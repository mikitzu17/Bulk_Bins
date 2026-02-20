import sqlite3
import os

db_path = 'backend/bulkbins.db'
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Businesses ---")
cursor.execute("SELECT id, name FROM business")
for row in cursor.fetchall():
    print(row)

print("\n--- Memberships ---")
cursor.execute("SELECT user_id, business_id, role FROM business_member")
for row in cursor.fetchall():
    print(row)

print("\n--- Users ---")
cursor.execute("SELECT id, username, email FROM user")
for row in cursor.fetchall():
    print(row)

conn.close()
