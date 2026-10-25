-- Pruebas de ataque de Anuncios y Notas privadas. Ejecutar DESPUÉS de rls_material.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; n int; bad text:=''; pl uuid;
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  perform pg_temp.reset();
  perform pg_temp.as_user(jeff);
  insert into public.announcements (workspace_id,title,body,pinned) values (ws,'Aviso','Mañana no hay llamadas',true);
  insert into public.announcements (workspace_id,body) values (ws,'Vencido ayer');
  update public.announcements set expires_on = current_date - 1 where body='Vencido ayer';
  insert into public.client_notes (workspace_id,client_id,body) values (ws,ca,'NOTA PRIVADA hombro');
  raise notice 'OK Jeff crea anuncios y notas';
  perform pg_temp.as_user(a);   -- activo, Esencial (tiene announcements)
  select count(*) into n from public.announcements; if n<>0 then bad:=bad||' [cliente lee la tabla announcements]'; end if;
  select count(*) into n from public.client_notes; if n<>0 then bad:=bad||' [cliente lee notas privadas]'; end if;
  if not pg_temp.fails(format('insert into public.client_notes (workspace_id,client_id,body) values (%L,%L,%L)', ws, ca, 'x')) then bad:=bad||' [cliente escribió una nota]'; end if;
  if not pg_temp.fails(format('insert into public.announcements (workspace_id,body) values (%L,%L)', ws, 'x')) then bad:=bad||' [cliente publicó un anuncio]'; end if;
  select count(*) into n from public.list_announcements(); assert n=1, 'A debe ver 1 anuncio vigente, vio '||n;
  perform pg_temp.as_user(o);   -- otro coach
  select count(*) into n from public.announcements; if n<>0 then bad:=bad||' [otro coach ve anuncios]'; end if;
  select count(*) into n from public.client_notes; if n<>0 then bad:=bad||' [otro coach ve notas]'; end if;
  if not pg_temp.fails(format('insert into public.client_notes (workspace_id,client_id,body) values (%L,%L,%L)', ws, ca, 'x')) then bad:=bad||' [otro coach escribió nota a cliente ajeno]'; end if;
  select count(*) into n from public.list_announcements(); if n<>0 then bad:=bad||' [otro coach usa la lista de anuncios de clientes]'; end if;
  perform pg_temp.as_user(c);   -- pendiente
  select count(*) into n from public.list_announcements(); if n<>0 then bad:=bad||' [cliente pendiente ve anuncios]'; end if;
  -- plan sin la función 'announcements'
  perform pg_temp.reset();
  insert into public.plans (workspace_id,name,features) values (ws,'SoloRutina',array['training']) returning id into pl;
  update public.clients set plan_id=pl where id=cb;
  perform pg_temp.as_user(b);
  select count(*) into n from public.list_announcements(); if n<>0 then bad:=bad||' [plan sin anuncios los ve]'; end if;
  perform pg_temp.as_user(jeff);   -- el coach no puede apuntar una nota a un cliente de otro espacio
  select count(*) into n from public.client_notes; assert n=1;
  raise notice 'RESULTADO ATAQUES NOTAS: %', coalesce(nullif(bad,''),'ninguno');
  perform pg_temp.reset();
end $$;
