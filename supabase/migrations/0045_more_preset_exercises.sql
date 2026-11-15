-- 0045 · 89 ejercicios precargados más (de 54 a 143), pedido de Cristian (30-oct). SOLO DATOS. Todos traen la imagen del personaje
-- (generadas por Cristian el 31-oct, en public/ex/; la numeración tiene huecos porque el 31-oct se quitaron 15 que repetían otros).
-- Lista, nombres de archivo de las imágenes y textos para generarlas: docs/EJERCICIOS_NUEVOS.md.
-- Igual que la 0040: se cargan en cada espacio de coach y NO duplican: si Jeff ya tiene uno con el mismo nombre (sin importar
-- mayúsculas), solo se le ponen la imagen y las series sugeridas si no las tenía (nunca pisa una imagen que Jeff haya subido). Necesita 0039. Compatible con main (solo filas nuevas).
-- Correrla cuando Cristian o Jeff aprueben la lista. Se puede correr otra vez sin duplicar.
-- Revertir (solo los que no se han usado en rutinas ni planes y no tienen una imagen subida por Jeff): crear y llenar _preset como abajo y luego
--   delete from public.exercises e using _preset p where lower(e.name) = lower(p.name) and (e.image is null or e.image like 'preset:%')
--     and not exists (select 1 from public.template_items t where t.exercise_id = e.id) and not exists (select 1 from public.plan_items i where i.exercise_id = e.id);

