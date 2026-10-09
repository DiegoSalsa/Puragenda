# Y2K · Y2K Motion & Visual Polish

> Documento de la fase de prototipo. Y2K ya está integrado como template seleccionable y persistente; ver [Activación de Y2K](./Y2K-DELIVERY.md).

Segunda iteración privada · 8 de octubre de 2026 · rama `codex/pink-y2k-prototype`.

## Revisar

Preview navegable: [localhost:3007/website-preview/pink-y2k](http://localhost:3007/website-preview/pink-y2k). Si el servidor está cerrado, ejecutar `node scripts/dev-pink-y2k.mjs`.

El diseño aprobado conserva composición, navegación, colores, textos, catálogo, reservas, editor, ventanas y distribución de secciones. Se añadió movimiento al template encapsulado; Bella y los demás templates siguen sin cambios. No hubo merge, despliegue, publicación, migración ni escritura comercial.

## Dónde observar los cambios

| Lugar | Movimiento y respuesta |
|---|---|
| Hero al recargar | Letras escalonadas con una deformación elástica y rebote breve. La segunda línea mantiene su inclinación y acabado rosado. Se asienta en aproximadamente 1,4 s; no vuelve a saltar. La foto y el Pocket tienen entradas suaves independientes. El CTA está disponible desde el principio. |
| Franja de servicios | Dos grupos idénticos, sin gap entre grupos, se desplazan de derecha a izquierda. Cada grupo contiene tres repeticiones y cubre al menos un viewport. El recorrido dura 42 s; `translateX(-50%)` entrega el siguiente grupo en la misma posición al reiniciarse. Hover pausa la cinta en dispositivos con puntero fino. |
| Botón circular de la cinta | Pausa/reanuda los bucles decorativos, incluido el Pocket. Funciona por clic, touch y teclado; el foco se dibuja dentro del botón para evitar recortes en móvil. No altera reservas ni contenido. |
| Love Pocket | Conserva la carcasa y sus tres controles. En escritorio flota 3 px durante un ciclo de 9 s. Un reflejo cruza la carcasa durante menos de un segundo dentro de un ciclo largo. Cada cambio de mensaje provoca una respuesta breve en pantalla y un corazón efímero; el botón central abre la reserva inmediatamente. |
| Servicios | El título aparece por palabras con una elasticidad pequeña. La ventana se abre una sola vez al entrar en vista; un reflejo atraviesa su barra superior. Las filas responden a hover y presión; sus flechas se desplazan 2 px. Los símbolos de minimizar/maximizar/cerrar siguen siendo decoración, no botones falsos. |
| Álbum | Las palabras del título se despliegan con una pequeña rotación; las polaroids entran progresivamente. Hover eleva fotos y sombras solo con ratón/puntero fino. En móvil continúa el álbum con scroll horizontal nativo y controles táctiles. |
| Foto ampliada | Apertura de 240 ms y transición breve al cambiar imagen. Flechas, Escape, cierre y deslizamiento horizontal siguen funcionando. |
| Guía y cierre | Entrada discreta del título de guía, transición de la ventana de políticas y aparición por palabras del título final. Un único destello cierra el recorrido; los párrafos no reciben un fade repetitivo. |
| Botones de reserva | Acabado glossy discreto, reflejo al hover/foco, respuesta de presión y desplazamiento breve del icono. Conservan sus destinos y eventos originales. |

Se incorporó un pequeño corazón nacarado en el detalle de servicios. Las estrellas existentes reciben una variación ocasional de opacidad. No se añadieron secciones ni objetos sobre las fotografías.

## Adaptación y accesibilidad

- Con `prefers-reduced-motion: reduce` no hay animaciones ni transiciones. Se ocultan los adornos efímeros y el control de pausa; todo el contenido y las interacciones siguen disponibles.
- En móvil no hay flotación ambiental del dispositivo. Se acortan las entradas de fotos y se espacian más los reflejos del Pocket. Los estados de hover se reservan para punteros finos.
- Los bucles se pausan al salir del viewport o al ocultarse el documento. Un `IntersectionObserver` distinto dispara las entradas una sola vez y deja de observar cada elemento visto.
- Las entradas no requieren ocultar el contenido mientras espera al observer: sin JavaScript o sin `IntersectionObserver`, los textos, fotos, precios y ventanas siguen visibles.
- Los títulos conservan su nombre accesible completo; la copia visual dividida en letras/palabras está marcada `aria-hidden`. El lector de pantalla no recibe una letra por anuncio.
- Los botones del Pocket mantienen sus blancos táctiles de 44 px y el foco visible. No se añadió audio ni información indispensable dentro de una animación.

## Implementación

Se revisó la dependencia `motion` ya instalada. Estos efectos se resolvieron con CSS, estado React local y `IntersectionObserver`, sin incorporarla al bundle del template ni instalar nuevas dependencias de runtime.

| Archivo | Responsabilidad en esta iteración |
|---|---|
| `src/websites/templates/pink-y2k/Motion.tsx` | División visual accesible de letras/palabras, entradas de una sola ejecución y control de bucles por visibilidad. |
| `src/websites/templates/pink-y2k/motion.module.css` | Keyframes encapsulados, marquee, Pocket, títulos, galería, reflejos, botones y adaptación móvil/reduced motion. |
| `src/websites/templates/pink-y2k/PinkY2k.tsx` | Conecta las animaciones a los componentes existentes, duplica los grupos del marquee y añade el control de pausa y un corazón SVG original. |
| `src/websites/templates/pink-y2k/LovePocket.tsx` | Respuestas a interacciones, reflejo de carcasa y animación del mensaje, conservando botones, mensajes configurables y callback de reserva. |
| `src/websites/templates/pink-y2k/pink.module.css` | Ajustes pequeños de brillo tipográfico, hover de puntero fino, presión y sombras; se conserva la estructura visual. |
| `scripts/qa-pink-y2k.mjs` | Espera el asentamiento de las entradas antes de capturar; conserva las comprobaciones funcionales previas. |
| `scripts/qa-pink-y2k-motion.mjs` | QA de continuidad, pausa, foco, entradas, touch, reduced motion, fallbacks y métricas locales. |
| `scripts/capture-pink-y2k-motion.mjs` | Graba sesiones reales de Chrome en escritorio y móvil, sin overlays ni reconstrucción de la interfaz. |

Los bucles usan `transform` y `opacity`. Las entradas pueden usar las propiedades individuales de transformación porque terminan en menos de un segundo; no animan altura, ancho, posición de layout, filtros ni sombras continuamente. Una revisión de rendimiento sustituyó transformaciones individuales de los bucles por `transform` y limitó el destello de estrellas a opacidad, reduciendo el trabajo de estilos observado.

## Evidencia real

Grabaciones del navegador en `output/pink-y2k/motion/`:

- `motion-desktop-1440.mp4`: recorrido de escritorio, aproximadamente 30 s.
- `motion-mobile-390.mp4`: recorrido táctil emulado, aproximadamente 27 s.
- Los `.webm` conservan las capturas originales. Los `.mp4` son conversiones de formato a H.264, a velocidad normal, sin añadir efectos ni sustituir frames por mockups.
- `recording-manifest.json`: URL, tamaño, escenas, tiempos aproximados y registro de errores/peticiones. Ambas sesiones terminaron sin errores de página ni llamadas a `/api/`.
- `hero-{ancho}.png`, `window-1440.png`, `gallery-1440.png`, `touch-lightbox-390.png`, `reduced-motion-1440.png`: capturas reales de la segunda iteración.
- `qa-motion-report.json`: mediciones y resultados reproducibles. Las capturas generales actualizadas siguen en `output/pink-y2k/viewport-{ancho}.png` y `page-{ancho}.png`.

Los tiempos concretos de cada escena están en el manifiesto; las grabaciones muestran la entrada del hero, interacción/reserva desde el Pocket, cinta/pausa, servicios, álbum, ampliación, políticas y CTA final.

## Validación

| Comprobación | Resultado |
|---|---|
| Regresión Vitest de esta iteración | **7 archivos / 58 pruebas aprobadas**: Pink, Bella V3, galería Bella, servicios, proxy/aislamiento, acciones y selección de reservas. |
| QA funcional general del prototipo | Aprobado: menú, Pocket, filtros, lightbox, políticas, editor, faltantes, reserva canónica de cinco pasos y cotización demostrativa de $30.990 / 125 min. Cero llamadas a APIs. |
| Anchuras | **320, 360, 390, 430, 768, 1280 y 1440 px**: sin desbordes durante la entrada; marquee moviéndose a la izquierda, grupos iguales, sin gap y continuidad verificada en el límite del ciclo. |
| Accesibilidad axe | **0 incidencias a 390 y 1440 px**, 40 reglas aprobadas por revisión. Complementado con prueba real de pausa por teclado/foco; no equivale a una auditoría completa con lector de pantalla. |
| QA específico de motion | Pausa/reanudación, hover, foco, aparición única de ventana, pausa fuera de pantalla, entradas de galería, reduced motion con cero animaciones, contenido visible sin JS/observer y controles táctiles aprobados. |
| Touch | Chrome emulando dispositivo táctil: controles del Pocket, reserva inmediata y deslizamiento horizontal de la foto ampliada aprobados. La grabación móvil también usa `isMobile` y `hasTouch`. |
| TypeScript | `npm run typecheck` aprobado; también comprobado dentro del build. |
| Build | `node scripts/dev-websites-local.mjs --build` aprobado en el entorno QA aislado existente. |
| Lint | `npm run lint`: 0 errores, 33 advertencias preexistentes. Lint dirigido a los archivos de esta iteración: sin incidencias. |

Las métricas de `Performance.getMetrics` en el reporte comparan aproximadamente 2,5 s de hero con movimiento, escritorio pausado y móvil con movimiento. Registran layouts, recálculos de estilo y tiempo del hilo principal. Son mediciones de Chrome local en este equipo, no una puntuación Lighthouse/CWV ni evidencia de rendimiento en un teléfono físico de gama media. No se afirma una equivalencia entre emulación táctil y prueba de hardware real.

| Muestra final | Layouts | Recálculos de estilo | Tiempo de tareas del hilo principal |
|---|---:|---:|---:|
| Escritorio 1440, movimiento activo, 2,51 s | 0 | 0 | 5,81 ms |
| Escritorio 1440, pausado, 2,52 s | 0 | 0 | 1,69 ms |
| Móvil emulado 390, movimiento activo, 2,52 s | 0 | 5 | 9,95 ms |

Para repetir:

```powershell
node scripts/dev-pink-y2k.mjs
# En otra terminal, con el tooling externo del prototipo ya instalado:
node scripts/qa-pink-y2k.mjs
node scripts/qa-pink-y2k-motion.mjs
node scripts/capture-pink-y2k-motion.mjs
```

Las dependencias de QA siguen fuera del repositorio, en `%TEMP%/puragenda-pink-y2k-qa/node_modules`; se requiere Google Chrome. La captura usa el soporte de vídeo de Playwright. Los MP4 se convirtieron con FFmpeg instalado en el equipo.

## Límites que se mantienen

Continúa siendo el prototipo local protegido por desarrollo, flag y host de loopback. El catálogo, los horarios, el profesional y la finalización de reserva son demostrativos. El editor conserva cambios en memoria/exportación JSON. No se conectó un negocio real ni se registró el template en publicación comercial. Los pendientes de marca, fotos autorizadas, precios, modalidad y políticas siguen en `docs/websites/pink-y2k-prototype.md`.

La revisión final de hardware móvil real y la aprobación privada de esta iteración deben preceder a la integración/publicación definitiva.
