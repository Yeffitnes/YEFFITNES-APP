-- Pruebas de ataque de 0058: solicitudes de funciones del plan. Ejecutar al FINAL (usa los datos de las anteriores).
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; pl uuid; full_pl uuid; rid uuid; n int; bad text:=''; missing text;
begin
  perform pg_temp.reset();
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  -- A activo con un plan sin nutrición
  insert into public.plans (workspace_id, name, features) values (ws, 'Solo rutina', array['training']) returning id into pl;
  select id into full_pl from public.plans where workspace_id = ws and 'nutrition' = any(features) limit 1;
  update public.clients set status = 'active', plan_id = pl where id = ca;
  insert into public.push_subscriptions values ('https://push.example/jeff-fr', jeff, ws, 'k', 'a', now()) on conflict (endpoint) do nothing;

  -- 1) A pide nutrición: avisa a Yeff una vez; repetir enseguida no avisa ni duplica
  perform pg_temp.as_user(a);
  select count(*) into n from public.request_feature('nutrition') where endpoint like 'https://push.example/jeff%'; if n < 1 then bad:=bad||' [no avisó al coach]'; end if;
  select count(*) into n from public.request_feature('nutrition'); if n <> 0 then bad:=bad||' [avisó dos veces seguidas]'; end if;
  if (select count(*) from public.feature_requests where client_id = ca) <> 1 then bad:=bad||' [solicitud duplicada]'; end if;
  if not pg_temp.fails('select * from public.request_feature(''training'')') then bad:=bad||' [pidió algo que ya tiene]'; end if;
  if not pg_temp.fails('select * from public.request_feature(''admin'')') then bad:=bad||' [función inventada aceptada]'; end if;
  -- el cliente no inserta, no cierra y no ve las de otros
  if not pg_temp.fails(format('insert into public.feature_requests (workspace_id, client_id, feature) values (%L, %L, %L)', ws, cb, 'nutrition')) then bad:=bad||' [cliente insertó directo]'; end if;
  select id into rid from public.feature_requests where client_id = ca and handled_at is null;
  if not pg_temp.fails(format('select public.resolve_feature_request(%L)', rid)) then bad:=bad||' [el cliente cerró la solicitud]'; end if;
  perform pg_temp.as_user(b);
  if (select count(*) from public.feature_requests) <> 0 then bad:=bad||' [otro cliente ve la solicitud]'; end if;
  -- 2) Otro coach no la ve ni la cierra
  perform pg_temp.as_user(o);
  if (select count(*) from public.feature_requests) <> 0 then bad:=bad||' [otro coach ve la solicitud]'; end if;
  if not pg_temp.fails(format('select public.resolve_feature_request(%L)', rid)) then bad:=bad||' [otro coach cerró la solicitud]'; end if;
  -- 3) Yeff la ve y la cierra
  perform pg_temp.as_user(jeff);
  if (select count(*) from public.feature_requests where id = rid) <> 1 then bad:=bad||' [Yeff no ve la solicitud]'; end if;
  perform public.resolve_feature_request(rid);
  perform pg_temp.reset();
  if (select handled_at from public.feature_requests where id = rid) is null then bad:=bad||' [no se cerró]'; end if;
  -- 4) Se cierra sola cuando el plan pasa a incluirla
  perform pg_temp.as_user(a); perform public.request_feature('nutrition'); perform pg_temp.reset();
  if full_pl is not null then
    update public.clients set plan_id = full_pl where id = ca;
    if exists (select 1 from public.feature_requests where client_id = ca and handled_at is null and feature = 'nutrition') then bad:=bad||' [no se cerró al cambiar el plan]'; end if;
  else bad:=bad||' [la semilla no tiene un plan con nutrición]'; end if;
  -- 5) Un pendiente no puede pedir funciones (para eso está "Solicitar acceso")
  update public.clients set status = 'pending' where id = cb;
  perform pg_temp.as_user(b);
  if not pg_temp.fails('select * from public.request_feature(''nutrition'')') then bad:=bad||' [un pendiente pidió una función]'; end if;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES SOLICITUDES: %', coalesce(nullif(bad,''),'ninguno');
end $$;
