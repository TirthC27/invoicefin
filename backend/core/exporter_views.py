"""
exporter_views.py — All exporter-facing API endpoints.

Endpoints:
  POST   /api/exporter/invoices/                — Upload invoice
  GET    /api/exporter/invoices/                — List with filter/sort/page
  GET    /api/exporter/invoices/<id>/           — Invoice detail + pool
  POST   /api/exporter/invoices/<id>/pool/      — Create investment pool
  PATCH  /api/exporter/invoices/<id>/status/    — Generic status update
  PATCH  /api/exporter/invoices/<id>/mature/    — Mature invoice (Completed)
  GET    /api/exporter/activities/              — Recent activity feed

Authentication: Supabase JWT, EXPORTER role required.
"""
import hashlib
import re
from decimal import Decimal, InvalidOperation
from datetime import date, timedelta

from django.db import models, transaction
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .authentication import SupabaseJWTAuthentication
from .models import AppUser, Invoice, InvoicePool, Pool, UploadHistory
from .serializers import InvoiceSerializer, InvoicePoolSerializer, UploadHistorySerializer
from .services.blockchain_service import create_pool_on_chain


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_app_user(request):
    """Returns the AppUser for the authenticated Supabase UID, or None."""
    try:
        return AppUser.objects.get(supabase_uid=request.user.id)
    except AppUser.DoesNotExist:
        return None


def _require_exporter(request):
    """Returns (app_user, error_response). error_response is None on success."""
    app_user = getattr(request.user, 'app_user', None) or _get_app_user(request)
    if not app_user:
        from .user_sync import sync_app_user_from_identity
        identity = {
            'id': request.user.id,
            'email': getattr(request.user, 'email', ''),
            'role': getattr(request.user, 'role', 'EXPORTER'),
            'status': getattr(request.user, 'status', 'ACTIVE'),
            'full_name': getattr(request.user, 'full_name', ''),
        }
        app_user = sync_app_user_from_identity(identity)

    if app_user.role not in ('EXPORTER', 'ADMIN'):
        return None, Response({
            'error': 'EXPORTER role required.',
            'your_role': app_user.role,
        }, status=403)
    return app_user, None



def _generate_blockchain_hash(invoice_number, buyer_name, buyer_company, amount, issue_date, due_date):
    """Generate a deterministic verification hash from validated invoice fields."""
    payload = "|".join([
        invoice_number,
        buyer_name,
        buyer_company,
        str(amount),
        issue_date.isoformat(),
        due_date.isoformat(),
    ])
    return "0x" + hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _log_activity(invoice, action_type, description, pool=None):
    UploadHistory.objects.create(
        invoice=invoice,
        pool=pool,
        action_type=action_type,
        description=description,
    )


INVOICE_NUM_RE = re.compile(r'^[a-zA-Z0-9_-]+$')
VALID_STATUSES = {'Draft', 'Verified', 'Funding', 'Funded', 'Active', 'Completed'}
ALLOWED_STATUS_TRANSITIONS = {
    'Draft': 'Verified',
    'Verified': 'Funding',
    'Funding': 'Funded',
    'Funded': 'Active',
    'Active': 'Completed',
}


