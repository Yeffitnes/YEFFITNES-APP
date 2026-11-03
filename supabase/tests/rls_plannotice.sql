-- Pruebas de ataque de 0047: aviso de cambio de plan y "Probar avisos". Ejecutar al FINAL (usa los datos de las anteriores).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cc uuid; n int; bad text:='';
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cc from public.clients where profile_id=c;
  perform pg_temp.reset();
  delete from public.push_subscriptions where endpoint like 'https://test.push/%';
  insert into public.push_subscriptions (endpoint, profile_id, workspace_id, p256dh, auth) values
    ('https://test.push/a1', a, ws, 'k', 'x'), ('https://test.push/b1', b, ws, 'k', 'x'), ('https://test.push/j1', jeff, ws, 'k', 'x');
  -- cliente A no puede pedir los teléfonos de nadie
  perform pg_temp.as_user(a);
  select count(*) into n from public.plan_change_targets(ca, 'training'); if n > 0 then bad:=bad||' [el cliente obtuvo teléfonos]'; end if;
  select count(*) into n from public.my_push_devices() d where d.endpoint like 'https://test.push/%'; if n <> 1 then bad:=bad||' [my_push_devices no devuelve solo el suyo]'; end if;
  select count(*) into n from public.my_push_devices() d join public.push_subscriptions s on s.endpoint = d.endpoint where s.profile_id <> a; if n > 0 then bad:=bad||' [el cliente ve teléfonos ajenos]'; end if;
  select count(*) into n from public.plan_notices; if n > 0 then bad:=bad||' [el cliente lee plan_notices]'; end if;
  -- otro coach: nada
  perform pg_temp.as_user(o);
  select count(*) into n from public.plan_change_targets(ca, 'training'); if n > 0 then bad:=bad||' [otro coach obtuvo teléfonos]'; end if;
  -- Jeff: una vez, y no de nuevo en 30 min; nutrición aparte; cliente pendiente nada; tipo inválido nada
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.plan_change_targets(ca, 'training') t where t.endpoint like 'https://test.push/%'; if n <> 1 then bad:=bad||' [Jeff no obtuvo el teléfono del cliente: '||n||']'; end if;
  select count(*) into n from public.plan_change_targets(ca, 'training'); if n > 0 then bad:=bad||' [segundo aviso antes de 30 min]'; end if;
  select count(*) into n from public.plan_change_targets(ca, 'nutrition') t where t.endpoint like 'https://test.push/%'; if n <> 1 then bad:=bad||' [nutrición no avisó]'; end if;
  select count(*) into n from public.plan_change_targets(cc, 'training'); if n > 0 then bad:=bad||' [avisó a un cliente pendiente]'; end if;
  select count(*) into n from public.plan_change_targets(ca, 'otro'); if n > 0 then bad:=bad||' [tipo inválido aceptado]'; end if;
  select count(*) into n from public.my_push_devices() d join public.push_subscriptions s on s.endpoint = d.endpoint where s.profile_id <> jeff; if n > 0 then bad:=bad||' [Jeff ve teléfonos ajenos]'; end if;
  perform pg_temp.reset();
  update public.plan_notices set sent_at = now() - interval '31 minutes' where client_id = ca;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.plan_change_targets(ca, 'training') t where t.endpoint like 'https://test.push/%'; if n <> 1 then bad:=bad||' [tras 30 min no volvió a avisar]'; end if;
  perform pg_temp.reset();
  delete from public.push_subscriptions where endpoint like 'https://test.push/%';
  raise notice 'RESULTADO ATAQUES AVISO DE PLAN: %', coalesce(nullif(bad,''),'ninguno');
end $$;
