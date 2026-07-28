from django.db import models

# ── Pool ─────────────────────────────────────────────────
class Pool(models.Model):
    STATUS_CHOICES = [
        ('open',         'Open'),
        ('fully_funded', 'Fully Funded'),
        ('settled',      'Settled'),
        ('closed',       'Closed'),
    ]

    name = models.CharField(max_length=200)
    apy = models.DecimalField(max_digits=6, decimal_places=2, help_text="APY percentage e.g. 14.20")
    duration_days = models.IntegerField()
    total_size = models.DecimalField(max_digits=20, decimal_places=8, help_text="Total pool size in MATIC")
    remaining_size = models.DecimalField(max_digits=20, decimal_places=8, help_text="Remaining capacity in MATIC")
    contract_pool_id = models.IntegerField(unique=True, help_text="Pool ID on the smart contract")
    is_settled = models.BooleanField(default=False)
    exporter = models.ForeignKey('AppUser', null=True, blank=True, on_delete=models.SET_NULL, related_name='investment_pools')
    invoice = models.OneToOneField('Invoice', null=True, blank=True, on_delete=models.SET_NULL, related_name='investment_pool')
    invoice_number = models.CharField(max_length=100, blank=True, default='')
    buyer_name = models.CharField(max_length=200, blank=True, default='')
    buyer_company = models.CharField(max_length=300, blank=True, default='')
    currency = models.CharField(max_length=5, blank=True, default='MATIC')
    due_date = models.DateField(null=True, blank=True)
    funding_deadline = models.DateField(null=True, blank=True)
    min_investment = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    max_investment = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    risk_score = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pool #{self.contract_pool_id}: {self.name} ({self.apy}% APY)"

    @property
    def is_investable(self):
        """
        A pool is investable when: not settled, status is 'open', and has remaining capacity.
        Uses both is_settled flag AND status field for consistency.
        """
        return (
            not self.is_settled
            and self.status == 'open'
            and self.remaining_size > 0
        )

    class Meta:
        ordering = ['-created_at']


class LegacyInvoice(models.Model):
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
        abstract = True
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


# ══════════════════════════════════════════════════════════
# EXPORTER INVOICE LIFECYCLE
# ══════════════════════════════════════════════════════════

# ── Invoice ──────────────────────────────────────────────
class Invoice(models.Model):
    STATUS_CHOICES = [
        ('Draft',     'Draft'),
        ('Verified',  'Verified'),
        ('Funding',   'Funding'),
        ('Funded',    'Funded'),
        ('Active',    'Active'),
        ('Completed', 'Completed'),
    ]
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'), ('EUR', 'Euro'), ('GBP', 'British Pound'),
        ('INR', 'Indian Rupee'), ('AED', 'UAE Dirham'),
        ('SGD', 'Singapore Dollar'), ('JPY', 'Japanese Yen'), ('CNY', 'Chinese Yuan'),
    ]

    exporter      = models.ForeignKey(
        AppUser, on_delete=models.CASCADE, related_name='invoices',
        null=True, blank=True,
        help_text="AppUser with EXPORTER role who uploaded this invoice",
    )
    invoice_number = models.CharField(max_length=100, unique=True)
    buyer_name     = models.CharField(max_length=200)
    buyer_company  = models.CharField(max_length=300)
    amount         = models.DecimalField(max_digits=20, decimal_places=2)
    currency       = models.CharField(max_length=5, choices=CURRENCY_CHOICES, default='USD')
    issue_date     = models.DateField()
    due_date       = models.DateField()
    po_number      = models.CharField(max_length=100, blank=True, default='')
    country        = models.CharField(max_length=100, default='United States')
    description    = models.TextField(blank=True, default='')
    pdf_url        = models.URLField(blank=True, default='')
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Verified')
    funded_amount  = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    blockchain_hash = models.CharField(max_length=70, blank=True, default='')
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.invoice_number} — {self.buyer_company} ({self.status})"

    @property
    def funding_percent(self):
        if self.amount and self.amount > 0:
            return round(float(self.funded_amount / self.amount) * 100, 1)
        return 0.0

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['invoice_number']),
        ]


# ── Invoice Pool ─────────────────────────────────────────
class InvoicePool(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('fully_funded', 'Fully Funded'),
        ('closed', 'Closed'),
    ]

    invoice          = models.OneToOneField(
        Invoice, on_delete=models.CASCADE, related_name='pool',
    )
    investment_pool  = models.OneToOneField(
        Pool, on_delete=models.CASCADE, related_name='invoice_pool_metadata',
        null=True, blank=True,
        help_text="Unified investor-facing pool row linked to this invoice pool",
    )
    pool_size        = models.DecimalField(max_digits=20, decimal_places=2)
    expected_roi     = models.DecimalField(max_digits=6, decimal_places=2,
                                           help_text="Expected ROI percentage, e.g. 12.50")
    funding_deadline = models.DateField(help_text="Must be before invoice due date")
    min_investment   = models.DecimalField(max_digits=20, decimal_places=2)
    max_investment   = models.DecimalField(max_digits=20, decimal_places=2)
    amount_funded    = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    is_visible_to_investors = models.BooleanField(default=True,
        help_text="When True, investors can see and invest in this pool")
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Pool for {self.invoice.invoice_number} ({self.status})"

    @property
    def percent_funded(self):
        if self.pool_size and self.pool_size > 0:
            return round(float(self.amount_funded / self.pool_size) * 100, 1)
        return 0.0

    class Meta:
        ordering = ['-created_at']


# ── Upload History (activity log) ────────────────────────
class UploadHistory(models.Model):
    ACTION_CHOICES = [
        ('uploaded',     'Uploaded'),
        ('verified',     'Verified'),
        ('pool_created', 'Pool Created'),
        ('funded',       'Funded'),
        ('matured',      'Matured'),
        ('status_changed', 'Status Changed'),
    ]

    invoice     = models.ForeignKey(Invoice, on_delete=models.CASCADE,
                                    related_name='history')
    pool        = models.ForeignKey(InvoicePool, on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name='history')
    action_type = models.CharField(max_length=30, choices=ACTION_CHOICES)
    description = models.TextField()
    timestamp   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.action_type}] {self.invoice.invoice_number} @ {self.timestamp}"

    class Meta:
        ordering = ['-timestamp']
