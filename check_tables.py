import os
import requests
from dotenv import load_dotenv

load_dotenv('backend/.env')

supabase_url = os.getenv('SUPABASE_URL')
service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

headers = {
    'apikey': service_key,
    'Authorization': f'Bearer {service_key}',
    'Content-Type': 'application/json'
}

tables = [
    'pools', 'investments', 'transactions', 'portfolios', 'app_users',
    'law_firms', 'recovery_cases', 'recovery_events', 'notifications',
    'profiles', 'invoices', 'invoice_pools', 'upload_history'
]

print('Checking Supabase tables...')
for table in tables:
    url = f'{supabase_url}/rest/v1/{table}?limit=1'
    resp = requests.get(url, headers=headers)
    if resp.status_code == 200:
        print(f'[OK] {table} exists (status 200)')
    else:
        print(f'[MISSING] {table} missing or error (status {resp.status_code}): {resp.text}')
