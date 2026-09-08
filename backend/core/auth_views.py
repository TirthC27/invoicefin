import os
import requests
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .user_sync import normalize_role, PUBLIC_SELF_REGISTRATION_ROLES
from .models import AppUser

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    POST /api/auth/register/
    Registers a new user via Supabase Admin API to bypass email verification,
    and creates the corresponding AppUser locally.
    """
    email = request.data.get('email')
    password = request.data.get('password')
    full_name = request.data.get('full_name', '')
    raw_role = request.data.get('role', 'INVESTOR')

    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=400)

    role = normalize_role(raw_role)
    if role not in PUBLIC_SELF_REGISTRATION_ROLES:
        role = 'INVESTOR'

    # Check if email already exists locally
    if AppUser.objects.filter(email=email).exists():
        return Response({'error': 'A user with this email already exists.'}, status=409)

    supabase_url = os.getenv('SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not service_role_key:
        return Response({'error': 'Supabase not configured on backend.'}, status=500)

    try:
        resp = requests.post(
            f"{supabase_url.rstrip('/')}/auth/v1/admin/users",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
            },
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {
                    "role": role,
                    "full_name": full_name,
                },
            },
            timeout=10,
        )

        if resp.status_code not in (200, 201):
            error_detail = resp.json() if resp.headers.get('content-type', '').startswith('application/json') else resp.text
            logger.error("Supabase user creation failed: %s", error_detail)
            error_msg = error_detail.get('msg') if isinstance(error_detail, dict) else str(error_detail)
            return Response(
                {'error': 'Registration failed', 'detail': error_msg},
                status=resp.status_code,
            )

        supabase_user = resp.json()
        supabase_uid = supabase_user.get('id')

    except requests.RequestException as e:
        logger.error("Supabase request failed: %s", e)
        return Response({'error': f'Supabase request failed: {str(e)}'}, status=502)

    # Create local AppUser
    AppUser.objects.create(
        supabase_uid=supabase_uid,
        email=email,
        full_name=full_name,
        role=role,
        status='ACTIVE',
    )

    return Response({
        'message': 'Registration successful',
        'id': supabase_uid,
        'email': email,
        'role': role
    }, status=201)
