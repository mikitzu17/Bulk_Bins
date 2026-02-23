from app import app, db
from models import Transaction

def normalize():
    with app.app_context():
        # Update 'sale' to 'Sale'
        txns_sale = Transaction.query.filter(Transaction.type.ilike('sale')).all()
        for t in txns_sale:
            t.type = 'Sale'
        
        # Update 'expense' to 'Expense'
        txns_exp = Transaction.query.filter(Transaction.type.ilike('expense')).all()
        for t in txns_exp:
            t.type = 'Expense'
            
        count = len(txns_sale) + len(txns_exp)
        db.session.commit()
        print(f"✅ Normalized {count} transactions.")

if __name__ == "__main__":
    normalize()
