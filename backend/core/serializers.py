from rest_framework import serializers
from .models import Pool, Investment, Transaction, Portfolio, Invoice, InvoicePool, UploadHistory


class PoolSerializer(serializers.ModelSerializer):
    percent_filled = serializers.SerializerMethodField()
    is_investable = serializers.BooleanField(read_only=True)
    invoice_id = serializers.IntegerField(source='invoice.id', read_only=True)
    exporter_email = serializers.EmailField(source='exporter.email', read_only=True, default=None)

    class Meta:
        model = Pool
        fields = [
            'id', 'name', 'apy', 'duration_days',
            'total_size', 'remaining_size',
            'contract_pool_id', 'is_settled', 'status',
            'invoice_id', 'invoice_number', 'buyer_name', 'buyer_company',
            'currency', 'due_date', 'funding_deadline',
            'min_investment', 'max_investment', 'risk_score',
            'exporter_email', 'percent_filled', 'is_investable', 'created_at',
        ]

    def get_percent_filled(self, obj):
        if obj.total_size and obj.total_size > 0:
            filled = float(obj.total_size - obj.remaining_size)
            return round((filled / float(obj.total_size)) * 100, 1)
        return 0


class PoolDetailSerializer(serializers.ModelSerializer):
    """Extended pool serializer with investor-facing computed fields."""
    percent_filled = serializers.SerializerMethodField()
    is_investable = serializers.BooleanField(read_only=True)
    invoice_id = serializers.IntegerField(source='invoice.id', read_only=True)
    exporter_email = serializers.EmailField(source='exporter.email', read_only=True, default=None)
    roi = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    investor_count = serializers.SerializerMethodField()

    class Meta:
        model = Pool
        fields = [
            'id', 'name', 'apy', 'duration_days',
            'total_size', 'remaining_size',
            'contract_pool_id', 'is_settled', 'status',
            'invoice_id', 'invoice_number', 'buyer_name', 'buyer_company',
            'currency', 'due_date', 'funding_deadline',
            'min_investment', 'max_investment', 'risk_score',
            'exporter_email', 'percent_filled', 'roi', 'days_remaining',
            'investor_count', 'is_investable', 'created_at',
        ]

    def get_percent_filled(self, obj):
        if obj.total_size and obj.total_size > 0:
            filled = float(obj.total_size - obj.remaining_size)
            return round((filled / float(obj.total_size)) * 100, 1)
        return 0

    def get_roi(self, obj):
        """ROI for the pool duration: apy * duration_days / 365"""
        if obj.apy and obj.duration_days:
            return round(float(obj.apy) * obj.duration_days / 365, 2)
        return 0

    def get_days_remaining(self, obj):
        """Days until pool duration ends from creation."""
        from django.utils import timezone
        if obj.created_at and obj.duration_days:
            end_date = obj.created_at + timezone.timedelta(days=obj.duration_days)
            remaining = (end_date - timezone.now()).days
            return max(0, remaining)
        return 0

    def get_investor_count(self, obj):
        return obj.investments.filter(status__in=['confirmed', 'active', 'completed']).values('user_id').distinct().count()


class InvestmentSerializer(serializers.ModelSerializer):
    pool_name = serializers.CharField(source='pool.name', read_only=True)
    pool_apy = serializers.DecimalField(source='pool.apy', max_digits=6, decimal_places=2, read_only=True)
    pool_duration_days = serializers.IntegerField(source='pool.duration_days', read_only=True)

    class Meta:
        model = Investment
        fields = [
            'id', 'user_id', 'wallet_address',
            'pool', 'pool_name', 'pool_apy', 'pool_duration_days',
            'amount', 'tx_hash', 'status',
            'block_number', 'created_at', 'confirmed_at',
            'expected_profit', 'roi', 'transaction_fee',
            'returns_due_at', 'completed_at',
        ]
        read_only_fields = ['id', 'created_at', 'confirmed_at']


class TransactionSerializer(serializers.ModelSerializer):
    pool_name = serializers.CharField(source='pool.name', read_only=True, default=None)

    class Meta:
        model = Transaction
        fields = [
            'id', 'user_id', 'tx_hash', 'tx_type',
            'amount', 'status', 'pool', 'pool_name',
            'timestamp',
        ]
        read_only_fields = ['id', 'timestamp']


class PortfolioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = [
            'id', 'user_id', 'wallet_address',
            'total_invested', 'active_investments',
            'total_returns', 'current_value',
            'total_profit', 'completed_count',
            'pending_returns', 'last_updated',
        ]
        read_only_fields = ['id', 'last_updated']


# ── Exporter Invoice Lifecycle ───────────────────────────────
class InvoicePoolSerializer(serializers.ModelSerializer):
    percent_funded = serializers.FloatField(read_only=True)
    investment_pool_id = serializers.IntegerField(source='investment_pool.id', read_only=True)
    contract_pool_id = serializers.IntegerField(source='investment_pool.contract_pool_id', read_only=True)

    class Meta:
        model = InvoicePool
        fields = [
            'id', 'investment_pool_id', 'contract_pool_id',
            'pool_size', 'expected_roi', 'funding_deadline',
            'min_investment', 'max_investment', 'amount_funded',
            'is_visible_to_investors', 'status', 'percent_funded',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceSerializer(serializers.ModelSerializer):
    pool = InvoicePoolSerializer(read_only=True)
    funding_percent = serializers.FloatField(read_only=True)
    exporter_email  = serializers.EmailField(source='exporter.email', read_only=True, default=None)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'buyer_name', 'buyer_company',
            'amount', 'currency', 'issue_date', 'due_date',
            'po_number', 'country', 'description', 'pdf_url',
            'status', 'funded_amount', 'funding_percent',
            'blockchain_hash', 'pool', 'exporter_email',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'funding_percent']


class UploadHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadHistory
        fields = ['id', 'action_type', 'description', 'timestamp']
        read_only_fields = ['id', 'timestamp']
