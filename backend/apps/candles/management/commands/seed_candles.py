"""
Management command: seed_candles
Creates demo candle data for presentation purposes.
Safe to run multiple times (skips existing slots).
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import uuid

from apps.candles.models import Candle

# (col, row, name, dedication_type)
# Cols 0–11 → "mort" (left half), cols 12–23 → "viu" (right half)
SEED_CANDLES = [
    # ── Row 0 ──
    (1,  0,  "Ion Popescu",          "mort"),
    (3,  0,  "Maria Ionescu",        "mort"),
    (5,  0,  "Elena Dumitrescu",     "mort"),
    (13, 0,  "Gheorghe Stan",        "viu"),
    (15, 0,  "Ana Constantin",       "viu"),
    (17, 0,  "Florea Marin",         "viu"),
    # ── Row 1 ──
    (0,  1,  "Vasile Popa",          "mort"),
    (2,  1,  "Tudor Mocanu",         "mort"),
    (4,  1,  "Steluta Vlad",         "mort"),
    (12, 1,  "Mihai Stoica",         "viu"),
    (14, 1,  "Ioana Barbu",          "viu"),
    (16, 1,  "Dumitru Radu",         "viu"),
    # ── Row 2 ──
    (1,  2,  "Cornelia Negru",       "mort"),
    (3,  2,  "Aurel Dinu",           "mort"),
    (5,  2,  "Paraschiva Stan",      "mort"),
    (13, 2,  "Rodica Matei",         "viu"),
    (15, 2,  "Constantin Lazar",     "viu"),
    (17, 2,  "Doina Marinescu",      "viu"),
    # ── Row 3 ──
    (0,  3,  "Lucia Neagu",          "mort"),
    (2,  3,  "Petru Ionita",         "mort"),
    (12, 3,  "Traian Coman",         "viu"),
    (14, 3,  "Margareta Voicu",      "viu"),
    (16, 3,  "Niculae Dobre",        "viu"),
    # ── Row 4 ──
    (1,  4,  "Elisabeta Ghita",      "mort"),
    (4,  4,  "Radu Zamfir",          "mort"),
    (13, 4,  "Cristina Popa",        "viu"),
    (16, 4,  "Liviu Olteanu",        "viu"),
    # ── Row 5 (5 RON zone) ──
    (0,  5,  "Eftimie Badea",        "mort"),
    (3,  5,  "Filofteia Rusu",       "mort"),
    (5,  5,  "Grigore Zaharia",      "mort"),
    (12, 5,  "Marian Trandafir",     "viu"),
    (15, 5,  "Ecaterina Vlad",       "viu"),
    # ── Row 6 ──
    (2,  6,  "Viorica Preda",        "mort"),
    (4,  6,  "Neculai Chirica",      "mort"),
    (13, 6,  "Alexandru Balan",      "viu"),
    (17, 6,  "Sorin Apostolescu",    "viu"),
    # ── Row 7 ──
    (1,  7,  "Sevastita Rus",        "mort"),
    (12, 7,  "Diana Florescu",       "viu"),
    (15, 7,  "Bogdan Mateescu",      "viu"),
    # ── Row 8 ──
    (0,  8,  "Avram Mocanu",         "mort"),
    (3,  8,  "Tecla Ionescu",        "mort"),
    (5,  8,  "Zamfira Ghinea",       "mort"),
    (14, 8,  "Cosmin Vrabie",        "viu"),
    (16, 8,  "Laura Albulescu",      "viu"),
    # ── Row 9 ──
    (2,  9,  "Gheorghita Draghici",  "mort"),
    (13, 9,  "Mihaela Serban",       "viu"),
]


class Command(BaseCommand):
    help = "Seed demo candle data for presentation"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Remove all existing seeded candles before creating new ones",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            deleted, _ = Candle.objects.filter(
                stripe_payment_intent_id__startswith="demo_seed_"
            ).delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} seeded candles."))

        now = timezone.now()
        created = 0
        skipped = 0

        for col, row, name, dedication_type in SEED_CANDLES:
            # Skip if slot is already occupied by an active candle
            if Candle.objects.filter(col=col, row=row, status=Candle.Status.ACTIVE).exists():
                skipped += 1
                continue

            Candle.objects.create(
                col=col,
                row=row,
                dedicated_to_name=name,
                dedication_type=dedication_type,
                price_lei=5,  # display price (actual pricing by row handled at buy time)
                status=Candle.Status.ACTIVE,
                lit_at=now - timedelta(hours=12),
                expires_at=now + timedelta(days=6, hours=12),
                stripe_payment_intent_id=f"demo_seed_{uuid.uuid4().hex}",
                renewal_sms_sent=False,
            )
            created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done — created {created} candles, skipped {skipped} (slot occupied)."
            )
        )
