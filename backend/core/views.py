import os
import logging
import threading
import requests
from decimal import Decimal
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

logger = logging.getLogger(__name__)

from .authentication import SupabaseJWTAuthentication, require_role
from .user_sync import sync_app_user_from_identity
from .models import Pool, Investment, Transaction, Portfolio, RecoveryCase, RecoveryEvent
from .serializers import (
    CreateInvoicePoolSerializer, InvoiceSerializer,
    PoolSerializer, PoolDetailSerializer, InvestmentSerializer,
    TransactionSerializer, PortfolioSerializer,
)
from .constants import TRANSACTION_FEE_RATE




# -----------------------------------------------
# /api/health — No auth required
# -----------------------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok", "service": "invoicefin-django-backend"})


# -----------------------------------------------
# /api/user/me — Requires Supabase JWT
# -----------------------------------------------
@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_user_me(request):
    """
    Return authenticated app user data and idempotently sync the local AppUser
    mirror used by notifications, recovery, admin, exporter, and law firm flows.
    """
    profile = getattr(request.user, 'profile', None) or {}
    identity = {
        'id': request.user.id,
        'email': request.user.email,
        'role': request.user.role,
        'status': getattr(request.user, 'status', 'ACTIVE'),
        'full_name': getattr(request.user, 'full_name', '') or profile.get('full_name') or '',
    }
    app_user = sync_app_user_from_identity(identity, explicit_profile=bool(profile.get('role') or profile.get('status')))
    request.user.app_user = app_user

    if request.user.app_user is None:
        profile_role = profile.get('role') if profile else None
        role = normalize_role(profile_role or request.user.role)
        app_user, _ = AppUser.objects.update_or_create(
            supabase_uid=request.user.id,
            defaults={
                'email': request.user.email,
                'full_name': profile.get('full_name') if profile else '',
                'role': role,
                'status': 'ACTIVE',
            },
        )
        request.user.app_user = app_user
        request.user.role = app_user.role
        request.user.status = app_user.status

    return Response({
        "id": request.user.id,
        "email": app_user.email if app_user else request.user.email,
        "role": app_user.role if app_user else request.user.role,
        "status": app_user.status if app_user else getattr(request.user, 'status', 'ACTIVE'),
        "full_name": app_user.full_name if app_user else identity['full_name'],
        "wallet_address": profile.get('wallet_address'),
    })


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def sync_user_role(request):
    """
    POST /api/auth/sync-user/
    Creates or updates the local AppUser mirror after Supabase signup.
    """
    role = normalize_role(request.data.get('role'), default=None)
    if role not in APP_ROLES:
        return Response({"error": "Invalid role"}, status=400)

    full_name = request.data.get('full_name', '') or ''
    app_user, _ = AppUser.objects.update_or_create(
        supabase_uid=request.user.id,
        defaults={
            'email': request.user.email,
            'full_name': full_name,
            'role': role,
            'status': 'ACTIVE',
        },
    )
    return Response({
        "id": app_user.supabase_uid,
        "email": app_user.email,
        "full_name": app_user.full_name,
        "role": app_user.role,
        "status": app_user.status,
    })


# ═══════════════════════════════════════════════════════════
# EXPORTER INVOICES
# ═══════════════════════════════════════════════════════════

def _get_or_create_app_user_for_request(user):
    app_user = getattr(user, 'app_user', None)
    if app_user:
        return app_user
    app_user, _ = AppUser.objects.update_or_create(
        supabase_uid=user.id,
        defaults={
            'email': user.email,
            'full_name': getattr(user, 'full_name', '') or '',
            'role': user.role,
            'status': getattr(user, 'status', 'ACTIVE'),
        },
    )
    return app_user


@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('EXPORTER', 'ADMIN')
def list_exporter_invoices(request):
    exporter = _get_or_create_app_user_for_request(request.user)
    invoices = Invoice.objects.filter(exporter=exporter).select_related('pool')
    return Response(InvoiceSerializer(invoices, many=True).data)


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('EXPORTER', 'ADMIN')
def upload_invoice(request):
    serializer = InvoiceSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    exporter = _get_or_create_app_user_for_request(request.user)
    invoice = serializer.save(exporter=exporter, status='UPLOADED')
    return Response(InvoiceSerializer(invoice).data, status=201)


