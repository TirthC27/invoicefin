import logging
import os

import requests

logger = logging.getLogger(__name__)

ROLE_ALIASES = {
    "investor": "INVESTOR",
    "exporter": "EXPORTER",
    "law_firm": "LAW_FIRM",
    "lawfirm": "LAW_FIRM",
    "admin": "ADMIN",
}
APP_ROLES = {"INVESTOR", "EXPORTER", "LAW_FIRM", "ADMIN"}
PRIVILEGED_ROLES = {"ADMIN", "LAW_FIRM", "EXPORTER"}
SUPABASE_SYSTEM_ROLES = {"anon", "authenticated", "service_role", "supabase_admin"}


def normalize_role(value):
    if not value:
        return None
    normalized = str(value).strip().lower().replace("-", "_").replace(" ", "_")
    if normalized in SUPABASE_SYSTEM_ROLES:
        return None
    role = ROLE_ALIASES.get(normalized, normalized.upper())
    return role if role in APP_ROLES else None


def normalize_status(value):
    status = str(value or "ACTIVE").strip().upper()
    return "SUSPENDED" if status == "SUSPENDED" else "ACTIVE"


def role_from_claims(claims):
    metadata = claims.get("user_metadata") or {}
    app_metadata = claims.get("app_metadata") or {}
    return (
        normalize_role(metadata.get("role"))
        or normalize_role(app_metadata.get("role"))
        or normalize_role(claims.get("app_role"))
    )


def full_name_from_claims(claims):
    metadata = claims.get("user_metadata") or {}
    return (
        metadata.get("full_name")
        or metadata.get("name")
        or claims.get("name")
        or ""
    )


def fetch_supabase_profile(user_id):
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key or not user_id:
        return None

    try:
        response = requests.get(
            f"{supabase_url.rstrip('/')}/rest/v1/profiles",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
            },
            params={"id": f"eq.{user_id}", "select": "*"},
            timeout=5,
        )
        if response.ok and response.json():
            return response.json()[0]
        if not response.ok:
            logger.warning("Supabase profile lookup failed for user=%s status=%s", user_id, response.status_code)
    except requests.RequestException as exc:
        logger.warning("Supabase profile lookup request failed for user=%s: %s", user_id, exc)
    except ValueError:
        logger.warning("Supabase profile lookup returned non-JSON response for user=%s", user_id)
    return None


PUBLIC_SELF_REGISTRATION_ROLES = {"INVESTOR", "EXPORTER"}


def resolve_user_identity(claims, profile=None):
    from .models import AppUser

    user_id = claims.get("sub")
    email = claims.get("email") or ""

    try:
        app_user = AppUser.objects.get(supabase_uid=user_id)
        role = app_user.role
        status = app_user.status
        full_name = app_user.full_name
    except AppUser.DoesNotExist:
        app_user = None
        profile_role = normalize_role((profile or {}).get("role"))
        claim_role = role_from_claims(claims)
        role = profile_role or claim_role or "INVESTOR"
        # Security: restrict public self-registration metadata to INVESTOR or EXPORTER
        if role not in PUBLIC_SELF_REGISTRATION_ROLES:
            logger.warning(
                "Rejected unauthorized public self-registration role=%s for user=%s",
                role, user_id,
            )
            role = "INVESTOR"
        status = normalize_status((profile or {}).get("status"))
        full_name = (profile or {}).get("full_name") or full_name_from_claims(claims)


    if profile and normalize_status(profile.get("status")) == "SUSPENDED":
        status = "SUSPENDED"

    return {
        "id": user_id,
        "email": email,
        "role": role,
        "status": status,
        "full_name": full_name or "",
        "profile": profile,
        "app_user": app_user,
    }


def sync_app_user_from_identity(identity, explicit_profile=False):
    from .models import AppUser

    user_id = identity.get("id")
    if not user_id:
        return None

    defaults = {
        "email": identity.get("email") or "",
        "full_name": identity.get("full_name") or "",
        "role": identity.get("role") or "INVESTOR",
        "status": identity.get("status") or "ACTIVE",
    }
    app_user, created = AppUser.objects.get_or_create(
        supabase_uid=user_id,
        defaults=defaults,
    )
    if created:
        return app_user

    updates = {}
    if defaults["email"] and app_user.email != defaults["email"]:
        updates["email"] = defaults["email"]
    if defaults["full_name"] and app_user.full_name != defaults["full_name"]:
        updates["full_name"] = defaults["full_name"]
    if defaults["status"] == "SUSPENDED" and app_user.status != "SUSPENDED":
        updates["status"] = "SUSPENDED"
    elif explicit_profile and app_user.status != defaults["status"]:
        updates["status"] = defaults["status"]

    incoming_role = defaults["role"]
    if incoming_role and app_user.role != incoming_role:
        replacing_privileged_with_default = (
            app_user.role in PRIVILEGED_ROLES
            and incoming_role == "INVESTOR"
            and not explicit_profile
        )
        if not replacing_privileged_with_default:
            updates["role"] = incoming_role

    if updates:
        for field, value in updates.items():
            setattr(app_user, field, value)
        app_user.save(update_fields=list(updates.keys()))
    return app_user
