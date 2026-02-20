import sqlite3
import os

def migrate_shadow():
    db_path = 'backend/bulkbins.db'
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # --- 1. Migrate inventory_item ---
        print("Migrating inventory_item...")
        cursor.execute("PRAGMA table_info(inventory_item)")
        existing_cols = [col[1] for col in cursor.fetchall()]
        
        cursor.execute("DROP TABLE IF EXISTS inventory_item_new")
        cursor.execute("""
            CREATE TABLE inventory_item_new (
                id INTEGER PRIMARY KEY,
                business_id INTEGER NOT NULL REFERENCES business(id),
                name VARCHAR(100) NOT NULL,
                stock_quantity INTEGER DEFAULT 0,
                reorder_level INTEGER DEFAULT 5,
                cost_price FLOAT,
                selling_price FLOAT,
                category VARCHAR(50),
                lead_time INTEGER DEFAULT 1
            )
        """)
        
        # Build SELECT list based on what exists
        select_cols = ["id", "COALESCE(business_id, 1) as business_id", "name"]
        target_cols = ["id", "business_id", "name"]
        
        mapping = {
            "stock_quantity": "stock_quantity",
            "reorder_level": "reorder_level",
            "cost_price": "cost_price",
            "selling_price": "selling_price",
            "category": "category",
            "lead_time": "lead_time"
        }
        for target, source in mapping.items():
            if source in existing_cols:
                select_cols.append(source)
                target_cols.append(target)
        
        cursor.execute(f"""
            INSERT INTO inventory_item_new ({', '.join(target_cols)})
            SELECT {', '.join(select_cols)} FROM inventory_item
        """)
        
        # --- 2. Migrate transaction ---
        print("Migrating transaction...")
        cursor.execute("PRAGMA table_info(\"transaction\")")
        existing_cols = [col[1] for col in cursor.fetchall()]
        
        cursor.execute("DROP TABLE IF EXISTS transaction_new")
        cursor.execute("""
            CREATE TABLE transaction_new (
                id INTEGER PRIMARY KEY,
                business_id INTEGER NOT NULL REFERENCES business(id),
                inventory_item_id INTEGER REFERENCES inventory_item(id),
                amount FLOAT NOT NULL,
                quantity INTEGER DEFAULT 1,
                category VARCHAR(50),
                type VARCHAR(20),
                timestamp DATETIME,
                description VARCHAR(200),
                receipt_url VARCHAR(500),
                ai_metadata TEXT
            )
        """)
        
        select_cols = ["id", "COALESCE(business_id, 1) as business_id", "amount"]
        target_cols = ["id", "business_id", "amount"]
        
        mapping = {
            "inventory_item_id": "inventory_item_id",
            "quantity": "quantity",
            "category": "category",
            "type": "type",
            "timestamp": "timestamp",
            "description": "description",
            "receipt_url": "receipt_url",
            "ai_metadata": "ai_metadata"
        }
        for target, source in mapping.items():
            if source in existing_cols:
                select_cols.append(source)
                target_cols.append(target)
        
        cursor.execute(f"""
            INSERT INTO transaction_new ({', '.join(target_cols)})
            SELECT {', '.join(select_cols)} FROM \"transaction\"
        """)

        # --- 3. Swap tables ---
        cursor.execute("DROP TABLE inventory_item")
        cursor.execute("ALTER TABLE inventory_item_new RENAME TO inventory_item")
        
        cursor.execute("DROP TABLE \"transaction\"")
        cursor.execute("ALTER TABLE transaction_new RENAME TO \"transaction\"")
        
        conn.commit()
        print("Successfully migrated both tables via shadow-table approach.")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_shadow()
