import sqlite3
import os

basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'bulkbins.db')

def migrate():
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(\"transaction\")")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'profit' not in columns:
            print("Adding 'profit' column to 'transaction' table...")
            cursor.execute("ALTER TABLE \"transaction\" ADD COLUMN profit FLOAT DEFAULT 0.0")
            conn.commit()
            print("Migration successful: Added 'profit' column.")
        else:
            print("Column 'profit' already exists in 'transaction' table.")
            
    except Exception as e:
        print(f"Error during migration: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
