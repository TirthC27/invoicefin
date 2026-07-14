from django.contrib import admin
from .models import Pool, Investment, Transaction, Portfolio, EmailLog


@admin.register(Pool)
class PoolAdmin(admin.ModelAdmin):
    list_display = ['contract_pool_id', 'name', 'apy', 'duration_days', 'total_size', 'remaining_size', 'is_settled', 'created_at']
    list_filter = ['is_settled']
    search_fields = ['name']


@admin.register(Investment)
class InvestmentAdmin(admin.ModelAdmin):
    list_display = ['tx_hash_short', 'user_id_short', 'pool', 'amount', 'status', 'block_number', 'created_at']
    list_filter = ['status']
    search_fields = ['tx_hash', 'wallet_address', 'user_id']

    def tx_hash_short(self, obj):
        return f"{obj.tx_hash[:10]}..."
    tx_hash_short.short_description = "TX Hash"

    def user_id_short(self, obj):
        return f"{obj.user_id[:8]}..."
    user_id_short.short_description = "User"


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['tx_hash_short', 'tx_type', 'amount', 'status', 'timestamp']
    list_filter = ['tx_type', 'status']
    search_fields = ['tx_hash', 'user_id']

    def tx_hash_short(self, obj):
        return f"{obj.tx_hash[:10]}..."
    tx_hash_short.short_description = "TX Hash"


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ['user_id_short', 'wallet_address', 'total_invested', 'active_investments', 'total_returns', 'last_updated']
    search_fields = ['user_id', 'wallet_address']

    def user_id_short(self, obj):
        return f"{obj.user_id[:8]}..."
    user_id_short.short_description = "User"


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ['email_type', 'recipient_email', 'status', 'provider', 'tx_hash_short', 'sent_at']
    list_filter = ['status', 'email_type', 'provider']
    search_fields = ['recipient_email', 'transaction_hash', 'user_id']
    readonly_fields = ['user_id', 'transaction_hash', 'recipient_email', 'email_type', 'status', 'provider', 'sent_at']

    def tx_hash_short(self, obj):
        return f"{obj.transaction_hash[:10]}..."
    tx_hash_short.short_description = "TX Hash"
