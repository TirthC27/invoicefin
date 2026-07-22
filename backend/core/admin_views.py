import os
import string
import secrets
import logging
import requests
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .authentication import SupabaseJWTAuthentication, require_role
from .models import AppUser, LawFirm, RecoveryCase, Notification
from .role_serializers import (
    AppUserSerializer, LawFirmSerializer, CreateLawFirmSerializer,
    RecoveryCaseSerializer, AssignLawFirmSerializer,
)

logger = logging.getLogger(__name__)


def _generate_temp_password(length=12):
    """Generate a secure temporary password."""
    alphabet = string.ascii_letters + string.digits + '!@#$%'
    return ''.join(secrets.choice(alphabet) for _ in range(length))


# ═══════════════════════════════════════════════════════════
# ADMIN — Law Firm CRUD
# ═══════════════════════════════════════════════════════════

@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('ADMIN')
def create_law_firm(request):
    """
    POST /api/admin/law-firms
    Creates a Supabase auth user + local AppUser + LawFirm record.
    Returns the temp password ONCE in the response.
    """
    serializer = CreateLawFirmSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    email = data['business_email']
    temp_password = _generate_temp_password()

    # Check if email already exists locally
    if AppUser.objects.filter(email=email).exists():
        return Response({'error': 'A user with this email already exists.'}, status=409)

    # ── Create user in Supabase via Admin API ────────────
    supabase_url = os.getenv('SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not service_role_key:
        return Response({'error': 'Supabase not configured on backend.'}, status=500)

    try:
        resp = requests.post(
            f"{supabase_url}/auth/v1/admin/users",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
            },
            json={
                "email": email,
                "password": temp_password,
                "email_confirm": True,
                "user_metadata": {
                    "role": "LAW_FIRM",
                    "full_name": data['contact_person'],
                },
            },
            timeout=10,
        )

        if resp.status_code not in (200, 201):
            error_detail = resp.json() if resp.headers.get('content-type', '').startswith('application/json') else resp.text
            logger.error("Supabase user creation failed: %s", error_detail)
            return Response(
                {'error': 'Failed to create auth user.', 'detail': error_detail},
                status=resp.status_code,
            )

        supabase_user = resp.json()
        supabase_uid = supabase_user.get('id')

    except requests.RequestException as e:
        logger.error("Supabase request failed: %s", e)
        return Response({'error': f'Supabase request failed: {str(e)}'}, status=502)

    # ── Create local AppUser + LawFirm ───────────────────
    app_user = AppUser.objects.create(
        supabase_uid=supabase_uid,
        email=email,
        full_name=data['contact_person'],
        role='LAW_FIRM',
        status='ACTIVE',
    )

    law_firm = LawFirm.objects.create(
        user=app_user,
        firm_name=data['firm_name'],
        country=data['country'],
        contact_person=data['contact_person'],
        business_email=email,
        website=data.get('website', ''),
        phone=data.get('phone', ''),
    )

    return Response({
        'law_firm': LawFirmSerializer(law_firm).data,
        'temp_password': temp_password,
        'message': 'Law firm partner created successfully. Share the temp password securely.',
    }, status=201)


@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('ADMIN')
def list_law_firms(request):
    """GET /api/admin/law-firms — List all law firms."""
    law_firms = LawFirm.objects.select_related('user').all()
    serializer = LawFirmSerializer(law_firms, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('ADMIN')
def update_law_firm(request, pk):
    """PATCH /api/admin/law-firms/:id — Suspend/activate a law firm."""
    try:
        law_firm = LawFirm.objects.select_related('user').get(pk=pk)
    except LawFirm.DoesNotExist:
        return Response({'error': 'Law firm not found.'}, status=404)

    new_status = request.data.get('status')
    if new_status and new_status in ('ACTIVE', 'SUSPENDED'):
        law_firm.status = new_status
        law_firm.save()
        # Also sync the AppUser status
        law_firm.user.status = new_status
        law_firm.user.save()

    return Response(LawFirmSerializer(law_firm).data)


# ═══════════════════════════════════════════════════════════
# ADMIN — Recovery Cases
# ═══════════════════════════════════════════════════════════

@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('ADMIN')
def list_recovery_cases(request):
    """GET /api/admin/recovery-cases — List all recovery cases."""
    cases = RecoveryCase.objects.select_related(
        'pool', 'law_firm', 'exporter', 'investor'
    ).all()
    serializer = RecoveryCaseSerializer(cases, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('ADMIN')
def create_recovery_case(request):
    """POST /api/admin/recovery-cases — Create a new recovery case."""
    serializer = RecoveryCaseSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    serializer.save()
    return Response(serializer.data, status=201)


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('ADMIN')
def assign_law_firm_to_case(request, pk):
    """POST /api/admin/recovery-cases/:id/assign — Assign a law firm to a case."""
    serializer = AssignLawFirmSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    try:
        case = RecoveryCase.objects.get(pk=pk)
    except RecoveryCase.DoesNotExist:
        return Response({'error': 'Recovery case not found.'}, status=404)

    try:
        law_firm = LawFirm.objects.get(pk=serializer.validated_data['law_firm_id'], status='ACTIVE')
    except LawFirm.DoesNotExist:
        return Response({'error': 'Active law firm not found.'}, status=404)

    case.law_firm = law_firm
    case.assigned_date = timezone.now()
    case.save()

    # Notify the law firm
    Notification.objects.create(
        user=law_firm.user,
        message=f"You have been assigned to recovery case #{case.id} for Pool #{case.pool.contract_pool_id}.",
        link=f"/lawfirm/cases/{case.id}",
    )

    return Response(RecoveryCaseSerializer(case).data)


# ═══════════════════════════════════════════════════════════
# ADMIN — Users
# ═══════════════════════════════════════════════════════════

@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('ADMIN')
def list_users(request):
    """GET /api/admin/users — List all local AppUsers."""
    role_filter = request.query_params.get('role')
    users = AppUser.objects.all()
    if role_filter:
        users = users.filter(role=role_filter.upper())
    serializer = AppUserSerializer(users, many=True)
    return Response(serializer.data)
