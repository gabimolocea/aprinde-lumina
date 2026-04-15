from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
import uuid
from .models import Candle
from .serializers import CandleListSerializer, CandleDetailSerializer, CandleCreateSerializer
from apps.analytics.models import CandleEvent, mask_ip, mask_phone
from apps.analytics.middleware import VisitLoggerMiddleware

# Wall dimensions (can be moved to settings)
WALL_TOTAL_ROWS = 200  # virtual rows for infinite scroll pages


class CandleListView(generics.ListAPIView):
    """
    GET /api/candles/
    Returns paginated list of ACTIVE candles (for the wall).
    Supports ?row_min=&row_max= for windowed loading.
    """

    serializer_class = CandleListSerializer
    pagination_class = None  # windowed by row_min/row_max, no cursor needed

    def get_queryset(self):
        qs = Candle.objects.filter(status=Candle.Status.ACTIVE)
        row_min = self.request.query_params.get("row_min")
        row_max = self.request.query_params.get("row_max")
        if row_min is not None:
            qs = qs.filter(row__gte=int(row_min))
        if row_max is not None:
            qs = qs.filter(row__lte=int(row_max))
        return qs


class CandleDetailView(generics.RetrieveAPIView):
    """
    GET /api/candles/<id>/
    Full detail for a single candle (shown in modal on click).
    """

    queryset = Candle.objects.filter(status=Candle.Status.ACTIVE)
    serializer_class = CandleDetailSerializer


