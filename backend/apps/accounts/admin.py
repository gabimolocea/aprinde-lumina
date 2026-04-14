from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, OTP


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["phone", "display_name", "is_active", "sms_reminders", "date_joined"]
    search_fields = ["phone", "display_name"]
    ordering = ["-date_joined"]
    fieldsets = (
        (None, {"fields": ("phone", "display_name", "password")}),
        ("Permisiuni", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("SMS", {"fields": ("sms_reminders",)}),
    )
    add_fieldsets = (
        (None, {"fields": ("phone", "password1", "password2")}),
    )
    filter_horizontal = ("groups", "user_permissions")


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ["phone", "code", "created_at", "expires_at", "used"]
    list_filter = ["used"]
    search_fields = ["phone"]
    readonly_fields = ["created_at"]
