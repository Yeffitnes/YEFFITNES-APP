-- Pruebas de 0064: estándar 3 × 15-20 / 120 s en rutinas y planes activos, con copia de lo viejo que nadie de la app puede leer.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.reset() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claim.sub','',false); end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-00000000000a'; jeff uuid:='00000000-0000-0000-0000-0000000000f0'; n int; bad text:='';
begin
  perform pg_temp.reset();
  select count(*) into n from public.template_items t where exists (select 1 from public.estandar_0064_backup b where b.tbl = 'template_items' and b.id = t.id) and (sets <> 3 or reps <> '15-20' or rest_seconds is distinct from 120);
  if n <> 0 then bad:=bad||' [quedaron '||n||' ejercicios de rutina sin el estándar]'; end if;
  select count(*) into n from public.plan_items pi join public.plan_days pd on pd.id = pi.plan_day_id join public.training_plans tp on tp.id = pd.plan_id
    where tp.status = 'active' and exists (select 1 from public.estandar_0064_backup b where b.tbl = 'plan_items' and b.id = pi.id) and (pi.sets <> 3 or pi.reps <> '15-20' or pi.rest_seconds is distinct from 120);
  if n <> 0 then bad:=bad||' [quedaron '||n||' ejercicios de planes activos sin el estándar]'; end if;
  perform pg_temp.as_user(jeff);
  begin select count(*) into n from public.estandar_0064_backup; if n <> 0 then bad:=bad||' [el coach lee la copia]'; end if; exception when insufficient_privilege then null; end;
  perform pg_temp.as_user(a);
  begin select count(*) into n from public.estandar_0064_backup; if n <> 0 then bad:=bad||' [el cliente lee la copia]'; end if; exception when insufficient_privilege then null; end;
  perform pg_temp.reset();
  raise notice 'RESULTADO ATAQUES ESTANDAR EN RUTINAS: %', coalesce(nullif(bad,''),'ninguno');
end $$;
