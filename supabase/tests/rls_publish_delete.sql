-- Pruebas de 0059: publicar disponibilidad (volver a abrir horarios quitados, choques) y eliminar un cliente. Ejecutar al FINAL.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; d timestamptz; r jsonb; sid uuid; n int; bad text:='';
begin
  perform pg_temp.reset();
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  d := date_trunc('day', now()) + interval '9 days' + interval '13 hours';   -- un día futuro, 13:00 UTC

  perform pg_temp.as_user(jeff);
  -- 1) Publicar 4 horarios de 30 min
  r := public.publish_slots(array[d, d + interval '30 min', d + interval '60 min', d + interval '90 min'], 30, 'followup', 1);
  if (r->>'created')::int <> 4 then bad:=bad||' [no creó 4: '||r::text||']'; end if;
  -- un cliente reserva el primero; Yeff quita el segundo
  select id into sid from public.availability_slots where workspace_id = ws and starts_at = d;
  perform public.coach_book_slot(sid, ca);
  update public.availability_slots set status = 'cancelled' where workspace_id = ws and starts_at = d + interval '30 min';
  -- 2) Volver a publicar el mismo rango + uno nuevo: el quitado vuelve, el reservado y los abiertos se respetan, el nuevo se crea
  r := public.publish_slots(array[d, d + interval '30 min', d + interval '60 min', d + interval '90 min', d + interval '120 min'], 30, 'followup', 1);
  if (r->>'created')::int <> 2 or (r->>'reopened')::int <> 1 or (r->>'clash')::int <> 3 then bad:=bad||' [republicar: '||r::text||']'; end if;
  if (select status from public.availability_slots where workspace_id = ws and starts_at = d + interval '30 min') <> 'open' then bad:=bad||' [el quitado no volvió]'; end if;
  if (select count(*) from public.bookings where slot_id = sid and status = 'confirmed') <> 1 then bad:=bad||' [se perdió la reserva]'; end if;
  -- 3) Uno que se monta encima de una sesión reservada (13:15 de 45 min) no se crea
  r := public.publish_slots(array[d + interval '15 min'], 45, 'initial', 1);
  if (r->>'created')::int <> 0 or (r->>'clash')::int <> 1 then bad:=bad||' [se montó encima: '||r::text||']'; end if;
  -- 4) Horas pasadas no se crean; datos inválidos se rechazan
  r := public.publish_slots(array[now() - interval '1 hour'], 30, 'followup', 1);
  if (r->>'created')::int <> 0 or (r->>'past')::int <> 1 then bad:=bad||' [creó una hora pasada]'; end if;
  if not pg_temp.fails(format('select public.publish_slots(array[%L::timestamptz], 5, %L, 1)', d + interval '1 day', 'followup')) then bad:=bad||' [duración inválida aceptada]'; end if;
  -- 5) El cliente y otro coach no publican en el espacio de Yeff
  perform pg_temp.as_user(a);
  if not pg_temp.fails(format('select public.publish_slots(array[%L::timestamptz], 30, %L, 1)', d + interval '2 days', 'followup')) then bad:=bad||' [el cliente publicó]'; end if;
  perform pg_temp.as_user(o);
  perform public.publish_slots(array[d + interval '3 days'], 30, 'followup', 1);
  perform pg_temp.reset();
  if exists (select 1 from public.availability_slots where workspace_id = ws and starts_at = d + interval '3 days') then bad:=bad||' [otro coach publicó en el espacio de Yeff]'; end if;

  -- 6) Eliminar cliente: el cliente no puede, otro coach no puede, Yeff sí y se borra todo lo suyo
  perform pg_temp.as_user(a);
  if not pg_temp.fails(format('select public.delete_client(%L)', cb)) then bad:=bad||' [un cliente borró a otro]'; end if;
  perform pg_temp.as_user(o);
  if not pg_temp.fails(format('select public.delete_client(%L)', cb)) then bad:=bad||' [otro coach borró a un cliente de Yeff]'; end if;
  perform pg_temp.as_user(jeff);
  if not pg_temp.fails(format('select public.delete_client(%L)', gen_random_uuid())) then bad:=bad||' [borró un cliente inexistente]'; end if;
  perform pg_temp.reset();
  insert into public.video_uploads (video_id, workspace_id, client_id) values ('d0000000-0000-4000-8000-0000000000b1', ws, cb);
  insert into public.messages (workspace_id, client_id, sender, body) values (ws, cb, 'client', 'hola');
  perform pg_temp.as_user(jeff);
  r := public.delete_client(cb);
  perform pg_temp.reset();
  if exists (select 1 from public.clients where id = cb) or exists (select 1 from public.profiles where id = b) or exists (select 1 from auth.users where id = b) then bad:=bad||' [quedó la cuenta]'; end if;
  if exists (select 1 from public.messages where client_id = cb) or exists (select 1 from public.workout_logs where client_id = cb) or exists (select 1 from public.bookings where client_id = cb) then bad:=bad||' [quedaron datos del cliente]'; end if;
  if not exists (select 1 from public.message_trash where ref = 'd0000000-0000-4000-8000-0000000000b1') then bad:=bad||' [su vídeo no fue a la basura de Bunny]'; end if;
  if not exists (select 1 from public.clients where id = ca) then bad:=bad||' [se borró otro cliente]'; end if;
  -- el coach no se puede borrar a sí mismo por aquí
  perform pg_temp.as_user(jeff);
  if not pg_temp.fails(format('select public.delete_client(%L)', (select id from public.clients where profile_id = jeff))) and exists (select 1 from public.clients where profile_id = jeff) then null; end if;
  perform pg_temp.reset();
  if not exists (select 1 from auth.users where id = jeff) then bad:=bad||' [se borró el coach]'; end if;
  raise notice 'RESULTADO ATAQUES AGENDA Y BORRADO: %', coalesce(nullif(bad,''),'ninguno');
end $$;
