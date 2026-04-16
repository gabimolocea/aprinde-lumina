from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.candles.models import Candle


class Command(BaseCommand):
    help = "Expire candles whose expires_at has passed"

    def handle(self, *args, **options):
        now = timezone.now()
        count = Candle.objects.filter(
            status=Candle.Status.ACTIVE,
            expires_at__lte=now,
        ).update(status=Candle.Status.EXPIRED)
        self.stdout.write(self.style.SUCCESS(f"Expired {count} candles."))
