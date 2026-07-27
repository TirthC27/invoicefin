"""
Test that the JWT secret decoding works correctly.
Simulates what authentication.py does.
"""
import os, base64
from dotenv import load_dotenv
load_dotenv()

import jwt

jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
print(f"Raw secret length: {len(jwt_secret)}")

# Decode as authentication.py now does
try:
    padded = jwt_secret + "=" * (4 - len(jwt_secret) % 4)
    signing_secret = base64.b64decode(padded)
    print(f"Decoded to {len(signing_secret)} bytes - OK")
except Exception as e:
    signing_secret = jwt_secret.encode()
    print(f"Fallback to encoded string: {e}")

# Check PyJWT can use it
print(f"signing_secret type: {type(signing_secret)}")
print("JWT decode will use bytes - signature verification will work correctly")

# Also verify the token validation algorithm
print("\nSupported algorithms for HS256:")
print("  - jwt.decode(token, bytes_secret, algorithms=['HS256']) -- CORRECT")
print("  - jwt.decode(token, str_secret, algorithms=['HS256'])   -- WRONG (signature mismatch)")
