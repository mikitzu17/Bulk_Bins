"""
Seed script to populate a business with dummy inventory items and transactions.
Usage: python seed_dummy.py [business_id]
Defaults to business_id=2 if not provided.
"""
import sys
import random
from datetime import datetime, timedelta
from app import app
from models import db, InventoryItem, Transaction, Business

business_id = int(sys.argv[1]) if len(sys.argv) > 1 else 2

inventory_data = [
    # Produce
    {"category": "Produce", "name": "Alphonso Mango", "cost_price": 350, "selling_price": 500, "stock_quantity": 45, "reorder_level": 10},
    {"category": "Produce", "name": "Desi Tomato", "cost_price": 30, "selling_price": 50, "stock_quantity": 120, "reorder_level": 20},
    {"category": "Produce", "name": "Red Onions", "cost_price": 35, "selling_price": 50, "stock_quantity": 200, "reorder_level": 30},
    {"category": "Produce", "name": "Potatoes (1kg)", "cost_price": 25, "selling_price": 40, "stock_quantity": 180, "reorder_level": 25},
    {"category": "Produce", "name": "Green Chilli", "cost_price": 10, "selling_price": 20, "stock_quantity": 90, "reorder_level": 15},
    {"category": "Produce", "name": "Ginger (100g)", "cost_price": 15, "selling_price": 30, "stock_quantity": 60, "reorder_level": 10},
    {"category": "Produce", "name": "Coriander Leaf", "cost_price": 5, "selling_price": 10, "stock_quantity": 70, "reorder_level": 15},
    {"category": "Produce", "name": "Bananas (1 doz)", "cost_price": 40, "selling_price": 60, "stock_quantity": 55, "reorder_level": 10},
    {"category": "Produce", "name": "Pomegranate", "cost_price": 140, "selling_price": 200, "stock_quantity": 30, "reorder_level": 8},
    {"category": "Produce", "name": "Spinach/Palak", "cost_price": 15, "selling_price": 25, "stock_quantity": 5, "reorder_level": 10},  # Low stock!

    # Bakery
    {"category": "Bakery", "name": "Milk Bread", "cost_price": 35, "selling_price": 45, "stock_quantity": 40, "reorder_level": 10},
    {"category": "Bakery", "name": "Brown Bread", "cost_price": 45, "selling_price": 60, "stock_quantity": 35, "reorder_level": 8},
    {"category": "Bakery", "name": "Paneer Puff", "cost_price": 18, "selling_price": 35, "stock_quantity": 80, "reorder_level": 15},
    {"category": "Bakery", "name": "Butter Cookies", "cost_price": 60, "selling_price": 100, "stock_quantity": 25, "reorder_level": 5},
    {"category": "Bakery", "name": "Chocolate Cake", "cost_price": 350, "selling_price": 550, "stock_quantity": 8, "reorder_level": 3},
    {"category": "Bakery", "name": "Pav Bun (6p)", "cost_price": 25, "selling_price": 40, "stock_quantity": 3, "reorder_level": 10},  # Low stock!

    # Dairy
    {"category": "Dairy", "name": "Toned Milk (500ml)", "cost_price": 54, "selling_price": 66, "stock_quantity": 150, "reorder_level": 30},
    {"category": "Dairy", "name": "Paneer (200g)", "cost_price": 75, "selling_price": 110, "stock_quantity": 40, "reorder_level": 10},
    {"category": "Dairy", "name": "Amul Butter", "cost_price": 240, "selling_price": 285, "stock_quantity": 20, "reorder_level": 5},
    {"category": "Dairy", "name": "Curd/Dahi (500g)", "cost_price": 35, "selling_price": 55, "stock_quantity": 65, "reorder_level": 15},
    {"category": "Dairy", "name": "Ghee (1L)", "cost_price": 550, "selling_price": 680, "stock_quantity": 12, "reorder_level": 4},
    {"category": "Dairy", "name": "Cheese Slices", "cost_price": 130, "selling_price": 175, "stock_quantity": 2, "reorder_level": 5},  # Low stock!

    # Meat
    {"category": "Meat", "name": "Chicken Curry", "cost_price": 180, "selling_price": 260, "stock_quantity": 35, "reorder_level": 8},
    {"category": "Meat", "name": "Mutton/Lamb", "cost_price": 750, "selling_price": 950, "stock_quantity": 10, "reorder_level": 3},
    {"category": "Meat", "name": "Rohu Fish", "cost_price": 160, "selling_price": 240, "stock_quantity": 18, "reorder_level": 5},
    {"category": "Meat", "name": "Eggs - White (1 doz)", "cost_price": 70, "selling_price": 90, "stock_quantity": 100, "reorder_level": 20},
    {"category": "Meat", "name": "Tiger Shrimp", "cost_price": 400, "selling_price": 650, "stock_quantity": 7, "reorder_level": 3},

    # Others (Staples & Groceries)
    {"category": "Others", "name": "Basmati Rice (1kg)", "cost_price": 450, "selling_price": 750, "stock_quantity": 50, "reorder_level": 10},
    {"category": "Others", "name": "Toor Dal (1kg)", "cost_price": 140, "selling_price": 185, "stock_quantity": 60, "reorder_level": 12},
    {"category": "Others", "name": "Sugar (1kg)", "cost_price": 42, "selling_price": 55, "stock_quantity": 90, "reorder_level": 15},
    {"category": "Others", "name": "Sunflower Oil", "cost_price": 115, "selling_price": 155, "stock_quantity": 30, "reorder_level": 8},
    {"category": "Others", "name": "Tea Leaves", "cost_price": 180, "selling_price": 290, "stock_quantity": 22, "reorder_level": 5},
    {"category": "Others", "name": "Maggi Noodles", "cost_price": 140, "selling_price": 168, "stock_quantity": 75, "reorder_level": 15},
    {"category": "Others", "name": "Turmeric Powder", "cost_price": 45, "selling_price": 75, "stock_quantity": 40, "reorder_level": 8},
    {"category": "Others", "name": "Salt (1kg)", "cost_price": 20, "selling_price": 28, "stock_quantity": 100, "reorder_level": 20},
]

