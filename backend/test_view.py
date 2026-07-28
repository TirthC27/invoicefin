import os, sys, django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'invoicefin_backend.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from core.views import create_pool_from_invoice
from core.models import Invoice, AppUser, Pool

print("Mocking an exporter user and invoice...")
exporter, _ = AppUser.objects.get_or_create(supabase_uid="mock_exporter_1", defaults={"role": "EXPORTER"})
invoice = Invoice.objects.create(
    exporter=exporter,
    buyer_name="Test Buyer",
    invoice_amount=5.00,
    due_date="2026-12-31",
    status="VERIFIED"
)
print("Created Invoice ID:", invoice.id)

factory = RequestFactory()
request = factory.post(f'/api/exporter/invoices/{invoice.id}/create-pool/', {
    'name': 'Test Invoice Pool via View',
    'apy': '14.50',
    'duration_days': 60
}, content_type='application/json')
request.user = type('MockUser', (), {'id': exporter.supabase_uid})() # Mock Supabase user

print("Calling create_pool_from_invoice view...")
try:
    response = create_pool_from_invoice(request, invoice.id)
    print("Response Status Code:", response.status_code)
    print("Response Data:", response.data)
except Exception as e:
    import traceback
    traceback.print_exc()

# Cleanup
invoice.delete()
