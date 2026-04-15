from .models import PageVisit, mask_ip


class VisitLoggerMiddleware:
    """
    Logs one PageVisit per page load.
    Triggered when the frontend calls GET /api/candles/meta/ (first request on load).
    """

    TRACKED_PATH = "/api/candles/meta/"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.method == "GET" and request.path == self.TRACKED_PATH:
            try:
                raw_ip = self._get_ip(request)
                PageVisit.objects.create(
                    ip=mask_ip(raw_ip),
                    referer=request.META.get("HTTP_REFERER", "")[:500],
                    user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
                )
            except Exception:
                pass  # never break the request
        return response

    @staticmethod
    def _get_ip(request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "")
