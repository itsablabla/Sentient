"""Definitive test: verify that the JWT secret in .env can decode Supabase-signed JWTs."""
import os, base64
from dotenv import load_dotenv
from jose import jwt

load_dotenv('.env')

secret = os.getenv("SUPABASE_JWT_SECRET")
anon_key = os.getenv("SUPABASE_ANON_KEY")
service_key = os.getenv("SUPABASE_SERVICE_KEY")

print(f"JWT Secret: {secret[:15]}...{secret[-10:]}")
print(f"Anon Key:   {anon_key[:30]}...")
print(f"Service Key:{service_key[:30]}...")
print()

# The anon key and service key are JWTs signed with the same JWT secret.
# If we can decode them, the secret is correct.

for name, token in [("ANON_KEY", anon_key), ("SERVICE_KEY", service_key)]:
    print(f"--- Testing {name} ---")
    
    # Method 1: base64-decoded secret
    try:
        decoded = jwt.decode(token, base64.b64decode(secret), algorithms=["HS256"], options={"verify_aud": False})
        print(f"  ✅ base64-decoded: {decoded}")
    except Exception as e:
        print(f"  ❌ base64-decoded: {e}")
    
    # Method 2: raw string secret
    try:
        decoded = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
        print(f"  ✅ raw string:     {decoded}")
    except Exception as e:
        print(f"  ❌ raw string:     {e}")
    
    print()
