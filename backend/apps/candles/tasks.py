"""
Celery tasks for candle lifecycle management.
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Candle


@shared_task
def expire_candles():
    """
    Mark candles as EXPIRED when their expires_at date has passed.
    Schedule every hour via django-celery-beat.
    """
    now = timezone.now()
    expired = Candle.objects.filter(status=Candle.Status.ACTIVE, expires_at__lte=now)
    count = expired.update(status=Candle.Status.EXPIRED)
    return f"Expired {count} candles."


@shared_task
def send_renewal_reminders():
    """
    Send SMS to users whose candle expires in the next 24 h.
    Only sent once per candle (renewal_sms_sent flag).
    Schedule every hour via django-celery-beat.
    """
    from apps.accounts.sms import send_sms

    now = timezone.now()
    window_end = now + timedelta(hours=24)

    candles = Candle.objects.filter(
        status=Candle.Status.ACTIVE,
        renewal_sms_sent=False,
        expires_at__gte=now,
        expires_at__lte=window_end,
        user__isnull=False,
        user__sms_reminders=True,
    ).select_related("user")

    count = 0
    for candle in candles:
        message = (
            f"Bună ziua! Lumânarea aprinsă pentru {candle.dedicated_to_name} "
            f"se stinge mâine. Dacă doriți să o reînnoiți pentru încă o săptămână, "
            f"accesați aprinde-lumina.ro și apăsați pe lumânare. Vă mulțumim!"
        )
        send_sms(candle.user.phone, message)
        candle.renewal_sms_sent = True
        candle.save(update_fields=["renewal_sms_sent"])
        count += 1

    return f"Sent renewal SMS for {count} candles."


@shared_task
def cleanup_pending_candles():
    """
    Remove PENDING candles older than 24 hours (abandoned checkouts).
    Schedule daily.
    """
    cutoff = timezone.now() - timedelta(hours=24)
    deleted, _ = Candle.objects.filter(
        status=Candle.Status.PENDING,
        created_at__lte=cutoff,
    ).delete()
    return f"Cleaned up {deleted} stale pending candles."


@shared_task
def auto_seed_candles(count=100):
    """
    Auto-light `count` random candles across the wall.
    Scheduled every 12 hours via Celery Beat (configure in Django admin
    under Periodic Tasks, or via Railway cron service).
    """
    from django.core.management import call_command
    from io import StringIO

    out = StringIO()
    call_command("seed_candles_random", count=count, stdout=out)
    return out.getvalue().strip()

