import logging
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .authentication import SupabaseJWTAuthentication, require_role
from .models import AppUser, LawFirm, RecoveryCase, RecoveryEvent, Notification
from .role_serializers import (
    RecoveryCaseSerializer, RecoveryEventSerializer,
    CreateRecoveryEventSerializer,
)

logger = logging.getLogger(__name__)


def _get_law_firm_for_user(user):
    """
    Given a request.user (SimpleUser), find the LawFirm
    associated with the user's supabase_uid.
    Returns (law_firm, error_response) tuple.
    """
    try:
        app_user = AppUser.objects.get(supabase_uid=user.id)
        law_firm = LawFirm.objects.get(user=app_user)
        return law_firm, None
    except AppUser.DoesNotExist:
        return None, Response({'error': 'User profile not found.'}, status=404)
    except LawFirm.DoesNotExist:
        return None, Response({'error': 'No law firm profile linked to this account.'}, status=404)


def _notify_stakeholders(case, event, exclude_user=None):
    """
    Create notification records for the investor, exporter,
    and all admins when a recovery event is created.
    """
    message = f"Recovery Case #{case.id}: {event.get_event_type_display()}"
    if event.notes:
        message += f" — {event.notes[:100]}"

    recipients = set()

    # Notify investor and exporter
    if case.investor_id:
        recipients.add(case.investor_id)
    if case.exporter_id:
        recipients.add(case.exporter_id)

    # Notify all admins
    admin_ids = list(
        AppUser.objects.filter(role='ADMIN', status='ACTIVE').values_list('id', flat=True)
    )
    recipients.update(admin_ids)

    # Remove the user who triggered the event
    if exclude_user:
        try:
            exclude_app_user = AppUser.objects.get(supabase_uid=exclude_user.id)
            recipients.discard(exclude_app_user.id)
        except AppUser.DoesNotExist:
            pass

    notifications = [
        Notification(
            user_id=uid,
            message=message,
            link=f"/lawfirm/cases/{case.id}" if AppUser.objects.filter(id=uid, role='LAW_FIRM').exists()
                  else f"/admin/recovery-cases",
        )
        for uid in recipients
    ]
    Notification.objects.bulk_create(notifications)


# ═══════════════════════════════════════════════════════════
# LAW FIRM — Assigned Cases
# ═══════════════════════════════════════════════════════════

@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('LAW_FIRM')
def list_assigned_cases(request):
    """
    GET /api/lawfirm/cases
    List all recovery cases assigned to this law firm.
    Scoped by the logged-in user's law firm.
    """
    law_firm, err = _get_law_firm_for_user(request.user)
    if err:
        return err

    cases = RecoveryCase.objects.filter(
        law_firm=law_firm
    ).select_related('pool', 'law_firm', 'exporter', 'investor')

    serializer = RecoveryCaseSerializer(cases, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('LAW_FIRM')
def get_case_detail(request, pk):
    """
    GET /api/lawfirm/cases/:id
    Detailed view of a single case including timeline events.
    Scoped: law firm can only view its own cases.
    """
    law_firm, err = _get_law_firm_for_user(request.user)
    if err:
        return err

    try:
        case = RecoveryCase.objects.select_related(
            'pool', 'law_firm', 'exporter', 'investor'
        ).get(pk=pk, law_firm=law_firm)
    except RecoveryCase.DoesNotExist:
        return Response({'error': 'Case not found or not assigned to your firm.'}, status=404)

    events = RecoveryEvent.objects.filter(
        recovery_case=case
    ).select_related('created_by').order_by('created_at')

    return Response({
        'case': RecoveryCaseSerializer(case).data,
        'events': RecoveryEventSerializer(events, many=True).data,
    })


# ═══════════════════════════════════════════════════════════
# LAW FIRM — Recovery Events (Timeline Actions)
# ═══════════════════════════════════════════════════════════

# Map event types to resulting recovery stage transitions
STAGE_TRANSITIONS = {
    'LEGAL_NOTICE_SENT': 'LEGAL_NOTICE_SENT',
    'NEGOTIATION_STARTED': 'NEGOTIATION',
    'SETTLEMENT_RECORDED': 'SETTLEMENT',
    'PARTIAL_RECOVERY': 'SETTLEMENT',
    'FULL_RECOVERY': 'RECOVERED',
    'CASE_CLOSED': 'CLOSED',
}


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('LAW_FIRM')
def create_recovery_event(request, pk):
    """
    POST /api/lawfirm/cases/:id/events
    Create a recovery event (timeline action) on a case.
    Automatically advances the case stage.
    """
    law_firm, err = _get_law_firm_for_user(request.user)
    if err:
        return err

    try:
        case = RecoveryCase.objects.get(pk=pk, law_firm=law_firm)
    except RecoveryCase.DoesNotExist:
        return Response({'error': 'Case not found or not assigned to your firm.'}, status=404)

    serializer = CreateRecoveryEventSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data

    # Get the AppUser for created_by
    try:
        app_user = AppUser.objects.get(supabase_uid=request.user.id)
    except AppUser.DoesNotExist:
        app_user = None

    event = RecoveryEvent.objects.create(
        recovery_case=case,
        event_type=data['event_type'],
        notes=data.get('notes', ''),
        document_url=data.get('document_url') or None,
        created_by=app_user,
    )

    # Advance case stage
    new_stage = STAGE_TRANSITIONS.get(data['event_type'])
    if new_stage:
        case.recovery_stage = new_stage
        case.updated_at = timezone.now()
        case.save()

    # Notify stakeholders
    _notify_stakeholders(case, event, exclude_user=request.user)

    return Response(RecoveryEventSerializer(event).data, status=201)


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('LAW_FIRM')
def upload_case_document(request, pk):
    """
    POST /api/lawfirm/cases/:id/documents
    Upload/link a document to a case (creates a DOCUMENT_UPLOADED event).
    """
    law_firm, err = _get_law_firm_for_user(request.user)
    if err:
        return err

    try:
        case = RecoveryCase.objects.get(pk=pk, law_firm=law_firm)
    except RecoveryCase.DoesNotExist:
        return Response({'error': 'Case not found or not assigned to your firm.'}, status=404)

    document_url = request.data.get('document_url')
    notes = request.data.get('notes', 'Document uploaded')

    if not document_url:
        return Response({'error': 'document_url is required.'}, status=400)

    try:
        app_user = AppUser.objects.get(supabase_uid=request.user.id)
    except AppUser.DoesNotExist:
        app_user = None

    event = RecoveryEvent.objects.create(
        recovery_case=case,
        event_type='DOCUMENT_UPLOADED',
        notes=notes,
        document_url=document_url,
        created_by=app_user,
    )

    _notify_stakeholders(case, event, exclude_user=request.user)

    return Response(RecoveryEventSerializer(event).data, status=201)
