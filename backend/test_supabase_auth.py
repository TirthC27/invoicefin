import os
import requests
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
anon_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print("SUPABASE_URL:", supabase_url)

# Test fetching auth config or creating an auth token via signup/login
url = f"{supabase_url.rstrip('/')}/auth/v1/token?grant_type=password"
print("Auth URL:", url)
