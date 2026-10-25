# Diseño de referencia (fuente de verdad visual)

Los 10 archivos de `mockups/` son las pantallas diseñadas para YEFFITNES TRAINING (rojo `#F7254B`, negro y dorado). **Cada pantalla de la app debe copiar su mockup: estructura, clases, espaciado, textos y comportamiento.** Se pueden mejorar, nunca improvisar.
Origen: extraídas de la propuesta comercial (`APROPUESTA-YEFFITNES.html`, repo `gomezromerogr333/coach`). Los mockups de DaniFit (otro coach, otros colores) NO se usan para visuales.

| Mockup | Ruta en la app | Estado |
|---|---|---|
| coach-clientes | /coach/clientes y /coach/clientes/[id] | lista y ficha hechas; pestañas pendientes salvo Resumen y Entrenamiento |
| coach-catalogo | /coach/catalogo/ejercicios y /rutinas | hecho (formularios en modal, no diseñados en el mockup) |
| coach-dashboard | /coach | hecho con datos reales (indicadores, clientes por revisar, actividad); pendientes: agenda del día y aviso de disponibilidad |
| coach-agenda | /coach/agenda | hecho (sin clases grupales ni presencial: no aplican al servicio de Jeff) |
| coach-material | /coach/material | pendiente |
| portal-hoy | /inicio | hecho: saludo, racha, semana y rutina de hoy con registro de series; faltan tarjetas de sesión, objetivo, nutrición, progreso y vídeo de la semana |
| portal-mi-plan | /inicio/plan | hecho (sin vídeo de rutina, próxima revisión, nivel ni nota) |
| portal-progreso | /inicio/progreso | hecho (mediciones, gráfica, historial, fotos antes/después) |
| portal-agenda | /inicio/agenda | hecho |
| portal-material | /inicio/material | pendiente |

Cómo portar una pantalla: abrir el mockup, copiar su CSS a `app/<zona>/<zona>.css` (reemplazar `'Manrope'` por `var(--font-body)`, `'Instrument Sans'` por `var(--font-display)`, `'IBM Plex Mono'` por `var(--font-mono)`), reproducir su marcado en React y conectar datos. Los datos de ejemplo del mockup (nombres, cifras) nunca se copian a producción.

Herramienta: `python3 design/port_css.py <mockup> <hoja destino>` porta el CSS de un mockup sin duplicar reglas (se puede repetir sin riesgo).
