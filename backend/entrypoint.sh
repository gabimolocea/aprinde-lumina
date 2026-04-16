#!/bin/sh
set -e

# Wait for PostgreSQL to be ready and grant public schema CREATE (PG 15/16 fix)
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database..."
    python -c "
import time, os, psycopg2
url = os.environ.get('DATABASE_URL', '')
for i in range(30):
    try:
        conn = psycopg2.connect(url)
        conn.autocommit = True
        cur = conn.cursor()
        # PG 15+ revoked CREATE on public schema; grant it back to ourselves
        try:
            cur.execute('GRANT ALL ON SCHEMA public TO CURRENT_USER')
            print('Schema permissions granted.')
        except Exception as ge:
            print(f'Grant skipped (may already have access): {ge}')
        conn.close()
        print('Database ready.')
        break
    except Exception as e:
        print(f'Attempt {i+1}/30: {e}')
        time.sleep(2)
"
fi

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting expire_candles background loop..."
while true; do
    python manage.py expire_candles
    sleep 3600
done &

echo "Starting gunicorn..."
exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers 2 \
    --timeout 60 \
    --access-logfile -
