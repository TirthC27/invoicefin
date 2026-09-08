"""
InvoiceFin — Business constants & configuration values.
All magic numbers live here, not scattered across views.
"""
import os
from datetime import timedelta
from decimal import Decimal

# ── Investment Fees ─────────────────────────────────────
TRANSACTION_FEE_RATE = Decimal('0.005')   # 0.5% platform fee on each investment

# ── Default / Recovery Lifecycle ────────────────────────
GRACE_PERIOD_DAYS = 7   # days after returns_due_at before OVERDUE → DEFAULTED

# ── Stage → Event mapping (for auto-stage advancement) ──
EVENT_TO_STAGE = {
    'LEGAL_NOTICE_SENT': 'LEGAL_NOTICE_SENT',
    'NEGOTIATION_STARTED': 'NEGOTIATION',
    'SETTLEMENT_RECORDED': 'SETTLEMENT',
    'FULL_RECOVERY': 'RECOVERED',
    'CASE_CLOSED': 'CLOSED',
}

# ── Demo Time-Compression Mode ──────────────────────────
def _bool_env(key, default='false'):
    return os.getenv(key, default).strip().lower() in ('1', 'true', 'yes', 'on')

DEMO_MODE            = _bool_env('DEMO_MODE', 'false')
DEMO_MATURITY_MINUTES = int(os.getenv('DEMO_MATURITY_MINUTES', '2'))
DEMO_DEFAULT_MINUTES  = int(os.getenv('DEMO_DEFAULT_MINUTES',  '5'))


def get_maturity_delta(duration_days: int) -> timedelta:
    """
    Returns the timedelta to use for investment maturity.
    In DEMO_MODE: uses DEMO_MATURITY_MINUTES regardless of pool duration.
    In production: uses the real duration_days.
    """
    if DEMO_MODE:
        return timedelta(minutes=DEMO_MATURITY_MINUTES)
    return timedelta(days=duration_days)


def get_default_delta() -> timedelta:
    """
    Returns the grace period timedelta before OVERDUE → DEFAULTED.
    In DEMO_MODE: uses DEMO_DEFAULT_MINUTES.
    In production: uses GRACE_PERIOD_DAYS (7 days).
    """
    if DEMO_MODE:
        return timedelta(minutes=DEMO_DEFAULT_MINUTES)
    return timedelta(days=GRACE_PERIOD_DAYS)


def get_check_overdue_interval() -> int:
    """Returns the scheduler poll interval (seconds) for the check_overdue job."""
    return 30 if DEMO_MODE else 3600

