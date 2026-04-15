from django.contrib import admin
from .models import PageVisit, CandleEvent


@admin.register(PageVisit)
class PageVisitAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "ip", "short_referer", "short_ua")
    list_filter = ("timestamp",)
    search_fields = ("ip", "referer", "user_agent")
    readonly_fields = ("timestamp", "ip", "referer", "user_agent")
    date_hierarchy = "timestamp"
    ordering = ("-timestamp",)

    def short_referer(self, obj):
        return obj.referer[:80] or "—"
    short_referer.short_description = "Sursă"

    def short_ua(self, obj):
        return obj.user_agent[:60] or "—"
    short_ua.short_description = "User-Agent"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(CandleEvent)
class CandleEventAdmin(admin.ModelAdmin):
    list_display = (
        "timestamp", "kind", "dedicated_to_name", "requester_name",
        "phone_masked", "dedication_type", "col", "row", "short_referer",
    )
    list_filter = ("kind", "dedication_type", "timestamp")
    search_fields = ("dedicated_to_name", "requester_name", "phone_masked", "ip")
    readonly_fields = (
        "timestamp", "kind", "phone_masked", "requester_name", "dedicated_to_name",
        "col", "row", "dedication_type", "ip", "referer",
    )
    date_hierarchy = "timestamp"
    ordering = ("-timestamp",)

    def short_referer(self, obj):
        return obj.referer[:60] or "—"
    short_referer.short_description = "Sursă"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
