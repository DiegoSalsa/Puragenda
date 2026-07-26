# 07 — Seguridad, rendimiento y accesibilidad

## Seguridad

### Autenticación y autorización

Toda lectura de borrador y toda mutación debe:

1. obtener la sesión en servidor;
2. resolver el negocio accesible por el usuario;
3. comprobar `appearance.manage`;
4. incluir `businessId` en la consulta del recurso;
5. rechazar ids de otro negocio aunque sean válidos;
6. registrar acciones sensibles.

No basta comprobar el permiso en la página. Cada acción, route handler y subida vuelve a comprobarlo.

### Publicación

En la primera versión, `appearance.manage` autoriza editar y publicar para conservar el modelo actual.

La arquitectura debe permitir separar después:

- `appearance.edit`;
- `appearance.publish`;
- `appearance.assets.manage`.

La publicación registra usuario, versión, checksum y fecha.

### Documento JSON

Protecciones:

- tamaño máximo del request;
- profundidad máxima;
- cantidad máxima de nodos;
- ids únicos;
- tipos discriminados;
- rechazo de claves desconocidas en zonas críticas;
- strings con longitud acotada;
- números finitos y en rango;
- URLs normalizadas;
- schema version soportada;
- referencias de activo del mismo negocio;
- rechazo de `__proto__`, `constructor` y estructuras inesperadas;
- serialización canónica antes del checksum.

No se evalúa contenido del documento.

### Contenido permitido

No se admite:

- JavaScript;
- expresiones;
- event handlers;
- `iframe` de terceros en el MVP;
- HTML arbitrario;
- CSS arbitrario;
- URLs `javascript:`, `data:` o `file:`;
- SVG subido por usuarios en la primera versión;
- redirects opacos controlados por contenido.

Texto enriquecido futuro usa un AST con nodos permitidos.

### Enlaces

- solo `https://` por defecto;
- `http://` únicamente en desarrollo local;
- protocolos rechazados explícitamente;
- longitud máxima;
- parsing mediante `URL`;
- `target="_blank"` implica `rel="noopener noreferrer"`;
- editor muestra dominio de destino;
- enlaces internos se resuelven desde una lista de acciones seguras;
- ningún enlace recibe API keys o datos personales.

### Archivos

Validaciones en servidor:

- firma binaria real;
- MIME detectado;
- extensión compatible;
- tamaño máximo;
- dimensiones mínimas y máximas;
- cantidad de píxeles máxima contra image bombs;
- decodificación segura;
- rechazo de archivos truncados;
- stripping de EXIF y metadatos;
- transformación a formatos de salida conocidos;
- hash para deduplicación opcional;
- nombre original no se usa como ruta;
- `publicId` generado por servidor;
- cuota por negocio;
- rate limit.

Formatos iniciales:

- JPEG;
- PNG;
- WebP.

AVIF puede generarse como salida aunque no se admita como entrada hasta validar soporte. GIF animado, SVG y video quedan fuera del MVP.

### Cloudinary

- credenciales solo en servidor;
- subidas firmadas si el cliente sube directamente;
- carpeta o tags por negocio sin exponer ids predecibles innecesarios;
- transformaciones permitidas definidas en servidor;
- URL guardada junto a `publicId`;
- borrado diferido;
- webhook verificado si se usa procesamiento asíncrono;
- no aceptar una URL de Cloudinary suministrada como prueba de propiedad.

### CSRF y origen

- cookies `HttpOnly`, `Secure` y `SameSite` adecuadas;
- Server Actions y endpoints validan origen;
- preview autenticada solo same-origin;
- `postMessage` valida `event.origin` y payload;
- operaciones mutables usan método correcto y token de sesión;
- no usar GET para mutar.

### Embedding

El widget debe poder insertarse en sitios externos, pero no es necesario permitir todos los orígenes para siempre.

Plan:

1. preservar compatibilidad actual durante la transición;
2. usar `Business.allowedOrigins` como allowlist administrable;
3. generar `frame-ancestors` por negocio si la infraestructura lo permite;
4. mantener una opción explícita “Permitir cualquier sitio”;
5. validar mensajes recibidos por `postMessage`;
6. no compartir cookies del dashboard con el widget público.

La cabecera `X-Frame-Options: ALLOWALL` no es una política estándar interoperable. La política real debe residir en CSP `frame-ancestors`.

### CSP

El renderer V2 necesita una CSP mínima:

- scripts propios;
- estilos propios;
- imágenes propias y CDN autorizado;
- conexiones a endpoints necesarios;
- sin `unsafe-eval` en producción;
- sin dominios agregados por contenido;
- frame ancestors controlado.

El editor y dashboard mantienen políticas más estrictas que el widget embebible.

### Secretos

Nunca se incluyen en el documento:

- `Business.apiKey`;
- tokens de Mercado Pago;
- credenciales Cloudinary;
- cookies;
- ids de sesión;
- datos personales de reservas.

La preview usa datos operativos autorizados o fixtures, no secretos en query strings.

### Auditoría y abuso

Registrar:

- publicación;
- restauración;
- eliminación;
- subida;
- fallo de autorización;
- rate limit;
- documento rechazado.

Alertar:

- accesos cruzados repetidos;
- muchas subidas fallidas;
- tamaño anómalo de documentos;
- fallback frecuente;
- tasa anómala de publicación.

