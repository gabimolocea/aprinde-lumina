import re
from rest_framework import serializers
from .models import User

PHONE_RE = re.compile(r"^(\+40|0040|0)[0-9]{9}$")


def validate_romanian_phone(value):
    cleaned = value.strip().replace(" ", "").replace("-", "")
    if not PHONE_RE.match(cleaned):
        raise serializers.ValidationError(
            "Introdu un număr de telefon românesc valid (ex: 07XXXXXXXX)."
        )
    return cleaned


class RequestOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20, validators=[validate_romanian_phone])


class VerifyOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20, validators=[validate_romanian_phone])
    code = serializers.CharField(min_length=6, max_length=6)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "phone", "display_name", "sms_reminders", "date_joined"]
        read_only_fields = ["id", "phone", "date_joined"]
