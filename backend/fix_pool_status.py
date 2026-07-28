"""
Fix data inconsistency: Pool.is_settled=True but status='open'
is_investable property checks both is_settled AND status=='open'.
When is_settled=True, the pool is settled - set status='settled' for clarity.
"""
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'invoicefin_backend.settings')
django.setup()

from core.models import Pool

# Fix: any pool with is_settled=True should have status='settled'
fixed = Pool.objects.filter(is_settled=True).exclude(status='settled').update(status='settled')
print(f'Fixed {fixed} pool(s) with is_settled=True + non-settled status -> now settled')

# Verify
for p in Pool.objects.all().values('id', 'contract_pool_id', 'status', 'is_settled', 'name'):
    investable = not p['is_settled'] and p['status'] == 'open'
    print(f"  Pool {p['id']} ({p['name']}): settled={p['is_settled']} status={p['status']} investable={investable}")
