# FoodieHub

FoodieHub is a food ordering website built with HTML, CSS, and JavaScript, with a Python Flask backend and SQLite by default. MySQL can be configured optionally.

GitHub repository: https://github.com/meghana-1234567/FoodieHub

## Run the website locally

1. Install Python 3 if it is not already installed.
2. Open PowerShell in the project folder:

   ```powershell
   cd "C:\Users\Dell\OneDrive\Desktop\foodiehub"
   ```

3. Install the Python dependencies:

   ```powershell
   python -m pip install -r requirements.txt
   ```

4. Start the Flask backend:

   ```powershell
   python app.py
   ```

5. Leave PowerShell running and open http://127.0.0.1:5000 in your browser.

The app uses `instance/foodiehub.sqlite3` by default. To use MySQL instead, follow [MYSQL_SETUP.md](MYSQL_SETUP.md).

## Check the database while the backend is running

The default setup uses SQLite. You can inspect it from a second PowerShell terminal while Flask keeps running:

1. Leave the terminal running `python app.py` open.
2. Open a second terminal in VS Code (**Terminal > New Terminal**) or open another PowerShell window.
3. Go to the project folder:

   ```powershell
   cd "C:\Users\Dell\OneDrive\Desktop\foodiehub"
   ```

4. Run this command to print the SQLite database path and registered accounts:

   ```powershell
   python -c "import sqlite3; c=sqlite3.connect('instance/foodiehub.sqlite3'); print('Database:', c.execute('PRAGMA database_list').fetchone()[2]); print('Registered users:'); [print(row) for row in c.execute('SELECT id, name, email, created_at, last_login_at FROM users ORDER BY id DESC')]; c.close()"
   ```

   Each row shows the account ID, name, email, registration time, and most recent login time. Passwords and password hashes are intentionally not displayed. The app creates the `users` table when Flask starts; register an account on the website to add a row.

If you started Flask with `MYSQL_DATABASE` set, it is using MySQL instead of this SQLite file. In that case, inspect the `foodiehub.users` table in MySQL Workbench using the instructions in [MYSQL_SETUP.md](MYSQL_SETUP.md).

## Connect this project to GitHub

These steps are for an existing local project folder. Run them in PowerShell from the project directory.

1. Check whether Git is installed:

   ```powershell
   git --version
   ```

2. Check whether the project is already connected to GitHub:

   ```powershell
   git remote -v
   ```

   For this project, the remote should be:

   ```text
   https://github.com/meghana-1234567/FoodieHub
   ```

   If `origin` is missing, add it:

   ```powershell
   git remote add origin https://github.com/meghana-1234567/FoodieHub.git
   ```

   If `origin` already exists but points to a different repository, update it:

   ```powershell
   git remote set-url origin https://github.com/meghana-1234567/FoodieHub.git
   ```

3. Set the name and email Git uses on commits. Use your own name and the email associated with your GitHub account:

   ```powershell
   git config user.name "Your Name"
   git config user.email "you@example.com"
   ```

4. Make sure the branch is named `main`:

   ```powershell
   git branch -M main
   ```

5. Stage and commit your changes:

   ```powershell
   git add .
   git commit -m "Describe your changes"
   ```

6. If the GitHub repository already has commits that are not in your local project, fetch and merge them before pushing:

   ```powershell
   git pull origin main --allow-unrelated-histories
   ```

   This merge option is only needed when the local and GitHub histories started separately. If Git reports a conflict, open the listed files, resolve the conflict markers, save them, then run `git add <file>` and `git commit` to finish the merge.

7. Push the branch to GitHub and set its upstream:

   ```powershell
   git push -u origin main
   ```

GitHub may ask you to sign in through your browser or VS Code. Do not put your GitHub password or access token in a Git command.

## Push later changes

After editing files, run these commands from the project folder:

```powershell
git add .
git commit -m "Describe your changes"
git pull --rebase origin main
git push
```

If a rebase conflict occurs, resolve and save the files Git lists, then run:

```powershell
git add <resolved-file>
git rebase --continue
git push
```
