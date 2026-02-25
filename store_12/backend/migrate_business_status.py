"""Migration script to add 'status' column to the Business table.
Sets all existing businesses to 'approved'.
"""
import sqlite3
import os

basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'bulkbins.db')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if column already exists
cursor.execute("PRAGMA table_info(business)")
columns = [col[1] for col in cursor.fetchall()]

if 'status' not in columns:
    cursor.execute("ALTER TABLE business ADD COLUMN status VARCHAR(20) DEFAULT 'pending'")
    # Set all existing businesses to approved
    cursor.execute("UPDATE business SET status = 'approved'")
    conn.commit()
    print("✅ Added 'status' column to Business table. All existing businesses set to 'approved'.")
else:
    print("ℹ️  'status' column already exists. No changes made.")

conn.close()
