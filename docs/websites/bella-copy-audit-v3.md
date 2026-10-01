# Auditoría de copy público Bella V3

## Alcance

La auditoría cubre `BellaContent`, `Header`, `Portfolio`, `Services`, `Studio`, `BookingSection`, `BookingFlow` y el sistema de acciones. La referencia original en `C:\Users\diego\Desktop\purocode-demos` no fue modificada.

## Copy de marca editable

El objeto tipado `config.copy` vive en `src/websites/templates/bella/copy.ts` y conserva defaults compatibles con V1. Está organizado por contexto: `nav`, `hero`, `gallery`, `services`, `studio`, `booking` y `footer`. Incluye títulos, subtítulos, etiquetas de navegación, CTA con acción controlada, texto del pie y frases del marquee. El editor expone estos valores en Portada, Galería y Mi negocio; los cambios se envían al preview con foco y resaltado.

El marquee acepta entre cero y ocho frases de hasta 120 caracteres, con edición, alta, baja y reordenamiento. Si queda vacío se usa un fallback dinámico del negocio para evitar un bloque roto; una sola frase sigue siendo válida.

## Copy funcional o transaccional

Se mantiene controlado por Puragenda el texto de errores de red, validación, conflictos de disponibilidad, confirmación de reserva, mensajes de demo/preview, etiquetas de campos de contacto, precios/duración canónicos y estados de pago. Estos textos explican una operación o protegen la comprensión del flujo y no se mezclan con el tono comercial del negocio.

El crédito `Reservas con Puragenda` queda fuera del editor por tratarse de branding del servicio. Las redes, datos de contacto, servicios, precios, profesionales y ubicación siguen viniendo de sus fuentes canónicas.

## Categorías

`galleryCategories` usa IDs estables `cat-*`, etiqueta y orden. Cada imagen puede guardar hasta ocho `categoryIds`. La lectura migra etiquetas V1 (`galleryFilters`, `category`, `filters`) de forma determinista. El panel permite crear, renombrar, eliminar con confirmación y contador de fotos, reordenar y asignar varias categorías. `Todo` es virtual y nunca se almacena. Al eliminar se limpian referencias y se conserva la imagen.

## Color y compatibilidad

`paletteMode` admite `preset` o `custom`; se conservan Coral, Lila y Bosque. La paleta custom expone cuatro tokens seguros: principal, acento/texto, fondo y texto/ink. `contrastRatio` y `validatePalette` dan feedback cuando el contraste es insuficiente y la publicación se bloquea para una combinación crítica. Configuraciones V1 sin estos campos reciben defaults; no se resetean datos existentes.

## Preview y responsive

El protocolo `puragenda.website.v2` acepta focos de copy y un filtro temporal de galería. El editor envía ese filtro al iframe para que la selección de categoría se vea de inmediato. El CSS mantiene wrapping para nombres y títulos largos, y el layout usa `min-width: 0` en el builder y los hijos del preview. No se añadió `body { overflow-x: hidden }` como parche.

## Iteración de corrección posterior

Se ampliaron los controles contextuales del editor: navegación de Portada; etiquetas y controles accesibles de Galería; frases del marquee; textos de servicios; copy del estudio y de cada momento del proceso; textos de la reserva, pasos y estados de cierre; y enlaces propios del footer. Las fotos del proceso ahora admiten edición de nombre, caption, alt, imagen y orden con fallback mover arriba/abajo.

El marquee respeta explícitamente una lista vacía: se oculta sin inventar copy. Solo una configuración que nunca definió la lista recibe la frase de compatibilidad derivada del negocio. El crédito «Reservas con Puragenda» y avisos de preview siguen siendo sistema.

La causa observable del desplazamiento en Contacto era la combinación de hijos con contenido largo y tamaños mínimos intrínsecos en booking/footer, junto con el scroll del iframe que podía mover el ancestro del builder. Se corrigió con tracks y descendientes `min-width: 0`, wrapping seguro y scroll contenido dentro del iframe. No se añadió overflow global al body.

QA browser local: a 1440×900 las seis secciones conservaron `scrollWidth === clientWidth` (1440) y preview de 788px; a 1280 el preview quedó en 628px; a 390 y 360px las seis secciones conservaron `scrollWidth === clientWidth` y `scrollX === 0`.
