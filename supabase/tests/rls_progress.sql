-- Pruebas de ataque para Progreso (mediciones y fotos). Ejecutar DESPUÉS de rls.sql (usa sus usuarios y datos).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; o uuid:='00000000-0000-0000-0000-0000000000f1'; ows uuid:='99999999-9999-9999-9999-999999999999';
  ws uuid; ca uuid; cb uuid; bad text:=''; n int;
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id='00000000-0000-0000-0000-00000000000b';
  perform pg_temp.reset();
  update public.clients set plan_id=(select id from public.plans where name='Esencial'), image_consent_at=null where id=ca;  -- A: plan con 'progress', sin consentimiento
  perform pg_temp.as_user(a);
  insert into public.measurements (workspace_id,client_id,weight_kg) values (ws,ca,70); raise notice 'OK medición normal';
  if not pg_temp.fails(format('insert into public.measurements (workspace_id,client_id,measured_on,weight_kg) values (%L,%L,current_date+1,70)', ows, ca)) then bad:=bad||' [A creó medición con workspace de OTRO coach]'; end if;
  if not pg_temp.fails(format('insert into public.measurements (workspace_id,client_id,measured_on,weight_kg) values (%L,%L,current_date+2,70)', ws, cb)) then bad:=bad||' [A creó medición a nombre de B]'; end if;
  if not pg_temp.fails(format('insert into public.measurements (workspace_id,client_id,measured_on,weight_kg,recorded_by) values (%L,%L,current_date+3,70,%L)', ws, ca, 'coach')) then bad:=bad||' [A se hizo pasar por coach]'; end if;
  if not pg_temp.fails(format('update public.measurements set workspace_id=%L where client_id=%L', ows, ca)) then bad:=bad||' [A MOVIÓ su medición a otro espacio]'; end if;
  if not pg_temp.fails(format('insert into public.progress_photos (workspace_id,client_id,storage_path) values (%L,%L,%L)', ws, ca, ws||'/'||ca||'/a.jpg')) then bad:=bad||' [A subió foto sin consentimiento]'; end if;
  perform public.give_image_consent();
  insert into public.progress_photos (workspace_id,client_id,storage_path) values (ws,ca,ws||'/'||ca||'/a.jpg'); raise notice 'OK foto con consentimiento';
  if not pg_temp.fails(format('insert into public.progress_photos (workspace_id,client_id,storage_path) values (%L,%L,%L)', ws, ca, ws||'/'||cb||'/robada.jpg')) then bad:=bad||' [A registró una foto apuntando a la carpeta de B]'; end if;
  if not pg_temp.fails(format('insert into public.progress_photos (workspace_id,client_id,storage_path) values (%L,%L,%L)', ows, ca, ows||'/'||ca||'/x.jpg')) then bad:=bad||' [A registró foto con workspace de OTRO coach]'; end if;
  if not pg_temp.fails(format('insert into public.progress_photos (workspace_id,client_id,storage_path) values (%L,%L,%L)', ws, cb, ws||'/'||cb||'/x.jpg')) then bad:=bad||' [A registró una foto a nombre de B]'; end if;
  insert into storage.objects (bucket_id,name) values ('progress-photos', ws||'/'||ca||'/ok.jpg'); raise notice 'OK subida a su carpeta';
  if not pg_temp.fails(format('insert into storage.objects (bucket_id,name) values (%L,%L)', 'progress-photos', ws||'/'||cb||'/x.jpg')) then bad:=bad||' [A subió archivos a la carpeta de B]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.measurements; if n<>0 then bad:=bad||' [otro coach ve mediciones]'; end if;
  select count(*) into n from public.progress_photos; if n<>0 then bad:=bad||' [otro coach ve fotos]'; end if;
  select count(*) into n from storage.objects; if n<>0 then bad:=bad||' [otro coach ve archivos]'; end if;
  perform pg_temp.reset();
  update public.clients set plan_id=(select id from public.plans where name='SoloContenido') where id=ca; perform pg_temp.as_user(a);
  if not pg_temp.fails(format('insert into public.measurements (workspace_id,client_id,measured_on,weight_kg) values (%L,%L,current_date+9,70)', ws, ca)) then bad:=bad||' [cliente sin "progress" pudo medir]'; end if;
  raise notice 'RESULTADO ATAQUES PROGRESO: %', coalesce(nullif(bad,''),'ninguno');
  perform pg_temp.reset();
end $$;
