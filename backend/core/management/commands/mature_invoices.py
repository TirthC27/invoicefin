"""
mature_invoices — Server-side scheduled job to auto-mature Active invoices.

Run via cron (every minute in production, or manually):
    python manage.py mature_invoices

This is the authoritative source of truth for maturity.
The frontend countdown timer also calls PATCH /exporter/invoices/<id>/mature/
as an optimistic UI update, but this job runs regardless of whether the
user has the page open.
"""
import logging
from datetime import date

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Invoice, UploadHistory, AppUser, Notification

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Auto-mature Active invoices whose due date has passed.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Print what would be matured without making changes.',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        today   = date.today()

        # Find all Active (or Funded) invoices past their due date
        overdue = Invoice.objects.filter(
            status__in=['Active', 'Funded'],
            due_date__lt=today,
        ).select_related('exporter')

        count = overdue.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No invoices to mature.'))
            return

        self.stdout.write(f'Found {count} invoice(s) to mature.')

        for invoice in overdue:
            if dry_run:
                self.stdout.write(f'  [DRY RUN] Would mature: {invoice.invoice_number} (due {invoice.due_date})')
                continue

            old_status     = invoice.status
            invoice.status = 'Completed'
            invoice.save(update_fields=['status', 'updated_at'])

            # Log to UploadHistory (shows in dashboard activity feed)
            UploadHistory.objects.create(
                invoice=invoice,
                action_type='matured',
                description=(
                    f'Invoice {invoice.invoice_number} matured and marked Completed. '
                    f'Due date was {invoice.due_date}. '
                    f'Total funded: {invoice.currency} {invoice.funded_amount}.'
                ),
            )

            # Notify the exporter via in-app notification
            if invoice.exporter:
                try:
                    Notification.objects.create(
                        user=invoice.exporter,
                        message=(
                            f'Invoice {invoice.invoice_number} has matured '
                            f'and been marked as Completed.'
                        ),
                        link=f'/exporter/invoices/{invoice.id}',
                    )
                except Exception as e:
                    logger.error('Failed to create notification for invoice %s: %s',
                                 invoice.invoice_number, e)

            logger.info(
                'Matured invoice %s (was %s, due %s)',
                invoice.invoice_number, old_status, invoice.due_date,
            )
            self.stdout.write(self.style.SUCCESS(
                f'  ✓ Matured: {invoice.invoice_number} (was {old_status}, due {invoice.due_date})'
            ))

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f'Done — matured {count} invoice(s).'))
