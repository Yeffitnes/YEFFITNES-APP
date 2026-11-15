-- Pruebas de 0039/0040: imágenes de ejercicios y ejercicios precargados. Ejecutar al FINAL.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ws2 uuid; n int; bad text:='';
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select workspace_id into ws2 from public.profiles where id = o;
  -- Precargados: 54 por espacio, sin duplicar si se corre de nuevo, con imagen y series sugeridas
  select count(*) into n from public.exercises where workspace_id = ws and image like 'preset:%'; if n < 54 then bad:=bad||' [faltan precargados: '||n||']'; end if;
  select count(*) into n from (select lower(name) from public.exercises where workspace_id = ws group by lower(name) having count(*) > 1) x; if n<>0 then bad:=bad||' [nombres duplicados]'; end if;
  select count(*) into n from public.exercises where workspace_id = ws and image like 'preset:%' and (sugg_sets is null or sugg_reps is null); if n<>0 then bad:=bad||' [sin series sugeridas]'; end if;
  if pg_temp.try(format('update public.exercises set image = %L where workspace_id = %L', 'http://malo.com/x.png', ws)) then bad:=bad||' [imagen con dirección externa aceptada]'; end if;
  -- Subir imagen: solo el coach, en la carpeta de su espacio
  perform pg_temp.as_user(jeff);
  if not pg_temp.try(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'exercise-images', ws::text || '/x.webp')) then bad:=bad||' [Jeff no pudo subir imagen]'; end if;
  if pg_temp.try(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'exercise-images', ws2::text || '/x.webp')) then bad:=bad||' [Jeff subió a otro espacio]'; end if;
  perform pg_temp.as_user(a);
  if pg_temp.try(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'exercise-images', ws::text || '/y.webp')) then bad:=bad||' [cliente subió imagen de ejercicio]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES EXIMG: %', coalesce(nullif(bad,''),'ninguno');
end $$;
