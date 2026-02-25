from app import app
from models import db, User, Business, BusinessMember

def seed():
    with app.app_context():
        # Clear existing (optional, but good for clean state)
        # db.drop_all() 
        db.create_all()

        email = "monica3214b@gmail.com"
        password = "password123" # User should know this or I'll tell them
        
        if not User.query.filter_by(email=email).first():
            print(f"Creating user {email}...")
            user = User(username="Monica", email=email)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            
            print("Creating default business 'BulkBins Alpha'...")
            biz = Business(name="BulkBins Alpha")
            db.session.add(biz)
            db.session.commit()
            
            print("Linking user to business as Owner...")
            member = BusinessMember(user_id=user.id, business_id=biz.id, role='Owner')
            db.session.add(member)
            db.session.commit()
            print("Seeding complete.")
        else:
            print("User already exists.")

if __name__ == "__main__":
    seed()
