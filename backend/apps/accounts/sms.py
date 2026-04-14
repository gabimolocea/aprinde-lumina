"""
SMS sending via Twilio.
In development, if TWILIO_* env vars are missing, logs the message instead.
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def send_sms(to: str, body: str) -> None:
    account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    from_number = getattr(settings, "TWILIO_FROM_NUMBER", "")

    if not all([account_sid, auth_token, from_number]):
        # Dev fallback — print to console
        logger.warning("[SMS DEV] To=%s | %s", to, body)
        return

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        client.messages.create(body=body, from_=from_number, to=to)
    except Exception as exc:
        logger.error("SMS send failed to %s: %s", to, exc)
        # Do not raise — SMS failure should not break the request
