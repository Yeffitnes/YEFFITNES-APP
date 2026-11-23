-- 0061 (22-nov, pedido de Yeff vía Cristian): el estándar de todos los ejercicios es 3 series de 15 a 20 repeticiones.
-- Cambia lo SUGERIDO de cada ejercicio del catálogo (lo que se rellena al armar una rutina) y deja ese valor por defecto para los
-- ejercicios nuevos. El descanso de 2 minutos se pone al armar la rutina (los ejercicios no guardan descanso). No toca rutinas ya
-- armadas ni planes de clientes. Se puede cambiar ejercicio por ejercicio como siempre.
-- Revertir: alter table exercises alter column sugg_sets drop default, alter column sugg_reps drop default;
--           (los valores anteriores no se guardan: vienen de 0040 para los ejercicios precargados)
update public.exercises set sugg_sets = 3, sugg_reps = '15-20';
alter table public.exercises alter column sugg_sets set default 3, alter column sugg_reps set default '15-20';
