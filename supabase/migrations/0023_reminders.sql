-- Recordatorios automáticos (push): reporte del día (8 p. m.), entrenamiento de hoy (7–11 a. m.) y sesión de agenda (1 hora antes).
-- Los dispara un cron de Supabase (pg_cron + pg_net) que llama a /api/cron/reminders con una clave secreta (ver docs/CONTEXT.md).
-- HORARIOS = PROPUESTA (confirmar con Jeff). Zona horaria fija: America/Bogota.
create table public.app_secrets (name text primary key, value text not null);
alter table public.app_secrets enable row level security;       -- sin políticas: nadie la lee desde la app
create table public.reminder_log (kind text not null, ref text not null, created_at timestamptz not null default now(), primary key (kind, ref));
alter table public.reminder_log enable row level security;      -- sin políticas

create function public.due_reminders(p_secret text, p_now timestamptz default now())
returns table (endpoint text, p256dh text, auth text, title text, body text, url text, tag text)
language plpgsql security definer set search_path = public as $$
declare loc timestamp := p_now at time zone 'America/Bogota'; d date := (p_now at time zone 'America/Bogota')::date;
  h int := extract(hour from (p_now at time zone 'America/Bogota'))::int; wd int := extract(isodow from (p_now at time zone 'America/Bogota'))::int; r record;
begin
  if p_secret is null or not exists (select 1 from app_secrets where name = 'cron' and value = p_secret) then return; end if;
  delete from reminder_log where created_at < p_now - interval '10 days';

  if h >= 20 and h < 23 then
    for r in select c.id, c.profile_id from clients c join plans p on p.id = c.plan_id
             where c.status = 'active' and 'daily_report' = any(p.features)
               and not exists (select 1 from daily_reports x where x.client_id = c.id and x.report_date = d) loop
      insert into reminder_log (kind, ref) values ('report', r.id || ':' || d) on conflict do nothing;
      if found then return query select s.endpoint, s.p256dh, s.auth, 'Cuéntale a tu coach cómo te fue hoy'::text, 'Envía tu reporte diario.'::text, '/inicio'::text, 'report'::text from push_subscriptions s where s.profile_id = r.profile_id; end if;
    end loop;
  end if;

  if h >= 7 and h < 12 then
    for r in select c.id, c.profile_id, pd.name from clients c
             join plans p on p.id = c.plan_id join training_plans tp on tp.client_id = c.id and tp.status = 'active'
             join plan_days pd on pd.plan_id = tp.id and pd.weekday = wd
             where c.status = 'active' and 'training' = any(p.features)
               and not exists (select 1 from workout_logs w where w.client_id = c.id and w.log_date = d and w.completed_at is not null) loop
      insert into reminder_log (kind, ref) values ('training', r.id || ':' || d) on conflict do nothing;
      if found then return query select s.endpoint, s.p256dh, s.auth, 'Hoy toca entrenar'::text, ('Tu rutina de hoy: ' || r.name)::text, '/inicio'::text, 'training'::text from push_subscriptions s where s.profile_id = r.profile_id; end if;
    end loop;
  end if;

  for r in select b.id, b.workspace_id, c.profile_id, pr.full_name, s.starts_at from bookings b
           join availability_slots s on s.id = b.slot_id join clients c on c.id = b.client_id join profiles pr on pr.id = c.profile_id
           where b.status = 'confirmed' and s.starts_at > p_now and s.starts_at <= p_now + interval '60 minutes' loop
    insert into reminder_log (kind, ref) values ('session', r.id::text) on conflict do nothing;
    if found then
      return query select s.endpoint, s.p256dh, s.auth, 'Tu sesión empieza pronto'::text, ('Hoy a las ' || to_char(r.starts_at at time zone 'America/Bogota', 'HH24:MI'))::text, '/inicio/agenda'::text, 'session'::text from push_subscriptions s where s.profile_id = r.profile_id;
      return query select s.endpoint, s.p256dh, s.auth, 'Sesión próxima'::text, (coalesce(r.full_name, 'Un cliente') || ' a las ' || to_char(r.starts_at at time zone 'America/Bogota', 'HH24:MI'))::text, '/coach/agenda'::text, 'session-coach'::text
        from push_subscriptions s join profiles co on co.id = s.profile_id where co.role = 'coach' and s.workspace_id = r.workspace_id;
    end if;
  end loop;
end $$;
grant execute on function public.due_reminders(text, timestamptz) to anon, authenticated;
