-- 0027 · Recordatorios a horas fijas (en vez de revisar cada 15 min): buenos días, mediodía, noche (reporte) y sesión 1 h antes.
-- TEXTOS Y HORAS = PROPUESTA (confirmar con Jeff). Zona horaria fija: America/Bogota. Cada aviso sale una sola vez (reminder_log).
-- Revertir: drop function public.due_reminders(text, text, timestamptz); y volver a crear la de 0023 (ver ese archivo).
drop function if exists public.due_reminders(text, timestamptz);
create function public.due_reminders(p_secret text, p_kind text, p_now timestamptz default now())
returns table (endpoint text, p256dh text, auth text, title text, body text, url text, tag text)
language plpgsql security definer set search_path = public as $$
declare d date := (p_now at time zone 'America/Bogota')::date; wd int := extract(isodow from (p_now at time zone 'America/Bogota'))::int; r record;
begin
  if p_secret is null or not exists (select 1 from app_secrets where name = 'cron' and value = p_secret) then return; end if;
  if p_kind not in ('morning', 'midday', 'night', 'session') then return; end if;
  delete from reminder_log where created_at < p_now - interval '10 days';

  if p_kind = 'morning' then
    for r in select c.id, c.profile_id, (select pd.name from plan_days pd join training_plans tp on tp.id = pd.plan_id and tp.status = 'active'
                where tp.client_id = c.id and pd.weekday = wd and 'training' = any(p.features) limit 1) as day_name
             from clients c join plans p on p.id = c.plan_id where c.status = 'active' loop
      insert into reminder_log (kind, ref) values ('morning', r.id || ':' || d) on conflict do nothing;
      if found then return query select s.endpoint, s.p256dh, s.auth, 'Buenos días'::text,
        (case when r.day_name is not null then 'Hoy toca ' || lower(r.day_name) || '. Tú puedes con esto, vamos con toda.' else 'Un día más para cuidarte. Tú puedes con esto.' end)::text,
        '/inicio'::text, 'morning'::text from push_subscriptions s where s.profile_id = r.profile_id; end if;
    end loop;
  end if;

  if p_kind = 'midday' then
    for r in select c.id, c.profile_id from clients c where c.status = 'active' loop
      insert into reminder_log (kind, ref) values ('midday', r.id || ':' || d) on conflict do nothing;
      if found then return query select s.endpoint, s.p256dh, s.auth, 'Espero que tu día vaya muy bien'::text,
        'Recuerda cumplir con tu plan de hoy. Tu coach está pendiente de ti.'::text, '/inicio'::text, 'midday'::text
        from push_subscriptions s where s.profile_id = r.profile_id; end if;
    end loop;
  end if;

  if p_kind = 'night' then
    for r in select c.id, c.profile_id from clients c join plans p on p.id = c.plan_id
             where c.status = 'active' and 'daily_report' = any(p.features)
               and not exists (select 1 from daily_reports x where x.client_id = c.id and x.report_date = d) loop
      insert into reminder_log (kind, ref) values ('night', r.id || ':' || d) on conflict do nothing;
      if found then return query select s.endpoint, s.p256dh, s.auth, 'Cuéntale a tu coach cómo te fue hoy'::text, 'Envía tu reporte diario antes de dormir.'::text, '/inicio'::text, 'report'::text
        from push_subscriptions s where s.profile_id = r.profile_id; end if;
    end loop;
  end if;

  if p_kind = 'session' then
    for r in select b.id, b.workspace_id, c.profile_id, pr.full_name, sl.starts_at from bookings b
             join availability_slots sl on sl.id = b.slot_id join clients c on c.id = b.client_id join profiles pr on pr.id = c.profile_id
             where b.status = 'confirmed' and sl.starts_at > p_now and sl.starts_at <= p_now + interval '60 minutes' loop
      insert into reminder_log (kind, ref) values ('session', r.id::text) on conflict do nothing;
      if found then
        return query select s.endpoint, s.p256dh, s.auth, 'Tu sesión empieza pronto'::text, ('Hoy a las ' || to_char(r.starts_at at time zone 'America/Bogota', 'HH24:MI'))::text, '/inicio/agenda'::text, 'session'::text from push_subscriptions s where s.profile_id = r.profile_id;
        return query select s.endpoint, s.p256dh, s.auth, 'Sesión próxima'::text, (coalesce(r.full_name, 'Un cliente') || ' a las ' || to_char(r.starts_at at time zone 'America/Bogota', 'HH24:MI'))::text, '/coach/agenda'::text, 'session-coach'::text
          from push_subscriptions s join profiles co on co.id = s.profile_id where co.role = 'coach' and s.workspace_id = r.workspace_id;
      end if;
    end loop;
  end if;
end $$;
grant execute on function public.due_reminders(text, text, timestamptz) to anon, authenticated;
