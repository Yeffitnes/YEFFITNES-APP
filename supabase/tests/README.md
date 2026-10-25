**Atajo:** `bash supabase/tests/run_local.sh` hace todo lo de abajo automáticamente (requiere Postgres 16; ver `docs/AGENT_PLAYBOOK.md` §3).

# Pruebas de seguridad (RLS) en una base local
Comprueban, contra un Postgres desechable (NO tu Supabase real), que un cliente no puede ver ni escribir datos de otro cliente ni de otro coach, ni cambiarse el rol o el plan, ni tocar las columnas del coach; y que sin la función "training" queda bloqueado.

Requisitos: Postgres 15+ con `psql`. En una base vacía:
```
psql -d prueba -v ON_ERROR_STOP=1 -f supabase/tests/stub_auth.sql      # simula auth.users y auth.uid()
psql -d prueba -c "alter default privileges in schema public grant all on tables to authenticated" -c "alter default privileges in schema public grant execute on functions to authenticated"
for f in supabase/migrations/0001*.sql; do psql -d prueba -v ON_ERROR_STOP=1 -f $f; done
psql -d prueba -c "insert into public.workspaces (slug,name,whatsapp) values ('yeffitnes','YEFFITNES TRAINING','573000000000')"
for f in $(ls supabase/migrations/*.sql | sed 1d); do psql -d prueba -v ON_ERROR_STOP=1 -f $f; done
psql -d prueba -f supabase/tests/rls.sql            # entrenamientos, revisión, aislamiento
psql -d prueba -f supabase/tests/rls_progress.sql   # mediciones y fotos (ejecutar DESPUÉS de rls.sql)
psql -d prueba -f supabase/tests/rls_agenda.sql     # agenda y reservas (DESPUÉS de las dos anteriores)
psql -d prueba -f supabase/tests/rls_material.sql   # material educativo (DESPUÉS de las anteriores)
psql -d prueba -f supabase/tests/rls_notes.sql      # anuncios y notas privadas (DESPUÉS de rls_material)
psql -d prueba -f supabase/tests/rls_reports.sql    # reporte diario y vídeos (DESPUÉS de rls_notes)
psql -d prueba -f supabase/tests/rls_nutrition.sql  # nutrición (DESPUÉS de rls_reports)
psql -d prueba -f supabase/tests/rls_onboarding.sql # onboarding (DESPUÉS de rls_nutrition)
psql -d prueba -f supabase/tests/rls_objective.sql  # objetivo (DESPUÉS de rls_onboarding)
```
Salida esperada: todas las líneas `OK`, `RESULTADO ATAQUES: ninguno` y `RESULTADO ATAQUES PROGRESO: ninguno` y `RESULTADO ATAQUES AGENDA: ninguno`. `stub_auth.sql` simula también el almacenamiento de Supabase (`storage`). Si aparece `FALLO` o un ataque, hay un agujero: no desplegar.
Al agregar una tabla con datos del cliente, añade su caso a `rls.sql`.
