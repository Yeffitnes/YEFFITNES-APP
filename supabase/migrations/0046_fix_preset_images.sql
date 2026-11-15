-- 0046 · Arreglo de la 0045 (31-oct). Cristian corrió la primera versión de la 0045 (sin imágenes y con 15 ejercicios que repetían
-- otros). Esta migración deja la base como la 0045 final:
--   1) pone la imagen del personaje a los 89 ejercicios nuevos (solo si no tienen imagen: nunca pisa una que Jeff haya subido);
--   2) quita los 15 repetidos (ver CHANGELOG 31-oct, tarde 3). Si alguno ya se usó en una rutina o en el plan de un cliente, NO se borra:
--      se archiva (deja de salir en el catálogo y en el selector, pero las rutinas y el historial siguen igual).
-- Solo toca ejercicios precargados (sin imagen o con imagen 'preset:'), nunca uno al que Jeff le subió su propia imagen.
-- Se puede correr aunque la 0045 se haya corrido en su versión final, y se puede correr dos veces. Compatible con main.
-- Revertir: imágenes, `update public.exercises set image = null where image like 'preset:%' and split_part(substr(image,8),'-',1)::int >= 55;`
--   los borrados no se deshacen (se vuelven a crear corriendo la 0045 del commit 106f863).

create temporary table _img (name text, image text);
insert into _img values
  ('Press inclinado con barra','preset:55-press-inclinado-con-barra'),
  ('Press declinado con barra','preset:56-press-declinado-con-barra'),
  ('Press inclinado en máquina','preset:57-press-inclinado-en-maquina'),
  ('Flexiones inclinadas','preset:60-flexiones-inclinadas'),
  ('Flexiones declinadas','preset:61-flexiones-declinadas'),
  ('Press de pecho en el piso con mancuernas','preset:62-press-de-pecho-en-el-piso-con-mancuernas'),
  ('Dominadas supinas','preset:64-dominadas-supinas'),
  ('Dominadas asistidas en máquina','preset:65-dominadas-asistidas-en-maquina'),
  ('Jalón con agarre cerrado','preset:66-jalon-con-agarre-cerrado'),
  ('Remo en máquina','preset:67-remo-en-maquina'),
  ('Remo en T','preset:68-remo-en-t'),
  ('Remo invertido','preset:69-remo-invertido'),
  ('Remo con mancuernas en banco inclinado','preset:70-remo-con-mancuernas-en-banco-inclinado'),
  ('Remo unilateral en polea','preset:73-remo-unilateral-en-polea'),
  ('Remo con banda','preset:74-remo-con-banda'),
  ('Pullover con mancuerna','preset:75-pullover-con-mancuerna'),
  ('Superman','preset:76-superman'),
  ('Press Arnold','preset:78-press-arnold'),
  ('Press de hombro en máquina','preset:79-press-de-hombro-en-maquina'),
  ('Elevaciones laterales en polea','preset:80-elevaciones-laterales-en-polea'),
  ('Elevaciones laterales en máquina','preset:81-elevaciones-laterales-en-maquina'),
  ('Pájaros con mancuernas','preset:82-pajaros-con-mancuernas'),
  ('Aperturas invertidas en máquina','preset:83-aperturas-invertidas-en-maquina'),
  ('Remo al mentón','preset:84-remo-al-menton'),
  ('Press landmine','preset:85-press-landmine'),
  ('Separación con banda','preset:86-separacion-con-banda'),
  ('Flexiones de hombro (pike)','preset:87-flexiones-de-hombro-pike'),
  ('Curl concentrado','preset:88-curl-concentrado'),
  ('Curl predicador con barra','preset:89-curl-predicador-con-barra'),
  ('Curl predicador en máquina','preset:90-curl-predicador-en-maquina'),
  ('Curl inclinado con mancuernas','preset:91-curl-inclinado-con-mancuernas'),
  ('Curl con banda','preset:93-curl-con-banda'),
  ('Curl araña','preset:94-curl-arana'),
  ('Extensión de tríceps sobre la cabeza en polea','preset:96-extension-de-triceps-sobre-la-cabeza-en-polea'),
  ('Press de banca agarre cerrado','preset:97-press-de-banca-agarre-cerrado'),
  ('Patada de tríceps con mancuerna','preset:98-patada-de-triceps-con-mancuerna'),
  ('Fondos en máquina','preset:99-fondos-en-maquina'),
  ('Extensión de tríceps con banda','preset:102-extension-de-triceps-con-banda'),
  ('Sentadilla frontal','preset:103-sentadilla-frontal'),
  ('Sentadilla libre','preset:104-sentadilla-libre'),
  ('Sentadilla en máquina Smith','preset:105-sentadilla-en-maquina-smith'),
  ('Zancada hacia atrás','preset:107-zancada-hacia-atras'),
  ('Subida al cajón','preset:108-subida-al-cajon'),
  ('Sentadilla en pared','preset:109-sentadilla-en-pared'),
  ('Sentadilla con banda','preset:111-sentadilla-con-banda'),
  ('Sentadilla con salto','preset:112-sentadilla-con-salto'),
  ('Saltos al cajón','preset:113-saltos-al-cajon'),
  ('Curl femoral sentado','preset:114-curl-femoral-sentado'),
  ('Curl femoral de pie en máquina','preset:115-curl-femoral-de-pie-en-maquina'),
  ('Peso muerto rumano con mancuernas','preset:116-peso-muerto-rumano-con-mancuernas'),
  ('Peso muerto a una pierna','preset:117-peso-muerto-a-una-pierna'),
  ('Buenos días con barra','preset:118-buenos-dias-con-barra'),
  ('Curl nórdico','preset:119-curl-nordico'),
  ('Peso muerto sumo','preset:121-peso-muerto-sumo'),
  ('Hip thrust en máquina','preset:122-hip-thrust-en-maquina'),
  ('Hip thrust a una pierna','preset:123-hip-thrust-a-una-pierna'),
  ('Patada de glúteo en cuadrupedia','preset:125-patada-de-gluteo-en-cuadrupedia'),
  ('Patada de glúteo en máquina','preset:126-patada-de-gluteo-en-maquina'),
  ('Caminata lateral con banda','preset:127-caminata-lateral-con-banda'),
  ('Abducción de cadera en polea','preset:128-abduccion-de-cadera-en-polea'),
  ('Sentadilla sumo con mancuerna','preset:129-sentadilla-sumo-con-mancuerna'),
  ('Almeja con banda','preset:130-almeja-con-banda'),
  ('Elevación de talones a una pierna','preset:132-elevacion-de-talones-a-una-pierna'),
  ('Elevación de talones con mancuernas','preset:133-elevacion-de-talones-con-mancuernas'),
  ('Crunch en polea','preset:134-crunch-en-polea'),
  ('Elevación de piernas colgado','preset:135-elevacion-de-piernas-colgado'),
  ('Elevación de rodillas en paralelas','preset:136-elevacion-de-rodillas-en-paralelas'),
  ('Giros rusos','preset:137-giros-rusos'),
  ('Rueda abdominal','preset:138-rueda-abdominal'),
  ('Pallof press','preset:139-pallof-press'),
  ('Leñador en polea','preset:140-lenador-en-polea'),
  ('Crunch inverso','preset:141-crunch-inverso'),
  ('Abdominal bicicleta','preset:142-abdominal-bicicleta'),
  ('Posición hueca','preset:143-posicion-hueca'),
  ('Plancha con toque de hombro','preset:144-plancha-con-toque-de-hombro'),
  ('Perro de caza','preset:145-perro-de-caza'),
  ('Tijeras','preset:146-tijeras'),
  ('Paseo del granjero','preset:147-paseo-del-granjero'),
  ('Saltos de tijera','preset:148-saltos-de-tijera'),
  ('Rodillas arriba','preset:149-rodillas-arriba'),
  ('Saltar la cuerda','preset:150-saltar-la-cuerda'),
  ('Thruster con mancuernas','preset:151-thruster-con-mancuernas'),
  ('Paso del oso','preset:152-paso-del-oso'),
  ('Zancadas con salto','preset:153-zancadas-con-salto'),
  ('Remo ergómetro','preset:154-remo-ergometro'),
  ('Bicicleta estática','preset:155-bicicleta-estatica'),
  ('Caminadora inclinada','preset:156-caminadora-inclinada'),
  ('Elíptica','preset:157-eliptica'),
  ('Escaladora','preset:158-escaladora');
