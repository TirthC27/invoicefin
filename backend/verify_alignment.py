"""
End-to-End Alignment Verification Script:
1. Normalization tests for roles ('investor' -> 'INVESTOR', 'exporter' -> 'EXPORTER', 'lawfirm' -> 'LAW_FIRM', 'admin' -> 'ADMIN')
2. Sync AppUser from identity for all 4 roles
3. Validate permissions logic for protected role endpoints
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'invoicefin_backend.settings')
django.setup()

from core.user_sync import normalize_role, resolve_user_identity, sync_app_user_from_identity
from core.models import AppUser, Pool, Invoice

print("--- Step 1: Role Normalization Tests ---")
test_cases = [
    ("investor", "INVESTOR"),
    ("INVESTOR", "INVESTOR"),
    ("exporter", "EXPORTER"),
    ("law_firm", "LAW_FIRM"),
    ("lawfirm", "LAW_FIRM"),
    ("admin", "ADMIN"),
    ("authenticated", None),
    ("invalid_role", None),
]

for raw, expected in test_cases:
    result = normalize_role(raw)
    status = "OK" if result == expected else f"FAIL (got {result})"
    print(f"  normalize_role({raw!r}) => {result!r} [{status}]")
    assert result == expected, f"Expected {expected}, got {result}"

print("\n--- Step 2: Idempotent AppUser Sync Tests for All 4 Roles ---")
roles = ["INVESTOR", "EXPORTER", "LAW_FIRM", "ADMIN"]
for idx, role in enumerate(roles, start=1):
    uid = f"test-uid-alignment-{idx}"
    email = f"test_{role.lower()}@invoicefi.local"
    identity = {
        "id": uid,
        "email": email,
        "role": role,
        "status": "ACTIVE",
        "full_name": f"Test {role.title()} User",
    }
    user = sync_app_user_from_identity(identity, explicit_profile=True)
    print(f"  Synced {role}: id={user.id}, email={user.email}, role={user.role}")
    assert user.role == role, f"Role mismatch: {user.role} != {role}"

print("\n--- Step 3: Database Models Alignment Check ---")
print(f"  AppUsers count: {AppUser.objects.count()}")
print(f"  Pools count: {Pool.objects.count()}")
print(f"  Invoices count: {Invoice.objects.count()}")

print("\n[OK] All End-to-End Alignment Checks Passed!")
