import os
import jwt
import functools
from rest_framework import authentication, exceptions
from rest_framework.response import Response


# ── Simple user object attached to request.user ──────────
class SimpleUser:
    """
    Lightweight user object built from Supabase JWT claims,
    optionally enriched with local AppUser data.
    """
    def __init__(self, uid, email, role='INVESTOR', status='ACTIVE', app_user=None):
        self.id = uid               # Supabase auth.users.id (UUID string)
        self.email = email
        self.role = role            # INVESTOR | EXPORTER | LAW_FIRM | ADMIN
        self.status = status        # ACTIVE | SUSPENDED
        self.app_user = app_user    # Local AppUser model instance (or None)
        self.is_authenticated = True


# ── Supabase JWT Authentication ──────────────────────────
class SupabaseJWTAuthentication(authentication.BaseAuthentication):
    """
    Validates Supabase JWT tokens (HS256 or asymmetric).
    If a local AppUser record exists for the user's supabase_uid,
    the role and status are read from that record instead of JWT claims.
    """

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]

        try:
            # Peek at the token header to determine the algorithm
            unverified_header = jwt.get_unverified_header(token)
            alg = unverified_header.get('alg', 'HS256')

            if alg.startswith('ES') or alg.startswith('RS') or alg.startswith('PS'):
                # Asymmetric algorithm — fetch public key from Supabase JWKS
                supabase_url = os.getenv('SUPABASE_URL', '')
                jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"

                from jwt import PyJWKClient
                jwk_client = PyJWKClient(jwks_url)
                signing_key = jwk_client.get_signing_key_from_jwt(token)

                decoded = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=[alg],
                    audience="authenticated",
                )
            else:
                # Symmetric algorithm (HS256, HS384, etc.)
                jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
                if not jwt_secret:
                    raise exceptions.AuthenticationFailed('SUPABASE_JWT_SECRET not configured.')

                decoded = jwt.decode(
                    token, jwt_secret,
                    algorithms=["HS256", "HS384", "HS512"],
                    audience="authenticated",
                )

            user_id = decoded.get('sub')
            email = decoded.get('email', '')

            # Try to enrich with local AppUser data
            role = decoded.get('role', 'INVESTOR').upper()
            status = 'ACTIVE'
            app_user = None

            try:
                from core.models import AppUser
                app_user = AppUser.objects.get(supabase_uid=user_id)
                role = app_user.role
                status = app_user.status
            except Exception:
                pass  # No local record — fall back to JWT claims

            # Reject suspended users
            if status == 'SUSPENDED':
                raise exceptions.AuthenticationFailed('Your account has been suspended.')

            user = SimpleUser(user_id, email, role, status, app_user)
            return (user, token)

        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired.')
        except jwt.DecodeError:
            raise exceptions.AuthenticationFailed('Invalid token.')
        except exceptions.AuthenticationFailed:
            raise
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Authentication failed: {str(e)}')


# ── Role-based access decorator ─────────────────────────
def require_role(*allowed_roles):
    """
    Decorator for DRF function-based views that restricts access
    to users with one of the specified roles.

    Usage:
        @api_view(['GET'])
        @authentication_classes([SupabaseJWTAuthentication])
        @permission_classes([IsAuthenticated])
        @require_role('ADMIN')
        def admin_only_view(request):
            ...

        @require_role('ADMIN', 'LAW_FIRM')
        def multi_role_view(request):
            ...
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapped(request, *args, **kwargs):
            user_role = getattr(request.user, 'role', None)
            if user_role not in allowed_roles:
                return Response(
                    {'error': f'Access denied. Required role: {", ".join(allowed_roles)}'},
                    status=403,
                )
            return view_func(request, *args, **kwargs)
        return wrapped
    return decorator
