import sqlite3
import os

def update_schema():
    db_path = os.path.join(os.path.dirname(__file__), 'bulkbins.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(user)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'is_master_admin' not in columns:
            print("Adding is_master_admin column to User table...")
            cursor.execute("ALTER TABLE user ADD COLUMN is_master_admin BOOLEAN DEFAULT 0")
            conn.commit()
            print("Schema updated successfully.")
        else:
            print("Column is_master_admin already exists in User table.")

        # Update business table
        cursor.execute("PRAGMA table_info(business)")
        columns = [info[1] for info in cursor.fetchall()]
        if 'secondary_email' not in columns:
            print("Adding secondary_email column to Business table...")
            cursor.execute("ALTER TABLE business ADD COLUMN secondary_email VARCHAR(120)")
            conn.commit()
            print("Business table updated successfully.")
        else:
            print("Column secondary_email already exists in Business table.")
            
    except Exception as e:
        print(f"Error updating schema: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    update_schema()
