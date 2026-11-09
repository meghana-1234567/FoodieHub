import os
import re
import secrets
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory, session
from werkzeug.security import check_password_hash, generate_password_hash


ROOT = Path(__file__).resolve().parent
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32),
        DATABASE=os.environ.get(
            "FOODIEHUB_DATABASE", str(ROOT / "instance" / "foodiehub.sqlite3")
        ),
        MYSQL_HOST=os.environ.get("MYSQL_HOST", "127.0.0.1"),
        MYSQL_PORT=int(os.environ.get("MYSQL_PORT", "3306")),
        MYSQL_USER=os.environ.get("MYSQL_USER", "root"),
        MYSQL_PASSWORD=os.environ.get("MYSQL_PASSWORD", ""),
        MYSQL_DATABASE=os.environ.get("MYSQL_DATABASE", ""),
        CORS_ORIGINS=tuple(
            origin.strip()
            for origin in os.environ.get(
                "FOODIEHUB_CORS_ORIGINS",
                "http://127.0.0.1:5500,http://localhost:5500",
            ).split(",")
            if origin.strip()
        ),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE", "0") == "1",
        MAX_CONTENT_LENGTH=16 * 1024,
    )
    if test_config:
        app.config.update(test_config)

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin in app.config["CORS_ORIGINS"]:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response.vary.add("Origin")
        return response

    def uses_mysql():
        return bool(app.config["MYSQL_DATABASE"])

    def connect_db():
        if uses_mysql():
            import mysql.connector

            return mysql.connector.connect(
                host=app.config["MYSQL_HOST"],
                port=app.config["MYSQL_PORT"],
                user=app.config["MYSQL_USER"],
                password=app.config["MYSQL_PASSWORD"],
                database=app.config["MYSQL_DATABASE"],
            )
        connection = sqlite3.connect(app.config["DATABASE"])
        connection.row_factory = sqlite3.Row
        return connection

    @contextmanager
    def database_connection():
        connection = connect_db()
        cursor = connection.cursor(dictionary=True) if uses_mysql() else connection.cursor()
        try:
            yield cursor
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            cursor.close()
            connection.close()

    def execute(cursor, statement, parameters=()):
        if uses_mysql():
            statement = statement.replace("?", "%s")
        cursor.execute(statement, parameters)

    if uses_mysql():
        create_users_table = """CREATE TABLE IF NOT EXISTS users (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(254) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_login_at TIMESTAMP NULL DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"""
    else:
        database_path = Path(app.config["DATABASE"])
        database_path.parent.mkdir(parents=True, exist_ok=True)
        create_users_table = """CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_login_at TEXT
        )"""
    with database_connection() as cursor:
        cursor.execute(create_users_table)
        if uses_mysql():
            cursor.execute("SHOW COLUMNS FROM users LIKE 'last_login_at'")
            has_last_login_column = cursor.fetchone() is not None
            if not has_last_login_column:
                cursor.execute(
                    "ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL DEFAULT NULL"
                )
        else:
            cursor.execute("PRAGMA table_info(users)")
            columns = {column["name"] for column in cursor.fetchall()}
            if "last_login_at" not in columns:
                cursor.execute("ALTER TABLE users ADD COLUMN last_login_at TEXT")

    def user_response(user):
        return {"id": user["id"], "name": user["name"], "email": user["email"]}

    @app.post("/api/auth/register")
    def register():
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify(error="A JSON object is required."), 400
        name = data.get("name", "")
        email = data.get("email", "")
        password = data.get("password", "")
        confirm_password = data.get("confirm_password", "")

        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 100:
            return jsonify(error="Enter a name between 1 and 100 characters."), 400
        if not isinstance(email, str):
            return jsonify(error="Enter a valid email address."), 400
        name = name.strip()
        email = email.strip().lower()
        if not EMAIL_PATTERN.fullmatch(email) or len(email) > 254:
            return jsonify(error="Enter a valid email address."), 400
        if not isinstance(password, str) or not 8 <= len(password) <= 128:
            return jsonify(error="Password must be between 8 and 128 characters."), 400
        if password != confirm_password:
            return jsonify(error="Passwords do not match."), 400

        try:
            with database_connection() as cursor:
                execute(
                    cursor,
                    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                    (name, email, generate_password_hash(password)),
                )
                execute(
                    cursor,
                    "SELECT id, name, email FROM users WHERE id = ?",
                    (cursor.lastrowid,),
                )
                user = cursor.fetchone()
        except Exception as error:
            is_duplicate = isinstance(error, sqlite3.IntegrityError) or getattr(
                error, "errno", None
            ) == 1062
            if is_duplicate:
                return jsonify(error="An account with that email already exists."), 409
            raise

        return jsonify(message="Account successfully registered.", user=user_response(user)), 201

    @app.post("/api/auth/login")
    def login():
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify(error="A JSON object is required."), 400
        email = data.get("email", "")
        password = data.get("password", "")
        if not isinstance(email, str) or not isinstance(password, str):
            return jsonify(error="Email and password are required."), 400
        email = email.strip().lower()
        if not email:
            return jsonify(error="Email and password are required."), 400

        with database_connection() as cursor:
            execute(
                cursor,
                "SELECT id, name, email, password_hash FROM users WHERE email = ?",
                (email,),
            )
            user = cursor.fetchone()

        if user is None or not check_password_hash(user["password_hash"], password):
            return jsonify(error="Invalid email or password."), 401

        with database_connection() as cursor:
            execute(
                cursor,
                "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
                (user["id"],),
            )

        session.clear()
        session["user_id"] = user["id"]
        return jsonify(message="Signed in.", user=user_response(user))

    @app.get("/api/auth/me")
    def current_user():
        user_id = session.get("user_id")
        if user_id is None:
            return jsonify(user=None), 200

        with database_connection() as cursor:
            execute(cursor, "SELECT id, name, email FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()
        if user is None:
            session.clear()
            return jsonify(user=None), 200
        return jsonify(user=user_response(user))

    @app.post("/api/auth/logout")
    def logout():
        session.clear()
        return jsonify(message="Signed out.")

    @app.get("/")
    def index():
        return send_from_directory(ROOT, "index.html")

    @app.get("/<path:filename>")
    def public_file(filename):
        return send_from_directory(ROOT, filename)

    return app


if __name__ == "__main__":
    application = create_app()
    application.run(
        host="127.0.0.1",
        port=int(os.environ.get("PORT", "5000")),
        debug=os.environ.get("FLASK_DEBUG") == "1",
    )
    