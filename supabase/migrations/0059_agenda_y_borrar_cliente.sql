-- 0059 (22-nov, reporte de Cristian y Yeff):
-- 1) Publicar disponibilidad decía "publicada" aunque no se creara nada. Causa: los horarios se insertaban con "si ya existe,
--    ignóralo" sobre la regla única (espacio, hora de inicio). Un horario QUITADO sigue en la tabla (estado 'cancelled'), así que
--    volver a publicar esa misma hora no hacía nada, y tampoco avisaba. publish_slots(): crea los nuevos, vuelve a abrir los que se
--    habían quitado, se salta los que chocan con un horario abierto (reservado o no) y devuelve cuántos de cada uno, para decirlo.
-- 2) Eliminar un cliente por completo desde su ficha: delete_client() borra su cuenta (y en cadena todo lo suyo, como el SQL de
--    docs/SQL_CUENTAS.md §2) y manda sus vídeos a la basura de Bunny. El coach puede borrar las fotos de progreso de su espacio
--    (la ruta /api/clients/delete las borra antes de la cuenta).
-- Revertir: drop function publish_slots(timestamptz[], int, text, int); drop function delete_client(uuid);
--           drop policy "fotos: el coach borra las de su espacio" on storage.objects;

create or replace function public.publish_slots(p_starts timestamptz[], p_duration int, p_kind text, p_capacity int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); s timestamptz; made int := 0; reopened int := 0; clash int := 0; past int := 0; clash_at timestamptz[] := '{}';
begin
  if public.my_role() is distinct from 'coach' or ws is null then raise exception 'not_allowed'; end if;
  if p_duration not between 10 and 240 or p_kind not in ('initial', 'followup') or p_capacity not between 1 and 30 then raise exception 'bad_input'; end if;
  if coalesce(array_length(p_starts, 1), 0) > 60 then raise exception 'too_many'; end if;
  for s in select distinct x from unnest(p_starts) x order by 1 loop
    if s <= now() then past := past + 1; continue; end if;
    -- choca con un horario abierto (el mismo inicio o se monta encima)
    if exists (select 1 from availability_slots a where a.workspace_id = ws and a.status = 'open'
               and a.starts_at < s + make_interval(mins => p_duration) and a.starts_at + make_interval(mins => a.duration_min) > s) then
      clash := clash + 1; clash_at := clash_at || s; continue;
    end if;
    update availability_slots set status = 'open', duration_min = p_duration, kind = p_kind, capacity = p_capacity
      where workspace_id = ws and starts_at = s and status = 'cancelled';
    if found then reopened := reopened + 1; continue; end if;
    insert into availability_slots (workspace_id, starts_at, duration_min, kind, capacity) values (ws, s, p_duration, p_kind, p_capacity);
    made := made + 1;
  end loop;
  return jsonb_build_object('created', made + reopened, 'reopened', reopened, 'clash', clash, 'past', past, 'clash_at', to_jsonb(clash_at));
end $$;
revoke all on function public.publish_slots(timestamptz[], int, text, int) from public, anon;
grant execute on function public.publish_slots(timestamptz[], int, text, int) to authenticated;

create or replace function public.delete_client(p_client uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); uid uuid; nm text; vids int;
begin
  if public.my_role() is distinct from 'coach' or ws is null then raise exception 'not_allowed'; end if;
  select c.profile_id, p.full_name into uid, nm from clients c join profiles p on p.id = c.profile_id where c.id = p_client and c.workspace_id = ws;
  if uid is null then raise exception 'not_found'; end if;
  if exists (select 1 from profiles where id = uid and role <> 'client') then raise exception 'not_a_client'; end if;
  insert into message_trash (workspace_id, kind, ref) select workspace_id, 'video', video_id from video_uploads where client_id = p_client;
  get diagnostics vids = row_count;
  delete from auth.users where id = uid;   -- en cadena: perfil, ficha y todo lo del cliente
  if exists (select 1 from clients where id = p_client) then delete from clients where id = p_client; end if;   -- por si el perfil no colgaba de auth
  return jsonb_build_object('name', nm, 'videos', vids);
end $$;
revoke all on function public.delete_client(uuid) from public, anon;
grant execute on function public.delete_client(uuid) to authenticated;

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects')
     and not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'fotos: el coach borra las de su espacio') then
    create policy "fotos: el coach borra las de su espacio" on storage.objects for delete to authenticated
      using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = public.my_workspace()::text and public.my_role() = 'coach');
  end if;
end $$;
