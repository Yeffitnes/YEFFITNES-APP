# Ejercicios precargados nuevos (0045): 104 más, de 54 a 158

Preparado el 31-oct para el pedido de Cristian ("más ejercicios precargados, 100 a 200"). Los datos ya están en la migración `0045_more_preset_exercises.sql` (sin imagen).
Mientras no haya imagen, cada uno se ve con la portada de marca. Series, repeticiones e indicaciones son **PROPUESTA**: Jeff las puede cambiar en el catálogo.

## Cómo poner las imágenes cuando existan
1. Generarlas en tandas de 9 (cuadrícula 3×3), con el mismo estilo y personaje de las 54 (sin números al inicio de cada línea, sin frases "NOT ..."; "side view" en lo acostado). Abajo va el texto de cada tanda, en el orden de la cuadrícula (izquierda a derecha, arriba a abajo).
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

## Textos para generar las imágenes

Mismo formato que las 54 (número, nombre en inglés y la pose). Se entregaron a Cristian el 31-oct en `ejercicios_55_a_158.txt`. Tandas de 9 (cuadrícula 3×3):

**Tanda 1** (#55 a #63)
```
55 Incline barbell bench press: lying on a bench inclined 30 degrees, feet flat on the floor, bar held over the upper chest with arms almost straight.
56 Decline barbell bench press: lying on a decline bench with the feet hooked under the pads, bar lowered to the lower chest, elbows at about 45 degrees.
57 Incline chest press machine: seated in the machine with the back against the pad, handles pushed up and forward, arms almost straight.
58 Incline dumbbell flyes: lying on a bench inclined 30 degrees, arms open wide with a slight bend in the elbows, dumbbells at chest height.
59 Low-to-high cable crossover: standing between two cable towers with the pulleys low, one foot forward, hands raised and meeting in front of the upper chest.
60 Incline push-up: hands on the edge of a flat bench, body in a straight line from head to heels, chest close to the bench.
61 Decline push-up: feet up on a flat bench, hands on the floor, body in a straight line, chest close to the floor.
62 Dumbbell floor press: lying on the back on the floor, knees bent, dumbbells pressed up over the chest, arms almost straight.
63 Resistance band chest press: standing, band wrapped behind the upper back, both arms pushed straight forward at chest height.
```

**Tanda 2** (#64 a #72)
```
64 Chin-up: hanging from a pull-up bar with an underhand grip, palms facing the body, chin above the bar, legs straight and still.
65 Assisted pull-up machine: kneeling on the assist pad, hands on the handles above, chin pulled up to the handles.
66 Close-grip lat pulldown: seated at the machine, thighs under the pads, V handle pulled down to the upper chest, elbows close to the body, chest up.
67 Seated row machine: seated with the chest against the pad, handles pulled back to the torso, shoulder blades squeezed.
68 T-bar row: standing over a T-bar, knees slightly bent, torso bent forward at 45 degrees, flat back, handle pulled to the stomach.
69 Inverted row: lying under a low bar at waist height, heels on the floor, body straight, chest pulled up to the bar.
70 Chest-supported dumbbell row: chest resting on a bench inclined 30 degrees, one dumbbell in each hand pulled up to the sides of the torso.
71 Underhand barbell row: standing, hips back, torso bent forward at 45 degrees, flat back, palms facing up, bar pulled to the belly button.
72 Pendlay row: standing, torso parallel to the floor, flat back, barbell pulled from the floor up to the lower chest.
```

**Tanda 3** (#73 a #81)
```
73 Single-arm seated cable row: seated at the low row machine, upright torso, one hand pulling a single handle to the side of the waist, the other hand on the knee.
74 Resistance band row: standing, band anchored in front at waist height, both hands pulled back to the stomach, elbows close to the body.
75 Dumbbell pullover: lying flat on a bench, one dumbbell held with both hands behind the head, arms almost straight.
76 Superman: lying face down on the floor, arms and legs straight and lifted off the floor at the same time.
77 Barbell shrug: standing, barbell held in front of the thighs, arms straight, shoulders raised toward the ears.
78 Arnold press: seated on a bench with back support, dumbbells pressed overhead, palms rotating to face forward at the top.
79 Shoulder press machine: seated in the machine with the back against the pad, handles pressed overhead, arms almost straight.
80 Single-arm cable lateral raise: standing beside a low pulley, one arm raised out to the side to shoulder height, the other hand on the hip.
81 Lateral raise machine: seated in the machine, elbows against the pads, arms raised to the sides to shoulder height.
```

**Tanda 4** (#82 a #90)
```
82 Bent-over dumbbell reverse fly: standing, hips back, torso bent forward almost parallel to the floor, arms opened out to the sides with dumbbells in hands.
83 Reverse pec deck: seated facing the machine with the chest against the pad, arms almost straight and opened back to the sides.
84 Barbell upright row: standing, narrow grip, bar pulled up to chest height, elbows high and pointing out.
85 Landmine press: standing, one end of a barbell anchored in a corner, one hand pressing the other end up and forward from the shoulder.
86 Resistance band pull-apart: standing, arms straight in front at chest height, band stretched apart to the sides of the chest.
87 Pike push-up: hands and feet on the floor, hips high in an inverted V, head lowered toward the floor between the hands.
88 Concentration curl: seated on a bench, elbow resting on the inside of the thigh, one dumbbell curled up toward the shoulder.
89 EZ-bar preacher curl: seated at a preacher bench, upper arms resting on the pad, EZ bar curled up toward the shoulders.
90 Preacher curl machine: seated in the machine, upper arms on the pad, handles curled up toward the shoulders.
```

**Tanda 5** (#91 a #99)
```
91 Incline dumbbell curl: seated on a bench inclined 45 degrees, arms hanging straight down, one dumbbell curled up with the palm facing up.
92 Cable rope hammer curl: standing facing a low pulley, rope held with thumbs up, curled up to chest height, elbows at the sides.
93 Resistance band curl: standing on the middle of a band, elbows at the sides, both handles curled up to chest height.
94 Spider curl: lying chest down on a bench inclined 45 degrees, arms hanging straight down, dumbbells curled up toward the shoulders.
95 Cable rope triceps pushdown: standing at a high pulley, elbows tight to the body, rope pushed down and spread apart at the bottom, arms straight.
96 Overhead cable triceps extension: standing with the back to a high pulley, one foot forward, rope held behind the head and extended overhead, elbows pointing forward.
97 Close-grip bench press: lying flat on a bench, hands at shoulder width, bar lowered to the lower chest, elbows close to the body.
98 Dumbbell triceps kickback: torso bent forward with one hand and knee on a bench, upper arm parallel to the floor, forearm extended straight back.
99 Seated dip machine: seated in the machine, hands on the handles at the sides, handles pushed down until the arms are straight.
```

**Tanda 6** (#100 a #108)
```
100 Lying dumbbell skull crusher: lying on a flat bench, two dumbbells lowered beside the head, upper arms vertical, palms facing each other.
101 Close-grip push-up: hands under the shoulders, body in a straight line, chest close to the floor, elbows tight to the body.
102 Resistance band triceps pushdown: standing, band anchored high, elbows at the sides, band pushed down until the arms are straight.
103 Barbell front squat: bar resting on the front of the shoulders, elbows high, squatting down to parallel, torso upright.
104 Bodyweight squat: feet shoulder-width apart, squatting down to parallel, arms straight in front, heels flat, chest up.
105 Smith machine squat: bar of the Smith machine on the upper back, feet slightly in front of the body, squatting down to parallel.
106 Walking lunges: long step forward, back knee almost touching the floor, upright torso, dumbbells at the sides, the body moving forward.
107 Reverse lunge: one leg stepped back, back knee almost touching the floor, front knee over the foot, upright torso, dumbbells at the sides.
108 Dumbbell step-up: one foot on a box, stepping up with the other leg rising, upright torso, dumbbells at the sides.
```

**Tanda 7** (#109 a #117)
```
109 Wall sit: back flat against a wall, knees bent at 90 degrees, thighs parallel to the floor, arms crossed on the chest.
110 Single-leg leg press: seated in the leg press machine, one foot in the center of the platform, knee bent at 90 degrees, the other leg resting.
111 Resistance band squat: standing on a band, band handles held at the shoulders, squatting down to parallel.
112 Jump squat: in the air after jumping from a squat, arms swung back, legs straight.
113 Box jump: landing on top of a box in a half squat, arms forward.
114 Seated leg curl: seated in the leg curl machine, thigh pad on the legs, heels curled down and back under the seat.
115 Standing leg curl machine: standing at the machine, hands on the handles, one heel curled up toward the glutes.
116 Dumbbell Romanian deadlift: standing, knees slightly bent, hips pushed back, flat back, dumbbells lowered to mid-shin close to the legs.
117 Single-leg Romanian deadlift: standing on one leg, torso tipped forward and the other leg extended straight back in one line, dumbbell in the opposite hand near the shin.
```

**Tanda 8** (#118 a #126)
```
118 Barbell good morning: standing, bar on the upper back, knees slightly bent, hips pushed back, torso bent forward almost parallel to the floor, flat back.
119 Nordic hamstring curl: kneeling on a pad with the ankles held down, body straight from knees to head, leaning forward toward the floor, hands ready in front.
120 Kettlebell deadlift: standing over a kettlebell, hips back, flat back, arms straight, both hands gripping the handle just before lifting.
121 Sumo deadlift: very wide stance with toes pointed out, barbell on the floor, hips low, flat back, hands gripping the bar inside the knees.
122 Hip thrust machine: seated in the machine, upper back against the pad, hips pushed up fully extended, torso and thighs in a straight line.
123 Single-leg hip thrust: upper back on a bench, one foot on the floor, the other leg raised, hips fully extended in a straight line.
124 Barbell glute bridge: lying on the floor, knees bent, barbell with a pad across the hips, hips lifted so the body is straight from knees to shoulders.
125 Quadruped donkey kick: on hands and knees, one leg kicked up with the knee bent at 90 degrees and the sole facing the ceiling.
126 Glute kickback machine: torso resting on the machine pad, one leg pushing the platform straight back, back flat.
```

**Tanda 9** (#127 a #135)
```
127 Lateral band walk: band around the knees, half squat, stepping sideways with the feet wide apart.
128 Standing cable hip abduction: standing side-on to a low pulley with an ankle strap, outside leg raised out to the side, holding the machine.
129 Dumbbell sumo squat: very wide stance with toes pointed out, deep squat, one dumbbell held with both hands hanging between the legs.
130 Clamshell with band: lying on one side, knees bent, band around the knees, top knee opened upward, feet together.
131 Calf press on leg press: seated in the leg press machine, balls of the feet on the edge of the platform, legs straight, toes pushing the platform.
132 Single-leg calf raise: standing on one foot on the edge of a step, raised high on the toes, one hand on a wall for balance.
133 Standing dumbbell calf raise: standing, dumbbells at the sides, raised high on the toes.
134 Kneeling cable crunch: kneeling facing a high pulley, rope held beside the head, torso curled down with the elbows toward the thighs.
135 Hanging leg raise: hanging from a pull-up bar with straight arms, straight legs raised to hip height.
```

**Tanda 10** (#136 a #144)
```
136 Captain's chair knee raise: forearms on the pads of the station, back against the pad, knees raised to the chest.
137 Russian twist: seated on the floor, torso leaning back, feet lifted, hands together rotated to one side of the hips.
138 Ab wheel rollout: kneeling on the floor, both hands on an ab wheel rolled forward, body almost straight from knees to head.
139 Pallof press: standing side-on to a cable at chest height, handle held with both hands and pressed straight out in front of the chest.
140 Cable woodchopper: standing side-on to a high pulley, torso rotated, handle pulled diagonally down across the body to the opposite hip.
141 Reverse crunch: lying on the back, knees bent, hips curled up off the floor, knees pulled toward the chest.
142 Bicycle crunch: lying on the back, shoulders lifted, one elbow touching the opposite knee, the other leg extended.
143 Hollow body hold: lying on the back, lower back pressed to the floor, arms and legs straight and lifted off the floor.
144 Plank shoulder tap: high plank with straight arms, one hand lifted to touch the opposite shoulder, hips level.
```

**Tanda 11** (#145 a #153)
```
145 Bird dog: on hands and knees, one arm and the opposite leg extended straight out, back flat.
146 Flutter kicks: lying on the back, hands under the hips, straight legs lifted slightly off the floor, one leg higher than the other.
147 Farmer's walk: walking upright with a heavy dumbbell in each hand at the sides, short steps.
148 Jumping jacks: in the air with arms raised overhead and legs spread apart.
149 High knees: running in place, one knee driven up to hip height, arms pumping.
150 Jump rope: jumping on the balls of the feet, rope passing under the feet, wrists turning the rope.
151 Dumbbell thruster: standing up from a squat, dumbbells pressed overhead, arms straight.
152 Bear crawl: on hands and feet, knees just above the floor, flat back, one hand and the opposite foot moving forward.
153 Jumping lunge: in the air between lunges, one leg forward and one leg back, arms swinging.
```

**Tanda 12** (#154 a #158)
```
154 Rowing machine: seated on the rower, legs extended, handle pulled to the lower chest, torso leaning slightly back.
155 Stationary bike: seated on an exercise bike, hands on the handlebars, upright torso, pedaling.
156 Incline treadmill walk: walking on a treadmill set to an incline, upright posture, not holding the handrails.
157 Elliptical trainer: standing on the pedals of an elliptical machine, hands on the moving handles, upright torso.
158 Stair climber: stepping up on a stair climber machine, upright torso, light hands on the rails.
```
