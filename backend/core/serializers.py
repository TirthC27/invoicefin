from rest_framework import serializers
from .models import Pool, Investment, Transaction, Portfolio


class PoolSerializer(serializers.ModelSerializer):
    percent_filled = serializers.SerializerMethodField()

    class Meta:
        model = Pool
        fields = [
            'id', 'name', 'apy', 'duration_days',
            'total_size', 'remaining_size',
            'contract_pool_id', 'is_settled',
            'percent_filled', 'created_at',
        ]

    def get_percent_filled(self, obj):
        if obj.total_size and obj.total_size > 0:
            filled = float(obj.total_size - obj.remaining_size)
            return round((filled / float(obj.total_size)) * 100, 1)
        return 0


class PoolDetailSerializer(serializers.ModelSerializer):
    """Extended pool serializer with investor-facing computed fields."""
    percent_filled = serializers.SerializerMethodField()
    roi = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    investor_count = serializers.SerializerMethodField()

    class Meta:
        model = Pool
        fields = [
            'id', 'name', 'apy', 'duration_days',
            'total_size', 'remaining_size',
            'contract_pool_id', 'is_settled',
            'percent_filled', 'roi', 'days_remaining',
            'investor_count', 'created_at',
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


class InvestmentInitiateSerializer(serializers.Serializer):
    wallet_address = serializers.CharField(max_length=42)
    pool_id = serializers.IntegerField(help_text="contract_pool_id from Pool model")
    amount = serializers.DecimalField(max_digits=20, decimal_places=8)
    tx_hash = serializers.CharField(max_length=66)


class InvestmentConfirmSerializer(serializers.Serializer):
    tx_hash = serializers.CharField(max_length=66)
    block_number = serializers.IntegerField()


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
