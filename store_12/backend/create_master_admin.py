from app import app
from models import db, User

def create_master_admin():
    with app.app_context():
        email = "master@bulkbins.com"
        password = "masterkey2026"
        
        user = User.query.filter_by(email=email).first()
        
        if user:
            print(f"User {email} found. Updating privileges...")
            user.is_master_admin = True
            # Update password just in case
            user.set_password(password)
        else:
            print(f"Creating new Master Admin: {email}...")
            user = User(username="MasterAdmin", email=email, is_master_admin=True)
            user.set_password(password)
            db.session.add(user)
            
        db.session.commit()
        print("Master Admin setup complete.")

if __name__ == "__main__":
    create_master_admin()
