from app import app
from models import db, Business

with app.app_context():
    businesses = Business.query.all()
    for b in businesses:
        print(f"ID: {b.id}, Name: {b.name}")
