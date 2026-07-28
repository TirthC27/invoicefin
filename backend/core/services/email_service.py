"""
email_service.py — Reusable email service using Brevo SMTP.

Sends transactional emails and logs every attempt to the EmailLog model.
All errors are caught and logged — email failures never break the
investment flow.
"""

import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


class EmailService:
    """Reusable SMTP email sender backed by Brevo."""

    def __init__(self):
        self.smtp_server = os.getenv("BREVO_SMTP_SERVER", "smtp-relay.brevo.com")
        self.smtp_port = int(os.getenv("BREVO_SMTP_PORT", "587"))
        self.username = os.getenv("BREVO_USERNAME", "")
        self.password = os.getenv("BREVO_PASSWORD", "")
        self.email_from = os.getenv("EMAIL_FROM", "noreply@invoicefi.com")

    def _is_configured(self) -> bool:
        """Check that all required SMTP env vars are present."""
        return bool(self.username and self.password)

    def _send_smtp(self, to_email: str, subject: str, html_body: str) -> bool:
        """
        Send an email via Brevo SMTP.
        Returns True on success, False on failure.
        """
        if not self._is_configured():
            logger.warning(
                "Email not configured (missing BREVO_USERNAME / BREVO_PASSWORD). "
                "Skipping email to %s.", to_email,
            )
            return False

        msg = MIMEMultipart("alternative")
        msg["From"] = self.email_from
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        try:
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=30) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.sendmail(self.email_from, to_email, msg.as_string())

            logger.info("Email sent successfully to %s [subject=%s]", to_email, subject)
            return True

        except smtplib.SMTPAuthenticationError as e:
            logger.error("SMTP auth failed: %s", e)
            return False
        except smtplib.SMTPException as e:
            logger.error("SMTP error sending to %s: %s", to_email, e)
            return False
        except Exception as e:
            logger.error("Unexpected email error sending to %s: %s", to_email, e)
            return False

    def _log_email(
        self,
        user_id: str,
        tx_hash: str,
        recipient_email: str,
        email_type: str,
        status: str,
    ):
        """Persist the email attempt to the EmailLog table."""
        try:
            from core.models import EmailLog  # late import to avoid circular deps
            EmailLog.objects.create(
                user_id=user_id,
                transaction_hash=tx_hash,
                recipient_email=recipient_email,
                email_type=email_type,
                status=status,
                provider="brevo",
            )
        except Exception as e:
            logger.error("Failed to log email record: %s", e)

    def send_investment_confirmation(
        self,
        recipient_email: str,
        user_id: str,
        investor_name: str,
        pool_name: str,
        pool_id: int,
        amount_eth: str,
        apy: str,
        expected_return: str,
        tx_hash: str,
        block_number: int,
        invested_at: str,
    ):
        """
        Send the investment confirmation email.

        This method is designed to be called from a background thread.
        It will never raise — all errors are caught and logged.
        """
        explorer_base = os.getenv(
            "BLOCK_EXPLORER_URL", "https://amoy.polygonscan.com/"
        )
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

        context = {
            "investor_name": investor_name or "Investor",
            "pool_name": pool_name,
            "pool_id": pool_id,
            "amount_eth": amount_eth,
            "apy": apy,
            "expected_return": expected_return,
            "tx_hash": tx_hash,
            "tx_hash_short": f"{tx_hash[:10]}...{tx_hash[-6:]}",
            "explorer_url": f"{explorer_base}tx/{tx_hash}",
            "block_number": block_number,
            "invested_at": invested_at,
            "dashboard_url": f"{frontend_url}/dashboard",
            "year": datetime.now().year,
        }

        try:
            html_body = render_to_string("email/investment_success.html", context)
        except Exception as e:
            logger.error("Failed to render email template: %s", e)
            self._log_email(user_id, tx_hash, recipient_email, "investment_confirmation", "failed")
            return

        subject = f"Investment Confirmed — {amount_eth} POL in {pool_name}"
        success = self._send_smtp(recipient_email, subject, html_body)
        status = "sent" if success else "failed"
        self._log_email(user_id, tx_hash, recipient_email, "investment_confirmation", status)
