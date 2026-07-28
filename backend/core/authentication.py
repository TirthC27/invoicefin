import functools
import logging
import os

import jwt
from rest_framework import authentication, exceptions
from rest_framework.response import Response

from .user_sync import fetch_supabase_profile, resolve_user_identity

logger = logging.getLogger(__name__)


class SimpleUser:
    """
    Lightweight user object built from a validated Supabase JWT, optionally
    enriched with local AppUser/profile data.
    """

    def __init__(self, uid, email, role="INVESTOR", status="ACTIVE", full_name="", profile=None, app_user=None):
        self.id = uid
        self.email = email
        self.role = role
        self.status = status
        self.full_name = full_name
        self.profile = profile
        self.app_user = app_user
        self.is_authenticated = True


class SupabaseJWTAuthentication(authentication.BaseAuthentication):
    """
    Validates current Supabase JWT tokens and maps them to InvoiceFi app roles.
    Supabase's standard JWT role=authenticated is intentionally ignored as an
    app authorization role.

    DRF convention:
      - Return None  → no credentials present; fall through to permission checks.
      - Raise        → credentials present but invalid; stop the request.
    """

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION")
        if not auth_header:
            return None
            
        if not auth_header.startswith("Bearer "):
            logger.info("Supabase auth failed: malformed Bearer token path=%s", request.path)
            raise exceptions.AuthenticationFailed("Malformed Authorization header. Expected Bearer token.")

        parts = auth_header.split()
        if len(parts) != 2 or not parts[1]:
            logger.info("Supabase auth failed: malformed Bearer token path=%s", request.path)
            raise exceptions.AuthenticationFailed("Malformed Authorization header. Expected Bearer token.")
        token = parts[1]

        try:
            unverified_header = jwt.get_unverified_header(token)
            alg = unverified_header.get("alg", "HS256")
            supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
            issuer = f"{supabase_url}/auth/v1" if supabase_url else None
            decode_kwargs = {
                "algorithms": [alg] if alg.startswith(("ES", "RS", "PS")) else ["HS256", "HS384", "HS512"],
                "audience": "authenticated",
                "options": {"verify_iss": bool(issuer)},
            }
            if issuer:
                decode_kwargs["issuer"] = issuer

            if alg.startswith(("ES", "RS", "PS")):
                if not supabase_url:
                    raise exceptions.AuthenticationFailed("SUPABASE_URL not configured.")
                from jwt import PyJWKClient

                jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
                signing_key = PyJWKClient(jwks_url).get_signing_key_from_jwt(token)
                decoded = jwt.decode(token, signing_key.key, **decode_kwargs)
            else:
                jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
                if not jwt_secret:
                    raise exceptions.AuthenticationFailed(
                        "SUPABASE_JWT_SECRET not configured on the backend."
                    )
                # Supabase JWT secrets are base64-encoded in the dashboard.
                # PyJWT needs the raw bytes for HS256 verification —
                # passing the base64 string causes InvalidSignatureError.
                import base64 as _b64
                try:
                    # Add padding if needed, then decode
                    padded = jwt_secret + "=" * (4 - len(jwt_secret) % 4)
                    signing_secret = _b64.b64decode(padded)
                except Exception:
                    # Not valid base64 — treat as a plain-text secret (legacy)
                    signing_secret = jwt_secret.encode() if isinstance(jwt_secret, str) else jwt_secret
                decoded = jwt.decode(token, signing_secret, **decode_kwargs)

            user_id = decoded.get("sub")
            if not user_id:
                logger.info("Supabase auth failed: token missing subject path=%s", request.path)
                raise exceptions.AuthenticationFailed("Token missing subject.")

            profile = fetch_supabase_profile(user_id)
            identity = resolve_user_identity(decoded, profile)

            if identity["status"] == "SUSPENDED":
                logger.info("Supabase auth failed: suspended user user=%s path=%s", user_id, request.path)
                raise exceptions.AuthenticationFailed("Your account has been suspended.")

            # Guarantee an AppUser record always exists for every authenticated request
            app_user = identity.get("app_user")
            if not app_user:
                from .user_sync import sync_app_user_from_identity
                app_user = sync_app_user_from_identity(identity, explicit_profile=bool(profile))
                identity["app_user"] = app_user

            user = SimpleUser(
                identity["id"],
                identity["email"],
                identity["role"],
                identity["status"],
                identity["full_name"],
                identity["profile"],
                identity["app_user"],
            )
            logger.debug(
                "Supabase auth OK: user=%s role=%s path=%s",
                user_id, identity["role"], request.path,
            )
            return user, token

        except jwt.ExpiredSignatureError:
            logger.info("Supabase auth failed: expired token path=%s", request.path)
            raise exceptions.AuthenticationFailed("Token has expired. Please sign in again.")
        except jwt.InvalidSignatureError:
            logger.info("Supabase auth failed: invalid signature path=%s", request.path)
            raise exceptions.AuthenticationFailed("Invalid token signature.")
        except (jwt.InvalidAudienceError, jwt.InvalidIssuerError) as exc:
            logger.info("Supabase auth failed: audience/issuer mismatch path=%s detail=%s", request.path, exc)
            raise exceptions.AuthenticationFailed("Token audience or issuer is invalid.")
        except jwt.DecodeError:
            logger.info("Supabase auth failed: invalid token path=%s", request.path)
            raise exceptions.AuthenticationFailed("Invalid token.")
        except exceptions.AuthenticationFailed:
            raise
        except Exception as exc:
            logger.exception("Supabase auth failed unexpectedly path=%s", request.path)
            raise exceptions.AuthenticationFailed(f"Authentication error: {exc}")

    def authenticate_header(self, request):
        """Return WWW-Authenticate header so DRF sends 401 (not 403) for unauthenticated requests."""
        return 'Bearer realm="invoicefin"'


def require_role(*allowed_roles):
    """Restrict a DRF function view to one or more InvoiceFi app roles."""

    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapped(request, *args, **kwargs):
            user_role = getattr(request.user, "role", None)
            if user_role not in allowed_roles:
                logger.info(
                    "Role denied: user=%s role=%s allowed=%s path=%s",
                    getattr(request.user, "id", None),
                    user_role,
                    allowed_roles,
                    getattr(request, "path", ""),
                )
                return Response(
                    {
                        "error": f"Access denied. Required role: {', '.join(allowed_roles)}",
                        "your_role": user_role,
                    },
                    status=403,
                )
            return view_func(request, *args, **kwargs)
        return wrapped
    return decorator
