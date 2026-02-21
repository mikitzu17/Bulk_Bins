from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, verify_jwt_in_request
from models import db, User, Business, BusinessMember, Transaction, InventoryItem
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from flask import send_from_directory
from functools import wraps
#from flask_mail import Mail
from extensions import mail



basedir = os.path.abspath(os.path.dirname(__file__))
env_path = os.path.join(basedir, '.env')
load_dotenv(env_path)

# Verify Environment Loading (Safe for Production)
print(f"DEBUG: Loading .env from {env_path}")
if os.path.exists(env_path):
    print("DEBUG: .env file found.")
else:
    print("DEBUG: .env file NOT found at this path.")

print(f"DEBUG: MAIL_SERVER set to: {os.environ.get('MAIL_SERVER')}")
print(f"DEBUG: MAIL_USERNAME set to: {os.environ.get('MAIL_USERNAME', 'NOT_SET')}")


app = Flask(__name__)
application = app

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'bulkbins.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'bulkbins-premium-key-2026'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-bulkbins-2026'
app.config['UPLOAD_FOLDER'] = os.path.join(basedir, 'uploads/receipts')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db.init_app(app)
jwt = JWTManager(app)

# CREATE DATABASE TABLES (IMPORTANT FOR RENDER)
def create_tables():
    with app.app_context():
        db.create_all()

create_tables()

# Flask-Mail Configuration
from flask_mail import Mail
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', '')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', '')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', app.config['MAIL_USERNAME'])
#mail = Mail(app)
mail.init_app(app)

from ai_insights import ai_bp
from ai_service import ai_service
from export_routes import export_bp
app.register_blueprint(ai_bp, url_prefix='/api')
app.register_blueprint(export_bp, url_prefix='/api')

# Configure CORS to allow requests from frontend
CORS(app, 
     resources={r"/api/*": {"origins": "*"}},
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     supports_credentials=True)
from business import role_required, get_member_role

def master_admin_required():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
                current_user_email = get_jwt_identity()
                user = User.query.filter_by(email=current_user_email).first()
                if not user or not user.is_master_admin:
                    return jsonify({"message": "Master Admin access required"}), 403
                return f(*args, **kwargs)
            except Exception as e:
                return jsonify({"message": f"Authorization error: {str(e)}"}), 401
        return decorated_function
    return decorator

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "BulkBins Backend"}), 200

# Auth Routes
@app.route('/api/signup', methods=['POST', 'OPTIONS'])
def signup():
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 200
    
    data = request.get_json()
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({"message": "User already exists"}), 400
    
    new_user = User(
        username=data.get('name'),
        email=data.get('email')
    )
    new_user.set_password(data.get('password'))
    db.session.add(new_user)
    db.session.commit()
    
    access_token = create_access_token(identity=new_user.email)
    return jsonify({
        "token": access_token, 
        "user": {"email": new_user.email, "name": new_user.username},
        "businesses": [] # New user has no businesses
    }), 201

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 200
    
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    
    if user and user.check_password(data.get('password')):
        access_token = create_access_token(identity=user.email)
        # Also return businesses they are members of
        memberships = BusinessMember.query.filter_by(user_id=user.id).all()
        biz_list = [{"id": m.business_id, "name": m.business.name, "role": m.role, "currency": m.business.currency, "status": m.business.status or 'approved'} for m in memberships]
        return jsonify({
            "token": access_token, 
            "user": {
                "email": user.email, 
                "name": user.username,
                "is_master_admin": user.is_master_admin
            },
            "businesses": biz_list
        }), 200
    
    return jsonify({"message": "Invalid email or password"}), 401

@app.route('/api/verify', methods=['GET'])
@jwt_required()
def verify():
    current_user_email = get_jwt_identity()
    user = User.query.filter_by(email=current_user_email).first()
    if user:
        # Also return businesses they are members of
        memberships = BusinessMember.query.filter_by(user_id=user.id).all()
        biz_list = [{"id": m.business_id, "name": m.business.name, "role": m.role, "currency": m.business.currency, "status": m.business.status or 'approved'} for m in memberships]
        return jsonify({
            "user": {
                "email": user.email, 
                "name": user.username,
                "is_master_admin": user.is_master_admin
            },
            "businesses": biz_list
        }), 200
    return jsonify({"message": "User not found"}), 404

