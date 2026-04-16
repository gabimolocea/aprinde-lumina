from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Banner, BannerSlot, PLACEMENT_CHOICES
from .serializers import BannerSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
def banner_list(request):
    """
    Returns all active banners, optionally filtered by ?placement=<value>.
    The frontend picks randomly client-side so each page load gets variety.
    """
    qs = Banner.objects.filter(is_active=True)
    placement = request.GET.get("placement")
    if placement:
        qs = qs.filter(placement=placement)
    return Response(BannerSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def slot_list(request):
    """
    Returns a list of placement keys that are currently enabled.
    Missing rows default to enabled (all placements visible by default).
    """
    existing = {s.placement: s.is_enabled for s in BannerSlot.objects.all()}
    enabled = [
        placement
        for placement, _ in PLACEMENT_CHOICES
        if existing.get(placement, True)  # missing row → enabled by default
    ]
    return Response(enabled)
