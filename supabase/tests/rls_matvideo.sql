-- Pruebas de ataque del vídeo privado en Material y del vídeo del día/semana (0035). Ejecutar al FINAL (después de rls_access.sql).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; mp uuid; mf uuid; n int; v text; bad text:='';
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  update public.plans set features = array['training','daily_report','progress','education_basic'] where name='Esencial' and workspace_id=ws;
  update public.clients set status='active', plan_id=(select id from public.plans where name='Esencial' and workspace_id=ws) where id=ca;   -- A: básico
  update public.clients set status='active', plan_id=(select id from public.plans where name='SoloRutina' and workspace_id=ws) where id=cb; -- B: sin material
  update public.clients set status='pending', plan_id=null where profile_id=c;

  -- Jeff crea un vídeo privado: borrador mientras sube, luego lo engancha y publica
  perform pg_temp.as_user(jeff);
  insert into public.materials (workspace_id,kind,title,tier,published) values (ws,'video','Privado básico','basic',false) returning id into mp;
  insert into public.materials (workspace_id,kind,title,tier,published) values (ws,'video','Privado completo','full',false) returning id into mf;
  if pg_temp.try(format('insert into public.materials (workspace_id,kind,title,tier,published) values (%L,%L,%L,%L,true)', ws,'video','Sin fuente','basic')) then bad:=bad||' [vídeo publicado sin fuente]'; end if;
  perform public.register_material_video('f0000001-0000-0000-0000-000000000001');
  perform public.register_material_video('f0000001-0000-0000-0000-000000000002');
  perform public.attach_material_video(mp, 'f0000001-0000-0000-0000-000000000001', true);
  perform public.attach_material_video(mf, 'f0000001-0000-0000-0000-000000000002', true);
  -- no se puede enganchar un vídeo que es de un cliente (reporte) ni uno inventado
  perform pg_temp.reset(); insert into public.video_uploads (video_id, workspace_id, client_id) values ('f0000001-0000-0000-0000-0000000000aa', ws, ca);
  perform pg_temp.as_user(jeff);
  if pg_temp.try(format('select public.attach_material_video(%L, %L, true)', mp, 'f0000001-0000-0000-0000-0000000000aa')) then bad:=bad||' [enganchó el vídeo de un cliente]'; end if;
  if pg_temp.try(format('select public.attach_material_video(%L, %L, true)', mp, 'f0000001-0000-0000-0000-0000000000bb')) then bad:=bad||' [enganchó un vídeo no registrado]'; end if;
  if pg_temp.try('select public._video_in_use(''x'')') then bad:=bad||' [coach usa _video_in_use]'; end if;
  perform pg_temp.reset();
  if public._video_in_use('f0000001-0000-0000-0000-000000000001') is not true then bad:=bad||' [el vídeo del material cuenta como huérfano]'; end if;

  -- Clientes: A (básico) ve el básico pero no el completo; B (sin material) ni el pendiente ven nada
  perform pg_temp.as_user(a);
  if public.material_video(mp) is distinct from 'f0000001-0000-0000-0000-000000000001' then bad:=bad||' [A no obtiene su vídeo básico]'; end if;
  if public.material_video(mf) is not null then bad:=bad||' [A obtuvo el vídeo del plan completo]'; end if;
  if pg_temp.try('select public.register_material_video(''f0000001-0000-0000-0000-0000000000cc'')') then bad:=bad||' [cliente registró vídeo de material]'; end if;
  if pg_temp.try(format('select public.attach_material_video(%L, %L, true)', mp, 'f0000001-0000-0000-0000-000000000002')) then bad:=bad||' [cliente cambió el vídeo de un material]'; end if;
  select count(*) into n from public.list_materials() where id=mp and private_video; if n<>1 then bad:=bad||' [la lista no marca el vídeo privado]'; end if;
  perform pg_temp.as_user(b);
  if public.material_video(mp) is not null then bad:=bad||' [B sin material obtuvo el vídeo]'; end if;
  perform pg_temp.as_user(c);
  if public.material_video(mp) is not null then bad:=bad||' [pendiente obtuvo el vídeo]'; end if;
  perform pg_temp.as_user(o);
  if public.material_video(mp) is not null then bad:=bad||' [otro coach obtuvo el vídeo]'; end if;
  if pg_temp.try(format('select public.set_featured_material(%L, true, %L)', mp, 'day')) then bad:=bad||' [otro coach destacó un vídeo ajeno]'; end if;

  -- Vídeo del día: se ve hoy y desaparece cuando vence; un vídeo del plan completo no se puede destacar
  perform pg_temp.as_user(jeff);
  perform public.set_featured_material(mp, true, 'day');
  if pg_temp.try(format('select public.set_featured_material(%L, true, %L)', mf, 'week')) then bad:=bad||' [destacó un vídeo del plan completo]'; end if;
  if pg_temp.try(format('select public.set_featured_material(%L, true, %L)', mp, 'mes')) then bad:=bad||' [periodo inválido aceptado]'; end if;
  perform public.set_featured_material(mp, true, 'day');
  perform pg_temp.as_user(a);
  select count(*) into n from public.list_materials() where id=mp and is_featured and featured_period='day'; if n<>1 then bad:=bad||' [no se ve el vídeo del día]'; end if;
  perform pg_temp.reset(); update public.materials set featured_until = current_date - 2 where id=mp;
  perform pg_temp.as_user(a);
  select count(*) into n from public.list_materials() where is_featured; if n<>0 then bad:=bad||' [se muestra un destacado vencido]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES MATVIDEO: %', coalesce(nullif(bad,''),'ninguno');
end $$;
