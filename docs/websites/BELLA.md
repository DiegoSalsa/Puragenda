# Template Bella

La galería de producción no usa fotografías demo como fallback: prioriza `config.gallery`, luego imágenes del catálogo canónico de servicios del mismo negocio, y oculta Portfolio si ambas fuentes están vacías. Las fotografías demo permanecen disponibles únicamente para fixtures, demos y QA explícitos.

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

`/dashboard/website` conserva sidebar, preview en vivo, modos escritorio/móvil, autosave, copy editable, marca/logo, portada, galería (máximo 30), categorías, about/procesos, contacto, redes, paletas preset/custom y SEO/favicons. Las fotos se suben desde el picker; no hay un flujo de URLs manuales. La galería permite reordenar fotos. Servicios y profesionales se editan donde ya se administran. No admite CSS ni layout libre.

Guardar actualiza el draft; previsualizar abre el borrador guardado; publicar exige guardar y reemplaza el snapshot público. `/website-preview` usa el negocio autenticado. `?mode=demo` utiliza datos de muestra, y `?viewport=mobile` presenta el mismo renderer en un iframe de 390×844. Ninguna modalidad requiere publicación ni crea reservas.

La publicación y el hero usan el titular efectivo: `headline.trim() || copy.hero.fallbackHeadline.trim()`. Si ambos están vacíos, o falta portada, la publicación se bloquea. Las paletas custom con contraste crítico también se bloquean; no se cambian los colores silenciosamente.

Las categorías validan label trim de 1–80, IDs/nombres case-insensitive únicos, orden entero único dentro del rango y referencias existentes. La lectura repara filas legacy y migra labels/filtros; guardar usa IDs estables, vacía galleryFilters y sincroniza captions antiguos como campos de compatibilidad. Renombrar conserva IDs y relaciones; eliminar retira asociaciones, también de procesos, sin borrar fotos. Un categoryIds vacío es una decisión explícita: sus labels anteriores no vuelven a crear categorías.

Auditoría de strings públicos: headings, navegación, slogans, marquee y CTA editoriales usan `config.copy`. Permanecen fijos los nombres de redes, skip link, controles/etiquetas transaccionales de reserva, estados de carga, errores, validaciones, unidades/precio/abono y mensajes de simulación. No se volvió configurable toda la UI técnica. Lucide del dashboard y el lenguaje visual público se conservan.

## Diferencias visuales intencionales

Footer acredita Puragenda, contacto y marca son dinámicos, y desaparecen los textos de integración o negocio de prueba de la referencia. El booking real muestra disponibilidad y estados de la agenda del negocio. Nombres largos cambian su escala. Las paletas alternativas cambian colores dentro del mismo layout. El caption genérico del estudio sustituye el aviso de imagen conceptual fuera de las fixtures.

No se detectó degradación evidente en las vistas revisadas. Esto es revisión visual en navegador y métricas DOM, no una certificación pixel-perfect automática ni auditoría de rendimiento; las animaciones pueden estar en distintos fotogramas en las capturas.
