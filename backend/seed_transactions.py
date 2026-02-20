"""
Generate 2 months of realistic transaction data (Dec 2025 & Jan 2026).
Uses ACTUAL inventory items from the database for sales.
~80% Sales, ~20% Expenses by amount. Clears old seeded data first.
"""
import sys, os, random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app, db
from models import Transaction, Business, InventoryItem

# ---------- CONFIG ----------
START_DATE = datetime(2025, 12, 1)
END_DATE   = datetime(2026, 2, 1)  # Up to Jan 31, 2026

# Expense categories (monthly recurring + ad-hoc)
MONTHLY_EXPENSES = [
    {'category': 'Rent',        'amount': (25000, 30000), 'desc': 'Monthly store rent'},
    {'category': 'Utilities',   'amount': (3000, 6000),   'desc': 'Electricity & water bill'},
    {'category': 'Salaries',    'amount': (40000, 55000), 'desc': 'Monthly staff salaries'},
    {'category': 'Insurance',   'amount': (2000, 3000),   'desc': 'Business insurance premium'},
]

ADHOC_EXPENSES = [
    {'category': 'Supplies',    'amount': (1000, 8000),  'desc': 'Restocking packaging materials'},
    {'category': 'Marketing',   'amount': (2000, 10000), 'desc': 'Social media ads & flyers'},
    {'category': 'Maintenance', 'amount': (500, 3000),   'desc': 'Store maintenance & repairs'},
    {'category': 'Taxes',       'amount': (1500, 5000),  'desc': 'GST payment'},
    {'category': 'Others',      'amount': (300, 2000),   'desc': 'Miscellaneous expenses'},
]


def random_time(date):
    """Add random hour/minute to a date."""
    return date.replace(hour=random.randint(9, 20), minute=random.randint(0, 59), second=random.randint(0, 59))


def generate_transactions(business_id, inventory_items):
    transactions = []
    
    current = START_DATE
    while current < END_DATE:
        year, month = current.year, current.month
        
        # Days in this month
        if month == 12:
            days_in_month = 31
        else:
            next_month = datetime(year, month + 1, 1)
            days_in_month = (next_month - timedelta(days=1)).day
        
        # --- MONTHLY EXPENSES (posted on 1st-5th of month) ---
        for exp in MONTHLY_EXPENSES:
            day = random.randint(1, 5)
            dt = random_time(datetime(year, month, day))
            amt = round(random.uniform(*exp['amount']), 2)
            transactions.append(Transaction(
                business_id=business_id,
                amount=amt,
                quantity=1,
                category=exp['category'],
                type='Expense',
                timestamp=dt,
                description=exp['desc'],
                profit=-amt,
                cogs=amt
            ))
        
        # --- AD-HOC EXPENSES (3-6 random ones per month) ---
        for _ in range(random.randint(3, 6)):
            exp = random.choice(ADHOC_EXPENSES)
            day = random.randint(1, days_in_month)
            dt = random_time(datetime(year, month, day))
            amt = round(random.uniform(*exp['amount']), 2)
            transactions.append(Transaction(
                business_id=business_id,
                amount=amt,
                quantity=1,
                category=exp['category'],
                type='Expense',
                timestamp=dt,
                description=exp['desc'],
                profit=-amt,
                cogs=amt
            ))
        
        # --- SALES (using REAL inventory items, 8-18 per day) ---
        for day in range(1, days_in_month + 1):
            dt_base = datetime(year, month, day)
            weekday = dt_base.weekday()  # 0=Mon, 6=Sun
            
            # More sales on weekends
            if weekday >= 5:
                num_sales = random.randint(18, 28)
            else:
                num_sales = random.randint(12, 20)
            
            for _ in range(num_sales):
                # Pick a random inventory item
                item = random.choice(inventory_items)
                qty = random.randint(1, 7)
                
                # Use actual selling price (with small random variance ±5%)
                sell_price = item.selling_price or 100
                unit_price = round(sell_price * random.uniform(0.95, 1.05), 2)
                amount = round(unit_price * qty, 2)
                
                # COGS from actual cost price
                cost_price = item.cost_price or (sell_price * 0.5)
                cogs = round(cost_price * qty, 2)
                profit = round(amount - cogs, 2)
                
                dt = random_time(dt_base)
                transactions.append(Transaction(
                    business_id=business_id,
                    inventory_item_id=item.id,
                    amount=amount,
                    quantity=qty,
                    category=item.category or 'Others',
                    type='Sale',
                    timestamp=dt,
                    description=f'{item.name} x{qty}',
                    profit=profit,
                    cogs=cogs
                ))
        
        # Move to next month
        if month == 12:
            current = datetime(year + 1, 1, 1)
        else:
            current = datetime(year, month + 1, 1)
    
    return transactions


if __name__ == '__main__':
    with app.app_context():
        biz = Business.query.first()
        if not biz:
            print("ERROR: No business found!")
            sys.exit(1)
        
        bid = biz.id
        print(f"Using business: {biz.name} (ID: {bid})")
        
        # Load real inventory items
        inventory_items = InventoryItem.query.filter_by(business_id=bid).all()
        if not inventory_items:
            print("ERROR: No inventory items found!")
            sys.exit(1)
        print(f"Loaded {len(inventory_items)} inventory items")
        
        # --- CLEAR OLD TRANSACTIONS (Dec 2025 - Jan 2026) ---
        old = Transaction.query.filter(
            Transaction.business_id == bid,
            Transaction.timestamp >= START_DATE,
            Transaction.timestamp < END_DATE
        ).delete()
        db.session.commit()
        print(f"Cleared {old} old transactions in date range")
        
        # Generate new ones
        txns = generate_transactions(bid, inventory_items)
        
        sales_count = sum(1 for t in txns if t.type == 'Sale')
        exp_count = sum(1 for t in txns if t.type == 'Expense')
        total_sales_amt = sum(t.amount for t in txns if t.type == 'Sale')
        total_exp_amt = sum(t.amount for t in txns if t.type == 'Expense')
        
        print(f"\nGenerated {len(txns)} transactions:")
        print(f"  Sales:    {sales_count} txns  (₹{total_sales_amt:,.0f})")
        print(f"  Expenses: {exp_count} txns  (₹{total_exp_amt:,.0f})")
        print(f"  Expense ratio: {total_exp_amt / (total_sales_amt + total_exp_amt) * 100:.1f}%")
        print(f"  Date range: {START_DATE.strftime('%Y-%m-%d')} to {(END_DATE - timedelta(days=1)).strftime('%Y-%m-%d')}")
        
        # Show sample items used
        sample_items = set()
        for t in txns[:50]:
            if t.type == 'Sale' and t.description:
                sample_items.add(t.description.split(' x')[0])
        print(f"\n  Sample products: {', '.join(list(sample_items)[:10])}...")
        
        # Insert
        db.session.bulk_save_objects(txns)
        db.session.commit()
        
        new_total = Transaction.query.filter_by(business_id=bid).count()
        print(f"\n✅ Done! Total transactions now: {new_total}")
        
        # Also export CSV for AI forecaster
        import csv
        csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f'sales_data_{bid}.csv')
        all_txns = Transaction.query.filter_by(business_id=bid).order_by(Transaction.timestamp).all()
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['Date', 'Type', 'Category', 'Amount'])
            for t in all_txns:
                w.writerow([t.timestamp.strftime('%Y-%m-%d'), t.type, t.category or 'Others', t.amount])
        print(f"📊 Exported {len(all_txns)} rows to {csv_path}")
