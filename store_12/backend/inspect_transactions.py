from app import app, db, Transaction

with app.app_context():
    # Count total
    total = Transaction.query.count()
    print(f"Total Transactions: {total}")
    
    # Count by description 'Imported'
    imported_desc = Transaction.query.filter_by(description='Imported').count()
    print(f"Transactions with description 'Imported': {imported_desc}")
    
    # Count with inventory_item_id=None
    no_inventory = Transaction.query.filter_by(inventory_item_id=None).count()
    print(f"Transactions with no inventory link: {no_inventory}")
    
    # Show sample of last 5 imported
    print("\nSample Imported Candidates:")
    candidates = Transaction.query.filter_by(inventory_item_id=None).order_by(Transaction.timestamp.desc()).limit(5).all()
    for t in candidates:
        print(f"ID: {t.id}, Desc: {t.description}, Type: {t.type}, Amount: {t.amount}, Date: {t.timestamp}")
