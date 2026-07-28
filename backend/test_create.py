import os, sys, django
from decimal import Decimal
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'invoicefin_backend.settings')
django.setup()

from core.services.blockchain_service import create_pool_on_chain

try:
    print("Testing create_pool_on_chain...")
    result = create_pool_on_chain(
        name="Test Diagnostic Pool",
        apy_bps=1400,
        duration_days=90,
        total_size_matic=Decimal("1.0"),
    )
    print("SUCCESS! Created Pool:", result)
except Exception as e:
    import traceback
    print("FAILURE in create_pool_on_chain:")
    traceback.print_exc()
