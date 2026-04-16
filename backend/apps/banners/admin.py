from django.contrib import admin
from django.utils.html import format_html
from .models import Banner, BannerSlot, PLACEMENT_CHOICES


@admin.register(BannerSlot)
class BannerSlotAdmin(admin.ModelAdmin):
    list_display  = ["get_placement_display", "is_enabled"]
    list_editable = ["is_enabled"]
    ordering      = ["placement"]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Auto-create missing slots so all 4 placements always appear
        existing = set(qs.values_list("placement", flat=True))
        missing  = [p for p, _ in PLACEMENT_CHOICES if p not in existing]
        if missing:
            BannerSlot.objects.bulk_create([BannerSlot(placement=p) for p in missing])
            qs = super().get_queryset(request)
        return qs


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display  = ["title", "placement", "preview", "width", "height", "is_active", "created_at"]
    list_filter   = ["placement", "is_active"]
    list_editable = ["is_active"]
    search_fields = ["title", "link_url"]
    readonly_fields = ["created_at", "preview"]
    fieldsets = [
        (None, {"fields": ["title", "placement", "is_active"]}),
        ("Imagine", {"fields": ["image", "image_url", "preview"], "description": "Încarcă un fișier SAU introdu un URL extern. Fișierul are prioritate."}),
        ("Link & dimensiuni", {"fields": ["link_url", "width", "height"]}),
        ("Info", {"fields": ["created_at"]}),
    ]

    def preview(self, obj):
        url = obj.effective_image_url
        if url:
            return format_html('<img src="{}" style="max-height:60px;max-width:200px;object-fit:contain;border-radius:4px;" />', url)
        return "—"
    preview.short_description = "Preview"
