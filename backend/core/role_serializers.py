from rest_framework import serializers
from .models import AppUser, LawFirm, RecoveryCase, RecoveryEvent, Notification


# ── AppUser ──────────────────────────────────────────────
class AppUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppUser
        fields = ['id', 'supabase_uid', 'email', 'full_name', 'role', 'status', 'created_at']
        read_only_fields = ['id', 'supabase_uid', 'created_at']


# ── LawFirm ─────────────────────────────────────────────
class LawFirmSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_status = serializers.CharField(source='user.status', read_only=True)

    class Meta:
        model = LawFirm
        fields = [
            'id', 'firm_name', 'country', 'contact_person',
            'business_email', 'website', 'phone', 'status',
            'user_email', 'user_status', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class CreateLawFirmSerializer(serializers.Serializer):
    """Input serializer for creating a law firm partner."""
    firm_name = serializers.CharField(max_length=300)
    business_email = serializers.EmailField()
    contact_person = serializers.CharField(max_length=200)
    country = serializers.CharField(max_length=100)
    website = serializers.URLField(required=False, allow_blank=True, default='')
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')


# ── Recovery Case ────────────────────────────────────────
class RecoveryCaseSerializer(serializers.ModelSerializer):
    pool_name = serializers.CharField(source='pool.name', read_only=True)
    pool_contract_id = serializers.IntegerField(source='pool.contract_pool_id', read_only=True)
    law_firm_name = serializers.CharField(source='law_firm.firm_name', read_only=True, default=None)
    exporter_email = serializers.EmailField(source='exporter.email', read_only=True)
    investor_email = serializers.EmailField(source='investor.email', read_only=True)

    class Meta:
        model = RecoveryCase
        fields = [
            'id', 'pool', 'pool_name', 'pool_contract_id',
            'law_firm', 'law_firm_name',
            'exporter', 'exporter_email',
            'investor', 'investor_email',
            'outstanding_amount', 'recovery_stage', 'priority',
            'assigned_date', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssignLawFirmSerializer(serializers.Serializer):
    """Input serializer for assigning a law firm to a recovery case."""
    law_firm_id = serializers.IntegerField()


# ── Recovery Event ───────────────────────────────────────
class RecoveryEventSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True, default=None)

    class Meta:
        model = RecoveryEvent
        fields = [
            'id', 'recovery_case', 'event_type', 'notes',
            'document_url', 'created_by', 'created_by_email', 'created_at',
        ]
        read_only_fields = ['id', 'recovery_case', 'created_by', 'created_at']


class CreateRecoveryEventSerializer(serializers.Serializer):
    """Input serializer for creating a recovery event."""
    event_type = serializers.ChoiceField(choices=[c[0] for c in RecoveryEvent.EVENT_TYPE_CHOICES])
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    document_url = serializers.URLField(required=False, allow_blank=True, default='')


# ── Notification ─────────────────────────────────────────
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'read', 'link', 'created_at']
        read_only_fields = ['id', 'message', 'link', 'created_at']
