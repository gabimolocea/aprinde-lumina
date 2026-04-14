"""
SMS OTP authentication views.

Flow:
  POST /api/auth/request-otp/   { phone }  → sends SMS, returns 200
  POST /api/auth/verify-otp/    { phone, code } → returns { token, user }
  GET  /api/auth/me/             → returns current user (requires token)
  POST /api/auth/logout/         → deletes token
"""
import random
import string
from datetime import timedelta

from django.utils import timezone
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token

from .models import User, OTP
from .serializers import RequestOTPSerializer, VerifyOTPSerializer, UserSerializer
from .sms import send_sms


def _generate_otp_code() -> str:
    return "".join(random.choices(string.digits, k=6))


def _normalize_phone(phone: str) -> str:
    """
    Accept common Romanian formats and normalise to E.164 (+40XXXXXXXXX).
      07XXXXXXXX  → +407XXXXXXXX
      +407XXXXXXXX → unchanged
      004070...   → +4070...
    """
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("00"):
        phone = "+" + phone[2:]
    if phone.startswith("07") or phone.startswith("02") or phone.startswith("03"):
        phone = "+4" + phone  # +4 + 0... = +40...
    return phone


class RequestOTPView(APIView):
    """
    Rate-limit: 1 OTP per phone per minute (checked in serializer).
    """

    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone = _normalize_phone(serializer.validated_data["phone"])

        # Invalidate previous OTPs for this phone
        OTP.objects.filter(phone=phone, used=False).update(used=True)

        # Rate limit: max 1 OTP per 60 seconds
        recent = OTP.objects.filter(
            phone=phone,
            created_at__gte=timezone.now() - timedelta(seconds=60),
        ).exists()
        if recent:
            return Response(
                {"detail": "Ai primit deja un cod. Încearcă din nou în 60 de secunde."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        code = _generate_otp_code()
        OTP.objects.create(
            phone=phone,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=5),
        )

        message = f"Codul tău de verificare Aprinde Lumânarea este: {code}. Valabil 5 minute."
        send_sms(phone, message)

        return Response({"detail": "Codul a fost trimis prin SMS."})


class VerifyOTPView(APIView):
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone = _normalize_phone(serializer.validated_data["phone"])
        code = serializer.validated_data["code"]

        otp = (
            OTP.objects.filter(phone=phone, used=False)
            .order_by("-created_at")
            .first()
        )

        if not otp or not otp.is_valid() or otp.code != code:
            return Response(
                {"detail": "Cod incorect sau expirat."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp.used = True
        otp.save(update_fields=["used"])

        user, _ = User.objects.get_or_create(phone=phone)
        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user).data,
            }
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
