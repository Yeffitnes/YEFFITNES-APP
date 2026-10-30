#!/usr/bin/env bash
# Prueba de punta a punta en local: Postgres (todas las migraciones + datos de prueba) + PostgREST + un Supabase mínimo (proxy.js) + la app.
# Uso (desde la raíz del repo): bash tests/e2e/run.sh setup   → base nueva, datos de prueba y build de la app apuntando a local
#                               bash tests/e2e/run.sh smoke.js  (o flows.js, hydration.js) → corre el guion con Playwright
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../.." && pwd)"; cd "$HERE"
(pg_ctlcluster 16 main start >/dev/null 2>&1 || true); sleep 1
P() { runuser -u postgres -- psql -q -v ON_ERROR_STOP=1 "$@"; }
if [ "${1:-}" = "setup" ]; then
  [ -x ./postgrest ] || { curl -sSL https://github.com/PostgREST/postgrest/releases/download/v12.2.3/postgrest-v12.2.3-linux-static-x64.tar.xz | tar xJ; }
  P -d postgres -c "drop database if exists e2e" -c "create database e2e"
  P -d e2e -f "$REPO/supabase/tests/stub_auth.sql"
  P -d e2e -c "alter default privileges in schema public grant all on tables to authenticated" -c "alter default privileges in schema public grant execute on functions to authenticated"
  P -d e2e -f "$REPO/supabase/migrations/0001_foundation.sql"
  P -d e2e -c "insert into public.workspaces (slug,name,whatsapp) values ('yeffitnes','YEFFITNES TRAINING','573000000000')"
  for f in $(ls "$REPO"/supabase/migrations/*.sql | sed 1d); do P -d e2e -f "$f" >/dev/null || echo "FALLÓ $f"; done
  P -d e2e -c "create or replace function auth.uid() returns uuid language sql stable as \$\$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true),''), current_setting('request.jwt.claims', true)::json->>'sub')::uuid \$\$" \
    -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator login password 'pw' noinherit; end if; end \$\$" \
    -c "alter role authenticator password 'pw'" -c "grant anon, authenticated to authenticator" -c "grant usage on schema public, auth, storage to anon" \
    -c "grant execute on all functions in schema public to anon, authenticated" -c "grant all on all tables in schema public to authenticated"
  P -d e2e -f seed.sql >/dev/null && echo "Base de prueba lista"
  ANON=$(node -e 'console.log(require("./proxy.js").sign({role:"anon",exp:2000000000}))')
  (cd "$REPO" && NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON npx next build > "$HERE/build.log" 2>&1) && echo "App compilada contra el Supabase local (OJO: vuelve a compilar normal antes de subir)"
  exit 0
fi
./postgrest pgrst.conf > pgrst.log 2>&1 & P1=$!
LATENCY=${LATENCY:-0} node proxy.js > proxy.log 2>&1 & P2=$!
(cd "$REPO" && PORT=3000 npx next start > "$HERE/next.log" 2>&1) & P3=$!
for i in $(seq 1 60); do curl -s -o /dev/null localhost:3000/login && break; sleep 1; done
CLIENT_ID=$(runuser -u postgres -- psql -d e2e -At -c "select id from clients where profile_id='00000000-0000-0000-0000-00000000000a'") node "$HERE/$(basename "$1")"; R=$?
kill $P1 $P2 $P3 2>/dev/null; pkill -f next-serve[r] 2>/dev/null
exit $R
