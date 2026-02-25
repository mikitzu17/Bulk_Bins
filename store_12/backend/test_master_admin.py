import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_master_admin():
    # 1. Login as Master Admin
    print("Logging in as Master Admin...")
    resp = requests.post(f"{BASE_URL}/login", json={
        "email": "master@bulkbins.com",
        "password": "masterkey2026"
    })
    
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
        
    data = resp.json()
    token = data['token']
    user = data['user']
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"Login success. User: {user['email']}, Master Admin: {user.get('is_master_admin')}")
    
    if not user.get('is_master_admin'):
        print("ERROR: User is not marked as Master Admin!")
        return

    # 2. Test Admin Overview
    print("\nTesting /api/admin/overview...")
    resp = requests.get(f"{BASE_URL}/admin/overview", headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.json()}")
    if resp.status_code == 200:
        print("PASS: Admin Overview accessed.")
    else:
        print("FAIL: Admin Overview failed.")

    # 3. Test Get Users
    print("\nTesting /api/admin/users...")
    resp = requests.get(f"{BASE_URL}/admin/users", headers=headers)
    print(f"Status: {resp.status_code}")
    users = resp.json()
    print(f"Found {len(users)} users.")
    if resp.status_code == 200:
        print("PASS: Get Users accessed.")
    else:
        print("FAIL: Get Users failed.")

    # 4. Test Get Businesses
    print("\nTesting /api/admin/businesses...")
    resp = requests.get(f"{BASE_URL}/admin/businesses", headers=headers)
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"FAIL: /api/admin/businesses failed with {resp.status_code}")
        print(f"Response: {resp.text}")
        return

    businesses = resp.json()
    if not isinstance(businesses, list):
        print(f"FAIL: Expected list of businesses, got {type(businesses)}")
        print(businesses)
        return
        
    print(f"Found {len(businesses)} businesses.")
    if resp.status_code == 200:
        print("PASS: Get Businesses accessed.")
    else:
        print("FAIL: Get Businesses failed.")
        
    # 5. Verify Restriction (Cannot access inventory)
    if len(businesses) > 0:
        biz_id = businesses[0]['id']
        print(f"\nTesting RESTRICTION: Accessing inventory for business {biz_id}...")
        # Try to access inventory - should FAIL (403 or 401?)
        # Since master admin endpoint is separate, accessing normal business endpoint 
        # goes through role_required. 
        # Master Admin is NOT in BusinessMember table for this business.
        # So role_required has no membership record -> Access Denied.
        
        resp = requests.get(f"{BASE_URL}/businesses/{biz_id}/inventory", headers=headers)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
        
        if resp.status_code in [403, 401]:
            print("PASS: Access Denied as expected.")
        else:
            print("FAIL: Master Admin was able to access inventory! (Security Risk)")
    else:
        print("Skipping restriction test (no businesses found).")

if __name__ == "__main__":
    test_master_admin()