@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('EXPORTER', 'ADMIN')
def get_invoice_detail(request, pk):
    exporter = _get_or_create_app_user_for_request(request.user)
    try:
        invoice = Invoice.objects.select_related('pool').get(pk=pk, exporter=exporter)
    except Invoice.DoesNotExist:
        return Response({"error": "Invoice not found"}, status=404)
    return Response(InvoiceSerializer(invoice).data)


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('EXPORTER', 'ADMIN')
def verify_invoice(request, pk):
    exporter = _get_or_create_app_user_for_request(request.user)
    try:
        invoice = Invoice.objects.get(pk=pk, exporter=exporter)
    except Invoice.DoesNotExist:
        return Response({"error": "Invoice not found"}, status=404)

    invoice.status = 'VERIFIED'
    invoice.verified_at = timezone.now()
    invoice.save(update_fields=['status', 'verified_at'])
    return Response(InvoiceSerializer(invoice).data)


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('EXPORTER', 'ADMIN')
def create_pool_from_invoice(request, pk):
    exporter = _get_or_create_app_user_for_request(request.user)
    try:
        invoice = Invoice.objects.select_related('pool').get(pk=pk, exporter=exporter)
    except Invoice.DoesNotExist:
        return Response({"error": "Invoice not found"}, status=404)

    if invoice.status != 'VERIFIED':
        return Response({"error": "Invoice must be verified before creating a pool."}, status=400)
    if invoice.pool_id:
        return Response(InvoiceSerializer(invoice).data, status=200)

    serializer = CreateInvoicePoolSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    pool_name = serializer.validated_data.get('name') or f"{invoice.buyer_name} Invoice #{invoice.id}"
    apy = serializer.validated_data['apy']
    duration_days = serializer.validated_data['duration_days']
    try:
        from core.services.blockchain_service import create_pool_on_chain
        created = create_pool_on_chain(
            name=pool_name,
            apy_bps=int(apy * Decimal('100')),
            duration_days=duration_days,
            total_size_matic=invoice.invoice_amount,
        )
    except Exception as e:
        logger.error("On-chain pool creation failed for invoice %s: %s", invoice.id, e)
        return Response({"error": f"On-chain pool creation failed: {e}"}, status=503)

    pool = Pool.objects.create(
        name=pool_name,
        apy=apy,
        duration_days=duration_days,
        total_size=invoice.invoice_amount,
        remaining_size=invoice.invoice_amount,
        contract_pool_id=created.pool_id,
        is_settled=False,
    )
    invoice.pool = pool
    invoice.status = 'POOL_CREATED'
    invoice.save(update_fields=['pool', 'status'])
    return Response(InvoiceSerializer(invoice).data, status=201)


