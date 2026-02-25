from flask import request, jsonify
from functools import wraps
from flask_jwt_extended import decode_token, verify_jwt_in_request, get_jwt_identity
from models import BusinessMember, User

def get_user_id(token):
    try:
        decoded = decode_token(token)
        # identity is email in our app.py
        # We need to look up User by email to get ID
        email = decoded['sub']
        user = User.query.filter_by(email=email).first()
        return user.id if user else None
    except Exception as e:
        print(f"Token decode error: {e}")
        return None

def get_member_role(user_id, business_id):
    if not user_id: return None
    member = BusinessMember.query.filter_by(user_id=user_id, business_id=business_id).first()
    return member.role if member else None

def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
                current_user_email = get_jwt_identity()
                user = User.query.filter_by(email=current_user_email).first()
                
                # Try to get business_id from URL kwargs, then args, then json
                business_id = kwargs.get('business_id') or request.args.get('business_id')
                if not business_id and request.is_json:
                    business_id = request.json.get('business_id')
                
                if not user or not business_id:
                    return jsonify({"message": "User or Business ID missing"}), 400
                
                membership = BusinessMember.query.filter_by(user_id=user.id, business_id=business_id).first()
                if not membership or membership.role not in allowed_roles:
                    return jsonify({"message": f"Access denied. Required roles: {allowed_roles}"}), 403
                
                return f(*args, **kwargs)
            except Exception as e:
                 return jsonify({"message": f"Authorization error: {str(e)}"}), 401
        return decorated_function
    return decorator
