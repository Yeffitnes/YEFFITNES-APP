-- 0055 (15-nov): cuatro rutinas base para que Jeff no empiece con el catálogo vacío (pedido de Cristian).
-- Solo usa ejercicios que ya están en el catálogo con imagen (los precargados, image 'preset:...'). Series, repeticiones y descansos
-- son un punto de partida general: Jeff las edita o las elimina desde Catálogo > Rutinas como cualquier otra.
-- Se puede correr más de una vez: si ya hay una rutina activa con ese nombre, no la crea otra vez. Si falta un ejercicio, lo salta.
-- Revertir: update public.routine_templates set active = false
--             where name in ('Pecho y tríceps', 'Espalda y bíceps', 'Pierna completa', 'Funcional');
do $$
declare ws uuid; r record; t uuid; pos int; it record; ex uuid;
begin
  for ws in select id from public.workspaces loop
    for r in select * from (values
      ('Pecho y tríceps', 'Fuerza', 60, '[
        ["Press de banca con barra", 4, "8-10", 120, null],
        ["Press inclinado con mancuernas", 3, "10-12", 90, null],
        ["Aperturas en máquina", 3, "12-15", 60, null],
        ["Fondos en paralelas", 3, "8-12", 90, null],
        ["Press francés", 3, "10-12", 60, null],
        ["Extensión de tríceps en polea", 3, "12-15", 45, null]]'::jsonb),
      ('Espalda y bíceps', 'Fuerza', 60, '[
        ["Jalón al pecho", 4, "10-12", 90, null],
        ["Remo con barra", 4, "8-10", 120, null],
        ["Remo en polea baja", 3, "10-12", 75, null],
        ["Remo con mancuerna a una mano", 3, "10-12", 60, "Cada brazo"],
        ["Curl con barra", 3, "10-12", 60, null],
        ["Curl martillo", 3, "12", 45, null]]'::jsonb),
      ('Pierna completa', 'Fuerza', 65, '[
        ["Sentadilla con barra", 4, "8-10", 150, null],
        ["Prensa de piernas", 3, "10-12", 120, null],
        ["Peso muerto rumano", 3, "8-10", 120, null],
        ["Zancadas con mancuernas", 3, "10", 90, "Cada pierna"],
        ["Extensión de cuádriceps", 3, "12-15", 60, null],
        ["Curl femoral acostado", 3, "12", 60, null],
        ["Elevación de talones de pie", 4, "15", 45, null]]'::jsonb),
      ('Funcional', 'Funcional', 40, '[
        ["Burpees", 3, "10", 45, null],
        ["Swing con kettlebell", 3, "15", 45, null],
        ["Thruster con mancuernas", 3, "12", 60, null],
        ["Saltos al cajón", 3, "10", 60, null],
        ["Escaladores", 3, "20", 45, "Cuenta cada pierna"],
        ["Giros rusos", 3, "20", 45, null],
        ["Saltos de tijera", 3, "30", 45, null]]'::jsonb)
    ) v(name, cat, mins, items) loop
      if exists (select 1 from public.routine_templates where workspace_id = ws and active and lower(name) = lower(r.name)) then continue; end if;
      insert into public.routine_templates (workspace_id, name, category, est_minutes) values (ws, r.name, r.cat, r.mins) returning id into t;
      pos := 0;
      for it in select e from jsonb_array_elements(r.items) e loop
        select id into ex from public.exercises where workspace_id = ws and active and image like 'preset:%' and lower(name) = lower(it.e->>0) limit 1;
        if ex is null then continue; end if;
        insert into public.template_items (workspace_id, template_id, exercise_id, position, sets, reps, rest_seconds, notes)
          values (ws, t, ex, pos, (it.e->>1)::int, it.e->>2, (it.e->>3)::int, it.e->>4);
        pos := pos + 1;
      end loop;
    end loop;
  end loop;
end $$;
