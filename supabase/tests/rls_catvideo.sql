-- Pruebas de ataque de 0057: vídeo subido en rutinas y ejercicios del catálogo. Ejecutar al FINAL (usa los datos de las anteriores).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ows uuid; ca uuid; tpl uuid; ex uuid; pid uuid; did uuid; personal uuid; n int; bad text:='';
begin
  perform pg_temp.reset();
  select id into ws from public.workspaces where slug='yeffitnes'; select id into ca from public.clients where profile_id=a;
  select workspace_id into ows from public.profiles where id = o;
  select id into tpl from public.routine_templates where workspace_id=ws and active order by created_at limit 1;
  select id into ex from public.exercises where workspace_id=ws and active order by created_at limit 1;
  insert into public.video_uploads (video_id, workspace_id, client_id) values ('c0000000-0000-4000-8000-0000000000c1', ws, null), ('c0000000-0000-4000-8000-0000000000c2', ws, null), ('c0000000-0000-4000-8000-0000000000a1', ws, ca), ('c0000000-0000-4000-8000-0000000000f1', ows, null);

  perform pg_temp.as_user(jeff);
  -- 1) Un vídeo ajeno (de un cliente o de otro espacio) no se acepta en una rutina ni en un ejercicio
  if not pg_temp.fails(format('update public.routine_templates set video_id = %L where id = %L', 'c0000000-0000-4000-8000-0000000000a1', tpl)) then bad:=bad||' [rutina aceptó vídeo de cliente]'; end if;
  if not pg_temp.fails(format('update public.routine_templates set video_id = %L where id = %L', 'c0000000-0000-4000-8000-0000000000f1', tpl)) then bad:=bad||' [rutina aceptó vídeo de otro espacio]'; end if;
  if not pg_temp.fails(format('update public.exercises set video_provider = %L, video_ref = %L where id = %L', 'bunny', 'c0000000-0000-4000-8000-0000000000f1', ex)) then bad:=bad||' [ejercicio aceptó vídeo de otro espacio]'; end if;
  if not pg_temp.fails(format('update public.exercises set video_provider = %L, video_ref = %L where id = %L', 'bunny', 'c0000000-0000-4000-8000-000000000999', ex)) then bad:=bad||' [ejercicio aceptó vídeo inventado]'; end if;
  -- 2) El suyo sí; con vídeo subido el enlace de YouTube se vacía
  update public.routine_templates set video_ref = 'dQw4w9WgXcQ' where id = tpl;
  update public.routine_templates set video_id = 'c0000000-0000-4000-8000-0000000000c1' where id = tpl;
  if (select video_ref from public.routine_templates where id = tpl) is not null then bad:=bad||' [quedaron YouTube y vídeo subido a la vez]'; end if;
  update public.exercises set video_provider = 'bunny', video_ref = 'c0000000-0000-4000-8000-0000000000c2' where id = ex;
  -- 3) Asignar la rutina copia el vídeo; cambiarlo en la rutina llega al plan activo, salvo al día con vídeo personal
  select id into pid from public.training_plans where client_id = ca and status = 'active' limit 1;
  if pid is null then perform pg_temp.reset(); insert into public.training_plans (workspace_id, client_id, name, status, starts_on) values (ws, ca, 'Plan vídeo', 'active', current_date) returning id into pid; perform pg_temp.as_user(jeff); end if;
  did := public.assign_day(pid, 2, tpl, 1);
  if (select video_id from public.plan_days where id = did) is distinct from 'c0000000-0000-4000-8000-0000000000c1' then bad:=bad||' [assign_day no copió el vídeo]'; end if;
  personal := public.assign_day(pid, 4, tpl, 1);
  perform pg_temp.reset(); update public.plan_days set video_id = 'c0000000-0000-4000-8000-0000000000a1' where id = personal; perform pg_temp.as_user(jeff);
  update public.routine_templates set video_id = 'c0000000-0000-4000-8000-0000000000c2' where id = tpl;
  if (select video_id from public.plan_days where id = did) is distinct from 'c0000000-0000-4000-8000-0000000000c2' then bad:=bad||' [el cambio de vídeo no llegó al plan]'; end if;
  if (select video_id from public.plan_days where id = personal) is distinct from 'c0000000-0000-4000-8000-0000000000a1' then bad:=bad||' [se pisó el vídeo personal]'; end if;
  perform public.set_day_video(personal, null);
  if (select video_id from public.plan_days where id = personal) is distinct from 'c0000000-0000-4000-8000-0000000000c2' then bad:=bad||' [quitar el vídeo personal no devolvió el de la rutina]'; end if;
  update public.routine_templates set video_id = null where id = tpl;
  if (select video_id from public.plan_days where id = did) is not null then bad:=bad||' [quitar el vídeo no llegó al plan]'; end if;
  update public.routine_templates set video_id = 'c0000000-0000-4000-8000-0000000000c1' where id = tpl;

  -- 4) El cliente y otro coach no pueden ponerle vídeo al catálogo
  perform pg_temp.as_user(a);
  update public.routine_templates set video_id = 'c0000000-0000-4000-8000-0000000000c2' where id = tpl;
  update public.exercises set video_ref = 'c0000000-0000-4000-8000-0000000000c1' where id = ex;
  perform pg_temp.as_user(o);
  update public.routine_templates set video_id = 'c0000000-0000-4000-8000-0000000000c2' where id = tpl;
  perform pg_temp.reset();
  if (select video_id from public.routine_templates where id = tpl) <> 'c0000000-0000-4000-8000-0000000000c1' or (select video_ref from public.exercises where id = ex) <> 'c0000000-0000-4000-8000-0000000000c2' then bad:=bad||' [alguien de afuera cambió el vídeo]'; end if;
  -- 5) La limpieza de huérfanos no los borra
  if not public._video_in_use('c0000000-0000-4000-8000-0000000000c1') or not public._video_in_use('c0000000-0000-4000-8000-0000000000c2') then bad:=bad||' [vídeo del catálogo marcado como huérfano]'; end if;
  raise notice 'RESULTADO ATAQUES VIDEO CATALOGO: %', coalesce(nullif(bad,''),'ninguno');
end $$;
