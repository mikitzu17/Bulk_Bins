import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), 'backend', 'bulkbins.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("Adding 'description' column to 'inventory_item' table...")
        cursor.execute("ALTER TABLE inventory_item ADD COLUMN description VARCHAR(500)")
        conn.commit()
        print("Migration successful: 'description' column added.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Migration skipped: 'description' column already exists.")
        else:
            print(f"Migration failed: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
