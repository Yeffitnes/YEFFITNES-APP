# Ejercicios precargados nuevos (0045): 104 más, de 54 a 158

Preparado el 31-oct para el pedido de Cristian ("más ejercicios precargados, 100 a 200"). Los datos ya están en la migración `0045_more_preset_exercises.sql` (sin imagen).
Mientras no haya imagen, cada uno se ve con la portada de marca. Series, repeticiones e indicaciones son **PROPUESTA**: Jeff las puede cambiar en el catálogo.

## Cómo poner las imágenes cuando existan
1. Generarlas en tandas de 9 (cuadrícula 3×3), con el mismo estilo y personaje de las 54 (sin números al inicio de cada línea, sin frases "NOT ..."; "side view" en lo acostado). Abajo va el texto en inglés de cada tanda, en el orden de la cuadrícula (izquierda a derecha, arriba a abajo).
2. Recortar a 360 px WebP con el nombre de archivo de la tabla y ponerlas en `public/ex/`.
3. Una migración nueva pone la imagen: `update public.exercises set image = 'preset:<archivo sin .webp>' where lower(name) = lower('<nombre>') and image is null;` (no pisa la imagen que Jeff ya haya subido).

## Lista

| # | Ejercicio | Músculo | Equipo | Series × reps | Archivo de imagen |
|---|---|---|---|---|---|
| 55 | Press inclinado con barra | Pecho | Barra | 4 × 6-10 | `55-press-inclinado-con-barra.webp` |
| 56 | Press declinado con barra | Pecho | Barra | 3 × 8-10 | `56-press-declinado-con-barra.webp` |
| 57 | Press inclinado en máquina | Pecho | Máquina | 3 × 10-12 | `57-press-inclinado-en-maquina.webp` |
| 58 | Aperturas inclinadas con mancuernas | Pecho | Mancuernas | 3 × 10-15 | `58-aperturas-inclinadas-con-mancuernas.webp` |
| 59 | Cruce de poleas desde abajo | Pecho | Polea | 3 × 12-15 | `59-cruce-de-poleas-desde-abajo.webp` |
| 60 | Flexiones inclinadas | Pecho | Peso corporal | 3 × 10-15 | `60-flexiones-inclinadas.webp` |
| 61 | Flexiones declinadas | Pecho | Peso corporal | 3 × 8-12 | `61-flexiones-declinadas.webp` |
| 62 | Press de pecho en el piso con mancuernas | Pecho | Mancuernas | 3 × 8-12 | `62-press-de-pecho-en-el-piso-con-mancuernas.webp` |
| 63 | Press de pecho con banda | Pecho | Banda elástica | 3 × 12-15 | `63-press-de-pecho-con-banda.webp` |
| 64 | Dominadas supinas | Espalda | Barra de dominadas | 3 × 5-8 | `64-dominadas-supinas.webp` |
| 65 | Dominadas asistidas en máquina | Espalda | Máquina | 3 × 8-12 | `65-dominadas-asistidas-en-maquina.webp` |
| 66 | Jalón con agarre cerrado | Espalda | Polea | 3 × 10-12 | `66-jalon-con-agarre-cerrado.webp` |
| 67 | Remo en máquina | Espalda | Máquina | 3 × 10-12 | `67-remo-en-maquina.webp` |
| 68 | Remo en T | Espalda | Barra | 4 × 8-10 | `68-remo-en-t.webp` |
| 69 | Remo invertido | Espalda | Peso corporal | 3 × 8-12 | `69-remo-invertido.webp` |
| 70 | Remo con mancuernas en banco inclinado | Espalda | Mancuernas | 3 × 10-12 | `70-remo-con-mancuernas-en-banco-inclinado.webp` |
| 71 | Remo con barra agarre supino | Espalda | Barra | 3 × 8-10 | `71-remo-con-barra-agarre-supino.webp` |
| 72 | Remo Pendlay | Espalda | Barra | 4 × 5-8 | `72-remo-pendlay.webp` |
| 73 | Remo unilateral en polea | Espalda | Polea | 3 × 10-12 | `73-remo-unilateral-en-polea.webp` |
| 74 | Remo con banda | Espalda | Banda elástica | 3 × 12-15 | `74-remo-con-banda.webp` |
| 75 | Pullover con mancuerna | Espalda | Mancuernas | 3 × 10-12 | `75-pullover-con-mancuerna.webp` |
| 76 | Superman | Espalda | Peso corporal | 3 × 12-15 | `76-superman.webp` |
| 77 | Encogimientos con barra | Hombro | Barra | 3 × 12-15 | `77-encogimientos-con-barra.webp` |
| 78 | Press Arnold | Hombro | Mancuernas | 3 × 8-12 | `78-press-arnold.webp` |
| 79 | Press de hombro en máquina | Hombro | Máquina | 3 × 10-12 | `79-press-de-hombro-en-maquina.webp` |
| 80 | Elevaciones laterales en polea | Hombro | Polea | 3 × 12-15 | `80-elevaciones-laterales-en-polea.webp` |
| 81 | Elevaciones laterales en máquina | Hombro | Máquina | 3 × 12-15 | `81-elevaciones-laterales-en-maquina.webp` |
| 82 | Pájaros con mancuernas | Hombro | Mancuernas | 3 × 12-15 | `82-pajaros-con-mancuernas.webp` |
| 83 | Aperturas invertidas en máquina | Hombro | Máquina | 3 × 12-15 | `83-aperturas-invertidas-en-maquina.webp` |
| 84 | Remo al mentón | Hombro | Barra | 3 × 10-12 | `84-remo-al-menton.webp` |
| 85 | Press landmine | Hombro | Barra | 3 × 8-12 | `85-press-landmine.webp` |
| 86 | Separación con banda | Hombro | Banda elástica | 3 × 15-20 | `86-separacion-con-banda.webp` |
| 87 | Flexiones de hombro (pike) | Hombro | Peso corporal | 3 × 8-12 | `87-flexiones-de-hombro-pike.webp` |
| 88 | Curl concentrado | Bíceps | Mancuernas | 3 × 10-12 | `88-curl-concentrado.webp` |
| 89 | Curl predicador con barra | Bíceps | Barra | 3 × 10-12 | `89-curl-predicador-con-barra.webp` |
| 90 | Curl predicador en máquina | Bíceps | Máquina | 3 × 10-12 | `90-curl-predicador-en-maquina.webp` |
| 91 | Curl inclinado con mancuernas | Bíceps | Mancuernas | 3 × 10-12 | `91-curl-inclinado-con-mancuernas.webp` |
| 92 | Curl martillo con cuerda en polea | Bíceps | Polea | 3 × 12-15 | `92-curl-martillo-con-cuerda-en-polea.webp` |
| 93 | Curl con banda | Bíceps | Banda elástica | 3 × 12-15 | `93-curl-con-banda.webp` |
| 94 | Curl araña | Bíceps | Mancuernas | 3 × 10-12 | `94-curl-arana.webp` |
| 95 | Extensión de tríceps con cuerda | Tríceps | Polea | 3 × 12-15 | `95-extension-de-triceps-con-cuerda.webp` |
| 96 | Extensión de tríceps sobre la cabeza en polea | Tríceps | Polea | 3 × 10-12 | `96-extension-de-triceps-sobre-la-cabeza-en-polea.webp` |
| 97 | Press de banca agarre cerrado | Tríceps | Barra | 3 × 6-10 | `97-press-de-banca-agarre-cerrado.webp` |
| 98 | Patada de tríceps con mancuerna | Tríceps | Mancuernas | 3 × 12-15 | `98-patada-de-triceps-con-mancuerna.webp` |
| 99 | Fondos en máquina | Tríceps | Máquina | 3 × 10-12 | `99-fondos-en-maquina.webp` |
| 100 | Press francés con mancuernas | Tríceps | Mancuernas | 3 × 10-12 | `100-press-frances-con-mancuernas.webp` |
| 101 | Flexiones de agarre cerrado | Tríceps | Peso corporal | 3 × 8-12 | `101-flexiones-de-agarre-cerrado.webp` |
| 102 | Extensión de tríceps con banda | Tríceps | Banda elástica | 3 × 15-20 | `102-extension-de-triceps-con-banda.webp` |
| 103 | Sentadilla frontal | Cuádriceps | Barra | 4 × 6-8 | `103-sentadilla-frontal.webp` |
| 104 | Sentadilla libre | Cuádriceps | Peso corporal | 3 × 15-20 | `104-sentadilla-libre.webp` |
| 105 | Sentadilla en máquina Smith | Cuádriceps | Máquina | 3 × 8-12 | `105-sentadilla-en-maquina-smith.webp` |
| 106 | Zancadas caminando | Cuádriceps | Mancuernas | 3 × 10-12 | `106-zancadas-caminando.webp` |
| 107 | Zancada hacia atrás | Cuádriceps | Mancuernas | 3 × 10-12 | `107-zancada-hacia-atras.webp` |
| 108 | Subida al cajón | Cuádriceps | Mancuernas | 3 × 10-12 | `108-subida-al-cajon.webp` |
| 109 | Sentadilla en pared | Cuádriceps | Peso corporal | 3 × 30-45s | `109-sentadilla-en-pared.webp` |
| 110 | Prensa a una pierna | Cuádriceps | Máquina | 3 × 10-12 | `110-prensa-a-una-pierna.webp` |
| 111 | Sentadilla con banda | Cuádriceps | Banda elástica | 3 × 15 | `111-sentadilla-con-banda.webp` |
| 112 | Sentadilla con salto | Cuádriceps | Peso corporal | 3 × 10-12 | `112-sentadilla-con-salto.webp` |
| 113 | Saltos al cajón | Cuádriceps | Peso corporal | 3 × 8-10 | `113-saltos-al-cajon.webp` |
| 114 | Curl femoral sentado | Femoral | Máquina | 3 × 10-12 | `114-curl-femoral-sentado.webp` |
| 115 | Curl femoral de pie en máquina | Femoral | Máquina | 3 × 10-12 | `115-curl-femoral-de-pie-en-maquina.webp` |
| 116 | Peso muerto rumano con mancuernas | Femoral | Mancuernas | 3 × 8-12 | `116-peso-muerto-rumano-con-mancuernas.webp` |
| 117 | Peso muerto a una pierna | Femoral | Mancuernas | 3 × 8-10 | `117-peso-muerto-a-una-pierna.webp` |
| 118 | Buenos días con barra | Femoral | Barra | 3 × 8-12 | `118-buenos-dias-con-barra.webp` |
| 119 | Curl nórdico | Femoral | Peso corporal | 3 × 4-6 | `119-curl-nordico.webp` |
| 120 | Peso muerto con kettlebell | Femoral | Kettlebell | 3 × 10-12 | `120-peso-muerto-con-kettlebell.webp` |
| 121 | Peso muerto sumo | Glúteo | Barra | 4 × 5-8 | `121-peso-muerto-sumo.webp` |
| 122 | Hip thrust en máquina | Glúteo | Máquina | 3 × 10-12 | `122-hip-thrust-en-maquina.webp` |
| 123 | Hip thrust a una pierna | Glúteo | Peso corporal | 3 × 10-12 | `123-hip-thrust-a-una-pierna.webp` |
| 124 | Puente de glúteo con barra | Glúteo | Barra | 3 × 10-12 | `124-puente-de-gluteo-con-barra.webp` |
| 125 | Patada de glúteo en cuadrupedia | Glúteo | Peso corporal | 3 × 15 | `125-patada-de-gluteo-en-cuadrupedia.webp` |
| 126 | Patada de glúteo en máquina | Glúteo | Máquina | 3 × 12-15 | `126-patada-de-gluteo-en-maquina.webp` |
| 127 | Caminata lateral con banda | Glúteo | Banda elástica | 3 × 12 | `127-caminata-lateral-con-banda.webp` |
| 128 | Abducción de cadera en polea | Glúteo | Polea | 3 × 12-15 | `128-abduccion-de-cadera-en-polea.webp` |
| 129 | Sentadilla sumo con mancuerna | Glúteo | Mancuernas | 3 × 12-15 | `129-sentadilla-sumo-con-mancuerna.webp` |
| 130 | Almeja con banda | Glúteo | Banda elástica | 3 × 15-20 | `130-almeja-con-banda.webp` |
| 131 | Elevación de talones en prensa | Pantorrilla | Máquina | 3 × 15-20 | `131-elevacion-de-talones-en-prensa.webp` |
| 132 | Elevación de talones a una pierna | Pantorrilla | Peso corporal | 3 × 12-15 | `132-elevacion-de-talones-a-una-pierna.webp` |
| 133 | Elevación de talones con mancuernas | Pantorrilla | Mancuernas | 3 × 15-20 | `133-elevacion-de-talones-con-mancuernas.webp` |
| 134 | Crunch en polea | Core | Polea | 3 × 12-15 | `134-crunch-en-polea.webp` |
| 135 | Elevación de piernas colgado | Core | Barra de dominadas | 3 × 8-12 | `135-elevacion-de-piernas-colgado.webp` |
| 136 | Elevación de rodillas en paralelas | Core | Máquina | 3 × 10-15 | `136-elevacion-de-rodillas-en-paralelas.webp` |
| 137 | Giros rusos | Core | Peso corporal | 3 × 20 | `137-giros-rusos.webp` |
| 138 | Rueda abdominal | Core | Rueda abdominal | 3 × 6-10 | `138-rueda-abdominal.webp` |
| 139 | Pallof press | Core | Polea | 3 × 10-12 | `139-pallof-press.webp` |
| 140 | Leñador en polea | Core | Polea | 3 × 10-12 | `140-lenador-en-polea.webp` |
| 141 | Crunch inverso | Core | Peso corporal | 3 × 12-15 | `141-crunch-inverso.webp` |
| 142 | Abdominal bicicleta | Core | Peso corporal | 3 × 20 | `142-abdominal-bicicleta.webp` |
| 143 | Posición hueca | Core | Peso corporal | 3 × 20-30s | `143-posicion-hueca.webp` |
| 144 | Plancha con toque de hombro | Core | Peso corporal | 3 × 20 | `144-plancha-con-toque-de-hombro.webp` |
| 145 | Perro de caza | Core | Peso corporal | 3 × 10 | `145-perro-de-caza.webp` |
| 146 | Tijeras | Core | Peso corporal | 3 × 30s | `146-tijeras.webp` |
| 147 | Paseo del granjero | Cuerpo completo | Mancuernas | 3 × 30-40s | `147-paseo-del-granjero.webp` |
| 148 | Saltos de tijera | Cuerpo completo | Peso corporal | 3 × 30-45s | `148-saltos-de-tijera.webp` |
| 149 | Rodillas arriba | Cuerpo completo | Peso corporal | 3 × 30s | `149-rodillas-arriba.webp` |
| 150 | Saltar la cuerda | Cuerpo completo | Cuerda | 3 × 45-60s | `150-saltar-la-cuerda.webp` |
| 151 | Thruster con mancuernas | Cuerpo completo | Mancuernas | 3 × 10-12 | `151-thruster-con-mancuernas.webp` |
| 152 | Paso del oso | Cuerpo completo | Peso corporal | 3 × 20-30s | `152-paso-del-oso.webp` |
| 153 | Zancadas con salto | Cuádriceps | Peso corporal | 3 × 12-16 | `153-zancadas-con-salto.webp` |
| 154 | Remo ergómetro | Cuerpo completo | Máquina | 1 × 10 min | `154-remo-ergometro.webp` |
| 155 | Bicicleta estática | Cuerpo completo | Máquina | 1 × 15-20 min | `155-bicicleta-estatica.webp` |
| 156 | Caminadora inclinada | Cuerpo completo | Máquina | 1 × 15-20 min | `156-caminadora-inclinada.webp` |
| 157 | Elíptica | Cuerpo completo | Máquina | 1 × 15-20 min | `157-eliptica.webp` |
| 158 | Escaladora | Cuerpo completo | Máquina | 1 × 10-15 min | `158-escaladora.webp` |

