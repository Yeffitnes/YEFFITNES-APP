#!/usr/bin/env bash
# Revisión completa de punta a punta (4-nov). Corre cada prueba con la base recién creada y los datos que necesita, y resume.
# Uso: bash tests/e2e/all.sh   (tarda ~20 min: en un chat con límite de 10 min por comando, lánzalo en segundo plano:
#      nohup bash tests/e2e/all.sh > /tmp/e2e_all.out 2>&1 &   y revisa /tmp/e2e_all.out). Logs por prueba en tests/e2e/logs/.
# push.js NO está aquí: necesita compilar con claves VAPID de prueba (ver README). Al terminar, vuelve a compilar normal antes de subir.
cd "$(dirname "$0")/../.."; OUT=tests/e2e/logs; mkdir -p $OUT
P() { runuser -u postgres -- psql -q -d e2e -c "$1" >/dev/null; }
REP="insert into daily_reports (workspace_id, client_id, report_date, comment) select workspace_id, id, (now() at time zone 'America/Bogota')::date, 'Hoy me sentí bien' from clients where profile_id='00000000-0000-0000-0000-00000000000a' on conflict do nothing"
REP_T="insert into daily_reports (workspace_id, client_id, report_date, comment, created_at) select workspace_id, id, (now() at time zone 'America/Bogota')::date, 'Hoy me sentí bien', (date_trunc('day', now() at time zone 'America/Bogota') + interval '20 hours 42 minutes') at time zone 'America/Bogota' from clients where profile_id='00000000-0000-0000-0000-00000000000a' on conflict do nothing"
NUDGE="insert into nudges (workspace_id, client_id, kind, day) select workspace_id, id, 'nothing', (now() at time zone 'America/Bogota')::date from clients where profile_id='00000000-0000-0000-0000-00000000000a'"
FAIL=0
run() { local t=$1; shift; bash tests/e2e/run.sh setup >/dev/null 2>&1; for q in "$@"; do P "$q"; done
  LATENCY=150 bash tests/e2e/run.sh $t > $OUT/$t.log 2>&1; local r=$?; [ $r = 0 ] || FAIL=1
  echo "$([ $r = 0 ] && echo "OK   " || echo "FALLA") $t · $(grep -c '^OK' $OUT/$t.log) pasos OK · $(grep -c '^FAIL' $OUT/$t.log) fallas"; }
run smoke.js; run flows.js; run extras.js; run photos.js; run offline.js; run catalog.js; run swaps.js
run nudge_row.js "$NUDGE"; run review2.js "$REP"; run review3.js; run report_time.js "$REP_T"; run away.js; run ficha.js "$REP"; run stuck.js
bash tests/e2e/run.sh setup >/dev/null 2>&1
LATENCY=150 bash tests/e2e/run.sh hydration.js > $OUT/hydration.log 2>&1; n=$(grep -vc ' ok$' $OUT/hydration.log); [ "$n" = 0 ] || FAIL=1; echo "$([ "$n" = 0 ] && echo "OK   " || echo "FALLA") hydration.js (Hoy) · $n aperturas con redibujo"
PAGE=/inicio/progreso LATENCY=150 bash tests/e2e/run.sh hydration.js > $OUT/hydration_prog.log 2>&1; n=$(grep -vc ' ok$' $OUT/hydration_prog.log); [ "$n" = 0 ] || FAIL=1; echo "$([ "$n" = 0 ] && echo "OK   " || echo "FALLA") hydration.js (Progreso) · $n aperturas con redibujo"
grep -h "=== ERRORES" -A1 $OUT/*.log | grep -v "^--$\|=== ERRORES\|ninguno" | head -5
[ $FAIL = 0 ] && echo "TODO OK (e2e)" || echo "HAY FALLAS (mira tests/e2e/logs/)"; exit $FAIL