class CandleCreateView(APIView):
    """
    POST /api/candles/
    Requires authentication (Token).
    Validates slot availability, computes price, creates a PENDING candle,
    and returns the Stripe client_secret for the frontend to confirm payment.
    In DEMO_MODE, skips Stripe and immediately activates the candle.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CandleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        col = data["col"]
        price_lei = Candle.compute_price(data["row"], WALL_TOTAL_ROWS)

        # Derive dedication type from column position (left = morti, right = vii)
        dedication_type = (
            Candle.Dedication.MORT if col < settings.WALL_SPLIT_COL
            else Candle.Dedication.VIU
        )

        # --- Demo mode: bypass Stripe, immediately activate ---
        if settings.DEMO_MODE:
            candle = serializer.save(
                user=request.user,
                price_lei=price_lei,
                dedication_type=dedication_type,
                stripe_payment_intent_id=f"demo_{uuid.uuid4().hex}",
                status=Candle.Status.PENDING,
            )
            candle.activate()
            try:
                CandleEvent.objects.create(
                    kind=CandleEvent.Kind.DEMO,
                    phone_masked=mask_phone(getattr(request.user, 'phone', '') or ''),
                    requester_name=getattr(request.user, 'display_name', '') or '',
                    dedicated_to_name=data.get('dedicated_to_name', ''),
                    col=col,
                    row=data['row'],
                    dedication_type=dedication_type,
                    ip=mask_ip(VisitLoggerMiddleware._get_ip(request)),
                    referer=request.META.get('HTTP_REFERER', '')[:500],
                )
            except Exception:
                pass
            return Response(
                {
                    "candle_id": candle.id,
                    "price_lei": price_lei,
                    "client_secret": None,
                    "demo": True,
                },
                status=status.HTTP_201_CREATED,
            )

        # --- Normal mode: create Stripe PaymentIntent ---
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY

        price_bani = price_lei * 100  # Stripe uses smallest currency unit (bani)
        try:
            intent = stripe.PaymentIntent.create(
                amount=price_bani,
                currency="ron",
                metadata={
                    "col": col,
                    "row": data["row"],
                    "dedicated_to_name": data["dedicated_to_name"],
                    "user_id": request.user.id,
                },
            )
        except stripe.error.StripeError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        candle = serializer.save(
            user=request.user,
            price_lei=price_lei,
            dedication_type=dedication_type,
            stripe_payment_intent_id=intent["id"],
            status=Candle.Status.PENDING,
        )

        return Response(
            {
                "candle_id": candle.id,
                "price_lei": price_lei,
                "client_secret": intent["client_secret"],
                "demo": False,
            },
            status=status.HTTP_201_CREATED,
        )


class WallMetaView(APIView):
    """
    GET /api/candles/meta/
    Returns wall dimensions, price thresholds, and grid config.
    """

    def get(self, request):
        threshold_row = int(WALL_TOTAL_ROWS * settings.CANDLE_TOP_THRESHOLD)
        total_lit_count = Candle.objects.exclude(status=Candle.Status.PENDING).count()
        return Response(
            {
                "total_rows": WALL_TOTAL_ROWS,
                "price_top_lei": settings.CANDLE_PRICE_TOP_LEI,
                "price_bottom_lei": settings.CANDLE_PRICE_BOTTOM_LEI,
                "top_threshold_row": threshold_row,
                "split_col": settings.WALL_SPLIT_COL,
                "demo_mode": settings.DEMO_MODE,
                "total_lit_count": total_lit_count,
            }
        )


class CandleFreeCreateView(APIView):
    """
    POST /api/candles/free/
    No authentication required. Allows anyone to light a free candle
    on a bottom-zone (5 RON) slot by providing only phone + name.
    Phone is stored for renewal reminder SMS after 7 days.
    Rate-limited to 1 active free candle per phone number at a time.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        from apps.accounts.models import User

        phone = request.data.get("phone", "").strip()
        requester_name = request.data.get("requester_name", "").strip()
        dedicated_to_name = request.data.get("dedicated_to_name", "").strip()
        col_raw = request.data.get("col")
        row_raw = request.data.get("row")

        # --- Basic validation ---
        errors = {}
        if not phone:
            errors["phone"] = ["Numărul de telefon este obligatoriu."]
        if not requester_name:
            errors["requester_name"] = ["Numele tău este obligatoriu."]
        if not dedicated_to_name:
            errors["dedicated_to_name"] = ["Numele celui pentru care aprinzi lumânarea este obligatoriu."]
        if col_raw is None or row_raw is None:
            errors["slot"] = ["Poziția lumânării lipsește."]
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        col = int(col_raw)
        row = int(row_raw)

        # --- Slot must be empty ---
        if Candle.objects.filter(col=col, row=row, status=Candle.Status.ACTIVE).exists():
            return Response(
                {"detail": "Acest loc este deja ocupat de o lumânare aprinsă."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Get or create user by phone (shadow account, no password) ---
        user, _ = User.objects.get_or_create(
            phone=phone,
            defaults={"display_name": requester_name},
        )
        # Update display_name if it changed
        if user.display_name != requester_name and requester_name:
            user.display_name = requester_name
            user.save(update_fields=["display_name"])

        # --- Rate limit: 1 active free candle per phone ---
        active_free = Candle.objects.filter(
            user=user, price_lei=0, status=Candle.Status.ACTIVE
        ).count()
        if active_free >= 1:
            return Response(
                {"detail": "Ai deja o lumânare gratuită aprinsă. Poți aprinde alta după ce aceasta se stinge."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Derive dedication type from column ---
        dedication_type = (
            Candle.Dedication.MORT if col < settings.WALL_SPLIT_COL
            else Candle.Dedication.VIU
        )

        # --- Create and immediately activate ---
        candle = Candle.objects.create(
            user=user,
            col=col,
            row=row,
            dedicated_to_name=dedicated_to_name,
            price_lei=0,
            dedication_type=dedication_type,
            stripe_payment_intent_id=f"free_{uuid.uuid4().hex}",
            status=Candle.Status.PENDING,
        )
        candle.activate()
        try:
            CandleEvent.objects.create(
                kind=CandleEvent.Kind.FREE,
                phone_masked=mask_phone(phone),
                requester_name=requester_name,
                dedicated_to_name=dedicated_to_name,
                col=col,
                row=row,
                dedication_type=dedication_type,
                ip=mask_ip(VisitLoggerMiddleware._get_ip(request)),
                referer=request.META.get('HTTP_REFERER', '')[:500],
            )
        except Exception:
            pass

        return Response(
            {"candle_id": candle.id, "free": True},
            status=status.HTTP_201_CREATED,
        )
