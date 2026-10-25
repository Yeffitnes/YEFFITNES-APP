#!/usr/bin/env bash
# Corre TODAS las migraciones desde cero + TODAS las pruebas de ataque RLS en un Postgres desechable.
# Requisitos: Postgres 16 instalado (ver docs/AGENT_PLAYBOOK.md §3). Uso: bash supabase/tests/run_local.sh [nombre_bd]
# Sale con código distinto de 0 si alguna migración falla o algún ataque tiene éxito.
set -uo pipefail
cd "$(dirname "$0")/../.."
DB="${1:-rls_check}"; FAIL=0
if [ "$(id -u)" = 0 ]; then PSQL() { runuser -u postgres -- psql "$@"; }; else PSQL() { psql "$@"; }; fi
(pg_ctlcluster 16 main start >/dev/null 2>&1 || true); sleep 2
PSQL -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null || { echo "No hay Postgres disponible (ver AGENT_PLAYBOOK §3)"; exit 2; }
run() { PSQL -q -v ON_ERROR_STOP=1 -d "$DB" "$@" >/dev/null 2>/tmp/run_local_err.txt || { echo "✗ falló: $*"; head -3 /tmp/run_local_err.txt; FAIL=1; }; }
run -f supabase/tests/stub_auth.sql
run -c "alter default privileges in schema public grant all on tables to authenticated" -c "alter default privileges in schema public grant execute on functions to authenticated"
run -f supabase/migrations/0001_foundation.sql
run -c "insert into public.workspaces (slug,name,whatsapp) values ('yeffitnes','YEFFITNES TRAINING','573000000000')"
for f in $(ls supabase/migrations/*.sql | sed 1d); do run -f "$f"; done
echo "Migraciones: $(ls supabase/migrations/*.sql | wc -l) aplicadas"
for t in rls rls_progress rls_agenda; do   # el orden importa: cada una usa los datos de la anterior
  [ -f supabase/tests/$t.sql ] || continue
  OUT=$(PSQL -d "$DB" -f supabase/tests/$t.sql 2>&1)
  if echo "$OUT" | grep -q 'RESULTADO ATAQUES[A-Z ]*: ninguno'; then echo "✓ $t: ninguno"; else echo "✗ $t:"; echo "$OUT" | grep -E 'RESULTADO|ERROR|CONTEXT' | head -5; FAIL=1; fi
done
[ $FAIL = 0 ] && echo "TODO OK" || echo "HAY FALLOS"; exit $FAIL
