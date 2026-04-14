from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/candles/", include("apps.candles.urls")),
    path("api/payments/", include("apps.payments.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
