-- 0053 (13-nov, pedido de Cristian): el resumen de la semana que Jeff le envía al cliente.
-- Antes "Enviarle el resumen" abría Mensajes con una línea de texto. Ahora queda un resumen que el cliente abre en su app (Inicio y
-- Progreso): sus números de la semana comparados con la anterior, gráficas y el comentario de Jeff. Los números se calculan con los
-- datos del cliente (no se copian aquí): aquí solo queda qué semana se envió, el comentario, y cuándo lo vio.
-- Al enviarlo también queda un mensaje en su chat (así le llega la notificación y Jeff lo ve en la conversación).
-- Compatible con `main`: solo agrega.
-- Revertir: drop function public.send_week_summary(uuid, int, date, text); drop function public.see_week_summary(uuid); drop table public.week_summaries;
create table public.week_summaries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces,
  client_id uuid not null references public.clients on delete cascade,
  week_n int not null check (week_n between 1 and 1000),
  from_day date not null,
  to_day date not null check (to_day = from_day + 6),
  note text check (note is null or length(note) <= 1000),
  message_id uuid references public.messages on delete set null,
  sent_at timestamptz not null default now(),
  seen_at timestamptz,
  unique (client_id, from_day)
);
alter table public.week_summaries enable row level security;
create policy ws_client_read on public.week_summaries for select using (client_id = public.my_client_id());
create policy ws_coach_read on public.week_summaries for select using (workspace_id = public.my_workspace() and public.my_role() = 'coach');
revoke insert, update, delete on public.week_summaries from anon, authenticated;

-- Jeff lo envía. Solo semanas ya terminadas. Si ya lo había enviado, se actualiza el comentario y se vuelve a avisar.
create function public.send_week_summary(p_client uuid, p_week int, p_from date, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); sid uuid; mid uuid; n text := nullif(btrim(coalesce(p_note, '')), '');
  today date := (now() at time zone 'America/Bogota')::date;
  label text := 'semana ' || p_week || ' (' || to_char(p_from, 'DD/MM') || ' al ' || to_char(p_from + 6, 'DD/MM') || ')';
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not_allowed'; end if;
  if not exists (select 1 from clients where id = p_client and workspace_id = ws) then raise exception 'not_found'; end if;
  if p_from is null or p_from + 6 >= today or p_week is null or p_week < 1 then raise exception 'week_not_done'; end if;
  if n is not null and length(n) > 1000 then raise exception 'too_long'; end if;
  insert into messages (workspace_id, client_id, sender, body)
    values (ws, p_client, 'coach', coalesce(n || E'\n\n', '') || 'Te envié el resumen de tu ' || label || '. Lo ves en Inicio y en Progreso.')
    returning id into mid;
  insert into week_summaries (workspace_id, client_id, week_n, from_day, to_day, note, message_id)
    values (ws, p_client, p_week, p_from, p_from + 6, n, mid)
    on conflict (client_id, from_day) do update set note = excluded.note, message_id = excluded.message_id, week_n = excluded.week_n, sent_at = now(), seen_at = null
    returning id into sid;
  return sid;
end $$;
revoke all on function public.send_week_summary(uuid, int, date, text) from public;
grant execute on function public.send_week_summary(uuid, int, date, text) to authenticated;

-- El cliente lo abrió: queda visto y su mensaje, leído (para que no quede el aviso de mensaje sin leer).
create function public.see_week_summary(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update week_summaries set seen_at = coalesce(seen_at, now()) where id = p_id and client_id = public.my_client_id();
  update messages set read_at = coalesce(read_at, now())
    where id = (select message_id from week_summaries where id = p_id and client_id = public.my_client_id()) and sender = 'coach';
$$;
revoke all on function public.see_week_summary(uuid) from public;
grant execute on function public.see_week_summary(uuid) to authenticated;
