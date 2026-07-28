"""Lightweight background scheduler for college/demo deployments.

This intentionally avoids Celery or external queues. When the Django app starts
under runserver/WSGI, a daemon thread periodically invokes the existing
management commands that keep invoice and investment state moving.
"""

import logging
import os
import sys
import threading
import time
from dataclasses import dataclass

from django.core.management import call_command

logger = logging.getLogger(__name__)

_DISABLE_COMMANDS = {
    "check",
    "collectstatic",
    "createsuperuser",
    "makemigrations",
    "migrate",
    "shell",
    "test",
}


@dataclass(frozen=True)
class ScheduledCommand:
    name: str
    interval_seconds: int
    initial_delay_seconds: int


SCHEDULE = [
    ScheduledCommand("mature_invoices", 60, 10),
    ScheduledCommand("sync_pools", 300, 20),
    ScheduledCommand("process_returns", 900, 30),
    ScheduledCommand("check_overdue", 3600, 45),
]

_started = False
_started_lock = threading.Lock()


def _scheduler_enabled() -> bool:
    value = os.getenv("INVOICEFIN_BACKGROUND_JOBS", "true").strip().lower()
    if value in {"0", "false", "no", "off"}:
        return False

    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command in _DISABLE_COMMANDS:
        return False

    # Avoid starting in the parent process created by Django's autoreloader.
    if command == "runserver" and os.environ.get("RUN_MAIN") != "true":
        return False

    return True


def _run_command(command_name: str) -> None:
    try:
        call_command(command_name)
    except Exception:
        logger.exception("Scheduled command %s failed", command_name)


def _command_loop(command: ScheduledCommand) -> None:
    time.sleep(command.initial_delay_seconds)
    while True:
        _run_command(command.name)
        time.sleep(command.interval_seconds)


def start_scheduler_once() -> None:
    global _started

    if not _scheduler_enabled():
        return

    with _started_lock:
        if _started:
            return
        _started = True

    for command in SCHEDULE:
        thread = threading.Thread(
            target=_command_loop,
            args=(command,),
            name=f"invoicefin-{command.name}-scheduler",
            daemon=True,
        )
        thread.start()

    logger.info(
        "InvoiceFin background scheduler started: %s",
        ", ".join(f"{item.name}/{item.interval_seconds}s" for item in SCHEDULE),
    )