from django.urls import path
from .views import CandleListView, CandleDetailView, CandleCreateView, CandleFreeCreateView, WallMetaView

urlpatterns = [
    path("", CandleListView.as_view(), name="candle-list"),
    path("create/", CandleCreateView.as_view(), name="candle-create"),
    path("free/", CandleFreeCreateView.as_view(), name="candle-free-create"),
    path("meta/", WallMetaView.as_view(), name="candle-meta"),
    path("<int:pk>/", CandleDetailView.as_view(), name="candle-detail"),
]
