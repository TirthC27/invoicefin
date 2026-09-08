"""
kyc_views.py — KYC submission and status endpoints.

POST /api/kyc/submit/   — Submit KYC application (investors only)
GET  /api/kyc/status/   — Get current KYC status
"""
import logging
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .authentication import SupabaseJWTAuthentication
from .models import AppUser, KYCApplication

logger = logging.getLogger(__name__)


def _get_app_user(request):
    try:
        return AppUser.objects.get(supabase_uid=request.user.id)
    except AppUser.DoesNotExist:
        return None


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def submit_kyc(request):
    """
    POST /api/kyc/submit/
    Creates a KYC application for the authenticated investor.
    In demo mode, auto-approves after 2 minutes.
    """
    app_user = getattr(request.user, 'app_user', None) or _get_app_user(request)
    if not app_user:
        return Response({'error': 'User account not found.'}, status=404)

    # Already an exporter? No need
    if app_user.can_export or app_user.role in ('EXPORTER', 'ADMIN'):
        return Response({
            'status': 'APPROVED',
            'message': 'You already have Exporter capabilities.',
            'can_export': True,
        })

    # Check existing application
    existing = KYCApplication.objects.filter(user=app_user).first()
    if existing:
        return Response({
            'status': existing.status,
            'submitted_at': existing.submitted_at,
            'auto_approve_at': existing.auto_approve_at,
            'can_export': app_user.can_export,
        })

    # Create new KYC application — always use 2-min auto-approve for demo
    auto_approve_at = timezone.now() + timedelta(minutes=2)
    kyc = KYCApplication.objects.create(
        user=app_user,
        status='PENDING',
        auto_approve_at=auto_approve_at,
    )

    return Response({
        'status': 'PENDING',
        'submitted_at': kyc.submitted_at,
        'auto_approve_at': kyc.auto_approve_at,
        'message': 'KYC submitted successfully. Auto-approval in ~2 minutes.',
        'can_export': False,
    }, status=201)


@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_kyc_status(request):
    """
    GET /api/kyc/status/
    Returns the current KYC application status for the authenticated user.
    """
    app_user = getattr(request.user, 'app_user', None) or _get_app_user(request)
    if not app_user:
        return Response({'error': 'User account not found.'}, status=404)

    # Already has exporter via role
    if app_user.role in ('EXPORTER', 'ADMIN', 'LAW_FIRM'):
        return Response({
            'status': 'APPROVED',
            'can_export': True,
        })

    if app_user.can_export:
        return Response({
            'status': 'APPROVED',
            'can_export': True,
        })

    kyc = KYCApplication.objects.filter(user=app_user).first()
    if not kyc:
        return Response({
            'status': None,
            'can_export': False,
        })

    now = timezone.now()
    seconds_remaining = None
    if kyc.auto_approve_at and kyc.status == 'PENDING':
        diff = (kyc.auto_approve_at - now).total_seconds()
        seconds_remaining = max(0, int(diff))

    return Response({
        'status': kyc.status,
        'submitted_at': kyc.submitted_at,
        'auto_approve_at': kyc.auto_approve_at,
        'seconds_remaining': seconds_remaining,
        'can_export': app_user.can_export,
    })
