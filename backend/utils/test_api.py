import requests

BASE_URL = 'http://localhost:5000/api'

try:
    # Test Health
    res = requests.get(f"{BASE_URL}/health")
    print(f"Health Check: {res.status_code} - {res.json()}")
    
    # login check
    # We still use wrong password but check if it handles it correctly
    # If I had the correct password I would check for businesses list
    res = requests.post(f"{BASE_URL}/login", json={"email": "monica3214b@gmail.com", "password": "wrong"})
    print(f"Login Check (Wrong Pwd): {res.status_code} - {res.json()}")
    
    # Check if verify still works as expected
    # (requires token normally, but we are just checking if endpoint exists)
    res = requests.get(f"{BASE_URL}/verify")
    print(f"Verify Check (No Token): {res.status_code}")

except Exception as e:
    print(f"API Test Error: {e}")