# Master Admin Routes
@app.route('/api/admin/overview', methods=['GET'])
@master_admin_required()
def admin_overview():
    user_count = User.query.count()
    business_count = Business.query.filter(Business.status == 'approved').count()
    pending_count = Business.query.filter(Business.status == 'pending').count()
    rejected_count = Business.query.filter(Business.status == 'rejected').count()
    return jsonify({
        "total_users": user_count,
        "total_businesses": business_count,
        "pending_businesses": pending_count,
        "rejected_businesses": rejected_count
    }), 200

@app.route('/api/admin/users', methods=['GET'])
@master_admin_required()
def admin_get_users():
    users = User.query.all()
    result = []
    for u in users:
        memberships = BusinessMember.query.filter_by(user_id=u.id).all()
        biz_names = [m.business.name for m in memberships]
        result.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_master_admin": u.is_master_admin,
            "businesses": biz_names,
            "created_at": u.created_at.strftime("%Y-%m-%d")
        })
    return jsonify(result), 200

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@master_admin_required()
def admin_delete_user(user_id):
    user = User.query.get(user_id)
    if not user: return jsonify({"message": "User not found"}), 404
    if user.is_master_admin: return jsonify({"message": "Cannot delete Master Admin"}), 400
    
    # Cascade delete should handle memberships, but let's be safe
    # SQLAlchemy cascade="all, delete-orphan" on Business.members should work if user is deleted?
    # Actually User.memberships has backref.
    # When user is deleted, their memberships are deleted.
    
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"}), 200

@app.route('/api/admin/businesses', methods=['GET'])
@master_admin_required()
def admin_get_businesses():
    businesses = Business.query.all()
    result = []
    for b in businesses:
        owners = BusinessMember.query.filter_by(business_id=b.id, role='Owner').all()
        owner_names = [o.user.username for o in owners]
        result.append({
            "id": b.id,
            "name": b.name,
            "owners": owner_names,
            "member_count": len(b.members),
            "created_at": b.created_at.strftime("%Y-%m-%d"),
            "status": b.status or 'approved'
        })
    return jsonify(result), 200

@app.route('/api/admin/businesses/<int:business_id>', methods=['DELETE'])
@master_admin_required()
def admin_delete_business(business_id):
    biz = Business.query.get(business_id)
    if not biz: return jsonify({"message": "Business not found"}), 404
    db.session.delete(biz)
    db.session.commit()
    return jsonify({"message": "Business deleted"}), 200

@app.route('/api/admin/pending-businesses', methods=['GET'])
@master_admin_required()
def admin_get_pending_businesses():
    businesses = Business.query.filter_by(status='pending').all()
    result = []
    for b in businesses:
        owners = BusinessMember.query.filter_by(business_id=b.id, role='Owner').all()
        owner_names = [o.user.username for o in owners]
        owner_emails = [o.user.email for o in owners]
        result.append({
            "id": b.id,
            "name": b.name,
            "owners": owner_names,
            "owner_emails": owner_emails,
            "member_count": len(b.members),
            "created_at": b.created_at.strftime("%Y-%m-%d"),
            "status": b.status
        })
    return jsonify(result), 200

@app.route('/api/admin/businesses/<int:business_id>/approve', methods=['PUT'])
@master_admin_required()
def admin_approve_business(business_id):
    biz = Business.query.get(business_id)
    if not biz: return jsonify({"message": "Business not found"}), 404
    biz.status = 'approved'
    db.session.commit()
    return jsonify({"message": f"Business '{biz.name}' has been approved"}), 200

@app.route('/api/admin/businesses/<int:business_id>/reject', methods=['PUT'])
@master_admin_required()
def admin_reject_business(business_id):
    biz = Business.query.get(business_id)
    if not biz: return jsonify({"message": "Business not found"}), 404
    biz.status = 'rejected'
    db.session.commit()
    return jsonify({"message": f"Business '{biz.name}' has been rejected"}), 200

