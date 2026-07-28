from django.db import models

# ── Pool ─────────────────────────────────────────────────
class Pool(models.Model):
    name = models.CharField(max_length=200)
    apy = models.DecimalField(max_digits=6, decimal_places=2, help_text="APY percentage e.g. 14.20")
    duration_days = models.IntegerField()
    total_size = models.DecimalField(max_digits=20, decimal_places=8, help_text="Total pool size in MATIC")
    remaining_size = models.DecimalField(max_digits=20, decimal_places=8, help_text="Remaining capacity in MATIC")
    contract_pool_id = models.IntegerField(unique=True, help_text="Pool ID on the smart contract")
    is_settled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pool #{self.contract_pool_id}: {self.name} ({self.apy}% APY)"

    class Meta:
        ordering = ['-created_at']


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('UPLOADED', 'Uploaded'),
        ('VERIFIED', 'Verified'),
        ('POOL_CREATED', 'Pool Created'),
    ]

    exporter = models.ForeignKey('AppUser', on_delete=models.CASCADE, related_name='invoices')
    pool = models.ForeignKey(Pool, null=True, blank=True, on_delete=models.SET_NULL, related_name='invoices')
    buyer_name = models.CharField(max_length=200)
    buyer_email = models.EmailField(blank=True, default='')
    buyer_country = models.CharField(max_length=100, blank=True, default='')
    invoice_amount = models.DecimalField(max_digits=20, decimal_places=8)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UPLOADED')
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invoice #{self.id} - {self.buyer_name} ({self.status})"

    class Meta:
        ordering = ['-created_at']


# ── Investment ───────────────────────────────────────────
class Investment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
        ('defaulted', 'Defaulted'),
        ('failed', 'Failed'),
    ]

    user_id = models.CharField(max_length=100, help_text="Supabase user UID")
    wallet_address = models.CharField(max_length=42)
    pool = models.ForeignKey(Pool, on_delete=models.CASCADE, related_name='investments')
    amount = models.DecimalField(max_digits=20, decimal_places=8, help_text="Amount in MATIC")
    tx_hash = models.CharField(max_length=66, unique=True, help_text="Transaction hash")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    block_number = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    # ── Investor portfolio fields (computed server-side) ──
    expected_profit = models.DecimalField(max_digits=20, decimal_places=8, default=0,
                                          help_text="Server-computed expected profit")
    roi = models.DecimalField(max_digits=6, decimal_places=2, default=0,
                              help_text="ROI percentage for the pool duration")
    transaction_fee = models.DecimalField(max_digits=20, decimal_places=8, default=0,
                                          help_text="Platform fee taken on this investment")
    returns_due_at = models.DateTimeField(null=True, blank=True,
                                          help_text="When returns are expected — countdown target")
    completed_at = models.DateTimeField(null=True, blank=True,
                                        help_text="When this investment was completed/returned")

    def __str__(self):
        return f"Investment {self.tx_hash[:10]}... → Pool #{self.pool.contract_pool_id} ({self.status})"

    class Meta:
        ordering = ['-created_at']


# ── Transaction ──────────────────────────────────────────
class Transaction(models.Model):
    TYPE_CHOICES = [
        ('invest', 'Invest'),
        ('withdraw', 'Withdraw'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('failed', 'Failed'),
    ]

    user_id = models.CharField(max_length=100)
    tx_hash = models.CharField(max_length=66, unique=True)
    tx_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=20, decimal_places=8)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    pool = models.ForeignKey(Pool, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"TX {self.tx_hash[:10]}... {self.tx_type} {self.amount} MATIC ({self.status})"

    class Meta:
        ordering = ['-timestamp']


# ── Portfolio (cached aggregate) ─────────────────────────
class Portfolio(models.Model):
    user_id = models.CharField(max_length=100, unique=True)
    wallet_address = models.CharField(max_length=42, blank=True, default='')
    total_invested = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    active_investments = models.IntegerField(default=0)
    total_returns = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    last_updated = models.DateTimeField(auto_now=True)

    # ── Extended portfolio fields ──
    current_value = models.DecimalField(max_digits=20, decimal_places=8, default=0,
                                        help_text="Total current value of all investments")
    total_profit = models.DecimalField(max_digits=20, decimal_places=8, default=0,
                                       help_text="Total realised profit from completed investments")
    completed_count = models.IntegerField(default=0)
    pending_returns = models.DecimalField(max_digits=20, decimal_places=8, default=0,
                                          help_text="Expected returns from active investments")

    def __str__(self):
        return f"Portfolio {self.user_id[:8]}... — {self.total_invested} MATIC invested"

    class Meta:
        ordering = ['-last_updated']


# ── Email Log ────────────────────────────────────────────
class EmailLog(models.Model):
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    user_id = models.CharField(max_length=100, help_text="Supabase user UID")
    transaction_hash = models.CharField(max_length=66)
    recipient_email = models.EmailField()
    email_type = models.CharField(max_length=50, help_text="e.g. investment_confirmation")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    provider = models.CharField(max_length=50, default='brevo')
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Email [{self.email_type}] → {self.recipient_email} ({self.status})"

    class Meta:
        ordering = ['-sent_at']


# ══════════════════════════════════════════════════════════
# MULTI-ROLE & RECOVERY MODULE
# ══════════════════════════════════════════════════════════

# ── AppUser (local mirror of Supabase auth.users) ────────
class AppUser(models.Model):
    ROLE_CHOICES = [
        ('INVESTOR', 'Investor'),
        ('EXPORTER', 'Exporter'),
        ('LAW_FIRM', 'Law Firm'),
        ('ADMIN', 'Admin'),
    ]
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
    ]

    supabase_uid = models.CharField(max_length=100, unique=True, help_text="auth.users.id from Supabase")
    email = models.EmailField()
    full_name = models.CharField(max_length=200, blank=True, default='')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='INVESTOR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email} ({self.role})"

    class Meta:
        ordering = ['-created_at']


