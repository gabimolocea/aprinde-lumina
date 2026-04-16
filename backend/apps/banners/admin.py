from django.contrib import admin
from django.utils.html import format_html
from .models import Banner


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
