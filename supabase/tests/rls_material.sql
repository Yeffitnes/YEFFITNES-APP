-- Pruebas de ataque del Material educativo. Ejecutar DESPUÉS de rls.sql, rls_progress.sql y rls_agenda.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1'; ows uuid:='99999999-9999-9999-9999-999999999999';
  ws uuid; ca uuid; cb uuid; mb uuid; mf uuid; mv uuid; mu uuid; n int; r record; bad text:='';
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  perform pg_temp.reset();
  update public.clients set status='active', plan_id=(select id from public.plans where name='Esencial') where id=ca;   -- A: solo 'education_basic'
  update public.clients set status='active', plan_id=(select id from public.plans where name='Completo') where id=cb;   -- B: básico y completo
  perform pg_temp.as_user(jeff);
  insert into public.materials (workspace_id,kind,title,body,tier) values (ws,'article','Basico','texto básico','basic') returning id into mb;
  insert into public.materials (workspace_id,kind,title,body,tier) values (ws,'article','Premium SECRETO','texto SECRETO solo completo','full') returning id into mf;
  insert into public.materials (workspace_id,kind,title,video_ref,tier) values (ws,'video','Video semana','dQw4w9WgXcQ','basic') returning id into mv;
  insert into public.materials (workspace_id,kind,title,body,published) values (ws,'article','Borrador','no publicado',false) returning id into mu;
  perform public.set_featured_material(mv, true); raise notice 'OK Jeff destaca un vídeo básico';
  if not pg_temp.fails(format('select public.set_featured_material(%L,true)', mf)) then bad:=bad||' [destacó un artículo premium]'; end if;
  perform pg_temp.as_user(o);
  if not pg_temp.fails(format('insert into public.materials (workspace_id,kind,title,body) values (%L,%L,%L,%L)', ws,'article','x','y')) then bad:=bad||' [otro coach publicó en el espacio de Jeff]'; end if;
  select count(*) into n from public.materials; if n<>0 then bad:=bad||' [otro coach ve material de Jeff]'; end if;
  perform pg_temp.as_user(a);
  select count(*) into n from public.materials; if n<>0 then bad:=bad||' [cliente lee la tabla materials directo]'; end if;
  select count(*) into n from public.material_views; if n<>0 then bad:=bad||' [cliente lee las visitas]'; end if;
  if not pg_temp.fails(format('insert into public.materials (workspace_id,kind,title,body) values (%L,%L,%L,%L)', ws,'article','x','y')) then bad:=bad||' [cliente publicó material]'; end if;
  if not pg_temp.fails(format('select public.set_featured_material(%L,false)', mv)) then bad:=bad||' [cliente cambió el destacado]'; end if;
  select count(*) into n from public.list_materials(); assert n=3, 'A debe listar 3 publicados (sin el borrador), vio '||n;
  select count(*) into n from public.list_materials() where title='Premium SECRETO' and not unlocked; assert n=1, 'el premium debe verse BLOQUEADO para A';
  select count(*) into n from public.list_materials() where title='Basico' and unlocked; assert n=1;
  select * into r from public.open_material(mb); assert r.body='texto básico'; raise notice 'OK abre material básico';
  if not pg_temp.fails(format('select * from public.open_material(%L)', mf)) then bad:=bad||' [A abrió el contenido premium sin tener el plan]'; end if;
  if not pg_temp.fails(format('select * from public.open_material(%L)', mu)) then bad:=bad||' [A abrió un borrador]'; end if;
  perform pg_temp.as_user(b);
  select * into r from public.open_material(mf); assert r.body like '%SECRETO%'; raise notice 'OK plan completo abre el premium';
  select count(*) into n from public.list_materials() where is_new; assert n=2, 'B debe ver 2 nuevos (vídeo y básico sin ver... premium abierto ya no)' ;
  perform pg_temp.as_user(c);   -- pendiente
  select count(*) into n from public.list_materials(); if n<>0 then bad:=bad||' [cliente pendiente ve material]'; end if;
  if not pg_temp.fails(format('select * from public.open_material(%L)', mb)) then bad:=bad||' [cliente pendiente abrió material]'; end if;
  perform pg_temp.as_user(o);
  select count(*) into n from public.list_materials(); if n<>0 then bad:=bad||' [otro coach usa la lista de clientes]'; end if;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.material_views; assert n=2, 'Jeff debe ver 2 visitas (A básico, B premium), vio '||n;
  select count(*) into n from public.materials where is_featured; assert n=1;
  raise notice 'RESULTADO ATAQUES MATERIAL: %', coalesce(nullif(bad,''),'ninguno');
  perform pg_temp.reset();
end $$;
