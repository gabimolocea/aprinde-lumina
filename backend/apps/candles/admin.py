from django.contrib import admin
from .models import Candle


@admin.register(Candle)
class CandleAdmin(admin.ModelAdmin):
    list_display = ["id", "dedicated_to_name", "dedication_type", "col", "row", "price_lei", "status", "expires_at"]
    list_filter = ["status", "dedication_type"]
    search_fields = ["dedicated_to_name", "lighter_email"]
    readonly_fields = ["stripe_payment_intent_id", "created_at", "updated_at"]
