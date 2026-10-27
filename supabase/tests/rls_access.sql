-- Pruebas de ataque de "Solicitar acceso" y aviso de activación (0034). Ejecutar al FINAL (después de rls_videoexpiry.sql).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cc uuid; n int; bad text:=''; t timestamptz;
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cc from public.clients where profile_id=c;
  update public.clients set status='pending', plan_id=null, access_requested_at=null where id=cc;
  update public.clients set activated_at = now() - interval '1 day', activation_notified_at = null where id=ca;   -- A lleva tiempo activo
  insert into public.push_subscriptions values ('https://push.example/jeff-acc', jeff, ws, 'k', 'a', now()) on conflict (endpoint) do nothing;
  insert into public.push_subscriptions values ('https://push.example/c-acc', c, ws, 'k', 'a', now()) on conflict (endpoint) do nothing;

  -- El pendiente pide acceso: recibe SOLO los dispositivos del coach, y una vez cada 12 h
  perform pg_temp.as_user(c);
  select count(*) into n from public.request_access() where endpoint like 'https://push.example/jeff%'; if n<1 then bad:=bad||' [no avisó al coach]'; end if;
  select count(*) into n from public.request_access(); if n<>0 then bad:=bad||' [avisó dos veces seguidas]'; end if;
  select count(*) into n from public.clients where id=cc and access_requested_at is not null; if n<>1 then bad:=bad||' [no quedó la fecha de la solicitud]'; end if;
  -- no puede marcarse activo ni cambiar su fecha
  update public.clients set status='active' where id=cc; get diagnostics n=row_count; if n<>0 then bad:=bad||' [pendiente se activó solo]'; end if;
  update public.clients set access_requested_at=null where id=cc; get diagnostics n=row_count; if n<>0 then bad:=bad||' [pendiente editó su solicitud]'; end if;
  -- un cliente activo no "pide acceso"
  perform pg_temp.as_user(a);
  if pg_temp.try('select * from public.request_access()') then bad:=bad||' [cliente activo pidió acceso]'; end if;
  -- el coach no puede pedir acceso
  perform pg_temp.as_user(jeff);
  if pg_temp.try('select * from public.request_access()') then bad:=bad||' [coach pidió acceso]'; end if;

  -- Activación: Jeff activa y obtiene los dispositivos del cliente una sola vez; otro coach nada
  update public.clients set status='active', plan_id=(select id from public.plans where workspace_id=ws limit 1) where id=cc;
  perform pg_temp.as_user(o);
  select count(*) into n from public.activation_targets(cc); if n<>0 then bad:=bad||' [otro coach obtuvo dispositivos del cliente]'; end if;
  perform pg_temp.as_user(c);
  select count(*) into n from public.activation_targets(cc); if n<>0 then bad:=bad||' [el cliente usó activation_targets]'; end if;
  perform pg_temp.as_user(jeff);
  select count(*) into n from public.activation_targets(cc) where endpoint='https://push.example/c-acc'; if n<>1 then bad:=bad||' [no obtuvo el dispositivo del cliente activado]'; end if;
  select count(*) into n from public.activation_targets(cc); if n<>0 then bad:=bad||' [aviso de activación repetido]'; end if;
  select count(*) into n from public.activation_targets(ca); if n<>0 then bad:=bad||' [avisó a un cliente que no se acaba de activar]'; end if;
  perform pg_temp.reset();
  update public.clients set status='pending', plan_id=null where id=cc;   -- deja a C como estaba
  raise notice 'RESULTADO ATAQUES ACCESO: %', coalesce(nullif(bad,''),'ninguno');
end $$;
