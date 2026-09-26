# Reel: Puri llega a Puragenda

Video vertical de 20 segundos (1080 × 1920, 30 fps) para anunciar la nueva integración de Puri con Hoy. La mascota oficial es la protagonista; las escenas de producto son mockups diseñados para el reel, sin capturas del dashboard.

## Archivo final

`remotion/out/puri-actualizacion-reel.mp4`

## Cómo se hizo

- `hyperframes-intro/`: apertura de tres segundos animada en HyperFrames. Su render es `hyperframes-intro/out/intro.mp4`.
- `remotion/`: montaje de las escenas de Hoy, el panel de Puri, las respuestas con contexto, el cierre y una pista musical original generada por `scripts/make-soundtrack.mjs`.

Para repetir el render, instala las dependencias en ambas carpetas, renderiza primero `hyperframes-intro`, copia `out/intro.mp4` a `remotion/public/intro.mp4` y ejecuta `npm run render` desde `remotion/`. La narrativa final dura 20 segundos: presentación, Hoy, pregunta, respuesta y cierre.

## Texto sugerido para publicar

Puri ya llegó a Puragenda 💜 Tu asistente aparece en Hoy y te ayuda a consultar citas, cobros y horarios libres con el contexto de tu negocio. Abre Hoy y pregúntale a Puri.
