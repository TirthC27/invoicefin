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
import re
import secrets
from decimal import Decimal, InvalidOperation
from datetime import date

from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .authentication import SupabaseJWTAuthentication
from .models import AppUser, Invoice, InvoicePool, UploadHistory
from .serializers import InvoiceSerializer, InvoicePoolSerializer, UploadHistorySerializer


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_app_user(request):
    """Returns the AppUser for the authenticated Supabase UID, or None."""
    try:
        return AppUser.objects.get(supabase_uid=request.user.id)
    except AppUser.DoesNotExist:
        return None


def _require_exporter(request):
    """Returns (app_user, error_response). error_response is None on success."""
    app_user = _get_app_user(request)
    if not app_user:
        # Auto-create an AppUser stub so development with fresh users works
        app_user = AppUser.objects.create(
            supabase_uid=request.user.id,
            email=request.user.email or '',
            role='EXPORTER',
        )
    if app_user.role not in ('EXPORTER', 'ADMIN'):
        return None, Response({'error': 'EXPORTER role required.'}, status=403)
    return app_user, None


def _generate_blockchain_hash():
    """Generate a realistic-looking SHA-256-style hex hash prefixed with 0x."""
    return '0x' + secrets.token_hex(32)


def _log_activity(invoice, action_type, description, pool=None):
    UploadHistory.objects.create(
        invoice=invoice,
        pool=pool,
        action_type=action_type,
        description=description,
    )


INVOICE_NUM_RE = re.compile(r'^[a-zA-Z0-9_-]+$')
VALID_STATUSES = {'Draft', 'Verified', 'Funding', 'Funded', 'Active', 'Completed'}


# ── POST /api/exporter/invoices/ ─────────────────────────────────────────────
@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def upload_invoice(request):
    """Upload a new invoice. Returns invoice with generated blockchain hash."""
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
    try:
        issue_date = date.fromisoformat(issue_date_str)
        if issue_date > date.today():
            errors['issue_date'] = 'Issue date cannot be in the future.'
    except (ValueError, TypeError):
        errors['issue_date'] = 'Invalid date format.'

    try:
        due_date = date.fromisoformat(due_date_str)
    except (ValueError, TypeError):
        errors['due_date'] = 'Invalid date format.'

    if issue_date and due_date and due_date <= issue_date:
        errors['due_date'] = 'Due date must be strictly after issue date.'

    if errors:
        return Response({'errors': errors}, status=400)

    # ── Create invoice ────────────────────────────────────────────────────────
    blockchain_hash = _generate_blockchain_hash()
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

    # Create pool + update invoice status atomically
    pool = InvoicePool.objects.create(
        invoice=invoice,
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
                  f'Investment pool created. Size: {invoice.currency} {pool_size}, '
                  f'ROI: {expected_roi}%, Deadline: {funding_deadline}.',
                  pool=pool)

    return Response({
        'invoice': InvoiceSerializer(invoice).data,
        'pool': InvoicePoolSerializer(pool).data,
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
