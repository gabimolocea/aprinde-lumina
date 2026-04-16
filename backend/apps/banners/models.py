from django.db import models


class Banner(models.Model):
    PLACEMENT_CHOICES = [
        ("top_mobile",      "Top pagină — Mobil (ex: 320×50)"),
        ("top_desktop",     "Top pagină — Desktop (ex: 728×90)"),
        ("strip_mobile",    "Bandă în grid — Mobil (ex: 320×50, 300×250)"),
        ("inline_desktop",  "Inline în grid — Desktop (ex: 300×250, 468×60)"),
    ]

    title      = models.CharField(max_length=120, help_text="Nume intern pentru identificare")
    placement  = models.CharField(max_length=20, choices=PLACEMENT_CHOICES, db_index=True)
    image_url  = models.URLField(help_text="URL-ul imaginii bannerului")
    link_url   = models.URLField(help_text="URL la care duce click-ul (include https://)")
    width      = models.PositiveIntegerField(help_text="Lățime în px (ex: 320)")
    height     = models.PositiveIntegerField(help_text="Înălțime în px (ex: 50)")
    is_active  = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Banner"
        verbose_name_plural = "Bannere"

    def __str__(self):
        return f"{self.title} [{self.get_placement_display()}] {'✓' if self.is_active else '✗'}"
