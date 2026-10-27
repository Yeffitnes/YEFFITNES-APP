-- 0031 · Audio en el comentario del coach sobre un entrenamiento.
-- El archivo vive en el bucket message-audio (mismo de los mensajes), en la carpeta del cliente: <espacio>/<cliente>/<archivo>.
-- Revertir: drop function public.review_workout(uuid, text, text); recrear la de 2 argumentos y protect_coach_columns de 0007; alter table workout_logs drop column coach_comment_audio.

alter table public.workout_logs add column coach_comment_audio text check (coach_comment_audio is null or length(coach_comment_audio) <= 300);

-- Un cliente tampoco puede escribir el audio del coach (el disparador de 0007 solo conocía seen_at y comment).
create or replace function public.protect_coach_columns() returns trigger language plpgsql as $$
begin
  if public.my_role() is distinct from 'coach' then
    if tg_op = 'INSERT' then new.coach_seen_at := null; new.coach_comment := null; new.coach_comment_audio := null;
    else new.coach_seen_at := old.coach_seen_at; new.coach_comment := old.coach_comment; new.coach_comment_audio := old.coach_comment_audio; end if;
  end if;
  return new;
end $$;

drop function public.review_workout(uuid, text);
create function public.review_workout(p_log uuid, p_comment text, p_audio text default null) returns void
language plpgsql security definer set search_path = public as $$
declare ws uuid := public.my_workspace(); cid uuid; old text;
begin
  if public.my_role() is distinct from 'coach' then raise exception 'not allowed'; end if;
  select client_id, coach_comment_audio into cid, old from workout_logs where id = p_log and workspace_id = ws;
  if cid is null then raise exception 'not found'; end if;
  if p_audio is not null and p_audio not like ws::text || '/' || cid::text || '/%' then raise exception 'bad_audio'; end if;
  update workout_logs set coach_seen_at = now(), coach_comment = nullif(trim(p_comment), ''), coach_comment_audio = p_audio where id = p_log;
  -- El audio reemplazado o quitado se anota en la basura para que la limpieza lo borre del almacenamiento.
  if old is not null and old is distinct from p_audio then insert into message_trash (workspace_id, kind, ref) values (ws, 'audio', old); end if;
end $$;
grant execute on function public.review_workout(uuid, text, text) to authenticated;
