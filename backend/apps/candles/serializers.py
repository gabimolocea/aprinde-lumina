from rest_framework import serializers
from .models import Candle


class CandleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the wall grid (no photo binary)."""

    class Meta:
        model = Candle
        fields = [
            "id",
            "col",
            "row",
            "dedicated_to_name",
            "dedication_type",
            "has_photo",
            "price_lei",
            "status",
            "lit_at",
            "expires_at",
        ]

    has_photo = serializers.SerializerMethodField()

    def get_has_photo(self, obj):
        return bool(obj.photo)


class CandleDetailSerializer(serializers.ModelSerializer):
    """Full serializer including photo URL, shown on candle click."""

    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Candle
        fields = [
            "id",
            "col",
            "row",
            "dedicated_to_name",
            "dedication_type",
            "photo_url",
            "price_lei",
            "status",
            "lit_at",
            "expires_at",
        ]

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url
        return None


class CandleCreateSerializer(serializers.ModelSerializer):
    """Used when a user requests to light a candle (before payment)."""

    class Meta:
        model = Candle
        fields = [
            "col",
            "row",
            "dedicated_to_name",
            "photo",
        ]

    def validate(self, attrs):
        # Reject if slot already has an active candle
        if Candle.objects.filter(col=attrs["col"], row=attrs["row"], status=Candle.Status.ACTIVE).exists():
            raise serializers.ValidationError("Acest loc este deja ocupat de o lumânare aprinsă.")
        return attrs
