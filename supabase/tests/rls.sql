\set ON_ERROR_STOP on
insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','a@t','{"full_name":"Camila A"}'),
 ('00000000-0000-0000-0000-00000000000b','b@t','{"full_name":"Andres B"}'),
 ('00000000-0000-0000-0000-00000000000c','c@t','{"full_name":"Carla C pendiente"}'),
 ('00000000-0000-0000-0000-0000000000f0','jeff@t','{"full_name":"Jeff"}'),
 ('00000000-0000-0000-0000-0000000000f1','otro@t','{"full_name":"Otro coach"}');
update public.profiles set role='coach' where id='00000000-0000-0000-0000-0000000000f0';
insert into public.workspaces (id,slug,name) values ('99999999-9999-9999-9999-999999999999','otro','Otro Coach');
update public.profiles set workspace_id='99999999-9999-9999-9999-999999999999', role='coach' where id='00000000-0000-0000-0000-0000000000f1';
insert into public.plans (workspace_id,name,features) select id,'SoloContenido',array['education_basic'] from public.workspaces where slug='yeffitnes';
update public.clients set status='active', plan_id=(select id from public.plans where name='Esencial') where profile_id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b');
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
create function pg_temp.fails(q text) returns boolean language plpgsql as $$ begin execute q; return false; exception when others then return true; end $$;
do $$
declare jeff uuid:='00000000-0000-0000-0000-0000000000f0'; a uuid:='00000000-0000-0000-0000-00000000000a'; b uuid:='00000000-0000-0000-0000-00000000000b';
  c uuid:='00000000-0000-0000-0000-00000000000c'; o uuid:='00000000-0000-0000-0000-0000000000f1';
  ws uuid; ows uuid:='99999999-9999-9999-9999-999999999999'; bad text:=''; cc text; ca uuid; cb uuid; ex1 uuid; t1 uuid; pa uuid; pb uuid; da uuid; db uuid; ia uuid; ib uuid; la uuid; lb uuid; n int; r text;
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a; select id into cb from public.clients where profile_id=b;
  perform pg_temp.as_user(jeff);
  insert into public.exercises (workspace_id,name) values (ws,'Press banca') returning id into ex1;
  t1 := public.save_routine(null,'Tren superior','upper',45, jsonb_build_array(jsonb_build_object('exercise_id',ex1,'sets',4,'reps','8','rest_seconds',90)));
  pa := public.create_training_plan(ca,'Plan A'); da := public.assign_day(pa,1,t1);
  pb := public.create_training_plan(cb,'Plan B'); db := public.assign_day(pb,1,t1);
  perform pg_temp.reset();
  select id into ia from public.plan_items where client_id=ca; select id into ib from public.plan_items where client_id=cb;
  raise notice 'SETUP ok';
  -- flujo normal del cliente A
  perform pg_temp.as_user(a);
  la := public.log_set(current_date, ia, 1, 8, 60);
  perform public.finish_workout(current_date, 7, 'bien');
  select count(*) into n from public.set_logs; assert n=1;
  raise notice 'OK flujo normal: log_set + finish_workout';
  -- B también registra (para tener su log)
  perform pg_temp.as_user(b); lb := public.log_set(current_date, ib, 1, 10, 50);
  -- AISLAMIENTO LECTURA
  perform pg_temp.as_user(a);
  select count(*) into n from public.workout_logs where client_id<>ca; assert n=0;
  select count(*) into n from public.plan_items where client_id<>ca; assert n=0;
  raise notice 'OK lectura aislada entre clientes';
  -- ATAQUES DE ESCRITURA (A intentando ensuciar datos de otros) — cada uno debería fallar
  if not pg_temp.fails(format('insert into public.workout_logs (workspace_id,client_id,log_date) values (%L,%L,current_date+1)', ows, ca)) then bad := bad||' [A pudo crear un log con workspace_id de OTRO coach]'; end if;
  if not pg_temp.fails(format('insert into public.set_logs (workspace_id,client_id,workout_log_id,plan_item_id,exercise_name,set_number) values (%L,%L,%L,%L,%L,5)', ws, ca, lb, ia, 'x')) then bad := bad||' [A pudo colgar una serie en el log de B]'; end if;
  if not pg_temp.fails(format('insert into public.set_logs (workspace_id,client_id,workout_log_id,plan_item_id,exercise_name,set_number) values (%L,%L,%L,%L,%L,6)', ws, ca, la, ib, 'x')) then bad := bad||' [A pudo usar un ejercicio del plan de B]'; end if;
  if not pg_temp.fails(format('update public.workout_logs set workspace_id=%L where client_id=%L', ows, ca)) then bad := bad||' [A pudo MOVER su log a otro espacio]'; end if;
  if not pg_temp.fails(format('update public.workout_logs set plan_day_id=%L where client_id=%L', db, ca)) then bad := bad||' [A pudo apuntar su log al día de B]'; end if;
  update public.workout_logs set coach_comment='hackeado', coach_seen_at=now() where client_id=ca;
  perform pg_temp.reset(); select coach_comment into cc from public.workout_logs where client_id=ca and coach_comment is not null limit 1;
  if cc is not null then raise notice 'FALLO: cliente escribió comentario del coach'; end if;
  perform pg_temp.as_user(a); update public.clients set plan_id=null where id=ca; get diagnostics n=row_count; assert n=0;
  update public.profiles set role='coach' where id=a; get diagnostics n=row_count; assert n=0;
  raise notice 'OK columnas del coach protegidas, rol y plan no editables por cliente';
  -- plan sin "training"
  perform pg_temp.reset(); update public.clients set plan_id=(select id from public.plans where name='SoloContenido') where id=ca; perform pg_temp.as_user(a);
  select count(*) into n from public.plan_days; raise notice 'INFO cliente sin "training" ve % dias de plan (debería ser 0 si la regla es total)', n;
  if pg_temp.fails(format('select public.log_set(current_date,%L,2,5,5)', ia)) then raise notice 'OK sin training no puede registrar'; else raise notice 'FALLO sin training pudo registrar'; end if;
  -- coach ajeno
  perform pg_temp.as_user(o);
  select count(*) into n from public.workout_logs; assert n=0;
  if pg_temp.fails(format('select public.review_workout(%L,%L)', la, 'x')) then raise notice 'OK otro coach no puede revisar'; else raise notice 'FALLO otro coach reviso'; end if;
  raise notice 'RESULTADO ATAQUES: %', coalesce(nullif(bad,''),'ninguno');
  perform pg_temp.reset();
end $$;
