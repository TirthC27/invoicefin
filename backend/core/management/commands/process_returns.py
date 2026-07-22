"""
process_returns — Complete investments for settled pools, credit profits.

Run via cron:  python manage.py process_returns
Recommended:   Every 15 minutes in production.
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Investment, AppUser, Notification, Portfolio

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process returns for investments in settled pools.'

    def handle(self, *args, **options):
        now = timezone.now()

        # Find active investments in settled pools where due date has passed
        eligible = Investment.objects.filter(
            status__in=['active', 'confirmed'],
            pool__is_settled=True,
            returns_due_at__lte=now,
            returns_due_at__isnull=False,
        )

        completed_count = 0
        for inv in eligible:
            inv.status = 'completed'
            inv.completed_at = now
            inv.save(update_fields=['status', 'completed_at'])
            completed_count += 1

            # Recompute portfolio
            from core.views import _update_portfolio
            _update_portfolio(inv.user_id, inv.wallet_address)

            # Notify investor
            try:
                app_user = AppUser.objects.get(supabase_uid=inv.user_id)
                Notification.objects.create(
                    user=app_user,
                    message=f'Your investment in {inv.pool.name} has returned! '
                            f'+{inv.expected_profit} ETH profit credited.',
                    link='/investor/portfolio',
                )
            except AppUser.DoesNotExist:
                pass

            logger.info(
                'Completed investment %s → pool %s, profit %s ETH',
                inv.tx_hash[:10], inv.pool.name, inv.expected_profit,
            )

        if completed_count:
            self.stdout.write(self.style.SUCCESS(
                f'Completed {completed_count} investments and credited returns.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS('No investments ready for return processing.'))
