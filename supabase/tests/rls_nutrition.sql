-- Pruebas de ataque de Nutrición. Ejecutar DESPUÉS de rls_reports.sql.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b'; c uuid:='00000000-0000-0000-0000-00000000000c';
  jeff uuid:='00000000-0000-0000-0000-0000000000f0'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ca uuid; cb uuid; n int; bad text:=''; tpl uuid; pa uuid; pb uuid; meals jsonb:='[{"name":"Desayuno","content":"2 huevos\n1 arepa"},{"name":"Almuerzo","content":"Pollo y arroz"}]';
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  perform pg_temp.reset();
  update public.clients set plan_id=(select id from public.plans where name='Completo') where id=ca;     -- A: tiene nutrition
  update public.clients set plan_id=(select id from public.plans where name='Esencial') where id=cb;     -- B: NO tiene nutrition
  perform pg_temp.as_user(jeff);
  tpl := public.save_nutrition(null, null, 'Definición 1800', 1800, 140, 180, 60, 'Beber agua', meals); raise notice 'OK Jeff crea plantilla';
  pa := public.assign_nutrition(tpl, ca); pb := public.assign_nutrition(tpl, cb);
  select count(*) into n from public.nutrition_meals where plan_id=pa; assert n=2, 'el plan clonado debe tener 2 comidas';
  perform public.save_nutrition(pa, ca, 'Definición 1800 (ajustada)', 1700, 140, 150, 60, null, '[{"name":"Desayuno","content":"avena"}]');
  select count(*) into n from public.nutrition_meals where plan_id=tpl; assert n=2, 'editar el plan del cliente NO debe tocar la plantilla';
  select count(*) into n from public.nutrition_meals where plan_id=pa; assert n=1;
  pa := public.assign_nutrition(tpl, ca);
  select count(*) into n from public.nutrition_plans where client_id=ca and active; assert n=1, 'solo un plan activo por cliente';
  perform pg_temp.as_user(a);
  select count(*) into n from public.nutrition_plans; assert n=1, 'A solo ve su plan activo (sin plantillas ni planes antiguos), vio '||n;
  select count(*) into n from public.nutrition_meals; assert n=2;
  if not pg_temp.fails(format('insert into public.nutrition_plans (workspace_id,client_id,name) values (%L,%L,%L)', ws, ca, 'x')) then bad:=bad||' [cliente creó un plan]'; end if;
  if not pg_temp.fails(format('select public.save_nutrition(null,null,%L,1800,1,1,1,null,%L::jsonb)', 'x', meals)) then bad:=bad||' [cliente usó save_nutrition]'; end if;
  if not pg_temp.fails(format('select public.assign_nutrition(%L,%L)', tpl, ca)) then bad:=bad||' [cliente usó assign_nutrition]'; end if;
  begin update public.nutrition_meals set content='trampa'; exception when others then null; end;
  select count(*) into n from public.nutrition_meals where content='trampa'; if n<>0 then bad:=bad||' [cliente editó comidas]'; end if;
  perform pg_temp.as_user(b);   -- plan sin nutrición
  select count(*) into n from public.nutrition_plans; if n<>0 then bad:=bad||' [plan sin nutrición ve un plan]'; end if;
  select count(*) into n from public.nutrition_meals; if n<>0 then bad:=bad||' [plan sin nutrición ve comidas]'; end if;
  perform pg_temp.as_user(c);
  select count(*) into n from public.nutrition_plans; if n<>0 then bad:=bad||' [pendiente ve nutrición]'; end if;
  perform pg_temp.as_user(o);   -- otro coach
  select count(*) into n from public.nutrition_plans; if n<>0 then bad:=bad||' [otro coach ve planes]'; end if;
  if not pg_temp.fails(format('select public.assign_nutrition(%L,%L)', tpl, ca)) then bad:=bad||' [otro coach asignó plantilla ajena]'; end if;
  if not pg_temp.fails(format('select public.save_nutrition(%L,null,%L,1800,1,1,1,null,%L::jsonb)', tpl, 'robada', meals)) then bad:=bad||' [otro coach editó plantilla ajena]'; end if;
  if not pg_temp.fails(format('insert into public.nutrition_plans (workspace_id,client_id,name) values (%L,%L,%L)', ws, ca, 'x')) then bad:=bad||' [otro coach insertó en el espacio de Jeff]'; end if;
  perform pg_temp.as_user(jeff);
  if not pg_temp.fails(format('select public.save_nutrition(null,null,%L,1800,1,1,1,null,%L::jsonb)', 'vacío', '[]')) then bad:=bad||' [plan sin comidas]'; end if;
  raise notice 'RESULTADO ATAQUES NUTRICION: %', coalesce(nullif(bad,''),'ninguno');
  perform pg_temp.reset();
end $$;
