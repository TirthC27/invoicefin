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
from core.constants import get_default_delta, DEMO_MODE, GRACE_PERIOD_DAYS, DEMO_DEFAULT_MINUTES

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Check for overdue investments and create recovery cases for defaults.'

    def handle(self, *args, **options):
        now = timezone.now()
        default_delta = get_default_delta()
        grace_cutoff = now - default_delta
        recently_flipped_window = timedelta(minutes=5) if DEMO_MODE else timedelta(hours=2)

        # ── Demo Mode Phase 0: 1-minute reminder (halfway through grace period) ──
        if DEMO_MODE:
            reminder_investments = Investment.objects.filter(
                status='overdue',
                returns_due_at__lt=now - timedelta(minutes=1),
                returns_due_at__gte=now - timedelta(minutes=2),
            )
            for inv in reminder_investments:
                try:
                    app_user = AppUser.objects.get(supabase_uid=inv.user_id)
                    Notification.objects.get_or_create(
                        user=app_user,
                        message=f'[REMINDER] Investment in "{inv.pool.name}" is overdue. '
                                f'1 more minute until default!',
                        defaults={'link': '/investor/portfolio'},
                    )
                except AppUser.DoesNotExist:
                    pass

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
                returns_due_at__gte=now - recently_flipped_window,  # recently flipped
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
        
        pools_to_default = set()
        default_count = 0
        for inv in newly_defaulted:
            inv.status = 'defaulted'
            inv.save(update_fields=['status'])
            pools_to_default.add(inv.pool)
            default_count += 1
            
        for pool in pools_to_default:
            try:
                # Avoid duplicate recovery cases per pool
                existing = RecoveryCase.objects.filter(pool=pool).exists()
                if existing:
                    continue
                    
                exporter_user, _ = AppUser.objects.get_or_create(
                    email='system@invoicefi.app',
                    defaults={
                        'supabase_uid': 'system-exporter-placeholder',
                        'role': 'EXPORTER',
                    },
                )
                
                # Calculate total outstanding amount for all defaulted investments in this pool
                pool_defaulted_invs = Investment.objects.filter(pool=pool, status='defaulted')
                total_outstanding = sum(i.amount + i.expected_profit for i in pool_defaulted_invs)
                
                bid_deadline = now + timedelta(minutes=10) if DEMO_MODE else now + timedelta(hours=10)
                
                recovery_case = RecoveryCase.objects.create(
                    pool=pool,
                    exporter=exporter_user,
                    outstanding_amount=total_outstanding,
                    recovery_stage='DEFAULT',
                    priority='HIGH' if total_outstanding > 10 else 'MEDIUM',
                    bid_deadline=bid_deadline,
                )
                
                # Notify all investors in this pool
                for inv in pool_defaulted_invs:
                    investor_user = AppUser.objects.filter(supabase_uid=inv.user_id).first()
                    if investor_user:
                        Notification.objects.get_or_create(
                            user=investor_user,
                            message=f'Investment in {pool.name} has been marked as DEFAULT. '
                                    f'Recovery case #{recovery_case.id} has been created for the pool.',
                            defaults={'link': f'/investor/portfolio'},
                        )
                
                # Notify all admins
                for admin in AppUser.objects.filter(role='ADMIN', status='ACTIVE'):
                    Notification.objects.create(
                        user=admin,
                        message=f'New default: Recovery case #{recovery_case.id} '
                                f'for Pool "{pool.name}" ({total_outstanding} MATIC)',
                        link=f'/admin/recovery-cases',
                    )

                logger.info(
                    'Created pool-level recovery case #%d for pool %s',
                    recovery_case.id, pool.name,
                )
            except Exception as e:
                logger.error('Failed to create recovery case for pool %s: %s', pool.id, e)

        if default_count:
            self.stdout.write(self.style.ERROR(
                f'Marked {default_count} investments as DEFAULTED and created recovery cases'
            ))

        if not overdue_count and not default_count:
            self.stdout.write(self.style.SUCCESS('No overdue or defaulted investments found.'))

