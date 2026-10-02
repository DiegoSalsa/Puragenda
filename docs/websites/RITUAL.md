# Ritual

Ritual es la plantilla editorial de bienestar de Puragenda. Mantiene la dirección V2 **MATERIAL · TOUCH · PAUSE** como una composición cálida y táctil, con una configuración aislada (`RitualConfig`) y booking canónico.

## Configuración y edición

- `src/websites/templates/ritual/config.ts` valida y migra el contenido V2. El copy de la pausa vive en `sensorial.eyebrow`, `sensorial.title` y `sensorial.body`; los snapshots antiguos con `copy.pauseTitle`/`copy.pauseBody` se migran al leer.
- Todo el copy público de marca tiene control editorial contextual: portada, tratamientos, pausa sensorial, equipo, galería, espacio, preguntas, reserva, contacto y footer. El inventario completo con DEFAULT, renderer, editor y clasificación vive en [`qa-ritual/field-inventory.md`](qa-ritual/field-inventory.md).
- `copy.bookingSteps` se edita como cinco labels fijos. Targets, validación, disponibilidad, conflictos, errores de email, booking failure, seguridad y loading siguen siendo sistema.
- `copy.heroStamp`, `copy.bookingPrompt`, `copy.staffDefaultLabel` y `copy.nav` son editables. Cada cambio actualiza el preview por `postMessage`; el focus salta al bloque correspondiente antes del autosave.
- Staff y servicios canónicos se leen desde Puragenda. El editor solo cambia etiqueta, nota y visibilidad editorial del staff.
- La paleta conserva tokens internos completos y muestra seis controles humanos. `accentContrast` se deriva automáticamente y se valida con contraste AA.

## Servicios, galería y fallback

Los servicios empiezan mostrando seis elementos cuando hay más de ocho y se abren en lotes de seis. Cambiar de categoría reinicia el límite visible. La galería respeta la prioridad: galería manual, imágenes de servicios reales, o sección oculta. Nunca mezcla ambas fuentes.

Una galería manual admite hasta 30 fotos, categorías con ID estable, múltiples categorías por foto, reordenamiento y eliminación segura. Cuando usa imágenes de servicios, sus categorías se proyectan en runtime para conservar filtros sin persistir categorías inventadas.

En móvil, galería y equipo usan scroll horizontal nativo con snap, swipe, contador, botones y teclado. En escritorio muestran hasta seis fotos o tres profesionales y los controles aparecen solo cuando hacen falta. El lightbox usa `dialog`, ESC, flechas, swipe y devuelve el foco al origen. La evidencia separa PASS de NOT_RUN para gestos que el navegador disponible no puede emular físicamente.

## Media y booking

Las fotos pasan por `MediaPicker`, Cloudinary/`WebsiteMedia` y la validación de ownership existente. El preview usa blobs locales durante la subida y guarda `mediaAssets` solo para referencias presentes en la configuración. El hero conserva prioridad; las demás imágenes usan `next/image` con tamaños responsivos.

El flujo de booking sigue siendo el motor canónico de Puragenda. Los datos reales de disponibilidad, profesionales, sucursales y precios no se duplican en la plantilla.

## QA actual

El fixture `ritualTerapiasSecFixture` mantiene el stress test de 2, 6, 12 y 25 servicios. `ritualTerapiasSecRealisticFixture` agrega 20+ servicios con nombres largos, tres profesionales, dos ubicaciones, categorías y servicios sin imagen. La ruta local `website-demo/ritual-terapias-sec-realistic` expone el fixture para capturas reproducibles; sus parámetros de QA permiten cambiar densidad sin cambiar el contrato público.

La evidencia de esta pasada vive en [`qa-ritual/`](qa-ritual/): fullpage realista a 1440/390/360, galería, staff, servicios, reserva, lightbox, cuatro presets, custom palette, builder y comparación Bella/Matchday/Ritual.