## Rendimiento

### Principio

El editor puede ser pesado; el widget público no.

Ningún paquete de drag and drop, inspector, historial o librería de paneles debe entrar al bundle público.

### Presupuestos iniciales

Se deben confirmar después de medir el baseline actual.

| Métrica | Objetivo |
| --- | --- |
| Documento publicado | ≤ 100 KB sin comprimir |
| Bloques activos | ≤ 50 |
| Secciones | ≤ 20 |
| Incremento JS del renderer visual V2 | ≤ 35 KB gzip sobre baseline |
| Imagen LCP móvil | ideal ≤ 250 KB transformada |
| Imágenes iniciales totales móvil | ideal ≤ 500 KB antes de interacción |
| LCP p75 | ≤ 2.5 s |
| INP p75 | ≤ 200 ms |
| CLS p75 | ≤ 0.1 |
| Respuesta de documento cacheado | p95 ≤ 200 ms en infraestructura objetivo |
| Guardado de borrador | p95 ≤ 600 ms sin subida |
| Publicación | p95 ≤ 3 s sin procesamiento de activos |

### Imágenes

- `srcset` y `sizes`;
- ancho derivado del slot;
- formatos modernos;
- calidad automática con límites;
- dimensiones explícitas;
- placeholder;
- lazy load fuera del primer viewport;
- prioridad solo para una imagen LCP;
- punto focal en transformación;
- evitar cargar fondo de escritorio en móvil;
- no usar base64 grande dentro del documento.

### Renderer

- componentes puros;
- selectores de datos acotados;
- documento prevalidado;
- sin interpretar CSS;
- sin cálculos de layout costosos en cada render;
- imports por registro;
- memoización donde tenga beneficio medido;
- errores aislados por bloque;
- caché por version id/checksum.

### Editor

- virtualizar biblioteca si crece;
- debounce de inspector;
- no recargar todo el `iframe` para cada pixel arrastrado;
- aplicar preview por canal seguro y consolidar guardado;
- comprimir historial en cliente;
- cancelar subidas obsoletas;
- miniaturas;
- carga progresiva de versiones.

### Rendimiento de base de datos

- índices por `businessId`;
- índice por `designId, versionNumber`;
- evitar buscar dentro de JSON en el camino crítico;
- una query para documento publicado;
- assets resueltos en lote;
- paginación de historial y activos;
- limpieza de borradores/activos archivados fuera del request.

## Accesibilidad

Objetivo: WCAG 2.2 AA.

### Editor

- navegación completa por teclado;
- alternativa a drag and drop;
- orden de foco predecible;
- foco visible;
- nombres accesibles;
- mensajes de estado con `aria-live`;
- errores asociados al control;
- modales con focus trap y retorno de foco;
- targets mínimos de 44 × 44 px;
- no depender solo del color;
- paneles y tabs con roles correctos;
- atajos documentados y no invasivos;
- canvas navegable sin ratón.

### Widget público

- jerarquía de headings;
- labels reales;
- grupos de opciones;
- estado seleccionado anunciado;
- validación de formularios accesible;
- manejo de foco al cambiar de paso;
- confirmación anunciada;
- loading no bloqueante;
- contraste;
- targets táctiles;
- texto redimensionable;
- orden DOM lógico aunque cambie el layout visual.

### Imágenes

- alt significativo;
- opción decorativa explícita;
- pie relacionado semánticamente;
- overlays con contraste;
- texto importante no incrustado únicamente en imagen;
- CTA accesible aunque el fondo falle.

### Color

El editor calcula contraste:

- texto normal: 4.5:1;
- texto grande: 3:1;
- controles y estados: 3:1.

Si un tema no cumple:

- muestra el par problemático;
- ofrece corrección automática;
- bloquea publicación solo cuando el problema afecta componentes esenciales, según la política aprobada;
- no altera colores silenciosamente.

### Movimiento

- respeta `prefers-reduced-motion`;
- animaciones decorativas desactivables;
- sin parpadeo;
- sin autoplay de video;
- hover nunca es la única forma de descubrir información.

### Zoom y reflow

- editor usable al 200 %;
- widget reflow a 320 CSS px;
- sin pérdida de acciones;
- sin scroll horizontal salvo componente con excepción documentada;
- ayudas y popovers se reposicionan;
- botones flotantes no cubren acciones.

## Privacidad

- imágenes de negocio se consideran contenido del negocio;
- no usar imágenes subidas para entrenar sistemas externos salvo acuerdo explícito;
- no registrar contenido del cliente en telemetría general;
- no incluir PII de reservas en screenshots automáticos;
- los datos de preview simulada deben ser ficticios;
- eliminación de cuenta incluye política de activos y versiones;
- retención de versiones definida y visible.

## Fiabilidad

- versión publicada inmutable;
- fallback;
- validación previa;
- smoke posterior;
- error boundary por bloque;
- request id;
- métricas;
- alertas;
- runbook;
- restauración ensayada.

## Checklist de calidad por bloque

Antes de registrar un tipo de bloque:

- schema;
- límites;
- renderer;
- preview;
- fallback;
- responsive;
- teclado;
- screen reader;
- contraste;
- loading;
- error;
- sanitización;
- presupuesto;
- pruebas;
- migración de schema;
- documentación.
