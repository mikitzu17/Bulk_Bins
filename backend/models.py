from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_master_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    memberships = db.relationship('BusinessMember', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Business(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    currency = db.Column(db.String(10), default='INR')
    email = db.Column(db.String(120), nullable=True)
    secondary_email = db.Column(db.String(120), nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    
    # Relationships
    members = db.relationship('BusinessMember', backref='business', lazy=True, cascade="all, delete-orphan")
    transactions = db.relationship('Transaction', backref='business', lazy=True, cascade="all, delete-orphan")
    items = db.relationship('InventoryItem', backref='business', lazy=True, cascade="all, delete-orphan")

class BusinessMember(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    business_id = db.Column(db.Integer, db.ForeignKey('business.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False) # 'Owner', 'Accountant', 'Analyst', 'Staff'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('user_id', 'business_id', name='unique_membership'),)

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey('business.id'), nullable=False)
    inventory_item_id = db.Column(db.Integer, db.ForeignKey('inventory_item.id'), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, default=1)
    category = db.Column(db.String(50)) # e.g., Produce, Dairy, Bakery, Rent, Utilities
    type = db.Column(db.String(20)) # Sale or Expense
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    description = db.Column(db.String(200))
    receipt_url = db.Column(db.String(500), nullable=True)
    ai_metadata = db.Column(db.Text, nullable=True) # JSON structured data for AI profit analysis
    profit = db.Column(db.Float, default=0.0)
    cogs = db.Column(db.Float, default=0.0)

    # Relationship
    inventory_item = db.relationship('InventoryItem', backref='transactions', lazy=True)

class InventoryItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey('business.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    stock_quantity = db.Column(db.Integer, default=0)
    reorder_level = db.Column(db.Integer, default=5) # Default changed to 5 as per user request
    cost_price = db.Column(db.Float)
    selling_price = db.Column(db.Float)
    category = db.Column(db.String(50))
    lead_time = db.Column(db.Integer, default=1) # Lead time in days
