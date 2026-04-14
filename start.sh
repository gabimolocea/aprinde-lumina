#!/usr/bin/env bash
# -------------------------------------------------------
# start.sh — Pornește backend (Django) și frontend (Vite)
# Folosire: ./start.sh
# -------------------------------------------------------
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# Culori pentru log
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
RESET="\033[0m"

log() { echo -e "${CYAN}[start.sh]${RESET} $*"; }

# ---- Cleanup: omoară procesele child la ieșire ----
trap 'log "Se opresc procesele..."; kill 0' EXIT

# ---- Backend ----
log "${GREEN}Pornire backend Django pe :8000${RESET}"
cd "$BACKEND"

# Activează virtualenv
if [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
elif [ -f "venv/bin/activate" ]; then
  source venv/bin/activate
else
  log "EROARE: Nu găsesc virtualenv. Rulează: cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

# Încarcă .env dacă există
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.development}"

# Rulează migrările automat la pornire
log "Se aplică migrationile..."
python manage.py migrate --run-syncdb 2>&1 | sed 's/^/  [django] /'

# Pornește serverul în fundal
python manage.py runserver 0.0.0.0:8000 2>&1 | sed "s/^/  ${GREEN}[backend]${RESET} /" &
BACKEND_PID=$!

# ---- Frontend ----
log "${YELLOW}Pornire frontend Vite pe :5173${RESET}"
cd "$FRONTEND"

# Instalează dependențele dacă node_modules lipsește
if [ ! -d "node_modules" ]; then
  log "Se instalează dependențele npm..."
  npm install
fi

npm run dev 2>&1 | sed "s/^/  ${YELLOW}[frontend]${RESET} /" &
FRONTEND_PID=$!

# ---- Așteaptă ----
echo ""
log "Backend PID=$BACKEND_PID | Frontend PID=$FRONTEND_PID"
log "Apasă ${CYAN}Ctrl+C${RESET} pentru a opri ambele servicii."
log "  Backend:  http://localhost:8000"
log "  Frontend: http://localhost:5173"
echo ""
wait