# ═══════════════════════════════════════════════════════════
# POOLS
# ═══════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([AllowAny])
def list_pools(request):
    """GET /api/pools/ — List all investment pools with enriched data."""
    pools = Pool.objects.all()
    serializer = PoolDetailSerializer(pools, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_pool_detail(request, pk):
    """GET /api/pools/<id>/ — Single pool with full detail."""
    try:
        pool = Pool.objects.get(pk=pk)
    except Pool.DoesNotExist:
        return Response({"error": "Pool not found"}, status=404)
    serializer = PoolDetailSerializer(pool)
    return Response(serializer.data)


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('EXPORTER', 'ADMIN')
def create_pool(request):
    """POST /api/pools/create/ — Create a pool record (admin/sync use)."""
    serializer = PoolSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


# ═══════════════════════════════════════════════════════════
# INVESTMENTS
# ═══════════════════════════════════════════════════════════

@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('INVESTOR')
def verify_investment(request):
    """
    POST /api/investments/verify/
    Secure endpoint: accepts ONLY tx_hash, verifies everything on-chain,
    saves the investment, and triggers async confirmation email.
    """
    tx_hash = request.data.get('tx_hash')
    if not tx_hash:
        return Response({"error": "tx_hash is required"}, status=400)

    # ── Reject duplicate tx_hash ─────────────────────────────────────
    if Investment.objects.filter(tx_hash=tx_hash).exists():
        return Response({"error": "Duplicate transaction hash"}, status=409)

    # ── On-chain verification ────────────────────────────────────────
    try:
        from core.services.blockchain_service import verify_investment_tx
        verified = verify_investment_tx(tx_hash)
    except ConnectionError as e:
        logger.error("Blockchain RPC error for tx %s: %s", tx_hash, e)
        return Response({"error": "Blockchain RPC unavailable. Try again later."}, status=503)
    except ValueError as e:
        logger.warning("Verification failed for tx %s: %s", tx_hash, e)
        return Response({"error": str(e)}, status=400)

    # ── Verify wallet ownership ──────────────────────────────────────
    # Fetch the user's registered wallet from their Supabase profile
    user_wallet = _get_user_wallet(request.user.id)
    if not user_wallet:
        logger.warning("Wallet ownership could not be confirmed for user=%s", request.user.id)
        return Response(
            {"error": "No registered wallet found. Connect and save your wallet before verifying investments."},
            status=403,
        )

    if verified.investor.lower() != user_wallet.lower():
        logger.warning(
            "Wallet mismatch: tx investor=%s, user wallet=%s, user=%s",
            verified.investor, user_wallet, request.user.id,
        )
        return Response(
            {"error": "Transaction wallet does not match your registered wallet."},
            status=403,
        )

    # ── Find the pool ────────────────────────────────────────────────
    try:
        pool = Pool.objects.get(contract_pool_id=verified.pool_id)
    except Pool.DoesNotExist:
        return Response(
            {"error": f"Pool with contract_pool_id={verified.pool_id} not found"},
            status=404,
        )
    # Save investment + transaction + update unified pool, invoice metadata, and portfolio.
    with transaction.atomic():
        pool = Pool.objects.select_for_update().get(contract_pool_id=verified.pool_id)
        if not pool.is_investable:
            return Response({"error": "Pool is not accepting investments."}, status=400)
        if verified.amount_matic > pool.remaining_size:
            return Response({"error": f"Investment exceeds remaining pool capacity ({pool.remaining_size})."}, status=400)


        fee = verified.amount_matic * TRANSACTION_FEE_RATE
        net_amount = verified.amount_matic - fee
        roi_pct = (pool.apy * Decimal(str(pool.duration_days)) / Decimal('365'))
        expected_profit = net_amount * roi_pct / Decimal('100')
        returns_due = timezone.now() + timedelta(days=pool.duration_days)

        investment = Investment.objects.create(
            user_id=request.user.id,
            wallet_address=verified.investor,
            pool=pool,
            amount=verified.amount_matic,
            tx_hash=tx_hash,
            status='active',
            block_number=verified.block_number,
            confirmed_at=timezone.now(),
            expected_profit=expected_profit,
            roi=roi_pct,
            transaction_fee=fee,
            returns_due_at=returns_due,
        )

        Transaction.objects.create(
            user_id=request.user.id,
            tx_hash=tx_hash,
            tx_type='invest',
            amount=verified.amount_matic,
            status='confirmed',
            pool=pool,
        )

        pool.remaining_size = max(Decimal('0'), pool.remaining_size - verified.amount_matic)
        if pool.remaining_size == 0:
            pool.status = 'fully_funded'
        pool.save(update_fields=['remaining_size', 'status'])

        if pool.invoice_id:
            invoice = pool.invoice
            invoice.funded_amount = min(invoice.amount, invoice.funded_amount + verified.amount_matic)
            if pool.remaining_size == 0:
                invoice.status = 'Funded'
            invoice.save(update_fields=['funded_amount', 'status', 'updated_at'])

        try:
            invoice_pool = pool.invoice_pool_metadata
            invoice_pool.amount_funded = min(invoice_pool.pool_size, invoice_pool.amount_funded + verified.amount_matic)
            if pool.remaining_size == 0:
                invoice_pool.status = 'fully_funded'
            invoice_pool.save(update_fields=['amount_funded', 'status', 'updated_at'])
        except Exception:
            pass

        _update_portfolio(request.user.id, verified.investor)


    # ── Trigger async email (never blocks the response) ──────────────
    try:
        from core.services.email_service import EmailService
        email_service = EmailService()

        expected_return = verified.amount_matic * pool.apy / Decimal('100')

        email_kwargs = dict(
            recipient_email=request.user.email,
            user_id=request.user.id,
            investor_name=getattr(request.user, 'full_name', None) or request.user.email,
            pool_name=pool.name,
            pool_id=pool.contract_pool_id,
            amount_eth=str(verified.amount_matic),
            apy=str(pool.apy),
            expected_return=str(round(expected_return, 8)),
            tx_hash=tx_hash,
            block_number=verified.block_number,
            invested_at=investment.confirmed_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
        )

        thread = threading.Thread(
            target=email_service.send_investment_confirmation,
            kwargs=email_kwargs,
            daemon=True,
        )
        thread.start()
        logger.info("Email thread started for tx %s → %s", tx_hash, request.user.email)

    except Exception as e:
        # Email failure must never break the investment
        logger.error("Failed to start email thread for tx %s: %s", tx_hash, e)

    return Response(InvestmentSerializer(investment).data, status=201)


def _get_user_wallet(user_id):
    """
    Fetch the user's wallet address from their Supabase profile.
    Returns None if profile is not accessible.
    """
    supabase_url = os.getenv('SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not service_role_key:
        return None

    try:
        r = requests.get(
            f"{supabase_url}/rest/v1/profiles",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
            },
            params={"id": f"eq.{user_id}", "select": "wallet_address"},
            timeout=5,
        )
        if r.ok and r.json():
            return r.json()[0].get('wallet_address')
    except Exception:
        pass
    return None


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('INVESTOR')
def fail_investment(request):
    """
    POST /api/investments/fail/
    Mark an investment as failed if TX reverts.
    """
    tx_hash = request.data.get('tx_hash')
    if not tx_hash:
        return Response({"error": "tx_hash required"}, status=400)

    Investment.objects.filter(
        tx_hash=tx_hash,
        user_id=request.user.id,
    ).update(status='failed')

    Transaction.objects.filter(
        tx_hash=tx_hash,
        user_id=request.user.id,
    ).update(status='failed')

    return Response({"status": "marked_failed"})


@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('INVESTOR')
def list_investments(request):
    """GET /api/investments/ — List user's investments."""
    investments = Investment.objects.filter(user_id=request.user.id)
    serializer = InvestmentSerializer(investments, many=True)
    return Response(serializer.data)


# ═══════════════════════════════════════════════════════════
# PORTFOLIO
# ═══════════════════════════════════════════════════════════

def _update_portfolio(user_id, wallet_address=''):
    """Recalculate and cache portfolio aggregates."""
    all_investments = Investment.objects.filter(user_id=user_id).exclude(status__in=['pending', 'failed'])

    # Active investments
    active = all_investments.filter(status__in=['confirmed', 'active'])
    active_count = active.count()
    total_invested = sum(inv.amount for inv in active)

    # Completed investments
    completed = all_investments.filter(status='completed')
    completed_count = completed.count()
    total_profit = sum(inv.expected_profit for inv in completed)

    # Returns from settled pools (legacy logic kept for backward compat)
    settled = all_investments.filter(pool__is_settled=True)
    returns = Decimal('0')
    for inv in settled:
        yearly_return = inv.amount * inv.pool.apy / Decimal('100')
        daily_return = yearly_return / Decimal('365')
        returns += daily_return * Decimal(str(inv.pool.duration_days))

    # Pending returns = expected profit from active investments
    pending_returns = sum(inv.expected_profit for inv in active)

    # Current value = invested amounts + accrued returns from completed
    current_value = total_invested + total_profit

    portfolio, _ = Portfolio.objects.update_or_create(
        user_id=user_id,
        defaults={
            'wallet_address': wallet_address,
            'total_invested': total_invested + sum(inv.amount for inv in completed),
            'active_investments': active_count,
            'total_returns': returns,
            'current_value': current_value,
            'total_profit': total_profit,
            'completed_count': completed_count,
            'pending_returns': pending_returns,
        },
    )
    return portfolio


@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('INVESTOR')
def get_portfolio(request):
    """GET /api/portfolio/ — Full portfolio: summary + investment list with recovery data."""
    # Recompute portfolio first
    _update_portfolio(request.user.id)

    try:
        portfolio = Portfolio.objects.get(user_id=request.user.id)
    except Portfolio.DoesNotExist:
        portfolio = None

    portfolio_data = PortfolioSerializer(portfolio).data if portfolio else {
        'user_id': request.user.id,
        'wallet_address': '',
        'total_invested': '0.00000000',
        'active_investments': 0,
        'total_returns': '0.00000000',
        'current_value': '0.00000000',
        'total_profit': '0.00000000',
        'completed_count': 0,
        'pending_returns': '0.00000000',
        'last_updated': None,
    }

    # Full investment list with recovery info
    investments = Investment.objects.filter(
        user_id=request.user.id
    ).exclude(status__in=['pending', 'failed']).select_related('pool')

    investment_list = []
    for inv in investments:
        inv_data = InvestmentSerializer(inv).data

        # Join recovery case if this investment is defaulted
        recovery_info = None
        if inv.status in ['overdue', 'defaulted']:
            recovery_case = RecoveryCase.objects.filter(
                investment=inv
            ).select_related('law_firm').first()
            if not recovery_case:
                # Fallback: find by pool + investor
                from .models import AppUser
                try:
                    app_user = AppUser.objects.get(supabase_uid=request.user.id)
                    recovery_case = RecoveryCase.objects.filter(
                        pool=inv.pool, investor=app_user
                    ).select_related('law_firm').first()
                except AppUser.DoesNotExist:
                    pass

            if recovery_case:
                recovery_info = {
                    'id': recovery_case.id,
                    'recovery_stage': recovery_case.recovery_stage,
                    'priority': recovery_case.priority,
                    'law_firm_name': recovery_case.law_firm.firm_name if recovery_case.law_firm else None,
                    'assigned_date': recovery_case.assigned_date,
                    'outstanding_amount': str(recovery_case.outstanding_amount),
                }

        inv_data['recovery'] = recovery_info
        investment_list.append(inv_data)

    return Response({
        'portfolio': portfolio_data,
        'investments': investment_list,
    })


# ═══════════════════════════════════════════════════════════
# INVESTMENT CALCULATOR
# ═══════════════════════════════════════════════════════════

@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('INVESTOR')
def calculate_investment(request):
    """
    POST /api/investment/calculate/
    Returns server-computed expected_profit, roi, transaction_fee for a given pool + amount.
    Used by the invest modal for debounced live preview.
    """
    pool_id = request.data.get('pool_id')
    amount = request.data.get('amount')

    if not pool_id or not amount:
        return Response({"error": "pool_id and amount are required"}, status=400)

    try:
        amount = Decimal(str(amount))
        if amount <= Decimal('0'):
            return Response({"error": "Amount must be greater than zero"}, status=400)
    except Exception:
        return Response({"error": "Invalid amount"}, status=400)

    try:
        pool = Pool.objects.get(pk=pool_id)
    except Pool.DoesNotExist:
        return Response({"error": "Pool not found"}, status=404)

    if not pool.is_investable:
        return Response({"error": "Pool is not accepting investments."}, status=400)

    if amount > pool.remaining_size:
        return Response({"error": f"Exceeds remaining capacity ({pool.remaining_size} MATIC)"}, status=400)

    fee = amount * TRANSACTION_FEE_RATE
    net_amount = amount - fee
    roi_pct = (pool.apy * Decimal(str(pool.duration_days)) / Decimal('365'))
    expected_profit = net_amount * roi_pct / Decimal('100')

    return Response({
        'amount': str(amount),
        'transaction_fee': str(round(fee, 8)),
        'net_amount': str(round(net_amount, 8)),
        'roi': str(round(roi_pct, 2)),
        'expected_profit': str(round(expected_profit, 8)),
        'duration_days': pool.duration_days,
        'apy': str(pool.apy),
    })


# ═══════════════════════════════════════════════════════════
# INVESTOR RECOVERY VIEW (read-only)
# ═══════════════════════════════════════════════════════════

@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('INVESTOR')
def investor_recovery_cases(request):
    """
    GET /api/investor/recovery-cases/
    Returns recovery cases for the current investor's defaulted investments.
    Read-only view into recovery data.
    """
    from .models import AppUser
    try:
        app_user = AppUser.objects.get(supabase_uid=request.user.id)
    except AppUser.DoesNotExist:
        return Response([])

    cases = RecoveryCase.objects.filter(
        investor=app_user
    ).select_related('law_firm', 'pool', 'investment').order_by('-created_at')

    result = []
    for case in cases:
        events = RecoveryEvent.objects.filter(recovery_case=case).order_by('created_at')
        result.append({
            'id': case.id,
            'pool_name': case.pool.name if case.pool else None,
            'pool_contract_id': case.pool.contract_pool_id if case.pool else None,
            'outstanding_amount': str(case.outstanding_amount),
            'recovery_stage': case.recovery_stage,
            'priority': case.priority,
            'assigned_date': case.assigned_date,
            'law_firm_name': case.law_firm.firm_name if case.law_firm else None,
            'law_firm_country': case.law_firm.country if case.law_firm else None,
            'investment_id': case.investment_id,
            'investment_amount': str(case.investment.amount) if case.investment else None,
            'created_at': case.created_at,
            'events': [
                {
                    'id': e.id,
                    'event_type': e.event_type,
                    'notes': e.notes,
                    'document_url': e.document_url,
                    'created_at': e.created_at,
                }
                for e in events
            ],
        })

    return Response(result)


# ═══════════════════════════════════════════════════════════
# TRANSACTIONS
# ═══════════════════════════════════════════════════════════

@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role('INVESTOR')
def list_transactions(request):
    """GET /api/transactions/ — Transaction history for user."""
    transactions = Transaction.objects.filter(user_id=request.user.id)
    serializer = TransactionSerializer(transactions, many=True)
    return Response(serializer.data)
