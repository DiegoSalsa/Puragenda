# Template Bella

La auditoría exacta y los 58 hashes de referencia están en [bella-source-audit.md](bella-source-audit.md) y [bella-source-manifest.json](bella-source-manifest.json). El original no se editó. Para QA se ejecutó una copia congelada en `scratch/bella-reference`, con salida de compilación propia.

## Portado y reutilizado

Desde `/studio`: composición de page/layout → `Bella.tsx`; `studio.module.css`; Action, Header, Motion, Portfolio, Services, Studio, BookingSection y BookingFlow; booking-events, booking-state, tipos/errores/validación de UI; dos iconos motion y sus tipos. Los diez WebP de `public/demos/studio` se copiaron byte a byte a `public/websites/bella`.

Portfolio y catálogo demostrativos se conservaron exclusivamente en fixtures. No se portaron los handlers HTTP, credenciales/configuración del demo ni sus adapters legacy/v1 como motores de producción. Puragenda suministra Context, DTO, Media, brand, renderer y adaptadores canónicos.

## Diseño frente a datos

| Template Bella | Datos del negocio/configuración |
| --- | --- |
| Hero editorial y wordmark | Marca, logo, titular, introducción, portada y caption |
| Rail asimétrico, filtros, lightbox | Galería, textos alternativos, categorías, orden, encuadre |
| Detalle y selección de tratamientos | Service, precio, duración, opciones, imagen y sucursales |
| Selector de profesionales | Staff, foto y servicios/sucursales compatibles |
| Proceso y sección estudio | About, fotos y momentos configurados |
| Footer y enlaces | Dirección canónica, contacto y redes configurados |
| CSS, fuentes, motion y breakpoints | Paleta permitida coral/ciruela/bosque y SEO |

Bricolage Grotesque y DM Sans se conservan mediante next/font. No se sustituyeron componentes visuales por los del dashboard. Mantiene hero, proporciones fotográficas, espaciado, responsive, menú móvil, transiciones, motion CSS, IntersectionObserver, iconos motion/react, pausa del marquee, focus visible y soporte declarado de reduced motion.

Los nombres largos adaptan la escala tipográfica sin recortarse. Una imagen ausente muestra un bloque neutral, no una foto inventada; galería y estudio vacíos se ocultan. Un catálogo vacío informa que aún no hay tratamientos y deshabilita iniciar reserva. Opciones canónicas incompletas no rompen la sección de servicios. Las fotos de Bella se usan únicamente en fixtures: un negocio nuevo comienza con contenido vacío.

## Editor y preview

`/dashboard/website` permite editar marca/logo, portada, titular, introducción, galería (máximo 30), about, contacto, redes, una de tres paletas y SEO/favicons. Permite subir imágenes o usar URLs aceptadas. Servicios y profesionales se editan donde ya se administran. No admite CSS, drag-and-drop ni layout libre.

Guardar actualiza el draft; previsualizar abre el borrador guardado; publicar exige guardar y reemplaza el snapshot público. `/dashboard/website/preview` usa el negocio autenticado. `?mode=demo` utiliza datos de muestra, y `?viewport=mobile` presenta el mismo renderer en un iframe de 390×844. Ninguna modalidad requiere publicación ni crea reservas.

## Diferencias visuales intencionales

Footer acredita Puragenda, contacto y marca son dinámicos, y desaparecen los textos de integración o negocio de prueba de la referencia. El booking real muestra disponibilidad y estados de la agenda del negocio. Nombres largos cambian su escala. Las paletas alternativas cambian colores dentro del mismo layout. El caption genérico del estudio sustituye el aviso de imagen conceptual fuera de las fixtures.

No se detectó degradación evidente en las vistas revisadas. Esto es revisión visual en navegador y métricas DOM, no una certificación pixel-perfect automática ni auditoría de rendimiento; las animaciones pueden estar en distintos fotogramas en las capturas.
