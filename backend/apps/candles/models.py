from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.conf import settings


def candle_photo_upload_path(instance, filename):
    return f"candles/{instance.id}/{filename}"


class Candle(models.Model):
    # Forward ref — avoids circular import with accounts app
    """
    Represents a candle on the wall.

    Position is stored as (col, row) integers on a virtual grid.
    row=0 is the TOP of the wall (most expensive).
    Price is determined at creation time based on row vs. total wall height.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending payment"
        ACTIVE = "active", "Burning"
        EXPIRED = "expired", "Expired"

    class Dedication(models.TextChoices):
        VIU = "viu", "Pentru vii"
        MORT = "mort", "Pentru morți"

    # --- Owner ---
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="candles",
    )

    # --- Position on the wall grid ---
    col = models.PositiveIntegerField()
    row = models.PositiveIntegerField()

    # --- Candle content ---
    dedicated_to_name = models.CharField(max_length=200)
    dedication_type = models.CharField(
        max_length=10,
        choices=Dedication.choices,
        default=Dedication.VIU,
    )
    photo = models.ImageField(
        upload_to=candle_photo_upload_path,
        null=True,
        blank=True,
    )

    # --- Renewal SMS tracking ---
    renewal_sms_sent = models.BooleanField(default=False)

    # --- Pricing ---
    price_lei = models.PositiveSmallIntegerField()  # 5 or 10

    # --- Lifecycle ---
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    lit_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # --- Stripe ---
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Each grid slot can hold only one active candle at a time
        constraints = [
            models.UniqueConstraint(
                fields=["col", "row"],
                condition=models.Q(status="active"),
                name="unique_active_candle_per_slot",
            )
        ]
        ordering = ["row", "col"]

    def __str__(self):
        return f"Lumânare pentru {self.dedicated_to_name} [{self.col},{self.row}]"

    def activate(self):
        """Called after successful Stripe payment."""
        self.status = Candle.Status.ACTIVE
        self.lit_at = timezone.now()
        self.expires_at = self.lit_at + timedelta(hours=12)
        self.save(update_fields=["status", "lit_at", "expires_at", "updated_at"])

    @staticmethod
    def compute_price(row: int, total_rows: int) -> int:
        """
        Return price in RON based on row position.
        Top CANDLE_TOP_THRESHOLD fraction → 10 RON, rest → 5 RON.
        """
        threshold = int(total_rows * settings.CANDLE_TOP_THRESHOLD)
        if row < threshold:
            return settings.CANDLE_PRICE_TOP_LEI
        return settings.CANDLE_PRICE_BOTTOM_LEI
