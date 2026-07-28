from django.contrib import admin
from .models import (
    Pool, Invoice, Investment, Transaction, Portfolio, EmailLog,
    AppUser, LawFirm, RecoveryCase, RecoveryEvent, Notification,
)


@admin.register(Pool)
class PoolAdmin(admin.ModelAdmin):
    list_display = ['contract_pool_id', 'name', 'apy', 'duration_days', 'total_size', 'remaining_size', 'is_settled', 'created_at']
    list_filter = ['is_settled']
    search_fields = ['name']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['id', 'invoice_number', 'buyer_name', 'buyer_company', 'amount', 'due_date', 'status', 'created_at']
    list_filter = ['status', 'currency', 'country']
    search_fields = ['invoice_number', 'buyer_name', 'buyer_company', 'exporter__email']


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


# ══════════════════════════════════════════════════════════
# MULTI-ROLE & RECOVERY MODULE
# ══════════════════════════════════════════════════════════

@admin.register(AppUser)
class AppUserAdmin(admin.ModelAdmin):
    list_display = ['email', 'role', 'status', 'supabase_uid_short', 'created_at']
    list_filter = ['role', 'status']
    search_fields = ['email', 'full_name', 'supabase_uid']

    def supabase_uid_short(self, obj):
        return f"{obj.supabase_uid[:8]}..."
    supabase_uid_short.short_description = "Supabase UID"


@admin.register(LawFirm)
class LawFirmAdmin(admin.ModelAdmin):
    list_display = ['firm_name', 'country', 'contact_person', 'business_email', 'status', 'created_at']
    list_filter = ['status', 'country']
    search_fields = ['firm_name', 'contact_person', 'business_email']


@admin.register(RecoveryCase)
class RecoveryCaseAdmin(admin.ModelAdmin):
    list_display = ['id', 'pool', 'law_firm', 'recovery_stage', 'priority', 'outstanding_amount', 'assigned_date', 'created_at']
    list_filter = ['recovery_stage', 'priority']
    search_fields = ['pool__name']


@admin.register(RecoveryEvent)
class RecoveryEventAdmin(admin.ModelAdmin):
    list_display = ['id', 'recovery_case', 'event_type', 'created_by', 'created_at']
    list_filter = ['event_type']
    search_fields = ['notes']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'message_short', 'read', 'created_at']
    list_filter = ['read']
    search_fields = ['message', 'user__email']

    def message_short(self, obj):
        return obj.message[:60] + ('...' if len(obj.message) > 60 else '')
    message_short.short_description = "Message"
