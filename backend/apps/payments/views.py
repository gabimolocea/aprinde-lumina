"""
Stripe webhook handler.
Activates a candle after successful payment confirmation.
"""
import stripe
import json
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from apps.candles.models import Candle


@csrf_exempt
@require_POST
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponse(status=400)

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        _activate_candle(intent["id"])

    return HttpResponse(status=200)


def _activate_candle(payment_intent_id: str):
    try:
        candle = Candle.objects.get(
            stripe_payment_intent_id=payment_intent_id,
            status=Candle.Status.PENDING,
        )
        candle.activate()
    except Candle.DoesNotExist:
        pass  # Already activated or not found – idempotent
