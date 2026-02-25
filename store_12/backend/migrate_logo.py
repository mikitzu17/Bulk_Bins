import sqlite3
import os

basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'bulkbins.db')

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE business ADD COLUMN logo_url VARCHAR(500)")
        print("✅ Added logo_url column to business table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("ℹ️ logo_url column already exists.")
        else:
            print(f"❌ Error adding column: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
