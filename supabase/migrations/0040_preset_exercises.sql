-- 0040 · Los 54 ejercicios precargados con su imagen (aprobación de Cristian y Jeff, 28-oct).
-- Se cargan en cada espacio de coach; si Jeff ya tiene un ejercicio con el mismo nombre (sin importar mayúsculas), NO se duplica:
-- solo se le pone la imagen y las series sugeridas si no las tenía. Jeff los puede editar, archivar o agregar otros.
-- Es solo datos: se puede correr cuando Jeff apruebe las imágenes. Necesita 0039.
-- Revertir (solo los que no se han usado en rutinas): delete from public.exercises e where e.image like 'preset:%'
--   and not exists (select 1 from public.template_items t where t.exercise_id = e.id) and not exists (select 1 from public.plan_items p where p.exercise_id = e.id);

create temporary table _preset (name text, category text, muscle text, equipment text, difficulty smallint, instructions text, image text, sets smallint, reps text);
insert into _preset values
  ('Press de banca con barra','upper','Pecho','Barra',2,'Omóplatos juntos, baja a mitad del pecho y empuja sin bloquear los codos.','preset:01-press-de-banca-con-barra',4,'6-10'),
  ('Press inclinado con mancuernas','upper','Pecho','Mancuernas',2,'Banco a 30°. Baja hasta la altura del pecho alto, codos a 45°.','preset:02-press-inclinado-con-mancuernas',3,'8-12'),
  ('Press de banca con mancuernas','upper','Pecho','Mancuernas',2,'Junta las mancuernas arriba sin chocarlas; baja controlado.','preset:03-press-de-banca-con-mancuernas',3,'8-12'),
  ('Aperturas con mancuernas','upper','Pecho','Mancuernas',1,'Codos levemente flexionados; abre hasta sentir estiramiento, no más.','preset:04-aperturas-con-mancuernas',3,'10-15'),
  ('Cruce de poleas','upper','Pecho','Polea',1,'Un pie adelante; cierra los brazos frente al pecho apretando 1 segundo.','preset:05-cruce-de-poleas',3,'12-15'),
  ('Flexiones','upper','Pecho','Peso corporal',1,'Cuerpo en línea recta; pecho casi al piso.','preset:06-flexiones',3,'10-15'),
  ('Fondos en paralelas','upper','Pecho','Peso corporal',3,'Inclínate un poco adelante; baja hasta 90° en el codo.','preset:07-fondos-en-paralelas',3,'6-10'),
  ('Dominadas','upper','Espalda','Barra de dominadas',3,'Agarre prono; sube hasta pasar la barbilla sin balancearte.','preset:08-dominadas',4,'5-8'),
  ('Jalón al pecho','upper','Espalda','Polea',1,'Pecho arriba; lleva la barra a la clavícula con los codos hacia abajo.','preset:09-jalon-al-pecho',3,'8-12'),
  ('Remo con barra','upper','Espalda','Barra',2,'Torso inclinado, espalda recta; lleva la barra al ombligo.','preset:10-remo-con-barra',4,'8-10'),
  ('Remo con mancuerna a una mano','upper','Espalda','Mancuernas',1,'Mano y rodilla en el banco; tira con el codo hacia la cadera.','preset:11-remo-con-mancuerna-a-una-mano',3,'10-12'),
  ('Remo en polea baja','upper','Espalda','Polea',1,'Espalda quieta; junta los omóplatos al final del recorrido.','preset:12-remo-en-polea-baja',3,'10-12'),
  ('Peso muerto','upper','Espalda','Barra',3,'Barra pegada a las piernas; empuja el piso y lleva la cadera adelante.','preset:13-peso-muerto',4,'5-8'),
  ('Pullover en polea','upper','Espalda','Polea',1,'Brazos casi estirados; baja la barra hasta los muslos.','preset:14-pullover-en-polea',3,'12-15'),
  ('Hiperextensiones','upper','Espalda','Máquina',1,'Sube hasta alinear el cuerpo; no arquees de más.','preset:15-hiperextensiones',3,'12-15'),
  ('Press militar con barra','upper','Hombro','Barra',2,'De pie, glúteo apretado; empuja la barra en línea recta sobre la cabeza.','preset:16-press-militar-con-barra',4,'6-10'),
  ('Press de hombro con mancuernas','upper','Hombro','Mancuernas',1,'Sentado; baja hasta la altura de las orejas.','preset:17-press-de-hombro-con-mancuernas',3,'8-12'),
  ('Elevaciones laterales','upper','Hombro','Mancuernas',1,'Sube hasta la altura del hombro con el codo un poco flexionado.','preset:18-elevaciones-laterales',3,'12-15'),
  ('Elevaciones frontales','upper','Hombro','Mancuernas',1,'Sube al frente hasta la altura de los ojos, sin balanceo.','preset:19-elevaciones-frontales',3,'10-12'),
  ('Face pull','upper','Hombro','Polea',1,'Cuerda a la altura de la cara; separa las manos al final.','preset:20-face-pull',3,'12-15'),
  ('Encogimientos','upper','Hombro','Mancuernas',1,'Sube los hombros hacia las orejas y sostén 1 segundo.','preset:21-encogimientos',3,'12-15'),
  ('Curl con barra','upper','Bíceps','Barra',1,'Codos quietos; sube sin echar la espalda atrás.','preset:22-curl-con-barra',3,'8-12'),
  ('Curl alterno con mancuernas','upper','Bíceps','Mancuernas',1,'Gira la muñeca al subir; baja lento.','preset:23-curl-alterno-con-mancuernas',3,'10-12'),
  ('Curl martillo','upper','Bíceps','Mancuernas',1,'Palmas mirándose; codos pegados al cuerpo.','preset:24-curl-martillo',3,'10-12'),
  ('Curl en polea','upper','Bíceps','Polea',1,'Tensión todo el recorrido; aprieta arriba 1 segundo.','preset:25-curl-en-polea',3,'12-15'),
  ('Extensión de tríceps en polea','upper','Tríceps','Polea',1,'Codos pegados; estira del todo abajo.','preset:26-extension-de-triceps-en-polea',3,'10-15'),
  ('Press francés','upper','Tríceps','Barra',2,'Acostado; baja la barra hacia la frente moviendo solo los codos.','preset:27-press-frances',3,'8-12'),
  ('Extensión sobre la cabeza con mancuerna','upper','Tríceps','Mancuernas',1,'Codos apuntando arriba; baja detrás de la cabeza.','preset:28-extension-sobre-la-cabeza-con-mancuerna',3,'10-12'),
  ('Fondos en banco','upper','Tríceps','Peso corporal',1,'Espalda cerca del banco; baja hasta 90° en el codo.','preset:29-fondos-en-banco',3,'10-15'),
  ('Sentadilla con barra','lower','Cuádriceps','Barra',3,'Barra en la espalda alta; baja sentándote atrás, talones al piso.','preset:30-sentadilla-con-barra',4,'8-12'),
  ('Sentadilla goblet','lower','Cuádriceps','Kettlebell',1,'Pesa pegada al pecho; codos por dentro de las rodillas al bajar.','preset:31-sentadilla-goblet',3,'10-12'),
  ('Prensa de piernas','lower','Cuádriceps','Máquina',1,'Pies a la anchura de la cadera; no despegues la cadera del respaldo.','preset:32-prensa-de-piernas',4,'10-12'),
  ('Zancadas con mancuernas','lower','Cuádriceps','Mancuernas',2,'Paso largo; la rodilla de atrás casi toca el piso. Repeticiones por pierna.','preset:33-zancadas-con-mancuernas',3,'10'),
  ('Sentadilla búlgara','lower','Cuádriceps','Mancuernas',2,'Pie de atrás en el banco; baja vertical, torso firme. Repeticiones por pierna.','preset:34-sentadilla-bulgara',3,'8-10'),
  ('Extensión de cuádriceps','lower','Cuádriceps','Máquina',1,'Estira del todo arriba y baja en 2 segundos.','preset:35-extension-de-cuadriceps',3,'12-15'),
  ('Peso muerto rumano','lower','Femoral','Barra',2,'Rodillas casi estiradas; cadera atrás hasta sentir el femoral.','preset:36-peso-muerto-rumano',3,'8-10'),
  ('Curl femoral acostado','lower','Femoral','Máquina',1,'Cadera pegada al banco; sube sin impulso.','preset:37-curl-femoral-acostado',3,'10-12'),
  ('Hip thrust','lower','Glúteo','Barra',2,'Espalda alta en el banco; sube hasta alinear tronco y muslos, aprieta arriba.','preset:38-hip-thrust',4,'8-12'),
  ('Puente de glúteo','lower','Glúteo','Peso corporal',1,'Talones cerca; empuja con los talones y aprieta 2 segundos.','preset:39-puente-de-gluteo',3,'12-15'),
  ('Patada de glúteo en polea','lower','Glúteo','Polea',1,'Torso quieto; lleva la pierna atrás sin arquear la espalda. Repeticiones por pierna.','preset:40-patada-de-gluteo-en-polea',3,'12-15'),
  ('Abducción de cadera','lower','Glúteo','Máquina',1,'Abre controlado y sostén 1 segundo afuera.','preset:41-abduccion-de-cadera',3,'15-20'),
  ('Elevación de talones de pie','lower','Pantorrilla','Máquina',1,'Sube hasta la punta y baja hasta estirar del todo.','preset:42-elevacion-de-talones-de-pie',4,'12-15'),
  ('Elevación de talones sentado','lower','Pantorrilla','Máquina',1,'Pausa abajo 1 segundo antes de subir.','preset:43-elevacion-de-talones-sentado',3,'15-20'),
  ('Plancha','core','Core','Peso corporal',1,'Codos bajo los hombros; glúteo y abdomen apretados, cadera alineada.','preset:44-plancha',3,'30-45s'),
  ('Plancha lateral','core','Core','Peso corporal',1,'Cadera arriba, cuerpo en línea recta. Tiempo por lado.','preset:45-plancha-lateral',3,'20-30s'),
  ('Crunch abdominal','core','Core','Peso corporal',1,'Sube despegando solo los hombros; no jales el cuello.','preset:46-crunch-abdominal',3,'15-20'),
  ('Elevación de piernas','core','Core','Peso corporal',2,'Acostado, zona lumbar pegada al piso; baja lento.','preset:47-elevacion-de-piernas',3,'10-15'),
  ('Bicho muerto','core','Core','Peso corporal',1,'Brazo y pierna contrarios; espalda baja siempre pegada al piso. Repeticiones por lado.','preset:48-bicho-muerto',3,'10'),
  ('Burpees','cardio','Cuerpo completo','Peso corporal',2,'Pecho al piso, salta con los brazos arriba; ritmo constante.','preset:49-burpees',3,'10-12'),
  ('Escaladores','cardio','Cuerpo completo','Peso corporal',1,'Plancha alta; lleva las rodillas al pecho rápido sin subir la cadera.','preset:50-escaladores',3,'30s'),
  ('Press de pecho en máquina','upper','Pecho','Máquina',1,'Espalda pegada al respaldo; empuja hasta casi estirar y vuelve lento.','preset:51-press-de-pecho-en-maquina',3,'10-12'),
  ('Aperturas en máquina','upper','Pecho','Máquina',1,'Codos un poco flexionados; junta al frente y aprieta 1 segundo.','preset:52-aperturas-en-maquina',3,'12-15'),
  ('Sentadilla hack','lower','Cuádriceps','Máquina',2,'Espalda pegada al respaldo; baja hasta que los muslos queden paralelos.','preset:53-sentadilla-hack',3,'8-12'),
  ('Swing con kettlebell','lower','Glúteo','Kettlebell',2,'Impulso con la cadera, no con los brazos; espalda recta, glúteo apretado arriba.','preset:54-swing-con-kettlebell',3,'15');

update public.exercises e set image = coalesce(e.image, p.image), sugg_sets = coalesce(e.sugg_sets, p.sets), sugg_reps = coalesce(e.sugg_reps, p.reps)
  from _preset p where lower(trim(e.name)) = lower(p.name);

insert into public.exercises (workspace_id, name, category, muscle_group, equipment, difficulty, instructions, image, sugg_sets, sugg_reps)
select w.id, p.name, p.category, p.muscle, p.equipment, p.difficulty, p.instructions, p.image, p.sets, p.reps
from public.workspaces w cross join _preset p
where not exists (select 1 from public.exercises e where e.workspace_id = w.id and lower(trim(e.name)) = lower(p.name));
drop table _preset;
