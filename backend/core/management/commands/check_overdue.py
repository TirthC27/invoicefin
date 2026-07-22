"""
check_overdue — Mark overdue and defaulted investments, create recovery cases.

Run via cron:  python manage.py check_overdue
Recommended:   Every hour in production.
"""
import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Investment, RecoveryCase, AppUser, Notification
from core.constants import GRACE_PERIOD_DAYS

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Check for overdue investments and create recovery cases for defaults.'

    def handle(self, *args, **options):
        now = timezone.now()
        grace_cutoff = now - timedelta(days=GRACE_PERIOD_DAYS)

        # ── Phase 1: ACTIVE → OVERDUE ──────────────────────────────
        newly_overdue = Investment.objects.filter(
            status='active',
            returns_due_at__lt=now,
            returns_due_at__isnull=False,
            pool__is_settled=False,  # only if pool hasn't settled yet
        )
        overdue_count = newly_overdue.count()
        if overdue_count:
            newly_overdue.update(status='overdue')
            self.stdout.write(self.style.WARNING(
                f'Marked {overdue_count} investments as OVERDUE'
            ))

            # Notify investors
            for inv in Investment.objects.filter(
                status='overdue',
                returns_due_at__lt=now,
                returns_due_at__gte=now - timedelta(hours=2),  # recently flipped
            ):
                try:
                    app_user = AppUser.objects.get(supabase_uid=inv.user_id)
                    Notification.objects.get_or_create(
                        user=app_user,
                        message=f'Your investment in {inv.pool.name} is overdue. '
                                f'Grace period of {GRACE_PERIOD_DAYS} days has started.',
                        defaults={'link': f'/investor/portfolio'},
                    )
                except AppUser.DoesNotExist:
                    pass

        # ── Phase 2: OVERDUE → DEFAULTED (past grace period) ──────
        newly_defaulted = Investment.objects.filter(
            status='overdue',
            returns_due_at__lt=grace_cutoff,
            returns_due_at__isnull=False,
        )
        default_count = 0
        for inv in newly_defaulted:
            inv.status = 'defaulted'
            inv.save(update_fields=['status'])
            default_count += 1

            # Create recovery case (reusing existing model)
            try:
                # Find or infer AppUser records
                investor_user = AppUser.objects.filter(supabase_uid=inv.user_id).first()
                exporter_user = None  # Exporter may not have an AppUser yet

                if not investor_user:
                    # Auto-create an AppUser stub for the investor
                    investor_user = AppUser.objects.create(
                        supabase_uid=inv.user_id,
                        email=f'{inv.user_id[:8]}@investor.invoicefi',
                        role='INVESTOR',
                    )

                # Avoid duplicate recovery cases
                existing = RecoveryCase.objects.filter(investment=inv).exists()
                if existing:
                    continue

                # We need an exporter — use pool creator or a placeholder
                if not exporter_user:
                    exporter_user, _ = AppUser.objects.get_or_create(
                        email='system@invoicefi.app',
                        defaults={
                            'supabase_uid': 'system-exporter-placeholder',
                            'role': 'EXPORTER',
                        },
                    )

                recovery_case = RecoveryCase.objects.create(
                    pool=inv.pool,
                    investment=inv,
                    investor=investor_user,
                    exporter=exporter_user,
                    outstanding_amount=inv.amount + inv.expected_profit,
                    recovery_stage='DEFAULT',
                    priority='HIGH' if inv.amount > 1 else 'MEDIUM',
                )

                # Notify investor
                Notification.objects.create(
                    user=investor_user,
                    message=f'Investment in {inv.pool.name} has been marked as DEFAULT. '
                            f'Recovery case #{recovery_case.id} has been created.',
                    link=f'/investor/recovery',
                )

                # Notify all admins
                for admin in AppUser.objects.filter(role='ADMIN', status='ACTIVE'):
                    Notification.objects.create(
                        user=admin,
                        message=f'New default: Recovery case #{recovery_case.id} '
                                f'for Pool "{inv.pool.name}" ({inv.amount} ETH)',
                        link=f'/admin/recovery-cases',
                    )

                logger.info(
                    'Created recovery case #%d for investment %s (pool %s)',
                    recovery_case.id, inv.tx_hash[:10], inv.pool.name,
                )

            except Exception as e:
                logger.error('Failed to create recovery case for investment %s: %s', inv.id, e)

        if default_count:
            self.stdout.write(self.style.ERROR(
                f'Marked {default_count} investments as DEFAULTED and created recovery cases'
            ))

        if not overdue_count and not default_count:
            self.stdout.write(self.style.SUCCESS('No overdue or defaulted investments found.'))
