import sqlite3
import os

basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'bulkbins.db')

def normalize():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Update types to title case
    cursor.execute("UPDATE transaction SET type = 'Sale' WHERE LOWER(type) = 'sale'")
    cursor.execute("UPDATE transaction SET type = 'Expense' WHERE LOWER(type) = 'expense'")
    
    deleted = cursor.rowcount
    print(f"✅ Normalized {deleted} transactions.")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    normalize()
