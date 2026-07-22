"""
InvoiceFin — Business constants & configuration values.
All magic numbers live here, not scattered across views.
"""
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
