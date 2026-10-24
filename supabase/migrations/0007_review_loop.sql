-- Ciclo de revisión: el coach revisa un entrenamiento y deja un comentario que el cliente ve.
alter table public.workout_logs add column coach_seen_at timestamptz, add column coach_comment text;
create policy wl_coach_upd on public.workout_logs for update using (workspace_id = public.my_workspace() and public.my_role() = 'coach');

-- Un cliente NUNCA puede escribir ni cambiar los campos del coach (aunque lo intente por la API).
create function public.protect_coach_columns() returns trigger language plpgsql as $$
begin
  if public.my_role() is distinct from 'coach' then
    if tg_op = 'INSERT' then new.coach_seen_at := null; new.coach_comment := null;
    else new.coach_seen_at := old.coach_seen_at; new.coach_comment := old.coach_comment; end if;
  end if;
  return new;
end $$;
create trigger wl_protect before insert or update on public.workout_logs for each row execute function public.protect_coach_columns();

create function public.review_workout(p_log uuid, p_comment text) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  update workout_logs set coach_seen_at = now(), coach_comment = nullif(trim(p_comment), '') where id = p_log and workspace_id = public.my_workspace();
  if not found then raise exception 'not found'; end if;
end $$;
