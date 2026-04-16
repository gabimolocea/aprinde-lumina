from django.contrib import admin
from .models import Banner


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display  = ["title", "placement", "width", "height", "is_active", "created_at"]
    list_filter   = ["placement", "is_active"]
    list_editable = ["is_active"]
    search_fields = ["title", "link_url"]
    readonly_fields = ["created_at"]
    fieldsets = [
        (None, {"fields": ["title", "placement", "is_active"]}),
        ("Imagine & link", {"fields": ["image_url", "link_url", "width", "height"]}),
        ("Info", {"fields": ["created_at"]}),
    ]
