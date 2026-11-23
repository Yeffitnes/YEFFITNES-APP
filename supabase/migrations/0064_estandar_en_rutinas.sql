-- 0064 (22-nov, noche, decisión de Cristian: "todo, sin excepción"): el estándar de Yeff (3 series de 15 a 20 repeticiones con
-- 2 minutos de descanso, 0061) se aplica también a lo que ya estaba armado: todos los ejercicios de las rutinas del catálogo y
-- de los planes ACTIVOS de los clientes (los planes terminados son historial y no se tocan). El peso objetivo no cambia.
-- Ojo: también cambian los ejercicios por tiempo o "por lado" (p. ej. una plancha de "30 s" queda en 15-20).
-- Antes de cambiar, guarda los valores viejos en estandar_0064_backup.
-- Revertir (vuelve a los valores de antes de esta migración):
--   update template_items t set sets = b.sets, reps = b.reps, rest_seconds = b.rest_seconds from estandar_0064_backup b where b.tbl = 'template_items' and b.id = t.id;
--   update plan_items p set sets = b.sets, reps = b.reps, rest_seconds = b.rest_seconds from estandar_0064_backup b where b.tbl = 'plan_items' and b.id = p.id;
--   drop table estandar_0064_backup;
-- Se puede correr dos veces: la copia no se sobrescribe (guarda siempre lo de la primera vez).

create table if not exists public.estandar_0064_backup (tbl text not null, id uuid not null, sets int not null, reps text not null, rest_seconds int, saved_at timestamptz not null default now(), primary key (tbl, id));
alter table public.estandar_0064_backup enable row level security;   -- sin políticas: nadie la lee desde la app

insert into public.estandar_0064_backup (tbl, id, sets, reps, rest_seconds)
  select 'template_items', ti.id, ti.sets, ti.reps, ti.rest_seconds from public.template_items ti
  on conflict do nothing;
insert into public.estandar_0064_backup (tbl, id, sets, reps, rest_seconds)
  select 'plan_items', pi.id, pi.sets, pi.reps, pi.rest_seconds from public.plan_items pi
    join public.plan_days pd on pd.id = pi.plan_day_id join public.training_plans tp on tp.id = pd.plan_id where tp.status = 'active'
  on conflict do nothing;

update public.template_items set sets = 3, reps = '15-20', rest_seconds = 120
  where sets is distinct from 3 or reps is distinct from '15-20' or rest_seconds is distinct from 120;
update public.plan_items pi set sets = 3, reps = '15-20', rest_seconds = 120
  from public.plan_days pd join public.training_plans tp on tp.id = pd.plan_id
  where pd.id = pi.plan_day_id and tp.status = 'active'
    and (pi.sets is distinct from 3 or pi.reps is distinct from '15-20' or pi.rest_seconds is distinct from 120);
