import sys
import os

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("\n[ERROR] Could not find 'psycopg2'.")
    print("This script must be run within the virtual environment.")
    print("\nTo fix this, please run:")
    print("  .\\venv_win\\Scripts\\python.exe create_databases.py")
    print("\nOr select the 'venv_win' interpreter in your IDE (VS Code: Ctrl+Shift+P -> 'Python: Select Interpreter').")
    sys.exit(1)

def create_db(dbname):
    try:
        con = psycopg2.connect(user='postgres', host='localhost', password='1', port='5432')
        con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = con.cursor()
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{dbname}'")
        exists = cur.fetchone()
        if not exists:
            cur.execute(f'CREATE DATABASE "{dbname}"')
            print(f"Database '{dbname}' created successfully.")
        else:
            print(f"Database '{dbname}' already exists.")
        cur.close()
        con.close()
    except Exception as e:
        print(f"Error creating database '{dbname}': {e}")

if __name__ == "__main__":
    create_db("user")
    create_db("book")
