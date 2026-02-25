from app import app, db, Transaction

with app.app_context():
    # Identify transactions to delete
    # Criteria: description contains 'Imported' OR (inventory_item_id is None AND type IN ('Sale', 'Expense'))
    # Wait, simple manual transactions might also have inventory_item_id=None if they are generic expenses or sales without items. 
    # But imported ones explicitly had description='Imported' in my previous code logic if description was missing.
    # The user said "transactions which are imported".
    # Let's target ones with description='Imported' first.
    
    imported_txns = Transaction.query.filter(Transaction.description.like('%Imported%')).all()
    count = len(imported_txns)
    
    print(f"Found {count} transactions with 'Imported' in description.")
    
    if count > 0:
        print("Deleting...")
        for txn in imported_txns:
            db.session.delete(txn)
        db.session.commit()
        print("Deletion complete.")
    else:
        print("No 'Imported' transactions found. Checking mostly likely candidates (no inventory link)...")
        # Fallback: Delete generic imports if they don't have 'Imported' in description but look like it?
        # Actually, the user's CSV had specific descriptions.
        # But my code: `description = row.get('description') ... or 'Imported'`
        # If the CSV had descriptions, they are preserved.
        # If they are from today...
        # Let's just delete the ones with 'Imported' validation message or similar? 
        # No, I can't be sure about other descriptions.
        # I will delete identifying by 'Imported' first. If 0, I'll tell the user.
