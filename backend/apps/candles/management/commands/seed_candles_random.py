"""
Management command: seed_candles_random
Lights N random candles across the entire grid.
Used by Railway cron job (every 12 hours) and Celery task.
"""
import random
import uuid
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from apps.candles.models import Candle

WALL_COLS = 24   # 0..23 (12 Adormiți | 12 Vii)
WALL_ROWS = 200
SPLIT_COL = 12   # cols 0..11 = morți, 12..23 = vii

# ── Romanian name pools ───────────────────────────────────────────────────────
MORT_NAMES = [
    "Ion Popescu", "Maria Ionescu", "Gheorghe Stan", "Elena Dumitrescu",
    "Vasile Popa", "Ana Constantin", "Tudor Mocanu", "Steluta Vlad",
    "Cornelia Negru", "Aurel Dinu", "Paraschiva Stan", "Lucia Neagu",
    "Petru Ionita", "Elisabeta Ghita", "Eftimie Badea", "Filofteia Rusu",
    "Viorica Preda", "Neculai Chirica", "Sevastita Rus", "Avram Mocanu",
    "Tecla Ionescu", "Zamfira Ghinea", "Gheorghita Draghici", "Octavian Marin",
    "Domnica Stoian", "Nastase Florea", "Veturia Apostol", "Simion Dinca",
    "Catinca Stefan", "Zaharia Moldovan", "Raveca Grecu", "Achim Lascu",
    "Profira Bularca", "Calistrat Nita", "Ermil Draghiceanu", "Constanta Baciu",
    "Niculae Dobre", "Magdalena Vintila", "Traian Enache", "Aurelia Cojan",
    "Dumitru Sandu", "Floarea Badescu", "Gheorghe Apostol", "Ileana Rus",
    "Miron Toma", "Aspazia Vlasceanu", "Radu Zamfir", "Didina Olariu",
    "Iordache Marinescu", "Letitia Gavrilescu", "Grigore Zaharia", "Ecaterina Vlad",
    "Niculina Badea", "Teodor Chirita", "Safta Grecu", "Pantelimon Chirica",
    "Ioana Barbu", "Traian Coman", "Dorin Mocanu", "Mariana Rus",
]

VIU_NAMES = [
    "Andrei Popescu", "Elena Ionescu", "Alexandru Balan", "Diana Florescu",
    "Bogdan Mateescu", "Cosmin Vrabie", "Laura Albulescu", "Mihaela Serban",
    "Cristina Popa", "Liviu Olteanu", "Marian Trandafir", "Monica Vlad",
    "Sorin Apostolescu", "Rodica Matei", "Constantin Lazar", "Doina Marinescu",
    "Razvan Teodorescu", "Simona Cojocaru", "Petrica Enache", "Luminita Badea",
    "Catalin Rusu", "Monica Dinu", "George Tanase", "Andreea Stefanescu",
    "Florin Moldovan", "Roxana Preda", "Victor Dumitru", "Elena Cojocaru",
    "Robert Ionita", "Daniela Nistor", "Adrian Stan", "Gabriela Iliescu",
    "Silviu Marin", "Carmen Apostol", "Ionut Gheorghe", "Nicoleta Popa",
    "Laurentiu Barbu", "Mihaela Florea", "Sebastian Niculescu", "Ana-Maria Stoian",
    "Radu Ungureanu", "Mirela Chirita", "Tudor Ciobanu", "Madalina Cretu",
    "Vlad Ionescu", "Ioana Zamfir", "Cristian Neagu", "Bianca Muresan",
    "Stefan Draghici", "Patricia Rosu", "Marius Olaru", "Teodora Pop",
    "Alexandru Dumitru", "Andreea Marin", "Razvan Stancu", "Oana Diaconescu",
    "Ionela Constantin", "Bogdan Radulescu", "Simona Matei", "Paul Florescu",
]


class Command(BaseCommand):
    help = "Auto-light random candles across the wall grid (used by cron / Celery)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=100,
            help="Number of candles to light (default: 100)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be created without saving",
        )

    def handle(self, *args, **options):
        count = options["count"]
        dry_run = options["dry_run"]

        # Occupied slots (active candles only)
        occupied = set(
            Candle.objects.filter(status=Candle.Status.ACTIVE).values_list("col", "row")
        )

        # All available slots across the full grid
        available = [
            (col, row)
            for col in range(WALL_COLS)
            for row in range(WALL_ROWS)
            if (col, row) not in occupied
        ]

        if not available:
            self.stdout.write(self.style.WARNING("No available slots — grid is full."))
            return

        to_create = random.sample(available, min(count, len(available)))
        now = timezone.now()
        created = 0

        for col, row in to_create:
            dedication_type = Candle.Dedication.MORT if col < SPLIT_COL else Candle.Dedication.VIU
            name_pool = MORT_NAMES if dedication_type == Candle.Dedication.MORT else VIU_NAMES
            name = random.choice(name_pool)

            if dry_run:
                self.stdout.write(
                    f"[DRY RUN] col={col:2d} row={row:3d} | {dedication_type:<4} | {name}"
                )
                created += 1
                continue

            Candle.objects.create(
                col=col,
                row=row,
                dedicated_to_name=name,
                dedication_type=dedication_type,
                price_lei=0,
                status=Candle.Status.ACTIVE,
                lit_at=now,
                expires_at=now + timedelta(hours=12),
                stripe_payment_intent_id=f"auto_{uuid.uuid4().hex}",
                renewal_sms_sent=False,
            )
            created += 1

        action = "Would create" if dry_run else "Created"
        self.stdout.write(self.style.SUCCESS(f"{action} {created} random candles."))
