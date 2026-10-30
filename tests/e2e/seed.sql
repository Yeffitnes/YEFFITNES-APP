\set ON_ERROR_STOP on
insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000f0','jeff@t','{"full_name":"Jeff González"}'),
 ('00000000-0000-0000-0000-00000000000a','camila@t','{"full_name":"Camila Arango"}'),
 ('00000000-0000-0000-0000-00000000000b','andres@t','{"full_name":"Andrés Bermúdez"}'),
 ('00000000-0000-0000-0000-00000000000c','laura@t','{"full_name":"Laura Pendiente"}');
update public.profiles set role='coach' where id='00000000-0000-0000-0000-0000000000f0';
update public.clients set status='active', plan_id=(select id from public.plans where name='Completo') where profile_id='00000000-0000-0000-0000-00000000000a';
update public.clients set status='active', plan_id=(select id from public.plans where name='Esencial') where profile_id='00000000-0000-0000-0000-00000000000b';
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
do $$
declare jeff uuid:='00000000-0000-0000-0000-0000000000f0'; a uuid:='00000000-0000-0000-0000-00000000000a';
 ws uuid; ca uuid; cb uuid; e1 uuid; e2 uuid; e3 uuid; t1 uuid; t2 uuid; pa uuid; d uuid; wd int; it uuid; n int; tpl uuid;
begin
  select id into ws from public.workspaces where slug='yeffitnes';
  select id into ca from public.clients where profile_id=a;
  select id into cb from public.clients where profile_id='00000000-0000-0000-0000-00000000000b';
  perform pg_temp.as_user(jeff);
  select id into e1 from public.exercises where name ilike 'sentadilla%' limit 1;
  select id into e2 from public.exercises where name ilike '%curl%' limit 1;
  select id into e3 from public.exercises where name ilike '%press%' limit 1;
  t1 := public.save_routine(null,'Pierna completa','lower',50, jsonb_build_array(
     jsonb_build_object('exercise_id',e1,'sets',3,'reps','10','rest_seconds',90),
     jsonb_build_object('exercise_id',e2,'sets',3,'reps','12-15','rest_seconds',60)), null);
  t2 := public.save_routine(null,'Torso','upper',45, jsonb_build_array(jsonb_build_object('exercise_id',e3,'sets',3,'reps','8-12','rest_seconds',90)), null);
  pa := public.create_training_plan(ca,'Plan Camila');
  wd := extract(isodow from (now() at time zone 'America/Bogota'))::int;
  perform public.assign_day(pa, wd, t1);
  perform public.assign_day(pa, ((wd % 7) + 1), t2);
  update public.plan_items set target_weight = 40 where client_id = ca and sets = 3 and reps = '10';
  perform public.save_nutrition(null, ca, 'Plan Camila', 2000, 140, 200, 60, null, jsonb_build_array(jsonb_build_object('name','Desayuno','content','Avena y huevos','weekday',null), jsonb_build_object('name','Almuerzo','content','Pollo y arroz','weekday',null)));
  insert into public.availability_slots (workspace_id, starts_at, kind) values
    (ws, date_trunc('hour', now()) - interval '5 hours', 'followup'),
    (ws, date_trunc('hour', now()) + interval '26 hours', 'followup'),
    (ws, date_trunc('hour', now()) + interval '50 hours', 'initial');
end $$;
reset role;
-- historial: Camila entrenó hace 3 días (pidió 10, hizo 7), y una sesión ya pasada hoy
insert into public.workout_logs (workspace_id, client_id, log_date, plan_day_id, effort, completed_at)
 select c.workspace_id, c.id, (now() at time zone 'America/Bogota')::date - 3, pd.id, 8, now() - interval '3 days'
 from public.clients c join public.plan_days pd on pd.client_id = c.id where c.profile_id='00000000-0000-0000-0000-00000000000a' order by pd.weekday limit 1;
insert into public.set_logs (workspace_id, client_id, workout_log_id, plan_item_id, exercise_name, set_number, kind, reps, weight)
 select w.workspace_id, w.client_id, w.id, pi.id, 'x', g, 'work', 7, 40 from public.workout_logs w join public.plan_items pi on pi.plan_day_id = w.plan_day_id and pi.reps='10', generate_series(1,3) g;
insert into public.bookings (workspace_id, slot_id, client_id, booked_by)
 select s.workspace_id, s.id, c.id, 'coach' from public.availability_slots s, public.clients c where c.profile_id='00000000-0000-0000-0000-00000000000a' and s.starts_at < now();
update public.clients set plan_since = (now() at time zone 'America/Bogota')::date - 20, activated_at = now() - interval '20 days' where profile_id in ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b');
update public.clients set onboarded_at = now(), height_cm = 165, start_weight_kg = 62, start_point_at = now() where profile_id='00000000-0000-0000-0000-00000000000a';
select (select count(*) from public.plan_items) items, (select count(*) from public.workout_logs) logs, (select count(*) from public.bookings) bk;
