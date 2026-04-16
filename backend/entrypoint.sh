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

        # Print current user for debugging
        cur.execute('SELECT current_user, current_database()')
        row = cur.fetchone()
        print(f'Connected as user={row[0]} db={row[1]}')

        # PG 15/16 revoked CREATE on public from PUBLIC role.
        # Restore it by granting to PUBLIC (all users). This is safe for a private app DB.
        cur.execute('GRANT CREATE ON SCHEMA public TO PUBLIC')
        print('Schema CREATE granted to PUBLIC.')

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
