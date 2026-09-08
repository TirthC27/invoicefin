"""
process_kyc — Auto-approve KYC applications whose auto_approve_at has passed.

In demo mode: auto_approve_at is set to now+2min on submission,
and this command fires every 30 seconds, so approval is near-instant.
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import KYCApplication, AppUser, Notification

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Auto-approve pending KYC applications in demo mode.'

    def handle(self, *args, **options):
        now = timezone.now()

        pending = KYCApplication.objects.filter(
            status='PENDING',
            auto_approve_at__isnull=False,
            auto_approve_at__lte=now,
        ).select_related('user')

        count = pending.count()
        if not count:
            return

        for kyc in pending:
            kyc.status = 'APPROVED'
            kyc.reviewed_at = now
            kyc.reviewer_notes = 'Auto-approved (demo mode)'
            kyc.save(update_fields=['status', 'reviewed_at', 'reviewer_notes'])

            # Grant exporter capability
            user = kyc.user
            if not user.can_export:
                user.can_export = True
                user.save(update_fields=['can_export'])

            # Notify the user
            Notification.objects.create(
                user=user,
                message='🎉 Your KYC has been approved! You now have Exporter capabilities. '
                        'Upload your first invoice to get started.',
                link='/investor/exporter/upload',
            )

            logger.info('Auto-approved KYC for user %s', user.email)
            self.stdout.write(self.style.SUCCESS(f'  [OK] KYC approved: {user.email}'))

        self.stdout.write(self.style.SUCCESS(f'Processed {count} KYC approval(s).'))