# Business Management
@app.route('/api/businesses', methods=['POST'])
@jwt_required()
def create_business():
    data = request.get_json()
    current_user_email = get_jwt_identity()
    user = User.query.filter_by(email=current_user_email).first()
    
    new_biz = Business(name=data.get('name'), status='pending')
    db.session.add(new_biz)
    db.session.flush() # Get ID before commit
    
    membership = BusinessMember(user_id=user.id, business_id=new_biz.id, role='Owner')
    db.session.add(membership)
    db.session.commit()
    
    return jsonify({"id": new_biz.id, "name": new_biz.name, "role": "Owner", "status": "pending"}), 201

@app.route('/api/businesses/<int:business_id>/members', methods=['POST'])
@role_required(['Owner'])
def add_member(business_id):
    data = request.get_json()
    new_member_email = data.get('email')
    role = data.get('role')
    
    if role not in ['Owner', 'Accountant', 'Analyst', 'Staff']:
        return jsonify({"message": "Invalid role"}), 400
        
    user_to_add = User.query.filter_by(email=new_member_email).first()
    if not user_to_add:
        return jsonify({"message": "User not found. They must register first."}), 404
        
    if BusinessMember.query.filter_by(user_id=user_to_add.id, business_id=business_id).first():
        return jsonify({"message": "User is already a member"}), 400
        
    if role == 'Owner':
        owner_count = BusinessMember.query.filter_by(business_id=business_id, role='Owner').count()
        if owner_count >= 2:
            return jsonify({"message": "Maximum of 2 Owners/Partners allowed per business"}), 400
            
    new_membership = BusinessMember(user_id=user_to_add.id, business_id=business_id, role=role)
    db.session.add(new_membership)
    db.session.commit()
    
    return jsonify({"message": f"User {new_member_email} added as {role}"}), 201

