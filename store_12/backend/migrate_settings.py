import sqlite3
import os

# Database Path
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'bulkbins.db')

print(f"Migrating database at: {db_path}")

def add_column(conn, table_name, column_name, data_type):
    cursor = conn.cursor()
    try:
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {data_type}")
        print(f"✅ Added column {column_name} to {table_name}")
    except sqlite3.OperationalError as e:
        if 'duplicate column name' in str(e):
            print(f"ℹ️ Column {column_name} already exists in {table_name}")
        else:
            print(f"❌ Error adding column {column_name}: {e}")

try:
    conn = sqlite3.connect(db_path)
    
    # Add 'currency' column to 'business' table
    add_column(conn, 'business', 'currency', "VARCHAR(10) DEFAULT 'INR'")
    
    # Add 'email' column to 'business' table
    add_column(conn, 'business', 'email', "VARCHAR(120)")

    conn.commit()
    conn.close()
    print("Migration complete!")
except Exception as e:
    print(f"Migration failed: {e}")
