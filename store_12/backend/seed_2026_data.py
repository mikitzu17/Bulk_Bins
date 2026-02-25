import sys
import random
from datetime import datetime, timedelta
from app import app
from models import db, InventoryItem, Transaction, Business

business_id = int(sys.argv[1]) if len(sys.argv) > 1 else 2

expense_templates = [
    {"category": "Rent", "description": "Monthly shop rent", "amount": 25000},
    {"category": "Utilities", "description": "Electricity bill", "amount": 4500},
    {"category": "Utilities", "description": "Water bill", "amount": 800},
    {"category": "Salaries", "description": "Staff salary - Ramesh", "amount": 15000},
    {"category": "Salaries", "description": "Staff salary - Priya", "amount": 12000},
    {"category": "Maintenance", "description": "Refrigerator repair", "amount": 3500},
    {"category": "Supplies", "description": "Packaging materials", "amount": 2200},
    {"category": "Marketing", "description": "Local newspaper ad", "amount": 1500},
    {"category": "Insurance", "description": "Shop insurance premium", "amount": 5000},
    {"category": "Others", "description": "Cleaning supplies", "amount": 650},
    {"category": "Maintenance", "description": "Pest control service", "amount": 1800},
    {"category": "Supplies", "description": "Carry bags & labels", "amount": 1200},
]

def seed_2026_data():
    with app.app_context():
        biz = Business.query.get(business_id)
        if not biz:
            print(f"Error: Business with id={business_id} not found!")
            return

        print(f"Seeding 2026 data for business: {biz.name} (id={business_id})")
        
        all_items = InventoryItem.query.filter_by(business_id=business_id).all()
        if not all_items:
            print("Error: No inventory items found. Please run seed_inventory.py first.")
            return

        start_date = datetime(2026, 1, 1)
        # Seed up to today (2026-02-17 based on system prompt metadata)
        end_date = datetime(2026, 2, 17)
        
        current_date = start_date
        transactions_created = 0

        while current_date <= end_date:
            # --- Sales ---
            # Increase sales on weekends
            is_weekend = current_date.weekday() >= 5
            num_sales = random.randint(8, 15) if is_weekend else random.randint(4, 10)
            
            for _ in range(num_sales):
                item = random.choice(all_items)
                qty = random.randint(1, 4)
                amount = item.selling_price * qty
                profit = (item.selling_price - (item.cost_price or 0)) * qty
                cogs = (item.cost_price or 0) * qty

                # Randomize time (9am - 9pm)
                hour = random.randint(9, 20)
                minute = random.randint(0, 59)
                second = random.randint(0, 59)
                tx_time = current_date.replace(hour=hour, minute=minute, second=second)

                tx = Transaction(
                    business_id=business_id,
                    inventory_item_id=item.id,
                    amount=amount,
                    quantity=qty,
                    category=item.category,
                    type='Sale',
                    timestamp=tx_time,
                    description=f"Sale of {qty}x {item.name}",
                    profit=profit,
                    cogs=cogs
                )
                db.session.add(tx)
                transactions_created += 1

            # --- Expenses ---
            # Rent, Utilities, Salaries at start of month
            if current_date.day == 1:
                for exp in expense_templates[:5]: # Rent, Utils, Salaries
                    tx = Transaction(
                        business_id=business_id,
                        amount=exp['amount'],
                        category=exp['category'],
                        type='Expense',
                        timestamp=current_date.replace(hour=10, minute=0),
                        description=exp['description'],
                        profit=0, cogs=0
                    )
                    db.session.add(tx)
                    transactions_created += 1
            
            # Random minor expenses
            if random.random() < 0.2:
                exp = random.choice(expense_templates[5:])
                tx = Transaction(
                    business_id=business_id,
                    amount=exp['amount'],
                    category=exp['category'],
                    type='Expense',
                    timestamp=current_date.replace(hour=random.randint(9, 17), minute=random.randint(0, 59)),
                    description=exp['description'],
                    profit=0, cogs=0
                )
                db.session.add(tx)
                transactions_created += 1

            current_date += timedelta(days=1)
            
            # Commit in batches of a week to be safe
            if current_date.day % 7 == 0:
                db.session.commit()

        db.session.commit()
        print(f"Total transactions created: {transactions_created}")
        print("Done!")

if __name__ == "__main__":
    seed_2026_data()
