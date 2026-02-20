import sqlite3

def migrate():
    conn = sqlite3.connect('backend/bulkbins.db')
    cursor = conn.cursor()
    
    # 1. Add business_id column to inventory_item
    try:
        cursor.execute("ALTER TABLE inventory_item ADD COLUMN business_id INTEGER REFERENCES business(id)")
        print("Added business_id to inventory_item")
    except sqlite3.OperationalError:
        print("business_id already exists in inventory_item (or error)")

    # 2. Add business_id column to transaction
    try:
        cursor.execute("ALTER TABLE \"transaction\" ADD COLUMN business_id INTEGER REFERENCES business(id)")
        print("Added business_id to transaction")
    except sqlite3.OperationalError:
        print("business_id already exists in transaction (or error)")

    # 3. Populate business_id from user_id (mapping existing items to the user's first business)
    # Get all memberships
    cursor.execute("SELECT user_id, business_id FROM business_member")
    memberships = cursor.fetchall()
    
    for user_id, business_id in memberships:
        # Update inventory_item
        cursor.execute("UPDATE inventory_item SET business_id = ? WHERE user_id = ? AND business_id IS NULL", (business_id, user_id))
        # Update transaction
        cursor.execute("UPDATE \"transaction\" SET business_id = ? WHERE user_id = ? AND business_id IS NULL", (business_id, user_id))
        
    print("Populated business_id from user_id")

    # 4. (Optional) Remove user_id columns if wanted, but SQLite doesn't support DROP COLUMN in older versions
    # Actually, recent versions (3.35.0+) do. Let's try.
    try:
        cursor.execute("ALTER TABLE inventory_item DROP COLUMN user_id")
        print("Dropped user_id from inventory_item")
    except sqlite3.OperationalError as e:
        print(f"Could not drop user_id from inventory_item: {str(e)}")

    try:
        cursor.execute("ALTER TABLE \"transaction\" DROP COLUMN user_id")
        print("Dropped user_id from transaction")
    except sqlite3.OperationalError as e:
        print(f"Could not drop user_id from transaction: {str(e)}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