# Expense categories with realistic amounts
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

with app.app_context():
    biz = Business.query.get(business_id)
    if not biz:
        print(f"Error: Business with id={business_id} not found!")
        sys.exit(1)

    print(f"Seeding data for business: {biz.name} (id={business_id})")

    # --- Seed Inventory ---
    created_items = []
    for data in inventory_data:
        existing = InventoryItem.query.filter_by(business_id=business_id, name=data['name']).first()
        if not existing:
            item = InventoryItem(
                business_id=business_id,
                name=data['name'],
                cost_price=data['cost_price'],
                selling_price=data['selling_price'],
                category=data['category'],
                stock_quantity=data['stock_quantity'],
                reorder_level=data['reorder_level'],
                lead_time=random.choice([3, 5, 7, 10])
            )
            db.session.add(item)
            created_items.append(item)

    db.session.commit()
    print(f"  ✓ Created {len(created_items)} inventory items")

    # Fetch all items for this business (including previously existing ones)
    all_items = InventoryItem.query.filter_by(business_id=business_id).all()

    # --- Seed Transactions (last 30 days) ---
    existing_tx_count = Transaction.query.filter_by(business_id=business_id).count()
    if existing_tx_count > 20:
        print(f"  ℹ Already {existing_tx_count} transactions exist. Skipping transaction seeding.")
    else:
        today = datetime.utcnow()
        transactions_created = 0

        for day_offset in range(30, 0, -1):
            day = today - timedelta(days=day_offset)

            # Generate 3-8 sales per day
            num_sales = random.randint(3, 8)
            for _ in range(num_sales):
                item = random.choice(all_items)
                qty = random.randint(1, 5)
                amount = item.selling_price * qty
                profit = (item.selling_price - item.cost_price) * qty
                cogs = item.cost_price * qty

                # Randomize time within the day (8am - 9pm)
                hour = random.randint(8, 21)
                minute = random.randint(0, 59)
                tx_time = day.replace(hour=hour, minute=minute, second=random.randint(0, 59))

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

            # Generate 0-2 expenses per day (more on specific days)
            if day_offset == 30:
                # Beginning of month — rent + salaries
                for exp in expense_templates[:5]:
                    tx = Transaction(
                        business_id=business_id,
                        amount=exp['amount'],
                        category=exp['category'],
                        type='Expense',
                        timestamp=day.replace(hour=10, minute=0),
                        description=exp['description'],
                        profit=0, cogs=0
                    )
                    db.session.add(tx)
                    transactions_created += 1
            elif random.random() < 0.3:
                exp = random.choice(expense_templates[5:])
                variation = random.uniform(0.8, 1.2)
                tx = Transaction(
                    business_id=business_id,
                    amount=round(exp['amount'] * variation),
                    category=exp['category'],
                    type='Expense',
                    timestamp=day.replace(hour=random.randint(9, 17), minute=random.randint(0, 59)),
                    description=exp['description'],
                    profit=0, cogs=0
                )
                db.session.add(tx)
                transactions_created += 1

        db.session.commit()
        print(f"  ✓ Created {transactions_created} transactions (30 days of data)")

    print("\n✅ Seeding completed successfully!")
    print(f"   Business: {biz.name}")
    print(f"   Inventory items: {len(all_items)}")
    print(f"   Total transactions: {Transaction.query.filter_by(business_id=business_id).count()}")
