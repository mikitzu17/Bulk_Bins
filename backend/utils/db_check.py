import sqlite3

def check_db():
    conn = sqlite3.connect('backend/bulkbins.db')
    cursor = conn.cursor()
    
    tables = ['inventory_item', 'transaction']
    
    with open('db_schema_utf8.txt', 'w', encoding='utf-8') as f:
        for table in tables:
            f.write(f"\n--- Columns in {table} ---\n")
            cursor.execute(f'PRAGMA table_info("{table}")')
            cols = cursor.fetchall()
            for col in cols:
                # col[0]=cid, col[1]=name, col[2]=type, col[3]=notnull, col[4]=dflt_value, col[5]=pk
                info = []
                if col[3] == 1: info.append("NOT NULL")
                if col[4] is not None: info.append(f"DEFAULT {col[4]}")
                if col[5] == 1: info.append("PRIMARY KEY")
                line = f"  {col[1]} ({col[2]}) {' '.join(info)}\n"
                f.write(line)
                print(f"Table {table}: {line.strip()}")
                
            has_business_id = any(col[1] == 'business_id' for col in cols)
            if not has_business_id:
                f.write(f"  !!! MISSING business_id column in {table}\n")
            
    conn.close()

if __name__ == "__main__":
    check_db()
