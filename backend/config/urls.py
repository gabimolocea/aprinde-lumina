from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/candles/", include("apps.candles.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/contact/", include("apps.contact.urls")),
    # SPA catch-all — serves React's index.html for all non-API routes
    re_path(r"^(?!(api|admin|media)/).*$", TemplateView.as_view(template_name="index.html")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
