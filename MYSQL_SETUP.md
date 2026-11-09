# FoodieHub MySQL Setup and Validation

MySQL Workbench is the client used to manage and inspect a database. Flask connects to a running MySQL Server; Workbench alone is not the database server.

## 1. Create the database

1. Start MySQL Server and connect to it in MySQL Workbench.
2. Open a SQL tab and run:

   ```sql
   CREATE DATABASE foodiehub
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   ```

Flask creates the `users` table on startup. You do not need to create that table manually.

## 2. Install the Python packages

In PowerShell, open the FoodieHub project folder and run:

```powershell
python -m pip install -r requirements.txt
```

## 3. Configure Flask for MySQL

Stop any already-running Flask process with `Ctrl+C`. In that same PowerShell window, set the MySQL connection settings. The password prompt is hidden and the password is not stored in the source files.

```powershell
$env:MYSQL_HOST = "127.0.0.1"
$env:MYSQL_PORT = "3306"
$env:MYSQL_USER = "root"
$securePassword = Read-Host "MySQL Server password" -AsSecureString
$env:MYSQL_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
Remove-Variable securePassword
$env:MYSQL_DATABASE = "foodiehub"
python app.py
```

Use the MySQL username and password for your own server. Flask only switches to MySQL when `MYSQL_DATABASE` is set. If it is unset, the app uses its local SQLite database instead.

## 4. Register and sign in

1. Keep Flask running with `python app.py`. Open `http://127.0.0.1:5000` or use VS Code Live Server at `http://127.0.0.1:5500`; the forms connect to the Flask API on port 5000.
2. Open Register, enter a name, email, and matching password of at least 8 characters, then submit.
3. A successful registration clears the registration fields and switches the modal to Login. The account is not signed in automatically.
4. Enter the same email and password on the Login tab. A successful login shows a welcome message and closes the modal.

## 5. Verify the saved row in Workbench

Run this query in MySQL Workbench and refresh the results after registering:

```sql
SELECT id, name, email, password_hash, created_at, last_login_at
FROM foodiehub.users
ORDER BY id DESC;
```

You should see the new name and email. `password_hash` should contain a long hash beginning with a method label such as `scrypt:`; the original password is never stored or displayed. `last_login_at` is updated after each successful login and remains `NULL` until the account signs in for the first time.

## Troubleshooting

- **Cannot connect / Flask exits during startup:** make sure MySQL Server is running, the host and port are correct, the database exists, and the credentials are valid. Check the Flask terminal for the connection error.
- **Registration reports success but Workbench has no row:** confirm `MYSQL_DATABASE` is set in the same PowerShell window that starts Flask, stop and restart Flask after setting it, then refresh Workbench.
- **Email already exists:** registration rejects duplicate email addresses. Use the existing account to sign in or choose another email.
- **Login says invalid credentials:** use the exact email and password from registration. Passwords are case-sensitive. Also confirm Flask is still using the same database configuration it used during registration. If `MYSQL_DATABASE` is unset when Flask starts, it uses `instance/foodiehub.sqlite3`; if it is set, it uses that MySQL database.
- **SQLite says it cannot open the database file:** PowerShell must run from the project directory if you use the relative path below. The absolute-path version works regardless of PowerShell's current directory:

  ```powershell
  python -c "import sqlite3; c=sqlite3.connect(r'C:\Users\Dell\OneDrive\Desktop\foodiehub\instance\foodiehub.sqlite3'); print('Database:', c.execute('PRAGMA database_list').fetchone()[2]); print('Saved accounts:'); [print(row) for row in c.execute('SELECT id,name,email,created_at,last_login_at FROM users ORDER BY id DESC LIMIT 10')]; c.close()"
  ```
