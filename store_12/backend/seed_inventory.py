from app import app
from models import db, InventoryItem

items_data = [
    # Produce
    {"category": "Produce", "name": "Alphonso Mango", "cost_price": 350, "selling_price": 500},
    {"category": "Produce", "name": "Desi Tomato", "cost_price": 30, "selling_price": 50},
    {"category": "Produce", "name": "Red Onions", "cost_price": 35, "selling_price": 50},
    {"category": "Produce", "name": "Potatoes (1kg)", "cost_price": 25, "selling_price": 40},
    {"category": "Produce", "name": "Green Chilli", "cost_price": 10, "selling_price": 20},
    {"category": "Produce", "name": "Ginger (100g)", "cost_price": 15, "selling_price": 30},
    {"category": "Produce", "name": "Coriander Leaf", "cost_price": 5, "selling_price": 10},
    {"category": "Produce", "name": "Lady Finger", "cost_price": 25, "selling_price": 45},
    {"category": "Produce", "name": "Cauliflower", "cost_price": 30, "selling_price": 50},
    {"category": "Produce", "name": "Spinach/Palak", "cost_price": 15, "selling_price": 25},
    {"category": "Produce", "name": "Bananas (1 doz)", "cost_price": 40, "selling_price": 60},
    {"category": "Produce", "name": "Pomegranate", "cost_price": 140, "selling_price": 200},
    {"category": "Produce", "name": "Papaya (1kg)", "cost_price": 40, "selling_price": 70},
    {"category": "Produce", "name": "Green Peas", "cost_price": 40, "selling_price": 70},
    {"category": "Produce", "name": "Lemon (4 u)", "cost_price": 10, "selling_price": 20},

    # Bakery
    {"category": "Bakery", "name": "Milk Bread", "cost_price": 35, "selling_price": 45},
    {"category": "Bakery", "name": "Brown Bread", "cost_price": 45, "selling_price": 60},
    {"category": "Bakery", "name": "Fruit Bun (2)", "cost_price": 20, "selling_price": 35},
    {"category": "Bakery", "name": "Paneer Puff", "cost_price": 18, "selling_price": 35},
    {"category": "Bakery", "name": "Veg Patty (P)", "cost_price": 15, "selling_price": 30},
    {"category": "Bakery", "name": "Rusk / Toast", "cost_price": 40, "selling_price": 65},
    {"category": "Bakery", "name": "Butter Cookies", "cost_price": 60, "selling_price": 100},
    {"category": "Bakery", "name": "Nankhatai (250g)", "cost_price": 70, "selling_price": 120},
    {"category": "Bakery", "name": "Chocolate Cake", "cost_price": 350, "selling_price": 550},
    {"category": "Bakery", "name": "Eggless Vanilla", "cost_price": 300, "selling_price": 450},
    {"category": "Bakery", "name": "Pav Bun (6p)", "cost_price": 25, "selling_price": 40},
    {"category": "Bakery", "name": "Garlic Toast", "cost_price": 50, "selling_price": 90},
    {"category": "Bakery", "name": "Multigrain Bread", "cost_price": 55, "selling_price": 75},
    {"category": "Bakery", "name": "Cream Roll", "cost_price": 10, "selling_price": 20},
    {"category": "Bakery", "name": "Fruit Cake Slice", "cost_price": 30, "selling_price": 50},

    # Dairy
    {"category": "Dairy", "name": "Toned Milk (500ml)", "cost_price": 54, "selling_price": 66},
    {"category": "Dairy", "name": "Full Cream (500ml)", "cost_price": 62, "selling_price": 72},
    {"category": "Dairy", "name": "Paneer (200g)", "cost_price": 75, "selling_price": 110},
    {"category": "Dairy", "name": "Amul Butter", "cost_price": 240, "selling_price": 285},
    {"category": "Dairy", "name": "Curd/Dahi (500g)", "cost_price": 35, "selling_price": 55},
    {"category": "Dairy", "name": "Fresh Cream", "cost_price": 55, "selling_price": 75},
    {"category": "Dairy", "name": "Ghee (1L)", "cost_price": 550, "selling_price": 680},
    {"category": "Dairy", "name": "Cheese Slices", "cost_price": 130, "selling_price": 175},
    {"category": "Dairy", "name": "Buttermilk/Chaas", "cost_price": 15, "selling_price": 25},
    {"category": "Dairy", "name": "Condensed Milk", "cost_price": 125, "selling_price": 160},
    {"category": "Dairy", "name": "Mozzarella", "cost_price": 115, "selling_price": 190},
    {"category": "Dairy", "name": "Greek Yogurt", "cost_price": 45, "selling_price": 70},
    {"category": "Dairy", "name": "Flavoured Milk", "cost_price": 25, "selling_price": 40},
    {"category": "Dairy", "name": "Skimmed Milk", "cost_price": 220, "selling_price": 310},
    {"category": "Dairy", "name": "Probiotic Drink", "cost_price": 60, "selling_price": 85},

    # Meat
    {"category": "Meat", "name": "Chicken Curry", "cost_price": 180, "selling_price": 260},
    {"category": "Meat", "name": "Chicken Breast", "cost_price": 320, "selling_price": 450},
    {"category": "Meat", "name": "Mutton/Lamb", "cost_price": 750, "selling_price": 950},
    {"category": "Meat", "name": "Rohu Fish", "cost_price": 160, "selling_price": 240},
    {"category": "Meat", "name": "Katla Fish", "cost_price": 190, "selling_price": 280},
    {"category": "Meat", "name": "Chicken Sausage", "cost_price": 110, "selling_price": 180},
    {"category": "Meat", "name": "Tiger Shrimp", "cost_price": 400, "selling_price": 650},
    {"category": "Meat", "name": "Chicken Drumstick", "cost_price": 140, "selling_price": 220},
    {"category": "Meat", "name": "Eggs - White (1 doz)", "cost_price": 70, "selling_price": 90},
    {"category": "Meat", "name": "Eggs - Brown (1 doz)", "cost_price": 90, "selling_price": 125},
    {"category": "Meat", "name": "Buff Meat", "cost_price": 280, "selling_price": 400},
    {"category": "Meat", "name": "Pomfret Fish", "cost_price": 250, "selling_price": 450},
    {"category": "Meat", "name": "Chicken Keema", "cost_price": 150, "selling_price": 240},
    {"category": "Meat", "name": "Pork Sausage", "cost_price": 280, "selling_price": 450},
    {"category": "Meat", "name": "Bacon Strips", "cost_price": 250, "selling_price": 420},

    # Others
    {"category": "Others", "name": "Basmati Rice (1kg)", "cost_price": 450, "selling_price": 750},
    {"category": "Others", "name": "Ashirvaad Atta", "cost_price": 245, "selling_price": 295},
    {"category": "Others", "name": "Toor Dal (1kg)", "cost_price": 140, "selling_price": 185},
    {"category": "Others", "name": "Moong Dal", "cost_price": 110, "selling_price": 150},
    {"category": "Others", "name": "Sugar (1kg)", "cost_price": 42, "selling_price": 55},
    {"category": "Others", "name": "Sunflower Oil", "cost_price": 115, "selling_price": 155},
    {"category": "Others", "name": "Tea Leaves", "cost_price": 180, "selling_price": 290},
    {"category": "Others", "name": "Instant Coffee", "cost_price": 120, "selling_price": 195},
    {"category": "Others", "name": "Salt (1kg)", "cost_price": 20, "selling_price": 28},
    {"category": "Others", "name": "Turmeric Powder", "cost_price": 45, "selling_price": 75},
    {"category": "Others", "name": "Red Chilli Powder", "cost_price": 60, "selling_price": 95},
    {"category": "Others", "name": "Garam Masala", "cost_price": 50, "selling_price": 90},
    {"category": "Others", "name": "Maggi Noodles", "cost_price": 140, "selling_price": 168},
    {"category": "Others", "name": "Marie Biscuit", "cost_price": 25, "selling_price": 40},
    {"category": "Others", "name": "Dishwash Liquid", "cost_price": 85, "selling_price": 130},
]

business_id = 1

with app.app_context():
    for data in items_data:
        # Check if item exists to avoid duplicates
        existing = InventoryItem.query.filter_by(business_id=business_id, name=data['name']).first()
        if not existing:
            item = InventoryItem(
                business_id=business_id,
                name=data['name'],
                cost_price=data['cost_price'],
                selling_price=data['selling_price'],
                category=data['category'],
                stock_quantity=50, # Set a default stock
                reorder_level=10   # Set a default reorder level
            )
            db.session.add(item)
    
    db.session.commit()
    print("Seeding completed successfully.")