update public.exercises e set image = i.image from _img i where lower(trim(e.name)) = lower(i.name) and e.image is null;
drop table _img;

create temporary table _gone (name text);
insert into _gone values ('Zancadas caminando'), ('Puente de glúteo con barra'), ('Encogimientos con barra'), ('Cruce de poleas desde abajo'), ('Press de pecho con banda'), ('Elevación de talones en prensa'), ('Remo con barra agarre supino'), ('Remo Pendlay'), ('Extensión de tríceps con cuerda'), ('Curl martillo con cuerda en polea'), ('Press francés con mancuernas'), ('Flexiones de agarre cerrado'), ('Prensa a una pierna'), ('Peso muerto con kettlebell'), ('Aperturas inclinadas con mancuernas');
-- usados en rutinas o planes: se archivan
update public.exercises e set active = false from _gone g
  where lower(trim(e.name)) = lower(g.name) and (e.image is null or e.image like 'preset:%')
    and (exists (select 1 from public.template_items t where t.exercise_id = e.id) or exists (select 1 from public.plan_items p where p.exercise_id = e.id));
-- sin usar: se borran (sus sustitutos de la 0044 se borran solos; un cambio ya hecho por un cliente conserva el nombre)
delete from public.exercises e using _gone g
  where lower(trim(e.name)) = lower(g.name) and (e.image is null or e.image like 'preset:%')
    and not exists (select 1 from public.template_items t where t.exercise_id = e.id) and not exists (select 1 from public.plan_items p where p.exercise_id = e.id);
drop table _gone;
