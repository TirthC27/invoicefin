"""
settle_bids — Auto-settle law firm bid auctions where bid_deadline has passed.

Picks the highest bidder, assigns the case to them, and notifies all parties.
Run automatically by the scheduler every 60 seconds.
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from core.models import RecoveryCase, RecoveryBid, Notification, AppUser

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Settle law firm bid auctions where the deadline has passed.'

    def handle(self, *args, **options):
        now = timezone.now()

        cases = RecoveryCase.objects.filter(
            recovery_stage='DEFAULT',
            law_firm__isnull=True,
            bid_deadline__lt=now,
            bid_deadline__isnull=False,
        )

        count = cases.count()
        if count == 0:
            self.stdout.write('No bid auctions to settle.')
            return

        settled = 0
        for case in cases:
            winning_bid = RecoveryBid.objects.filter(
                case=case, status='PENDING'
            ).order_by('-bid_amount').first()

            if not winning_bid:
                self.stdout.write(f'Case #{case.id}: no bids, skipping.')
                continue

            try:
                with transaction.atomic():
                    case.law_firm = winning_bid.law_firm
                    case.recovery_stage = 'LEGAL_NOTICE_SENT'
                    case.assigned_date = now
                    case.save()

                    winning_bid.status = 'ACCEPTED'
                    winning_bid.save()

                    RecoveryBid.objects.filter(
                        case=case, status='PENDING'
                    ).exclude(id=winning_bid.id).update(status='REJECTED')

                    # --- Distribute winning bid to pool investors ---
                    from core.models import Investment, Transaction as AppTransaction
                    from core.views import _update_portfolio
                    import uuid

                    pool_invs = Investment.objects.filter(pool=case.pool, status='defaulted')
                    total_defaulted = sum(i.amount for i in pool_invs)

                    if total_defaulted > 0:
                        for inv in pool_invs:
                            share = inv.amount / total_defaulted
                            refund_amount = winning_bid.bid_amount * share

                            AppTransaction.objects.create(
                                user_id=inv.user_id,
                                tx_hash=f"recovery-{uuid.uuid4().hex[:10]}",
                                tx_type='withdraw',  # representing payout to wallet
                                amount=refund_amount,
                                status='confirmed',
                                pool=case.pool,
                            )

                            # Record the refund as the realized return
                            inv.expected_profit = refund_amount - inv.amount
                            inv.status = 'completed'
                            inv.completed_at = now
                            inv.save(update_fields=['status', 'completed_at', 'expected_profit'])

                            _update_portfolio(inv.user_id, inv.wallet_address)

                            app_user = AppUser.objects.filter(supabase_uid=inv.user_id).first()
                            if app_user:
                                Notification.objects.create(
                                    user=app_user,
                                    message=f'Recovery successful! Law Firm bought {case.pool.name} debt. '
                                            f'You received {refund_amount:.4f} MATIC.',
                                    link='/investor/portfolio',
                                )
                    # ------------------------------------------------

                    # Notify winning law firm
                    Notification.objects.create(
                        user=winning_bid.law_firm.user,
                        message=(
                            f'Your bid of {winning_bid.bid_amount} MATIC won Recovery Case #{case.id} '
                            f'for Pool "{case.pool.name}". Case assigned to you!'
                        ),
                        link=f'/lawfirm/cases/{case.id}',
                    )

                    # Notify admins
                    for admin in AppUser.objects.filter(role='ADMIN', status='ACTIVE'):
                        Notification.objects.create(
                            user=admin,
                            message=(
                                f'Bid auction for Case #{case.id} settled. '
                                f'Winner: {winning_bid.law_firm.firm_name} ({winning_bid.bid_amount} MATIC)'
                            ),
                            link='/admin/recovery-cases',
                        )

                    settled += 1
                    self.stdout.write(self.style.SUCCESS(
                        f'Case #{case.id} settled -> {winning_bid.law_firm.firm_name} '
                        f'({winning_bid.bid_amount} MATIC)'
                    ))
            except Exception as e:
                logger.error('Failed to settle case #%d: %s', case.id, e)

        if settled:
            self.stdout.write(self.style.SUCCESS(f'Settled {settled} bid auction(s).'))
