from rest_framework import serializers
from .models import Banner


class BannerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = ["id", "placement", "image_url", "link_url", "width", "height"]

    def get_image_url(self, obj):
        url = obj.effective_image_url
        if url and url.startswith("/"):
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(url)
        return url
