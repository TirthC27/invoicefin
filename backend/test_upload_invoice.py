import os, requests, json
from dotenv import load_dotenv
load_dotenv()

url = os.getenv('SUPABASE_URL').rstrip('/')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Login as exporter
login_res = requests.post(
    f'{url}/auth/v1/token?grant_type=password',
    headers={'apikey': key, 'Content-Type': 'application/json'},
    json={'email': 'test_exporter@invoicefi.local', 'password': 'TestPassword123!'}
)

if not login_res.ok:
    print('Failed to login as exporter:', login_res.text)
    # Set password for test_exporter if needed
    user_id = 'test-uid-alignment-2'
    # Find user in Supabase or Django
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'invoicefin_backend.settings')
    django.setup()
    from core.models import AppUser
    exp = AppUser.objects.filter(role='EXPORTER').first()
    print('Exporter in DB:', exp.email if exp else 'None', exp.supabase_uid if exp else 'None')
    if exp:
        # Update password for exp
        res = requests.put(
            f'{url}/auth/v1/admin/users/{exp.supabase_uid}',
            headers={'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'password': 'TestPassword123!'}
        )
        print('Update password res:', res.status_code)
        login_res = requests.post(
            f'{url}/auth/v1/token?grant_type=password',
            headers={'apikey': key, 'Content-Type': 'application/json'},
            json={'email': exp.email, 'password': 'TestPassword123!'}
        )

if login_res.ok:
    token = login_res.json()['access_token']
    print('Logged in! Access token acquired.')

    # Try uploading an invoice via POST /api/exporter/invoices/
    payload = {
        'invoice_number': 'INV-TEST-999',
        'buyer_name': 'Global Logistics Inc',
        'buyer_company': 'Global Freight Co',
        'amount': '15000.00',
        'currency': 'USD',
        'issue_date': '2026-07-20',
        'due_date': '2026-08-30',
        'po_number': 'PO-98765',
        'country': 'United States',
        'description': 'Export shipment of industrial components',
    }

    res = requests.post(
        'http://127.0.0.1:8000/api/exporter/invoices/',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json=payload
    )

    print('Upload response status:', res.status_code)
    print('Upload response content:', res.text)
else:
    print('Could not log in as exporter:', login_res.text)
