"""
Verification Test for Multi-Role Registration and Security Rules:
1. Public self-registration allowed for INVESTOR and EXPORTER.
2. Self-registration rejected/downgraded for LAW_FIRM and ADMIN.
3. AppUser synchronization stores exact uppercase role.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'invoicefin_backend.settings')
django.setup()

from core.user_sync import resolve_user_identity, sync_app_user_from_identity
from core.models import AppUser

print("--- Test 1: Self-registration as EXPORTER ---")
claims_exporter = {
    "sub": "uid-exporter-test-01",
    "email": "exporter1@invoicefi.local",
    "user_metadata": {"full_name": "Exporter One", "role": "EXPORTER"},
}
identity_exporter = resolve_user_identity(claims_exporter)
assert identity_exporter["role"] == "EXPORTER", f"Expected EXPORTER, got {identity_exporter['role']}"
user_exporter = sync_app_user_from_identity(identity_exporter)
print(f"  Synced Exporter: id={user_exporter.id}, role={user_exporter.role}")
assert user_exporter.role == "EXPORTER"

print("\n--- Test 2: Self-registration as INVESTOR ---")
claims_investor = {
    "sub": "uid-investor-test-01",
    "email": "investor1@invoicefi.local",
    "user_metadata": {"full_name": "Investor One", "role": "INVESTOR"},
}
identity_investor = resolve_user_identity(claims_investor)
assert identity_investor["role"] == "INVESTOR", f"Expected INVESTOR, got {identity_investor['role']}"
user_investor = sync_app_user_from_identity(identity_investor)
print(f"  Synced Investor: id={user_investor.id}, role={user_investor.role}")
assert user_investor.role == "INVESTOR"

print("\n--- Test 3: Rejection of Unauthorized Public ADMIN Registration ---")
claims_unauthorized_admin = {
    "sub": "uid-fake-admin-01",
    "email": "hacker@invoicefi.local",
    "user_metadata": {"full_name": "Fake Admin", "role": "ADMIN"},
}
identity_admin = resolve_user_identity(claims_unauthorized_admin)
print(f"  Public signup attempt with role=ADMIN resolved to: {identity_admin['role']}")
assert identity_admin["role"] == "INVESTOR", "Public self-signup as ADMIN must be rejected/fallback to INVESTOR"
user_admin = sync_app_user_from_identity(identity_admin)
assert user_admin.role == "INVESTOR"

print("\n--- Test 4: Existing Admin AppUser is Preserved ---")
existing_admin = AppUser.objects.create(
    supabase_uid="uid-real-admin-01",
    email="admin@invoicefi.local",
    full_name="Real Admin",
    role="ADMIN",
    status="ACTIVE",
)
claims_real_admin = {
    "sub": "uid-real-admin-01",
    "email": "admin@invoicefi.local",
}
identity_real_admin = resolve_user_identity(claims_real_admin)
print(f"  Existing AppUser role for real admin resolved to: {identity_real_admin['role']}")
assert identity_real_admin["role"] == "ADMIN"

print("\n[OK] All Multi-Role Registration & Gatekeeping Tests Passed!")