# ── Law Firm ─────────────────────────────────────────────
class LawFirm(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
    ]

    user = models.OneToOneField(AppUser, on_delete=models.CASCADE, related_name='law_firm')
    firm_name = models.CharField(max_length=300)
    country = models.CharField(max_length=100)
    contact_person = models.CharField(max_length=200)
    business_email = models.EmailField()
    website = models.URLField(blank=True, default='')
    phone = models.CharField(max_length=30, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.firm_name} ({self.country})"

    class Meta:
        ordering = ['-created_at']


# ── Recovery Case ────────────────────────────────────────
class RecoveryCase(models.Model):
    STAGE_CHOICES = [
        ('DEFAULT', 'Default'),
        ('LEGAL_NOTICE_SENT', 'Legal Notice Sent'),
        ('NEGOTIATION', 'Negotiation'),
        ('SETTLEMENT', 'Settlement'),
        ('RECOVERED', 'Recovered'),
        ('CLOSED', 'Closed'),
    ]
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    pool = models.ForeignKey(Pool, on_delete=models.CASCADE, related_name='recovery_cases',
                             help_text="The invoice pool this recovery case is for")
    investment = models.ForeignKey('Investment', null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='recovery_cases',
                                   help_text="The specific investment that defaulted")
    law_firm = models.ForeignKey(LawFirm, null=True, blank=True, on_delete=models.SET_NULL,
                                 related_name='recovery_cases')
    exporter = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='recovery_cases_as_exporter')
    investor = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='recovery_cases_as_investor')
    outstanding_amount = models.DecimalField(max_digits=20, decimal_places=8)
    recovery_stage = models.CharField(max_length=30, choices=STAGE_CHOICES, default='DEFAULT')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    assigned_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        firm = self.law_firm.firm_name if self.law_firm else 'Unassigned'
        return f"Recovery #{self.id} — Pool #{self.pool.contract_pool_id} → {firm} ({self.recovery_stage})"

    class Meta:
        ordering = ['-created_at']


# ── Recovery Event (timeline entries) ────────────────────
class RecoveryEvent(models.Model):
    EVENT_TYPE_CHOICES = [
        ('LEGAL_NOTICE_SENT', 'Legal Notice Sent'),
        ('NEGOTIATION_STARTED', 'Negotiation Started'),
        ('SETTLEMENT_RECORDED', 'Settlement Recorded'),
        ('PARTIAL_RECOVERY', 'Partial Recovery'),
        ('FULL_RECOVERY', 'Full Recovery'),
        ('CASE_CLOSED', 'Case Closed'),
        ('DOCUMENT_UPLOADED', 'Document Uploaded'),
        ('NOTE_ADDED', 'Note Added'),
    ]

    recovery_case = models.ForeignKey(RecoveryCase, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=30, choices=EVENT_TYPE_CHOICES)
    notes = models.TextField(blank=True, default='')
    document_url = models.URLField(blank=True, null=True)
    created_by = models.ForeignKey(AppUser, on_delete=models.SET_NULL, null=True, related_name='created_events')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} on Case #{self.recovery_case_id} at {self.created_at}"

    class Meta:
        ordering = ['created_at']


# ── Notification (simple in-app) ─────────────────────────
class Notification(models.Model):
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        status = '✓' if self.read else '•'
        return f"[{status}] {self.user.email}: {self.message[:50]}"

    class Meta:
        ordering = ['-created_at']
