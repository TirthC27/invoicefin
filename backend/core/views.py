import os
import jwt
import logging
import threading
import requests
from decimal import Decimal
from django.utils import timezone
from rest_framework import authentication, exceptions
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

logger = logging.getLogger(__name__)

from .models import Pool, Investment, Transaction, Portfolio
from .serializers import (
    PoolSerializer, InvestmentSerializer,
    InvestmentInitiateSerializer, InvestmentConfirmSerializer,
    TransactionSerializer, PortfolioSerializer,
)


# -----------------------------------------------
# Supabase JWT Authentication class
# -----------------------------------------------
class SupabaseJWTAuthentication(authentication.BaseAuthentication):
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
                # Asymmetric algorithm (ES256, RS256, etc.)
                # Fetch the public key from Supabase JWKS endpoint
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

            class SimpleUser:
                def __init__(self, uid, email, role):
                    self.id = uid
                    self.email = email
                    self.role = role
                    self.is_authenticated = True

            user = SimpleUser(user_id, decoded.get('email'), decoded.get('role', 'investor'))
            return (user, token)

        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired.')
        except jwt.DecodeError:
            raise exceptions.AuthenticationFailed('Invalid token.')
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Authentication failed: {str(e)}')


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
    Returns user data decoded from the Supabase JWT.
    Optionally fetches the profile from Supabase Data API.
    """
    supabase_url = os.getenv('SUPABASE_URL')
    service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    profile = None
    if supabase_url and service_role_key:
        try:
            # Fetch profile from supabase using service role key
            r = requests.get(
                f"{supabase_url}/rest/v1/profiles",
                headers={
                    "apikey": service_role_key,
                    "Authorization": f"Bearer {service_role_key}",
                    "Content-Type": "application/json",
                },
                params={"id": f"eq.{request.user.id}", "select": "*"},
                timeout=5,
            )
            if r.ok and r.json():
                profile = r.json()[0]
        except Exception:
            pass  # Fall back to JWT claims

    return Response({
        "id": request.user.id,
        "email": request.user.email,
        "role": profile.get('role', request.user.role) if profile else request.user.role,
        "full_name": profile.get('full_name') if profile else None,
        "wallet_address": profile.get('wallet_address') if profile else None,
    })


# ═══════════════════════════════════════════════════════════
# POOLS
# ═══════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([AllowAny])
def list_pools(request):
    """GET /api/pools/ — List all investment pools."""
    pools = Pool.objects.all()
    serializer = PoolSerializer(pools, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
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
def initiate_investment(request):
    """
    POST /api/investments/initiate/
    Record a pending investment after TX is submitted on-chain.
    """
    serializer = InvestmentInitiateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data

    # Prevent duplicate tx_hash
    if Investment.objects.filter(tx_hash=data['tx_hash']).exists():
        return Response({"error": "Duplicate tx_hash"}, status=409)

    # Find pool by contract_pool_id
    try:
        pool = Pool.objects.get(contract_pool_id=data['pool_id'])
    except Pool.DoesNotExist:
        return Response({"error": f"Pool with contract_pool_id={data['pool_id']} not found"}, status=404)

    # Create investment record
    investment = Investment.objects.create(
        user_id=request.user.id,
        wallet_address=data['wallet_address'],
        pool=pool,
        amount=data['amount'],
        tx_hash=data['tx_hash'],
        status='pending',
    )

    # Create transaction record
    Transaction.objects.create(
        user_id=request.user.id,
        tx_hash=data['tx_hash'],
        tx_type='invest',
        amount=data['amount'],
        status='pending',
        pool=pool,
    )

    return Response(InvestmentSerializer(investment).data, status=201)


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def confirm_investment(request):
    """
    POST /api/investments/confirm/
    Mark an investment as confirmed after on-chain confirmation.
    """
    serializer = InvestmentConfirmSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data

    try:
        investment = Investment.objects.get(
            tx_hash=data['tx_hash'],
            user_id=request.user.id,
        )
    except Investment.DoesNotExist:
        return Response({"error": "Investment not found"}, status=404)

    if investment.status == 'confirmed':
        return Response({"message": "Already confirmed"}, status=200)

    # Update investment
    investment.status = 'confirmed'
    investment.block_number = data['block_number']
    investment.confirmed_at = timezone.now()
    investment.save()

    # Update transaction
    Transaction.objects.filter(
        tx_hash=data['tx_hash'],
        user_id=request.user.id,
    ).update(status='confirmed')

    # Update pool remaining size
    pool = investment.pool
    pool.remaining_size = max(Decimal('0'), pool.remaining_size - investment.amount)
    pool.save()

    # Update portfolio
    _update_portfolio(request.user.id, investment.wallet_address)

    return Response(InvestmentSerializer(investment).data)


@api_view(['POST'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
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
    if user_wallet:
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

    # ── Save investment + transaction + update pool & portfolio ──────
    investment = Investment.objects.create(
        user_id=request.user.id,
        wallet_address=verified.investor,
        pool=pool,
        amount=verified.amount_matic,
        tx_hash=tx_hash,
        status='confirmed',
        block_number=verified.block_number,
        confirmed_at=timezone.now(),
    )

    Transaction.objects.create(
        user_id=request.user.id,
        tx_hash=tx_hash,
        tx_type='invest',
        amount=verified.amount_matic,
        status='confirmed',
        pool=pool,
    )

    # Update pool remaining size
    pool.remaining_size = max(Decimal('0'), pool.remaining_size - verified.amount_matic)
    pool.save()

    # Update portfolio
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
    confirmed = Investment.objects.filter(user_id=user_id, status='confirmed')
    total = sum(inv.amount for inv in confirmed)
    active = confirmed.filter(pool__is_settled=False).count()

    # Calculate mock returns (based on APY * duration for confirmed settled pools)
    settled = confirmed.filter(pool__is_settled=True)
    returns = Decimal('0')
    for inv in settled:
        yearly_return = inv.amount * inv.pool.apy / Decimal('100')
        daily_return = yearly_return / Decimal('365')
        returns += daily_return * Decimal(str(inv.pool.duration_days))

    portfolio, _ = Portfolio.objects.update_or_create(
        user_id=user_id,
        defaults={
            'wallet_address': wallet_address,
            'total_invested': total,
            'active_investments': active,
            'total_returns': returns,
        },
    )
    return portfolio


@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_portfolio(request):
    """GET /api/portfolio/ — Aggregated portfolio for user."""
    try:
        portfolio = Portfolio.objects.get(user_id=request.user.id)
    except Portfolio.DoesNotExist:
        # Return empty portfolio
        return Response({
            'user_id': request.user.id,
            'wallet_address': '',
            'total_invested': '0.00000000',
            'active_investments': 0,
            'total_returns': '0.00000000',
            'last_updated': None,
        })

    serializer = PortfolioSerializer(portfolio)
    return Response(serializer.data)


# ═══════════════════════════════════════════════════════════
# TRANSACTIONS
# ═══════════════════════════════════════════════════════════

@api_view(['GET'])
@authentication_classes([SupabaseJWTAuthentication])
@permission_classes([IsAuthenticated])
def list_transactions(request):
    """GET /api/transactions/ — Transaction history for user."""
    transactions = Transaction.objects.filter(user_id=request.user.id)
    serializer = TransactionSerializer(transactions, many=True)
    return Response(serializer.data)