create temporary table _preset (name text, category text, muscle text, equipment text, difficulty smallint, instructions text, sets smallint, reps text, image text);
insert into _preset values
  ('Press inclinado con barra','upper','Pecho','Barra',2,'Banco a 30°. Baja la barra al pecho alto y empuja sin despegar la espalda.',4,'6-10','preset:55-press-inclinado-con-barra'),
  ('Press declinado con barra','upper','Pecho','Barra',2,'Pies bien sujetos. Baja a la parte baja del pecho, controlado.',3,'8-10','preset:56-press-declinado-con-barra'),
  ('Press inclinado en máquina','upper','Pecho','Máquina',1,'Espalda pegada al respaldo. Empuja hacia arriba y adelante y vuelve lento.',3,'10-12','preset:57-press-inclinado-en-maquina'),
  ('Flexiones inclinadas','upper','Pecho','Peso corporal',1,'Manos en un banco y cuerpo en línea recta. Más fácil que la flexión normal.',3,'10-15','preset:60-flexiones-inclinadas'),
  ('Flexiones declinadas','upper','Pecho','Peso corporal',2,'Pies en un banco. Cuerpo recto y pecho cerca del piso.',3,'8-12','preset:61-flexiones-declinadas'),
  ('Press de pecho en el piso con mancuernas','upper','Pecho','Mancuernas',1,'Acostado en el piso. Baja hasta que los codos toquen suave y empuja.',3,'8-12','preset:62-press-de-pecho-en-el-piso-con-mancuernas'),
  ('Dominadas supinas','upper','Espalda','Barra de dominadas',3,'Palmas hacia ti. Sube hasta pasar la barbilla y baja completo.',3,'5-8','preset:64-dominadas-supinas'),
  ('Dominadas asistidas en máquina','upper','Espalda','Máquina',1,'Rodillas en el apoyo. Sube llevando el pecho hacia la barra.',3,'8-12','preset:65-dominadas-asistidas-en-maquina'),
  ('Jalón con agarre cerrado','upper','Espalda','Polea',1,'Agarre en V. Lleva el agarre al pecho con los codos pegados.',3,'10-12','preset:66-jalon-con-agarre-cerrado'),
  ('Remo en máquina','upper','Espalda','Máquina',1,'Pecho en el apoyo. Tira con los codos hacia atrás y junta los omóplatos.',3,'10-12','preset:67-remo-en-maquina'),
  ('Remo en T','upper','Espalda','Barra',2,'Torso inclinado y espalda recta. Lleva la barra al abdomen.',4,'8-10','preset:68-remo-en-t'),
  ('Remo invertido','upper','Espalda','Peso corporal',1,'Cuerpo recto bajo la barra. Sube el pecho hasta la barra.',3,'8-12','preset:69-remo-invertido'),
  ('Remo con mancuernas en banco inclinado','upper','Espalda','Mancuernas',1,'Pecho apoyado en un banco a 30°. Tira con los codos hacia atrás.',3,'10-12','preset:70-remo-con-mancuernas-en-banco-inclinado'),
  ('Remo unilateral en polea','upper','Espalda','Polea',1,'Un brazo a la vez. Tira hacia la cadera sin girar el torso. Repeticiones por brazo.',3,'10-12','preset:73-remo-unilateral-en-polea'),
  ('Remo con banda','upper','Espalda','Banda elástica',1,'Banda anclada al frente. Tira hacia el abdomen juntando los omóplatos.',3,'12-15','preset:74-remo-con-banda'),
  ('Pullover con mancuerna','upper','Espalda','Mancuernas',1,'Acostado en el banco. Baja la mancuerna detrás de la cabeza con los brazos casi rectos.',3,'10-12','preset:75-pullover-con-mancuerna'),
  ('Superman','upper','Espalda','Peso corporal',1,'Boca abajo. Sube brazos y piernas a la vez y sostén 2 segundos.',3,'12-15','preset:76-superman'),
  ('Press Arnold','upper','Hombro','Mancuernas',2,'Empieza con las palmas hacia ti y gíralas mientras subes.',3,'8-12','preset:78-press-arnold'),
  ('Press de hombro en máquina','upper','Hombro','Máquina',1,'Espalda pegada. Empuja sin bloquear los codos.',3,'10-12','preset:79-press-de-hombro-en-maquina'),
  ('Elevaciones laterales en polea','upper','Hombro','Polea',1,'Un brazo a la vez. Sube hasta el hombro y baja lento. Repeticiones por brazo.',3,'12-15','preset:80-elevaciones-laterales-en-polea'),
  ('Elevaciones laterales en máquina','upper','Hombro','Máquina',1,'Codos en los apoyos. Sube hasta la altura del hombro y baja lento.',3,'12-15','preset:81-elevaciones-laterales-en-maquina'),
  ('Pájaros con mancuernas','upper','Hombro','Mancuernas',1,'Torso inclinado. Abre los brazos hacia los lados apretando la espalda alta.',3,'12-15','preset:82-pajaros-con-mancuernas'),
  ('Aperturas invertidas en máquina','upper','Hombro','Máquina',1,'Pecho contra el respaldo. Abre hacia atrás con los brazos casi rectos.',3,'12-15','preset:83-aperturas-invertidas-en-maquina'),
  ('Remo al mentón','upper','Hombro','Barra',2,'Agarre al ancho de hombros. Sube la barra hasta el pecho con los codos arriba.',3,'10-12','preset:84-remo-al-menton'),
  ('Press landmine','upper','Hombro','Barra',2,'Barra anclada en una esquina. Empuja arriba y adelante. Repeticiones por brazo.',3,'8-12','preset:85-press-landmine'),
  ('Separación con banda','upper','Hombro','Banda elástica',1,'Brazos al frente. Separa la banda hasta el pecho juntando los omóplatos.',3,'15-20','preset:86-separacion-con-banda'),
  ('Flexiones de hombro (pike)','upper','Hombro','Peso corporal',2,'Cadera alta en V invertida. Baja la cabeza entre las manos.',3,'8-12','preset:87-flexiones-de-hombro-pike'),
  ('Curl concentrado','upper','Bíceps','Mancuernas',1,'Codo apoyado en el muslo. Sube sin mover el brazo. Repeticiones por brazo.',3,'10-12','preset:88-curl-concentrado'),
  ('Curl predicador con barra','upper','Bíceps','Barra',1,'Brazos en el banco Scott. Baja casi hasta estirar y sube sin despegar los brazos.',3,'10-12','preset:89-curl-predicador-con-barra'),
  ('Curl predicador en máquina','upper','Bíceps','Máquina',1,'Brazos en el apoyo. Sube y baja lento.',3,'10-12','preset:90-curl-predicador-en-maquina'),
  ('Curl inclinado con mancuernas','upper','Bíceps','Mancuernas',2,'Banco a 45°, brazos colgando. Sube sin adelantar los codos.',3,'10-12','preset:91-curl-inclinado-con-mancuernas'),
  ('Curl con banda','upper','Bíceps','Banda elástica',1,'Pisa la banda. Sube sin balancear el cuerpo.',3,'12-15','preset:93-curl-con-banda'),
  ('Curl araña','upper','Bíceps','Mancuernas',2,'Pecho en un banco inclinado y brazos colgando. Sube y aprieta arriba.',3,'10-12','preset:94-curl-arana'),
  ('Extensión de tríceps sobre la cabeza en polea','upper','Tríceps','Polea',1,'De espaldas a la polea. Estira los brazos sobre la cabeza sin abrir los codos.',3,'10-12','preset:96-extension-de-triceps-sobre-la-cabeza-en-polea'),
  ('Press de banca agarre cerrado','upper','Tríceps','Barra',2,'Manos al ancho de hombros. Codos pegados al bajar.',3,'6-10','preset:97-press-de-banca-agarre-cerrado'),
  ('Patada de tríceps con mancuerna','upper','Tríceps','Mancuernas',1,'Torso inclinado. Estira el brazo hacia atrás sin mover el codo. Repeticiones por brazo.',3,'12-15','preset:98-patada-de-triceps-con-mancuerna'),
  ('Fondos en máquina','upper','Tríceps','Máquina',1,'Empuja hacia abajo hasta estirar los brazos y vuelve lento.',3,'10-12','preset:99-fondos-en-maquina'),
  ('Extensión de tríceps con banda','upper','Tríceps','Banda elástica',1,'Banda anclada arriba. Estira los brazos hacia abajo con los codos pegados.',3,'15-20','preset:102-extension-de-triceps-con-banda'),
  ('Sentadilla frontal','lower','Cuádriceps','Barra',3,'Barra sobre los hombros al frente y codos altos. Torso erguido.',4,'6-8','preset:103-sentadilla-frontal'),
  ('Sentadilla libre','lower','Cuádriceps','Peso corporal',1,'Pies al ancho de hombros. Baja como si te sentaras, talones en el piso.',3,'15-20','preset:104-sentadilla-libre'),
  ('Sentadilla en máquina Smith','lower','Cuádriceps','Máquina',2,'Pies un poco adelante. Baja hasta paralelo, controlado.',3,'8-12','preset:105-sentadilla-en-maquina-smith'),
  ('Zancada hacia atrás','lower','Cuádriceps','Mancuernas',1,'Da el paso hacia atrás. Rodilla de adelante sobre el pie. Repeticiones por pierna.',3,'10-12','preset:107-zancada-hacia-atras'),
  ('Subida al cajón','lower','Cuádriceps','Mancuernas',1,'Sube empujando con el talón de la pierna de arriba. Repeticiones por pierna.',3,'10-12','preset:108-subida-al-cajon'),
  ('Sentadilla en pared','lower','Cuádriceps','Peso corporal',1,'Espalda contra la pared y rodillas a 90°. Sostén.',3,'30-45s','preset:109-sentadilla-en-pared'),
  ('Sentadilla con banda','lower','Cuádriceps','Banda elástica',1,'Banda bajo los pies y sobre los hombros. Baja y sube controlado.',3,'15','preset:111-sentadilla-con-banda'),
  ('Sentadilla con salto','lower','Cuádriceps','Peso corporal',2,'Baja a sentadilla y salta. Aterriza suave con las rodillas flexionadas.',3,'10-12','preset:112-sentadilla-con-salto'),
  ('Saltos al cajón','lower','Cuádriceps','Peso corporal',2,'Salta al cajón y aterriza suave. Baja caminando.',3,'8-10','preset:113-saltos-al-cajon'),
  ('Curl femoral sentado','lower','Femoral','Máquina',1,'Rodillas alineadas con el eje. Flexiona y sostén 1 segundo.',3,'10-12','preset:114-curl-femoral-sentado'),
  ('Curl femoral de pie en máquina','lower','Femoral','Máquina',1,'Una pierna. Flexiona sin mover la cadera. Repeticiones por pierna.',3,'10-12','preset:115-curl-femoral-de-pie-en-maquina'),
  ('Peso muerto rumano con mancuernas','lower','Femoral','Mancuernas',2,'Cadera atrás y espalda recta. Mancuernas pegadas a las piernas.',3,'8-12','preset:116-peso-muerto-rumano-con-mancuernas'),
  ('Peso muerto a una pierna','lower','Femoral','Mancuernas',2,'Una pierna atrás, como una balanza, con la espalda recta. Repeticiones por pierna.',3,'8-10','preset:117-peso-muerto-a-una-pierna'),
  ('Buenos días con barra','lower','Femoral','Barra',2,'Barra en la espalda. Cadera atrás con rodillas suaves y espalda recta.',3,'8-12','preset:118-buenos-dias-con-barra'),
  ('Curl nórdico','lower','Femoral','Peso corporal',3,'Pies sujetos. Baja el cuerpo lo más lento posible.',3,'4-6','preset:119-curl-nordico'),
  ('Peso muerto sumo','lower','Glúteo','Barra',3,'Pies abiertos con las puntas afuera. Barra pegada al cuerpo; empuja el piso.',4,'5-8','preset:121-peso-muerto-sumo'),
  ('Hip thrust en máquina','lower','Glúteo','Máquina',1,'Espalda en el respaldo. Empuja con la cadera y aprieta arriba.',3,'10-12','preset:122-hip-thrust-en-maquina'),
  ('Hip thrust a una pierna','lower','Glúteo','Peso corporal',2,'Espalda en el banco. Empuja con un talón. Repeticiones por pierna.',3,'10-12','preset:123-hip-thrust-a-una-pierna'),
  ('Patada de glúteo en cuadrupedia','lower','Glúteo','Peso corporal',1,'En cuatro apoyos. Empuja el talón hacia el techo. Repeticiones por pierna.',3,'15','preset:125-patada-de-gluteo-en-cuadrupedia'),
  ('Patada de glúteo en máquina','lower','Glúteo','Máquina',1,'Torso apoyado. Empuja hacia atrás sin arquear la espalda. Repeticiones por pierna.',3,'12-15','preset:126-patada-de-gluteo-en-maquina'),
  ('Caminata lateral con banda','lower','Glúteo','Banda elástica',1,'Banda sobre las rodillas. Pasos laterales en media sentadilla. Repeticiones = pasos por lado.',3,'12','preset:127-caminata-lateral-con-banda'),
  ('Abducción de cadera en polea','lower','Glúteo','Polea',1,'Tobillera en la polea. Abre la pierna hacia el lado sin inclinarte. Repeticiones por pierna.',3,'12-15','preset:128-abduccion-de-cadera-en-polea'),
  ('Sentadilla sumo con mancuerna','lower','Glúteo','Mancuernas',1,'Pies muy abiertos y puntas afuera. Mancuerna colgando entre las piernas.',3,'12-15','preset:129-sentadilla-sumo-con-mancuerna'),
  ('Almeja con banda','lower','Glúteo','Banda elástica',1,'De lado, rodillas flexionadas. Abre la rodilla sin mover la cadera. Repeticiones por lado.',3,'15-20','preset:130-almeja-con-banda'),
  ('Elevación de talones a una pierna','lower','Pantorrilla','Peso corporal',1,'En un escalón. Baja el talón y sube a la punta. Repeticiones por pierna.',3,'12-15','preset:132-elevacion-de-talones-a-una-pierna'),
  ('Elevación de talones con mancuernas','lower','Pantorrilla','Mancuernas',1,'Mancuernas a los lados. Sube a la punta y baja lento.',3,'15-20','preset:133-elevacion-de-talones-con-mancuernas'),
  ('Crunch en polea','core','Core','Polea',2,'De rodillas. Lleva los codos hacia los muslos redondeando la espalda.',3,'12-15','preset:134-crunch-en-polea'),
  ('Elevación de piernas colgado','core','Core','Barra de dominadas',3,'Colgado de la barra. Sube las rodillas o las piernas sin balancearte.',3,'8-12','preset:135-elevacion-de-piernas-colgado'),
  ('Elevación de rodillas en paralelas','core','Core','Máquina',2,'Espalda pegada al respaldo. Sube las rodillas al pecho.',3,'10-15','preset:136-elevacion-de-rodillas-en-paralelas'),
  ('Giros rusos','core','Core','Peso corporal',1,'Sentado con el torso inclinado atrás. Gira de lado a lado. Repeticiones totales.',3,'20','preset:137-giros-rusos'),
  ('Rueda abdominal','core','Core','Rueda abdominal',3,'De rodillas. Rueda al frente sin arquear la espalda y vuelve con el abdomen.',3,'6-10','preset:138-rueda-abdominal'),
  ('Pallof press','core','Core','Polea',1,'De lado a la polea. Empuja al frente sin dejar que te gire. Repeticiones por lado.',3,'10-12','preset:139-pallof-press'),
  ('Leñador en polea','core','Core','Polea',2,'Gira el torso llevando la polea en diagonal, con la cadera estable. Repeticiones por lado.',3,'10-12','preset:140-lenador-en-polea'),
  ('Crunch inverso','core','Core','Peso corporal',1,'Acostado. Sube la cadera llevando las rodillas al pecho.',3,'12-15','preset:141-crunch-inverso'),
  ('Abdominal bicicleta','core','Core','Peso corporal',1,'Codo a la rodilla contraria, alternando. Zona lumbar en el piso. Repeticiones totales.',3,'20','preset:142-abdominal-bicicleta'),
  ('Posición hueca','core','Core','Peso corporal',2,'Zona lumbar pegada al piso. Brazos y piernas estirados y elevados.',3,'20-30s','preset:143-posicion-hueca'),
  ('Plancha con toque de hombro','core','Core','Peso corporal',2,'Plancha alta. Toca el hombro contrario sin mover la cadera. Repeticiones totales.',3,'20','preset:144-plancha-con-toque-de-hombro'),
  ('Perro de caza','core','Core','Peso corporal',1,'En cuatro apoyos. Estira brazo y pierna contrarios sin girar la cadera. Repeticiones por lado.',3,'10','preset:145-perro-de-caza'),
  ('Tijeras','core','Core','Peso corporal',1,'Acostado. Piernas estiradas un poco arriba del piso, alternando. Tiempo total.',3,'30s','preset:146-tijeras'),
  ('Paseo del granjero','core','Cuerpo completo','Mancuernas',1,'Mancuernas pesadas a los lados. Camina erguido con pasos cortos.',3,'30-40s','preset:147-paseo-del-granjero'),
  ('Saltos de tijera','cardio','Cuerpo completo','Peso corporal',1,'Abre piernas y brazos a la vez, a ritmo constante.',3,'30-45s','preset:148-saltos-de-tijera'),
  ('Rodillas arriba','cardio','Cuerpo completo','Peso corporal',1,'Trota en el sitio subiendo las rodillas a la altura de la cadera.',3,'30s','preset:149-rodillas-arriba'),
  ('Saltar la cuerda','cardio','Cuerpo completo','Cuerda',1,'Saltos pequeños sobre la punta de los pies. Gira la cuerda con las muñecas.',3,'45-60s','preset:150-saltar-la-cuerda'),
  ('Thruster con mancuernas','cardio','Cuerpo completo','Mancuernas',2,'Sentadilla y, al subir, empuja las mancuernas sobre la cabeza en un solo movimiento.',3,'10-12','preset:151-thruster-con-mancuernas'),
  ('Paso del oso','cardio','Cuerpo completo','Peso corporal',2,'Rodillas apenas despegadas del piso. Avanza con mano y pie contrarios.',3,'20-30s','preset:152-paso-del-oso'),
  ('Zancadas con salto','cardio','Cuádriceps','Peso corporal',3,'Cambia de pierna en el aire y aterriza suave. Repeticiones totales.',3,'12-16','preset:153-zancadas-con-salto'),
  ('Remo ergómetro','cardio','Cuerpo completo','Máquina',1,'Empuja con las piernas y luego tira con los brazos, a ritmo constante.',1,'10 min','preset:154-remo-ergometro'),
  ('Bicicleta estática','cardio','Cuerpo completo','Máquina',1,'Resistencia moderada y cadencia constante.',1,'15-20 min','preset:155-bicicleta-estatica'),
  ('Caminadora inclinada','cardio','Cuerpo completo','Máquina',1,'Camina con inclinación sin sujetarte de los pasamanos.',1,'15-20 min','preset:156-caminadora-inclinada'),
  ('Elíptica','cardio','Cuerpo completo','Máquina',1,'Empuja y jala con brazos y piernas a ritmo constante.',1,'15-20 min','preset:157-eliptica'),
  ('Escaladora','cardio','Cuerpo completo','Máquina',2,'Paso completo y torso erguido, sin colgarte de los pasamanos.',1,'10-15 min','preset:158-escaladora');

update public.exercises e set image = coalesce(e.image, p.image), sugg_sets = coalesce(e.sugg_sets, p.sets), sugg_reps = coalesce(e.sugg_reps, p.reps)
  from _preset p where lower(trim(e.name)) = lower(p.name);

insert into public.exercises (workspace_id, name, category, muscle_group, equipment, difficulty, instructions, image, sugg_sets, sugg_reps)
select w.id, p.name, p.category, p.muscle, p.equipment, p.difficulty, p.instructions, p.image, p.sets, p.reps
from public.workspaces w cross join _preset p
where not exists (select 1 from public.exercises e where e.workspace_id = w.id and lower(trim(e.name)) = lower(p.name));
drop table _preset;
