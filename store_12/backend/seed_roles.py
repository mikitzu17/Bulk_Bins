from app import app, db
from models import User, Business, BusinessMember

def seed_roles():
    with app.app_context():
        # 1. Create or Get 'r-mart' Business
        business = Business.query.filter(Business.name.ilike("r-mart")).first()
        if not business:
            business = Business(name="r-mart", currency="INR")
            db.session.add(business)
            db.session.commit()
            print(f"Created business: {business.name} (ID: {business.id})")
        else:
            print(f"Using existing business: {business.name} (ID: {business.id})")

        # 2. Define Users and Roles
        users_data = [
            {"email": "owner@bulkbins.com", "name": "Owner User", "role": "Owner"},
            {"email": "accountant@bulkbins.com", "name": "Accountant User", "role": "Accountant"},
            {"email": "analyst@bulkbins.com", "name": "Analyst User", "role": "Analyst"},
            {"email": "staff@bulkbins.com", "name": "Staff User", "role": "Staff"}
        ]

        password = "password123"

        for u_data in users_data:
            # Create User if not exists
            user = User.query.filter_by(email=u_data['email']).first()
            if not user:
                user = User(username=u_data['name'], email=u_data['email'])
                user.set_password(password)
                db.session.add(user)
                db.session.commit()
                print(f"Created user: {user.email}")
            else:
                print(f"User exists: {user.email}")

            # Assign Role (Membership)
            member = BusinessMember.query.filter_by(user_id=user.id, business_id=business.id).first()
            if not member:
                member = BusinessMember(user_id=user.id, business_id=business.id, role=u_data['role'])
                db.session.add(member)
                print(f"Assigned {u_data['role']} role to {user.email}")
            else:
                member.role = u_data['role']
                print(f"Updated {user.email} role to {u_data['role']}")
            
            db.session.commit()

        print("\n--- Role Seeding Complete ---")
        print(f"Business: {business.name}")
        print("Credentials (Password: password123):")
        for u in users_data:
            print(f"- {u['role']}: {u['email']}")

if __name__ == "__main__":
    seed_roles()