# ── POST /api/exporter/invoices/ ─────────────────────────────────────────────
@api_view(['GET', 'POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def upload_invoice(request):
    """Upload a new invoice or list exporter invoices. Returns invoice with generated blockchain hash and pool."""
    if request.method == 'GET':
        return list_invoices(request)

    app_user, err = _require_exporter(request)
    if err:
        return err

    data = request.data

    # ── Server-side validation (mirrors frontend rules) ───────────────────────
    errors = {}
    invoice_number = (data.get('invoice_number') or '').strip()
    if not invoice_number:
        errors['invoice_number'] = 'This field is required.'
    elif not INVOICE_NUM_RE.match(invoice_number):
        errors['invoice_number'] = 'Only letters, numbers, - and _ allowed.'
    elif Invoice.objects.filter(invoice_number=invoice_number).exists():
        errors['invoice_number'] = 'This invoice number already exists.'

    buyer_name    = (data.get('buyer_name') or '').strip()
    buyer_company = (data.get('buyer_company') or '').strip()
    if not buyer_name:    errors['buyer_name']    = 'This field is required.'
    if not buyer_company: errors['buyer_company'] = 'This field is required.'

    amount_raw = data.get('amount')
    try:
        amount = Decimal(str(amount_raw))
        if amount <= 0:
            errors['amount'] = 'Amount must be positive.'
    except (InvalidOperation, TypeError):
        errors['amount'] = 'Enter a valid positive amount.'
        amount = None

    issue_date_str = data.get('issue_date', '')
    due_date_str   = data.get('due_date', '')
    issue_date = due_date = None
    today_date = date.today()

    try:
        issue_date = date.fromisoformat(issue_date_str)
        # Timezone tolerance: allow issue_date up to tomorrow in UTC/local
        if issue_date > today_date + timedelta(days=1):
            errors['issue_date'] = 'Issue date cannot be in the future.'
    except (ValueError, TypeError):
        errors['issue_date'] = 'Invalid date format.'

    try:
        due_date = date.fromisoformat(due_date_str)
    except (ValueError, TypeError):
        errors['due_date'] = 'Invalid date format.'

    if due_date and due_date <= today_date - timedelta(days=1):
        errors['due_date'] = 'Due date must be in the future.'
    elif issue_date and due_date and due_date <= issue_date:
        errors['due_date'] = 'Due date must be strictly after issue date.'

    if errors:
        return Response({'errors': errors}, status=400)

    # ── Create invoice record only. Pool creation happens explicitly after verification.
    blockchain_hash = _generate_blockchain_hash(
        invoice_number, buyer_name, buyer_company, amount, issue_date, due_date
    )

    with transaction.atomic():
        invoice = Invoice.objects.create(
            exporter=app_user,
            invoice_number=invoice_number,
            buyer_name=buyer_name,
            buyer_company=buyer_company,
            amount=amount,
            currency=data.get('currency', 'USD'),
            issue_date=issue_date,
            due_date=due_date,
            po_number=(data.get('po_number') or '').strip(),
            country=(data.get('country') or 'United States').strip(),
            description=(data.get('description') or '').strip()[:500],
            pdf_url=data.get('pdf_url', ''),
            status='Verified',
            blockchain_hash=blockchain_hash,
        )

        _log_activity(invoice, 'uploaded',
                      f'Invoice {invoice_number} uploaded and verified. '
                      f'Amount: {invoice.currency} {invoice.amount}. '
                      f'Blockchain hash generated.')

    return Response({
        'invoice': InvoiceSerializer(invoice).data,
        'blockchainHash': blockchain_hash,
    }, status=201)


# ── GET /api/exporter/invoices/ ──────────────────────────────────────────────
@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def list_invoices(request):
    """
    List invoices for the authenticated exporter.
    Query params:
      status   — filter by status (comma-separated allowed)
      search   — search invoice_number or buyer_name (case-insensitive)
      sort     — amount | due_date | status | created_at (prefix - for desc)
      page     — page number (default 1)
      per_page — rows per page (default 20, max 100)
    """
    app_user, err = _require_exporter(request)
    if err:
        return err

    qs = Invoice.objects.filter(exporter=app_user).select_related('pool')

    # Filter by status
    status_param = request.query_params.get('status', '')
    if status_param:
        statuses = [s.strip() for s in status_param.split(',') if s.strip() in VALID_STATUSES]
        if statuses:
            qs = qs.filter(status__in=statuses)

    # Search
    search = request.query_params.get('search', '').strip()
    if search:
        from django.db.models import Q
        qs = qs.filter(
            Q(invoice_number__icontains=search) | Q(buyer_name__icontains=search)
        )

    # Sort
    SORT_MAP = {
        'amount': 'amount', '-amount': '-amount',
        'due_date': 'due_date', '-due_date': '-due_date',
        'status': 'status', '-status': '-status',
        'created_at': 'created_at', '-created_at': '-created_at',
    }
    sort = request.query_params.get('sort', '-created_at')
    qs = qs.order_by(SORT_MAP.get(sort, '-created_at'))

    # Pagination
    try:
        page = max(1, int(request.query_params.get('page', 1)))
        per_page = min(100, max(1, int(request.query_params.get('per_page', 20))))
    except ValueError:
        page, per_page = 1, 20

    total = qs.count()
    offset = (page - 1) * per_page
    invoices = qs[offset:offset + per_page]

    return Response({
        'invoices': InvoiceSerializer(invoices, many=True).data,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': max(1, (total + per_page - 1) // per_page),
    })


# ── GET /api/exporter/invoices/<id>/ ─────────────────────────────────────────
@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def invoice_detail(request, pk):
    """Return full invoice detail including linked pool and activity history."""
    app_user, err = _require_exporter(request)
    if err:
        return err

    try:
        invoice = Invoice.objects.select_related('pool').get(pk=pk, exporter=app_user)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found.'}, status=404)

    history = UploadHistory.objects.filter(invoice=invoice).order_by('-timestamp')[:10]

    return Response({
        'invoice': InvoiceSerializer(invoice).data,
        'history': UploadHistorySerializer(history, many=True).data,
    })


# ── POST /api/exporter/invoices/<id>/pool/ ───────────────────────────────────
@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def create_invoice_pool(request, pk):
    """Create an investment pool for a Verified invoice. Updates status to Funding."""
    app_user, err = _require_exporter(request)
    if err:
        return err

    try:
        invoice = Invoice.objects.get(pk=pk, exporter=app_user)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found.'}, status=404)

    if invoice.status != 'Verified':
        return Response({'error': 'Pool can only be created for Verified invoices.'}, status=400)

    if hasattr(invoice, 'pool'):
        return Response({'error': 'A pool already exists for this invoice.'}, status=409)

    data = request.data
    errors = {}

    # Pool size
    try:
        pool_size = Decimal(str(data.get('pool_size', 0)))
        if pool_size <= 0:
            errors['pool_size'] = 'Pool size must be positive.'
        elif pool_size > invoice.amount:
            errors['pool_size'] = f'Pool size cannot exceed invoice amount ({invoice.amount}).'
    except (InvalidOperation, TypeError):
        errors['pool_size'] = 'Enter a valid amount.'
        pool_size = None

    # ROI
    try:
        expected_roi = Decimal(str(data.get('expected_roi', 0)))
        if not (Decimal('0.1') <= expected_roi <= Decimal('50')):
            errors['expected_roi'] = 'ROI must be between 0.1% and 50%.'
    except (InvalidOperation, TypeError):
        errors['expected_roi'] = 'Enter a valid percentage.'
        expected_roi = None

    # Funding deadline
    try:
        funding_deadline = date.fromisoformat(data.get('funding_deadline', ''))
        if funding_deadline >= invoice.due_date:
            errors['funding_deadline'] = 'Funding deadline must be before invoice due date.'
        if funding_deadline <= date.today():
            errors['funding_deadline'] = 'Funding deadline must be in the future.'
    except (ValueError, TypeError):
        errors['funding_deadline'] = 'Invalid date format.'
        funding_deadline = None

    # Min / Max investment
    try:
        min_inv = Decimal(str(data.get('min_investment', 0)))
        if min_inv <= 0:
            errors['min_investment'] = 'Must be positive.'
    except (InvalidOperation, TypeError):
        errors['min_investment'] = 'Enter a valid amount.'
        min_inv = None

    try:
        max_inv = Decimal(str(data.get('max_investment', 0)))
        if max_inv <= 0:
            errors['max_investment'] = 'Must be positive.'
        elif pool_size and max_inv > pool_size:
            errors['max_investment'] = 'Max investment cannot exceed pool size.'
    except (InvalidOperation, TypeError):
        errors['max_investment'] = 'Enter a valid amount.'
        max_inv = None

    if min_inv and max_inv and min_inv >= max_inv:
        errors['min_investment'] = 'Min investment must be less than max investment.'

    if errors:
        return Response({'errors': errors}, status=400)

    pool_name = f"{invoice.buyer_company} Invoice {invoice.invoice_number}"
    duration_days = max(1, (invoice.due_date - date.today()).days)

    try:
        created = create_pool_on_chain(
            name=pool_name,
            apy=expected_roi,
            duration_days=duration_days,
            total_size=pool_size,
        )
    except ConnectionError as exc:
        return Response({'error': f'Blockchain RPC unavailable: {exc}'}, status=503)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)

    with transaction.atomic():
        investment_pool = Pool.objects.create(
            name=pool_name,
            apy=expected_roi,
            duration_days=duration_days,
            total_size=pool_size,
            remaining_size=pool_size,
            contract_pool_id=created.pool_id,
            is_settled=False,
            exporter=app_user,
            invoice=invoice,
            invoice_number=invoice.invoice_number,
            buyer_name=invoice.buyer_name,
            buyer_company=invoice.buyer_company,
            currency=invoice.currency,
            due_date=invoice.due_date,
            funding_deadline=funding_deadline,
            min_investment=min_inv,
            max_investment=max_inv,
            status='open',
        )

        pool = InvoicePool.objects.create(
            invoice=invoice,
            investment_pool=investment_pool,
            pool_size=pool_size,
            expected_roi=expected_roi,
            funding_deadline=funding_deadline,
            min_investment=min_inv,
            max_investment=max_inv,
            is_visible_to_investors=True,
            status='open',
        )

        invoice.status = 'Funding'
        invoice.save(update_fields=['status', 'updated_at'])

        _log_activity(invoice, 'pool_created',
                      f'Investment pool created on-chain as Pool #{created.pool_id}. '
                      f'Size: {invoice.currency} {pool_size}, ROI: {expected_roi}%, '
                      f'Deadline: {funding_deadline}.',
                      pool=pool)

    return Response({
        'invoice': InvoiceSerializer(invoice).data,
        'pool': InvoicePoolSerializer(pool).data,
        'investment_pool': {
            'id': investment_pool.id,
            'contract_pool_id': investment_pool.contract_pool_id,
            'creation_tx_hash': created.tx_hash,
            'creation_block_number': created.block_number,
        },
    }, status=201)


# ── PATCH /api/exporter/invoices/<id>/status/ ────────────────────────────────
@api_view(['PATCH'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def update_invoice_status(request, pk):
    """Generic status transition endpoint. Validates allowed transitions."""
    app_user, err = _require_exporter(request)
    if err:
        return err

    try:
        invoice = Invoice.objects.get(pk=pk, exporter=app_user)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found.'}, status=404)

    new_status = (request.data.get('status') or '').strip()
    if new_status not in VALID_STATUSES:
        return Response({'error': f'Invalid status. Valid: {sorted(VALID_STATUSES)}'}, status=400)

    old_status = invoice.status
    if new_status != old_status and ALLOWED_STATUS_TRANSITIONS.get(old_status) != new_status:
        return Response(
            {
                'error': f'Invalid status transition from {old_status} to {new_status}.',
                'allowed_next_status': ALLOWED_STATUS_TRANSITIONS.get(old_status),
            },
            status=400,
        )

    invoice.status = new_status
    invoice.save(update_fields=['status', 'updated_at'])

    _log_activity(invoice, 'status_changed',
                  f'Status changed from {old_status} to {new_status}.')

    return Response(InvoiceSerializer(invoice).data)


# ── PATCH /api/exporter/invoices/<id>/mature/ ────────────────────────────────
@api_view(['PATCH'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def mature_invoice(request, pk):
    """
    Mark an Active invoice as Completed.
    Called by both the frontend countdown timer (optimistic) and the
    mature_invoices management command (authoritative server-side source).
    Idempotent — safe to call multiple times.
    """
    app_user, err = _require_exporter(request)
    if err:
        return err

    try:
        invoice = Invoice.objects.get(pk=pk, exporter=app_user)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found.'}, status=404)

    if invoice.status == 'Completed':
        return Response(InvoiceSerializer(invoice).data)  # already done, idempotent

    if invoice.status not in ('Active', 'Funded'):
        return Response(
            {'error': f'Cannot mature invoice with status {invoice.status}.'},
            status=400,
        )

    invoice.status = 'Completed'
    invoice.save(update_fields=['status', 'updated_at'])

    _log_activity(invoice, 'matured',
                  f'Invoice {invoice.invoice_number} matured and marked Completed. '
                  f'Total funded: {invoice.currency} {invoice.funded_amount}.')

    return Response(InvoiceSerializer(invoice).data)


# ── GET /api/exporter/activities/ ────────────────────────────────────────────
@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def exporter_activities(request):
    """Return recent activity feed for the exporter's invoices."""
    app_user, err = _require_exporter(request)
    if err:
        return err

    history = UploadHistory.objects.filter(
        invoice__exporter=app_user,
    ).select_related('invoice').order_by('-timestamp')[:20]

    return Response(UploadHistorySerializer(history, many=True).data)
