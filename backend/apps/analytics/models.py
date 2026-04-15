from django.db import models


def mask_phone(phone: str) -> str:
    """Show first 4 and last 2 digits, mask the rest."""
    phone = phone.strip()
    if len(phone) <= 6:
        return phone
    return phone[:4] + "*" * (len(phone) - 6) + phone[-2:]


def mask_ip(ip: str) -> str:
    """Anonymise last octet of IPv4 (GDPR)."""
    if not ip:
        return ip
    if "." in ip:
        parts = ip.split(".")
        parts[-1] = "0"
        return ".".join(parts)
    # IPv6 — zero out last 16-bit group
    if ":" in ip:
        parts = ip.split(":")
        parts[-1] = "0"
        return ":".join(parts)
    return ip


class PageVisit(models.Model):
    """Recorded once per page load (when the frontend hits /api/candles/meta/)."""

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    ip = models.CharField(max_length=45, blank=True)          # masked last octet
    referer = models.CharField(max_length=500, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Vizită"
        verbose_name_plural = "Vizite"

    def __str__(self):
        return f"{self.timestamp:%Y-%m-%d %H:%M} | {self.ip} | {self.referer[:60]}"


class CandleEvent(models.Model):
    """Recorded every time a candle is lit (free or paid)."""

    class Kind(models.TextChoices):
        FREE = "free", "Gratuită"
        PAID = "paid", "Plătită"
        DEMO = "demo", "Demo"

    class Dedication(models.TextChoices):
        MORT = "mort", "Adormiți"
        VIU = "viu", "Vii"

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.FREE)
    phone_masked = models.CharField(max_length=20, blank=True)
    requester_name = models.CharField(max_length=100, blank=True)
    dedicated_to_name = models.CharField(max_length=200, blank=True)
    col = models.PositiveSmallIntegerField()
    row = models.PositiveSmallIntegerField()
    dedication_type = models.CharField(
        max_length=10, choices=Dedication.choices, blank=True
    )
    ip = models.CharField(max_length=45, blank=True)          # masked
    referer = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Lumânare aprinsă"
        verbose_name_plural = "Lumânări aprinse"

    def __str__(self):
        return (
            f"{self.timestamp:%Y-%m-%d %H:%M} | {self.kind} | "
            f"{self.dedicated_to_name} | col={self.col} row={self.row}"
        )