## Textos para generar las imágenes (tandas de 9)

**Tanda 1** (#55 a #63)
```
incline barbell bench press on a 30 degree bench
decline barbell bench press, side view
incline chest press machine, seated
incline dumbbell fly on a 30 degree bench, side view
low-to-high cable crossover
incline push-up with hands on a bench, side view
decline push-up with feet on a bench, side view
dumbbell floor press, lying on the floor, side view
standing resistance band chest press
```

**Tanda 2** (#64 a #72)
```
chin-up with underhand grip
assisted pull-up machine, kneeling on the pad
close-grip lat pulldown with V handle
seated row machine with chest pad
T-bar row, side view
inverted row under a low bar, side view
chest-supported dumbbell row on an incline bench, side view
underhand barbell bent-over row, side view
Pendlay row, torso parallel to the floor, side view
```

**Tanda 3** (#73 a #81)
```
single-arm seated cable row
standing resistance band row
dumbbell pullover lying on a bench, side view
superman exercise lying face down, side view
barbell shrug, front view
seated Arnold press with dumbbells
shoulder press machine, seated
single-arm cable lateral raise
lateral raise machine, seated
```

**Tanda 4** (#82 a #90)
```
bent-over dumbbell reverse fly, side view
reverse pec deck machine, rear delt fly
barbell upright row, front view
single-arm landmine press, standing
resistance band pull-apart, front view
pike push-up, side view
seated dumbbell concentration curl
EZ-bar preacher curl on a preacher bench
preacher curl machine, seated
```

**Tanda 5** (#91 a #99)
```
incline dumbbell curl on a 45 degree bench, side view
cable rope hammer curl
resistance band biceps curl, standing
spider curl, chest on incline bench, side view
cable rope triceps pushdown
overhead cable triceps extension with rope
close-grip barbell bench press, side view
dumbbell triceps kickback, side view
seated dip machine
```

**Tanda 6** (#100 a #108)
```
lying dumbbell skull crusher, side view
close-grip push-up, side view
resistance band triceps pushdown
barbell front squat, side view
bodyweight squat, side view
Smith machine squat, side view
walking lunges with dumbbells, side view
reverse lunge with dumbbells, side view
dumbbell step-up onto a box, side view
```

**Tanda 7** (#109 a #117)
```
wall sit, side view
single-leg leg press machine, side view
resistance band squat, front view
jump squat in mid-air, side view
box jump landing on a box, side view
seated leg curl machine, side view
standing single-leg curl machine, side view
dumbbell Romanian deadlift, side view
single-leg dumbbell Romanian deadlift, side view
```

**Tanda 8** (#118 a #126)
```
barbell good morning, side view
Nordic hamstring curl, kneeling, side view
kettlebell deadlift, side view
sumo barbell deadlift, front view
hip thrust machine, side view
single-leg hip thrust with back on a bench, side view
barbell glute bridge on the floor, side view
quadruped donkey kick, side view
glute kickback machine, side view
```

**Tanda 9** (#127 a #135)
```
lateral band walk in half squat, front view
standing cable hip abduction, front view
dumbbell sumo squat, front view
side-lying clamshell with resistance band
calf press on leg press machine, side view
single-leg calf raise on a step, side view
standing dumbbell calf raise, side view
kneeling cable crunch, side view
hanging leg raise from a pull-up bar
```

**Tanda 10** (#136 a #144)
```
captain's chair knee raise
Russian twist, seated, side view
ab wheel rollout from knees, side view
Pallof press with cable, standing sideways
cable woodchopper, high to low
reverse crunch lying on the floor, side view
bicycle crunch lying on the floor, side view
hollow body hold, side view
high plank shoulder tap, side view
```

**Tanda 11** (#145 a #153)
```
bird dog exercise on all fours, side view
flutter kicks lying on the back, side view
farmer's walk carrying heavy dumbbells
jumping jacks, front view
high knees running in place, side view
jumping rope
dumbbell thruster, squat to overhead press
bear crawl, side view
jumping lunges in mid-air, side view
```

**Tanda 12** (#154 a #158)
```
rowing machine (ergometer), side view
stationary bike, side view
incline treadmill walk, side view
elliptical trainer, side view
stair climber machine, side view
```
