# Ritual

Ritual es la plantilla editorial de bienestar de Puragenda. Mantiene la dirección V2 **MATERIAL · TOUCH · PAUSE** como una composición cálida y táctil, con una configuración aislada (`RitualConfig`) y booking canónico.

## Configuración y edición

- `src/websites/templates/ritual/config.ts` valida y migra el contenido V2. El copy de la pausa vive en `sensorial.eyebrow`, `sensorial.title` y `sensorial.body`; los snapshots antiguos con `copy.pauseTitle`/`copy.pauseBody` se migran al leer.
- `copy.heroStamp`, `copy.bookingPrompt`, `copy.staffDefaultLabel` y `copy.nav` son editables. Los errores de disponibilidad, validación y booking siguen siendo copy de sistema.
- Staff y servicios canónicos se leen desde Puragenda. El editor solo cambia etiqueta, nota y visibilidad editorial del staff.
- La paleta conserva tokens internos completos y muestra seis controles humanos. `accentContrast` se deriva automáticamente y se valida con contraste AA.

## Servicios, galería y fallback

Los servicios empiezan mostrando seis elementos cuando hay más de ocho y se abren en lotes de seis. Cambiar de categoría reinicia el límite visible. La galería respeta la prioridad: galería manual, imágenes de servicios reales, o sección oculta. Nunca mezcla ambas fuentes.

Una galería manual admite hasta 30 fotos, categorías con ID estable, múltiples categorías por foto, reordenamiento y eliminación segura. Cuando usa imágenes de servicios, sus categorías se proyectan en runtime para conservar filtros sin persistir categorías inventadas.

En móvil, galería y equipo usan scroll horizontal nativo con snap, swipe, contador, botones y teclado. En escritorio muestran hasta seis fotos o tres profesionales y los controles aparecen solo cuando hacen falta. El lightbox usa `dialog`, ESC, flechas, swipe y devuelve el foco al origen.

## Media y booking

Las fotos pasan por `MediaPicker`, Cloudinary/`WebsiteMedia` y la validación de ownership existente. El preview usa blobs locales durante la subida y guarda `mediaAssets` solo para referencias presentes en la configuración. El hero conserva prioridad; las demás imágenes usan `next/image` con tamaños responsivos.

El flujo de booking sigue siendo el motor canónico de Puragenda. Los datos reales de disponibilidad, profesionales, sucursales y precios no se duplican en la plantilla.

## QA

El fixture `ritualTerapiasSecFixture` mantiene el stress test de 2, 6, 12 y 25 servicios. `ritualTerapiasSecRealisticFixture` agrega 20+ servicios con nombres largos, tres profesionales, dos ubicaciones, categorías y servicios sin imagen. La evidencia de esta iteración vive en [`qa-ritual/`](qa-ritual/).
