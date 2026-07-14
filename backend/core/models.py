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


# ── Investment ───────────────────────────────────────────
class Investment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
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
