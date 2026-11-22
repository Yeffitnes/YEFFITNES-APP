#!/usr/bin/env bash
# Capturas REALES de la app para la landing (22-nov). Usa el entorno de prueba local de tests/e2e con datos de demostración.
# Uso (desde la raíz del repo):
#   bash tests/e2e/run.sh setup                                   # base nueva + build contra el Supabase local
#   runuser -u postgres -- psql -d e2e -f tools/landing/demo.sql  # Valentina Ríos, 12 semanas con Yeff (datos ficticios)
#   bash tools/landing/capture.sh [script.js]                     # por defecto capture.js → public/landing/shots/*.webp + screens.json
# OJO: después, `npm run build` normal antes de subir.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../.." && pwd)"; E2E="$REPO/tests/e2e"
(pg_ctlcluster 16 main start >/dev/null 2>&1 || true); sleep 1
cd "$E2E"
./postgrest pgrst.conf > pgrst.log 2>&1 & P1=$!
node proxy.js > proxy.log 2>&1 & P2=$!
(cd "$REPO" && PORT=3000 npx next start > "$E2E/next.log" 2>&1) & P3=$!
for i in $(seq 1 60); do curl -s -o /dev/null localhost:3000/login && break; sleep 1; done
node "$HERE/${1:-capture.js}"; R=$?
kill $P1 $P2 $P3 2>/dev/null; pkill -f next-serve[r] 2>/dev/null
exit $R