@app.route('/api/businesses/<int:business_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_business(business_id):
    current_user_email = get_jwt_identity()
    user = User.query.filter_by(email=current_user_email).first()
    
    # Custom role check because DELETE is Owner only, PUT is Owner/Accountant
    membership = BusinessMember.query.filter_by(user_id=user.id, business_id=business_id).first()
    if not membership:
        return jsonify({"message": "Access denied"}), 403

    if request.method == 'DELETE':
        if membership.role != 'Owner':
            return jsonify({"message": "Only Owners can delete a business"}), 403
        biz = Business.query.get(business_id)
        if not biz: return jsonify({"message": "Business not found"}), 404
        db.session.delete(biz)
        db.session.commit()
        return jsonify({"message": "Business deleted successfully"}), 200

    if request.method == 'PUT':
        if membership.role not in ['Owner', 'Accountant']:
             return jsonify({"message": "Access denied"}), 403
        
        data = request.get_json()
        biz = Business.query.get(business_id)
        if not biz: return jsonify({"message": "Business not found"}), 404
        
        biz.name = data.get('name', biz.name)
        biz.currency = data.get('currency', biz.currency)
        biz.email = data.get('email', biz.email)
        
        db.session.commit()
        return jsonify({"message": "Business settings updated", "currency": biz.currency}), 200

@app.route('/api/businesses/<int:business_id>/members', methods=['GET'])
@role_required(['Owner', 'Accountant', 'Analyst', 'Staff'])
def get_members(business_id):
    members = BusinessMember.query.filter_by(business_id=business_id).all()
    result = []
    for m in members:
        result.append({
            "user_id": m.user_id,
            "name": m.user.username,
            "email": m.user.email,
            "role": m.role,
            "joined_at": m.created_at.strftime("%Y-%m-%d")
        })
    return jsonify(result), 200

@app.route('/api/businesses/<int:business_id>/members/<int:user_id>', methods=['PUT', 'DELETE'])
@role_required(['Owner'])
def manage_member(business_id, user_id):
    member = BusinessMember.query.filter_by(business_id=business_id, user_id=user_id).first()
    if not member:
        return jsonify({"message": "Member not found"}), 404

    # Prevent deleting/demoting the last Owner
    if member.role == 'Owner':
        owner_count = BusinessMember.query.filter_by(business_id=business_id, role='Owner').count()
        if owner_count <= 1:
            return jsonify({"message": "Cannot remove or demote the only Owner"}), 400

    if request.method == 'DELETE':
        db.session.delete(member)
        db.session.commit()
        return jsonify({"message": "Member removed"}), 200

    if request.method == 'PUT':
        data = request.get_json()
        new_role = data.get('role')
        if new_role not in ['Owner', 'Accountant', 'Analyst', 'Staff']:
            return jsonify({"message": "Invalid role"}), 400
            
        member.role = new_role
        db.session.commit()
        return jsonify({"message": f"Member role updated to {new_role}"}), 200

# Inventory Management
@app.route('/api/businesses/<int:business_id>/inventory', methods=['GET'])
@role_required(['Owner', 'Accountant', 'Analyst', 'Staff'])
def get_inventory(business_id):
    items = InventoryItem.query.filter_by(business_id=business_id).all()
    return jsonify([{
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "stock_quantity": item.stock_quantity,
        "reorder_level": item.reorder_level,
        "cost_price": item.cost_price,
        "selling_price": item.selling_price,
        "category": item.category
    } for item in items]), 200

@app.route('/api/businesses/<int:business_id>/inventory', methods=['POST'])
@role_required(['Owner'])
def add_inventory(business_id):
    try:
        data = request.get_json()
        def safe_float(val, default=0.0):
            try: return float(val) if val else default
            except: return default
        def safe_int(val, default=0):
            try: return int(val) if val else default
            except: return default

        new_item = InventoryItem(
            business_id=business_id,
            name=data.get('name'),
            description=data.get('description'),
            stock_quantity=safe_int(data.get('stock_quantity'), 0),
            reorder_level=safe_int(data.get('reorder_level'), 5),
            cost_price=safe_float(data.get('cost_price'), 0.0),
            selling_price=safe_float(data.get('selling_price'), 0.0),
            category=data.get('category'),
            lead_time=safe_int(data.get('lead_time'), 1)
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify({"message": "Item added to inventory", "id": new_item.id}), 201
    except Exception as e:
        db.session.rollback()
        print(f"ERROR in add_inventory: {str(e)}")
        return jsonify({"message": f"Server Error: {str(e)}"}), 500

@app.route('/api/businesses/<int:business_id>/inventory/<int:item_id>', methods=['PUT'])
@role_required(['Owner', 'Accountant'])
def update_inventory(business_id, item_id):
    item = InventoryItem.query.filter_by(id=item_id, business_id=business_id).first()
    if not item:
        return jsonify({"message": "Item not found"}), 404
        
    data = request.get_json()
    current_user_email = get_jwt_identity()
    user = User.query.filter_by(email=current_user_email).first()
    membership = BusinessMember.query.filter_by(user_id=user.id, business_id=business_id).first()
    
    def safe_float(val, default=0.0):
        try: return float(val) if val is not None and val != '' else default
        except: return default
    def safe_int(val, default=0):
        try: return int(val) if val is not None and val != '' else default
        except: return default

    if membership.role == 'Accountant':
        # Accountants can ONLY update quantity (restock)
        if 'stock_quantity' in data:
            item.stock_quantity = safe_int(data['stock_quantity'], item.stock_quantity)
    else: # Owner
        item.name = data.get('name', item.name)
        item.description = data.get('description', item.description)
        item.stock_quantity = safe_int(data.get('stock_quantity'), item.stock_quantity)
        item.reorder_level = safe_int(data.get('reorder_level'), item.reorder_level)
        item.cost_price = safe_float(data.get('cost_price'), item.cost_price)
        item.selling_price = safe_float(data.get('selling_price'), item.selling_price)
        item.category = data.get('category', item.category)
        item.lead_time = safe_int(data.get('lead_time'), item.lead_time)
        
    db.session.commit()
    return jsonify({"message": "Item updated successfully"}), 200

@app.route('/api/businesses/<int:business_id>/inventory/<int:item_id>', methods=['DELETE'])
@role_required(['Owner'])
def delete_inventory(business_id, item_id):
    item = InventoryItem.query.filter_by(id=item_id, business_id=business_id).first()
    if not item:
        return jsonify({"message": "Item not found"}), 404
    
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Item deleted successfully"}), 200

# Transactions
@app.route('/api/businesses/<int:business_id>/transactions', methods=['GET'])
@role_required(['Owner', 'Accountant', 'Analyst', 'Staff'])
def get_transactions(business_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('limit', 100, type=int)
    
    query = Transaction.query.filter_by(business_id=business_id).order_by(Transaction.timestamp.desc())
    
    # Pagination
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    txns = pagination.items

    return jsonify({
        "transactions": [{
            "id": t.id,
            "amount": t.amount,
            "category": t.category,
            "type": t.type,
            "timestamp": t.timestamp.isoformat(),
            "description": t.description,
            "receipt_url": t.receipt_url,
            "ai_metadata": t.ai_metadata,
            "profit": t.profit,
            "cogs": t.cogs,
            "inventory_item_id": t.inventory_item_id,
            "quantity": t.quantity
        } for t in txns],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page
    }), 200

@app.route('/api/businesses/<int:business_id>/transactions', methods=['POST'])
@role_required(['Owner', 'Staff', 'Accountant'])
def create_transaction(business_id):
    # Use request.form if there's a file, otherwise request.get_json()
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
    else:
        data = request.get_json()

    def safe_float(val, default=0.0):
        try: return float(val) if val else default
        except: return default
    def safe_int(val, default=1):
        try: return int(val) if val else default
        except: return default

    amount = safe_float(data.get('amount'), 0.0)
    txn_type = data.get('type') # Sale or Expense
    inventory_item_id = data.get('inventory_item_id')
    quantity = safe_int(data.get('quantity'), 1)
    
    # Handle Receipt Upload
    receipt_url = None
    if 'receipt' in request.files:
        file = request.files['receipt']
        if file and file.filename != '':
            filename = secure_filename(f"{datetime.utcnow().timestamp()}_{file.filename}")
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            receipt_url = f"/api/receipts/{filename}"

    # Inventory Logic for Sales
    if txn_type == 'Sale' and inventory_item_id:
        item = InventoryItem.query.filter_by(id=inventory_item_id, business_id=business_id).first()
        if not item:
            return jsonify({"message": "Inventory item not found"}), 404
        if item.stock_quantity < quantity:
            return jsonify({"message": f"Insufficient stock. Available: {item.stock_quantity}"}), 400
        
        item.stock_quantity -= quantity
        # If amount not provided, calculate from selling_price
        if amount == 0:
            amount = item.selling_price * quantity
            
    # Calculate Profit and COGS
    profit = 0.0
    cogs = 0.0
    if txn_type == 'Sale' and inventory_item_id:
        item = InventoryItem.query.get(inventory_item_id)
        if item:
            item_cost = item.cost_price * quantity
            profit = amount - item_cost
            cogs = item_cost
    elif txn_type == 'Expense':
        profit = -amount
        cogs = amount # Expenses are essentially COGS for the business operation

    timestamp_str = data.get('timestamp')
    if timestamp_str:
        try:
            timestamp = datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            try:
                timestamp = datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M")
            except ValueError:
                try:
                    timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d")
                except ValueError:
                    timestamp = datetime.utcnow()
    else:
        timestamp = datetime.utcnow()

    new_txn = Transaction(
        business_id=business_id,
        inventory_item_id=inventory_item_id if txn_type == 'Sale' else None,
        amount=amount,
        quantity=quantity if txn_type == 'Sale' else 1,
        category=data.get('category'),
        type=txn_type,
        description=data.get('description'),
        timestamp=timestamp,
        receipt_url=receipt_url,
        profit=profit,
        cogs=cogs,
        ai_metadata=data.get('metadata') # Storing JSON as string
    )
    db.session.add(new_txn)
    db.session.commit()
    return jsonify({"message": "Transaction recorded", "id": new_txn.id}), 201

@app.route('/api/receipts/<filename>')
def get_receipt(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/businesses/<int:business_id>/transactions/<int:transaction_id>', methods=['PUT'])
@role_required(['Owner', 'Accountant'])
def update_transaction(business_id, transaction_id):
    txn = Transaction.query.filter_by(id=transaction_id, business_id=business_id).first()
    if not txn:
        return jsonify({"message": "Transaction not found"}), 404
        
    # Support both JSON and Form Data (for receipt updates)
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
    else:
        data = request.get_json()
    
    # Store old values for inventory adjustment
    old_type = txn.type
    old_qty = txn.quantity or 0
    old_item_id = txn.inventory_item_id
    
    # 1. Revert Old Inventory Impact
    if old_type == 'Sale' and old_item_id:
        old_item = InventoryItem.query.get(old_item_id)
        if old_item:
            old_item.stock_quantity += old_qty
            
    def safe_float(val, default=0.0):
        try: return float(val) if val else default
        except: return default
    def safe_int(val, default=1):
        try: return int(val) if val else default
        except: return default

    # 2. Update Transaction Fields
    txn.amount = safe_float(data.get('amount'), txn.amount)
    txn.category = data.get('category', txn.category)
    txn.type = data.get('type', txn.type)
    txn.description = data.get('description', txn.description)
    txn.quantity = safe_int(data.get('quantity'), txn.quantity or 1)
    txn.inventory_item_id = data.get('inventory_item_id', txn.inventory_item_id)
    if txn.inventory_item_id == '': txn.inventory_item_id = None
    
    if 'timestamp' in data:
        try:
            txn.timestamp = datetime.strptime(data['timestamp'], "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            try:
                txn.timestamp = datetime.strptime(data['timestamp'], "%Y-%m-%dT%H:%M")
            except ValueError:
                try:
                    txn.timestamp = datetime.strptime(data['timestamp'], "%Y-%m-%d")
                except ValueError:
                    pass # Keep old timestamp if invalid
            
    # Handle Receipt Update
    if 'receipt' in request.files:
        file = request.files['receipt']
        if file and file.filename != '':
            filename = secure_filename(f"{datetime.utcnow().timestamp()}_{file.filename}")
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            txn.receipt_url = f"/api/receipts/{filename}"
            
    # 3. Apply New Inventory Impact
    if txn.type == 'Sale' and txn.inventory_item_id:
        new_item = InventoryItem.query.get(txn.inventory_item_id)
        if not new_item:
            db.session.rollback()
            return jsonify({"message": "New inventory item not found"}), 404
        if new_item.stock_quantity < txn.quantity:
            db.session.rollback()
            return jsonify({"message": f"Insufficient stock for update. Available: {new_item.stock_quantity}"}), 400
        new_item.stock_quantity -= txn.quantity
        
    # Recalculate Profit and COGS
    if txn.type == 'Sale' and txn.inventory_item_id:
        item = InventoryItem.query.get(txn.inventory_item_id)
        if item:
            item_cost = item.cost_price * txn.quantity
            txn.profit = txn.amount - item_cost
            txn.cogs = item_cost
    elif txn.type == 'Expense':
        txn.profit = -txn.amount
        txn.cogs = txn.amount
    else:
        txn.profit = 0.0
        txn.cogs = 0.0
        
    db.session.commit()
    return jsonify({"message": "Transaction updated successfully"}), 200

@app.route('/api/businesses/<int:business_id>/transactions/<int:transaction_id>', methods=['DELETE'])
@role_required(['Owner', 'Accountant'])
def delete_transaction(business_id, transaction_id):
    txn = Transaction.query.filter_by(id=transaction_id, business_id=business_id).first()
    if not txn:
        return jsonify({"message": "Transaction not found"}), 404
        
    # Revert Inventory Impact if it's a Sale
    if txn.type == 'Sale' and txn.inventory_item_id and txn.quantity:
        item = InventoryItem.query.get(txn.inventory_item_id)
        if item:
            item.stock_quantity += txn.quantity
            
    db.session.delete(txn)
    db.session.commit()
    return jsonify({"message": "Transaction deleted successfully"}), 200

# AI Integration Endpoints
@app.route('/api/ai/classify', methods=['POST'])
@jwt_required()
def ai_classify():
    data = request.get_json()
    description = data.get('description', '')
    suggestion = ai_service.classify_expense(description)
    return jsonify({"suggestion": suggestion}), 200

@app.route('/api/businesses/<int:business_id>/ai/predictions', methods=['GET'])
@role_required(['Owner', 'Analyst'])
def ai_predictions(business_id):
    txns = Transaction.query.filter_by(business_id=business_id).all()
    txn_data = [{
        "timestamp": t.timestamp.isoformat(),
        "amount": t.amount,
        "type": t.type,
        "profit": t.profit
    } for t in txns]
    
    predictions = ai_service.predict_profit(txn_data)
    
    # Overspending check for current month
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current_month_expenses = db.session.query(db.func.sum(Transaction.amount)).filter(
        Transaction.business_id == business_id,
        Transaction.type == 'Expense',
        Transaction.timestamp >= month_start
    ).scalar() or 0
    
    # Use ai_service logic if available, or keep existing
    # For now, let's just return what we have
    return jsonify({
        "predictions": predictions,
        "overspending": {
            "alert": False,
            "excess_amount": 0
        }
    }), 200

@app.route('/api/businesses/<int:business_id>/ai/predictions', methods=['GET'])
@role_required(['Owner', 'Accountant', 'Analyst'])
def get_predictions(business_id):
    # Fetch all transactions for analysis
    txns = Transaction.query.filter_by(business_id=business_id).all()
    txn_data = [{
        "timestamp": t.timestamp.isoformat(),
        "amount": t.amount,
        "type": t.type,
        "profit": t.profit
    } for t in txns]
    
    prediction = ai_service.predict_profit(txn_data)
    
    return jsonify(prediction), 200

@app.route('/api/businesses/<int:business_id>/ai/pnl', methods=['GET'])
@role_required(['Owner', 'Accountant', 'Analyst'])
def get_pnl_data(business_id):
    # Get monthly sales vs expenses for the last 6 months
    now = datetime.utcnow()
    six_months_ago = now - timedelta(days=180)
    
    txns = Transaction.query.filter(
        Transaction.business_id == business_id,
        Transaction.timestamp >= six_months_ago
    ).all()
    
    data = {}
    for t in txns:
        month = t.timestamp.strftime('%Y-%m')
        if month not in data:
            data[month] = {"sales": 0, "expenses": 0, "profit": 0, "cogs": 0}
        if t.type == 'Sale':
            data[month]["sales"] += t.amount
            data[month]["cogs"] += (t.cogs or 0)
        else:
            data[month]["expenses"] += t.amount
        data[month]["profit"] += (t.profit or 0)
            
    sorted_months = sorted(data.keys())
    pnl_history = [{
        "month": m,
        "sales": data[m]["sales"],
        "expenses": data[m]["expenses"],
        "cogs": data[m]["cogs"],
        "profit": data[m]["profit"]
    } for m in sorted_months]
    
    return jsonify(pnl_history), 200

@app.route('/api/businesses/<int:business_id>/ai/inventory-insights', methods=['GET'])
@role_required(['Owner', 'Accountant', 'Analyst'])
def get_inventory_insights(business_id):
    items = InventoryItem.query.filter_by(business_id=business_id).all()
    inventory_data = [{
        "id": item.id,
        "name": item.name,
        "stock_quantity": item.stock_quantity,
        "reorder_level": item.reorder_level,
        "lead_time": item.lead_time
    } for item in items]
    
    txns = Transaction.query.filter_by(business_id=business_id).all()
    txn_data = [{
        "inventory_item_id": t.inventory_item_id,
        "type": t.type,
        "quantity": t.quantity,
        "timestamp": t.timestamp.isoformat()
    } for t in txns]
    
    reorders = ai_service.recommend_reorders(inventory_data, txn_data)
    
    return jsonify({
        "reorder_recommendations": reorders
    }), 200

@app.route('/api/businesses/<int:business_id>/ai/profit-stars', methods=['GET'])
@role_required(['Owner', 'Accountant', 'Analyst'])
def get_profit_stars(business_id):
    items = InventoryItem.query.filter_by(business_id=business_id).all()
    inventory_data = [{"id": item.id, "name": item.name} for item in items]
    
    txns = Transaction.query.filter_by(business_id=business_id).all()
    txn_data = [{
        "inventory_item_id": t.inventory_item_id,
        "type": t.type,
        "quantity": t.quantity,
        "profit": t.profit,
        "amount": t.amount,
        "timestamp": t.timestamp.isoformat()
    } for t in txns]
    
    stars = ai_service.get_profitability_insights(inventory_data, txn_data)
    
    return jsonify({
        "profit_stars": stars
    }), 200

@app.route('/api/businesses/<int:business_id>/transaction-import', methods=['POST'])
@role_required(['Owner', 'Analyst'])
def import_transactions(business_id):
    if 'file' not in request.files:
        return jsonify({"message": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No selected file"}), 400
    
    if file and file.filename.endswith('.csv'):
        try:
            original_filename = file.filename
            # Save file for AI Forecaster usage (Persist it)
            # Use a fixed name 'sales_data.csv' so get_csv_analysis can find it
            filepath = os.path.join(basedir, f'sales_data_{business_id}.csv') 
            file.save(filepath)
            # Save original filename for display
            with open(os.path.join(basedir, f'sales_data_{business_id}.meta'), 'w') as mf:
                mf.write(original_filename)
            
            # Parse CSV to import into DB
            import csv
            count = 0
            
            # Re-open the saved file
            with open(filepath, 'r', encoding='utf-8-sig') as csvfile: # Handle BOM
                # Sniff header
                sample = csvfile.read(1024)
                csvfile.seek(0)
                has_header = csv.Sniffer().has_header(sample)
                
                reader = csv.reader(csvfile)
                if has_header:
                    header = next(reader)
                    # Simple mapping strategy: Look for keywords in header position
                    # Default map: date=0, type=1, category=2, amount=3, description=4
                    # Or just use DictReader with normalized keys
                
                csvfile.seek(0)
                dict_reader = csv.DictReader(csvfile)
                
                # Normalize keys to lowercase for robustness
                normalized_rows = []
                for row in dict_reader:
                    lower_row = {k.lower().strip(): v for k, v in row.items() if k}
                    normalized_rows.append(lower_row)
                
                for row in normalized_rows:
                    try:
                        # Flexible key matching
                        date_str = row.get('date') or row.get('timestamp') or row.get('txn_date')
                        amount_str = row.get('amount') or row.get('revenue') or row.get('cost') or row.get('value')
                        category = row.get('category') or row.get('expense_type') or 'Others'
                        txn_type = row.get('type') or ('Expense' if row.get('expense_type') else 'Sale')
                        description = row.get('description') or row.get('notes') or 'Imported'
                        
                        if not date_str or not amount_str:
                            continue # Skip empty rows
                            
                        # Handle Date Formats
                        try:
                            # Try standard formats including DD-MM-YYYY
                            for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d', '%d-%m-%y'):
                                try:
                                    dt = datetime.strptime(date_str, fmt)
                                    break
                                except ValueError:
                                    pass
                            else:
                                dt = datetime.now() # Fallback
                        except:
                            dt = datetime.now()

                        # Map transaction type standard
                        raw_type = txn_type.capitalize().strip()
                        if 'Sale' in raw_type:
                            final_type = 'Sale'
                        elif 'Expense' in raw_type:
                            final_type = 'Expense'
                        else:
                            final_type = 'Expense' # Default fallback

                        txn = Transaction(
                            business_id=business_id,
                            timestamp=dt,
                            type=txn_type.capitalize(), # Ensure Sale/Expense
                            category=category,
                            amount=float(amount_str),
                            description=description,
                            quantity=1,
                            inventory_item_id=None # Importing generic transactions
                        )
                        db.session.add(txn)
                        count += 1
                    except Exception as row_error:
                        print(f"Skipping row {row}: {row_error}")
                        continue
            
            db.session.commit()
            # Do NOT remove filepath, kept for AI analysis
            return jsonify({"message": f"Successfully imported {count} transactions. AI models updated."}), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({"message": f"Import failed: {str(e)}"}), 500
    else:
        return jsonify({"message": "Invalid file type. Please upload a CSV."}), 400



if __name__ == '__main__':
    app.run(debug=True, port=5000)


@app.route("/")
def home():
    return {"message": "Bulk Bins Backend is running successfully!"}