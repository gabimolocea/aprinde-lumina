from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Banner
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
    return Response(BannerSerializer(qs, many=True).data)
