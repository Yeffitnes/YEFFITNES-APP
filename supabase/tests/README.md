# Pruebas de seguridad (RLS) en una base local
Comprueban, contra un Postgres desechable (NO tu Supabase real), que un cliente no puede ver ni escribir datos de otro cliente ni de otro coach, ni cambiarse el rol o el plan, ni tocar las columnas del coach; y que sin la función "training" queda bloqueado.

Requisitos: Postgres 15+ con `psql`. En una base vacía:
```
psql -d prueba -v ON_ERROR_STOP=1 -f supabase/tests/stub_auth.sql      # simula auth.users y auth.uid()
psql -d prueba -c "alter default privileges in schema public grant all on tables to authenticated" -c "alter default privileges in schema public grant execute on functions to authenticated"
for f in supabase/migrations/0001*.sql; do psql -d prueba -v ON_ERROR_STOP=1 -f $f; done
psql -d prueba -c "insert into public.workspaces (slug,name,whatsapp) values ('yeffitnes','YEFFITNES TRAINING','573000000000')"
for f in supabase/migrations/000[2-9]*.sql; do psql -d prueba -v ON_ERROR_STOP=1 -f $f; done
psql -d prueba -f supabase/tests/rls.sql
```
Salida esperada: todas las líneas `OK` y `RESULTADO ATAQUES: ninguno`. Si aparece `FALLO` o un ataque, hay un agujero: no desplegar.
Al agregar una tabla con datos del cliente, añade su caso a `rls.sql`.
