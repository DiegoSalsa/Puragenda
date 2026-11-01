# Auditoría 06 — Sitios web, editor y Puragenda+

Fecha: **1 de noviembre de 2026**, America/Santiago. Repositorio: `DiegoSalsa/Puragenda`.

## Resumen ejecutivo

Auditoría correctiva del módulo existente, sin reconstrucción ni cambio de identidad visual. Se identificaron **17 hallazgos: 16 corregidos y 1 pendiente de mantenimiento de dependencias de desarrollo**. Las comprobaciones de proveedores reales se separan de los resultados locales: no se certifican DNS, SSL, Cloudinary ni operaciones comerciales productivas mediante mocks.

La política efectiva de sitios ahora gobierna editor, publicación, hosting y escrituras sensibles. Conserva el contrato independiente legacy pagado hasta su vencimiento o retiro mediante migración probada; una promoción legacy no eleva un contrato V2 base. La vigencia del editor incluye la gracia legítima de Auditoría 05. Se bloquean contrataciones superpuestas, se conservan borradores y publicaciones, y se vuelven a comprobar derechos después de adquirir el bloqueo del negocio.

Se ejercitaron **Bella, Matchday, Ritual y Y2K**, editor y página pública, a 1440, 768 y 390 px. Se comprobó el guardado mediante controles reales de navegador y acciones HTTP compiladas, además de reservas, idempotencia, suspensión, recuperación, canonical, robots y sitemap. Ritual conserva contenido visible sin JavaScript y con las animaciones de aparición deshabilitadas por accesibilidad.

**Alcance de la aprobación:** preparado para revisión local independiente. Los controles locales no autorizan push, merge, deploy, migraciones remotas, cambios DNS ni cobros. Permanecen las validaciones externas indicadas al final y el mantenimiento de herramientas de desarrollo.

## Aislamiento y procedencia

- Base exacta: `release/puragenda-next-rc1`, **`d9b54a8056f8be93d0b400d33dc71ca54cc7f5d4`**, coincidente con la referencia local, `origin/release/puragenda-next-rc1` y `git ls-remote` al inicio.
- Rama creada: `fix/puragenda-next-audit-06-websites-plus`.
- Worktree: `C:/Users/diego/.codex/worktrees/puragenda-next-audit06/agenda`; comenzó limpio y exactamente en el SHA aprobado.
- Se conservaron el workspace original con cambios previos y los demás worktrees. No se modificaron `main` ni RC1.
- PostgreSQL 17 exclusivo, creado con `initdb`, enlazado a `127.0.0.1:55446`, bases con nombres de QA validados por `localCommercialDatabase`. Se comprobaron el directorio propio del clúster y su aislamiento. No se cargaron archivos `.env` del workspace original.
- La aplicación HTTP se ejecutó desde una copia privada bajo `scratch/next-staging/`, con datos y credenciales sintéticos, Cloudinary local/mock, Vercel mock, escritores productivos apagados y transporte HTTP externo bloqueado. Las fuentes públicas de Google Fonts son la única excepción de red del build aislado.
- DNS se ensayó mediante respuestas TXT controladas en pruebas unitarias e integración. El recorrido HTTP de dominio personalizado usa una reserva sintética con prueba reciente; no consulta DNS ni vincula un dominio real.

## Inventario y límites de autorización

El inventario inicial contiene **163 archivos** bajo las entradas de sitios de RC1. La revisión siguió los flujos y sus consumidores indirectos, con inspección estática, regresiones y ejecución local; no constituye una certificación externa de proveedores.

| Superficie examinada | Comportamiento y autorización revisados |
| --- | --- |
| `src/server/websites/` completo | Servicio, política comercial, checkout, Paddle legacy, Mercado Pago legacy, intención de compra, lanzamiento, dominios, proveedor, imágenes y adaptador de reservas. |
| `src/server/actions/website.actions.ts` | Todas las acciones exportadas: borrador, plantilla, publicación, suspensión, imágenes, dominios, solicitudes, disponibilidad de subdominio, prueba, contratación, recuperación y cancelación. |
| `src/app/dashboard/website/` | Cuatro editores, biblioteca, selector, preview en iframe, paneles comerciales y DNS, simulador local. |
| `src/websites/` | Registro/versiones, cuatro configuraciones y renderizadores, snapshots, autosave, schemas, medios, catálogo público, metadatos, JSON-LD, protocolo de preview y cliente de reservas. |
| Sitio y previews | `src/app/sites/[hostname]/`, `website-preview/`, prototipo Y2K y `website-demo/[tenant]/`. Producción no habilita demos locales; preview exige sesión y permiso. |
| API | `/api/website/{availability,book,media,robots,sitemap,payment-simulator}` y `/api/websites/purchase-intent`. |
| Consumidores indirectos | Onboarding de sitio, banner/layout del dashboard, permisos, sesión/tokenVersion, contexto de negocio, política comercial efectiva, migración, reconciliación y webhooks. |
| Infraestructura | Modelos Prisma de sitio, medios, dominios, complementos, eventos, operaciones, ofertas y contratos comerciales; bootstrap/RLS, proxy, Next, Cloudinary, Vercel y workflow de seguridad. |
| Motor central | `server/booking/`, endpoint canónico de reserva y suites aprobadas de agenda, servicios, profesionales, clientes, pagos, Puri, MCP y Contact Flow. No se creó otro motor. |

`requireWebsiteManager` deriva el negocio de la sesión y exige permiso `WEBSITE_MANAGE` para contenido. Propiedad exclusiva para dominios y facturación. Las operaciones de recuperación, cancelación y desconexión conservan una vía autorizada aunque venza el acceso al editor. Desactivar un profesional elimina su pertenencia efectiva; una sesión revocada/eliminada se rechaza en el servicio de sesión. El permiso de sitio es del negocio, no una autorización para introducir IDs de otra sucursal o tenant en el motor de reservas.

El proxy sobrescribe `x-puragenda-website-host` desde `Host`. Una ruta interna no sirve contenido de otro hostname. Las rutas públicas dependen de publicación y derechos vigentes; el HTML recibe el DTO público, no el objeto de negocio ni sus claves.

## Hallazgos, reproducciones y correcciones

### 06-01 · Crítico · Decisiones comerciales divergentes

**Reproducción:** Plus válido con `CommercialSubscription` y proyección `Subscription.plan=INDIVIDUAL` obtenía `hosting=true` en la política, pero `resolveWebsiteHost` devolvía `null`. Una cuenta legacy base sin complemento tampoco era rechazada por el guard del editor. Reproducciones PostgreSQL fallidas conservadas en `scratch/audit06/reproduction.log`.

**Causa:** selección del motor por la proyección legacy en unas entradas y por el snapshot comercial en otras; el guard legacy no exigía derechos web.

**Corrección:** servicio público, editor y publicación consumen la política efectiva común. El contrato pendiente/autorizado sin prueba o pago válido no concede hosting. Los metadatos del evaluador dejan de anunciar que es únicamente shadow. Archivos: `commercial-access.ts`, `service.ts`, `website.actions.ts`, página del editor. Pruebas: matriz comercial y reproducciones PostgreSQL.

### 06-02 · Crítico · Pérdida de derechos de un complemento legacy legítimo

**Reproducción:** plan V2 Puragenda operativo con complemento independiente `ACTIVE` y `validUntil` futuro devolvía `source=NONE` y negaba editor/hosting.

**Causa:** `!v2Contract` descartaba cualquier complemento, incluso uno pagado que no había sido retirado mediante migración.

**Corrección:** el complemento pagado conserva sus derechos bajo un plan base operativo; una transición `INCLUDED` de propuesta `APPLIED` efectiva impide reactivarlos. Las promociones antiguas no se convierten en derechos Plus de V2. No se modifican contratos, dominios, imágenes ni contenido histórico. Pruebas: PostgreSQL, política unitaria y regresión de migraciones comerciales.

Cuando vence un complemento histórico de una cuenta V2, se muestra su revisión comercial y la cancelación explícita autorizada, en lugar de confundirlo con una cuenta que nunca contrató sitio. La regularización que implicaría cancelar y crear un acuerdo Mercado Pago queda bloqueada con una explicación específica hasta validación controlada. El webhook de un pago legítimo sigue restaurando sus derechos. Reproducción de interfaz: `reproduction-legacy-review.log`.

### 06-04 · Crítico · Entradas de contratación superpuestas

**Reproducción:** el onboarding/purchase-intent legacy podía ofrecer una contratación adicional a V2; las funciones legacy no repetían la comprobación bajo el lock. Una preparación Plus tampoco verificaba un complemento recurrente existente, incluido el caso que aparece entre preparación y ejecución.

**Corrección:** salida al editor en onboarding/intención de V2, comprobación transaccional en nuevos checkout/prueba legacy y bloqueo de una operación Plus con complemento recurrente, período web pagado o resultado pendiente/incierto. Se repite antes de reclamar la ejecución. Se conserva la cancelación explícita del complemento y se informa al propietario del contrato histórico. Archivos: `billing-safety.ts`, motores comerciales, checkout, onboarding, API y aviso del dashboard. Prueba PostgreSQL: ninguna llamada `create` del proveedor al detectar superposición.

No se cancela automáticamente un contrato. La migración remota sigue necesitando evidencia canónica y validación controlada; un estado ambiguo continúa bloqueado.

### 06-08 · Crítico · Titularidad DNS sin caducidad y eliminación con prueba histórica

**Reproducción:** un `ACTIVE` con `tenantVerifiedAt` antiguo continuaba resolviendo sin TXT actual. Desconectar se basaba únicamente en ese timestamp para autorizar la eliminación en el proveedor.

**Corrección:** prueba DNS con vigencia de 24 horas, comprobación TXT exacta tras vencer y límite de espera de 3 segundos; falla cerrada ante ausencia, cambio, error o prueba futura. Canonical excluye dominios sin prueba válida. La eliminación del proveedor requiere TXT actual; una reserva local se puede retirar sin borrar un recurso ajeno. Cada nueva reserva obtiene otro token aleatorio. Se revalida también el acceso comercial de operaciones DNS tras el lock.

Pruebas: TXT dividido/ausente/incorrecto/antiguo, dos reclamaciones concurrentes, unicidad global, TTL, fallos de resolución, prueba sin titularidad, estados del proveedor y reintentos. El DNS y el transporte Vercel fueron controlados. La [documentación de dominios de Vercel](https://vercel.com/docs/domains/working-with-domains) no sustituye una comprobación real de emisión SSL.

### 06-16 · Crítico · Un registro de complemento podía apuntar al contrato principal

**Reproducción:** ante un registro histórico incorrecto con el mismo `paddleSubscriptionId` que la suscripción principal, cancelar el complemento enviaba ese ID al proveedor. La prueba con SDK mock falló antes de la corrección en `reproduction-primary-binding.log`; no se llamó a una cuenta real.

**Corrección:** antes de cancelar, reactivar o regularizar un complemento Paddle/MP, se compara su ID con los IDs principales de `Subscription` y `CommercialSubscription`. La coincidencia queda en revisión antes de llamar al proveedor. Pruebas: cancelación Paddle y ambas fuentes principales MP; además de las 85 regresiones legacy. No se usan identificadores aportados por el navegador para seleccionar el contrato.

### 06-03 · Alto · Publicación bloqueada en la interfaz durante la gracia válida

**Reproducción:** snapshot en gracia legítima, permiso de servidor válido y `periodEnd` pasado; el DTO `addon` del editor utilizaba ese vencimiento y `hasWebsitePaidAccess` devolvía falso. Fallo previo en `reproduction-grace-ui.log`.

**Corrección:** se expone `validUntil` efectivo desde el evaluador, usando la misma fecha límite de 48 horas de Auditoría 05; la página transmite esa vigencia al editor. No se inicia ni extiende la gracia desde una visita. Pruebas: componente de página y límites PostgreSQL 0 h, 24 h, 48 h menos 1 ms y 48 h exactas, además de la regresión mensual/anual de Auditoría 05.

### 06-05 · Alto · Un webhook legacy podía suspender un sitio incluido en Plus

**Reproducción:** `syncWebsiteAddon(past_due)` cambiaba el sitio `PUBLISHED` a `SUSPENDED` sin considerar un derecho Plus independiente; una recuperación tampoco conocía la elección previa del propietario.

**Corrección:** el evento reconcilia el complemento y su ledger; el hosting se decide por derechos efectivos en cada lectura. Se conserva la elección de publicación, por lo que pagar puede restablecer el hosting sin recrear contenido. Una suspensión explícita del propietario sigue necesitando republicación. Prueba: regresión unitaria de Paddle, política y suspensión/recuperación PostgreSQL/HTTP.

Se contrastaron las semánticas con la [referencia de cancelación de Paddle](https://developer.paddle.com/api-reference/subscriptions/cancel-subscription/) y la [verificación de firmas](https://developer.paddle.com/webhooks/about/signature-verification/). Se mantuvieron el SDK oficial, sandbox y `webhooks.unmarshal()` en el ingreso existente. El servidor MCP denominado `paddle-docs` no estaba disponible: se utilizó la referencia conectada `paddle-sandbox.search` y documentación oficial como respaldo. No se ejecutaron operaciones de cuenta Paddle.

### 06-06 · Alto · Derechos y borrador consultados antes del bloqueo

**Reproducción:** una escritura podía superar la autorización inicial y quedar esperando mientras otro proceso cambiaba el plan. Las solicitudes de dominio contaban su límite fuera de la transacción. La prueba nueva espera un lock real observado en `pg_stat_activity`, cambia el plan y comprueba que el borrador no avance.

**Corrección:** relectura del sitio y derechos tras bloquear `Business`, conservación de CAS por `revision`, conteo/creación de solicitudes bajo el mismo lock y suspensión explícita serializada con publicación. El CAS de RC1 ya rechazaba revisiones obsoletas; se conservó esa protección. Pruebas: ediciones simultáneas, revisión obsoleta, cambio de plan en espera y preservación de la publicación.

### 06-07 · Alto · Carrera del límite de biblioteca y fallos parciales

**Reproducción:** dos subidas con 149 imágenes podían aprobar el conteo inicial; una suspensión durante la subida no impedía el registro final. Fallos reproducidos contra los archivos originales en `reproduction-media-booking.log`.

**Corrección:** conteo final, derechos y alta del medio bajo lock del negocio. Limpieza de IDs propios ante fallo Prisma, resultado incierto de subida o rechazo comercial/cuota; también se limpia el archivo mock local. Pruebas: dos subidas reales normalizadas contra PostgreSQL, carrera guardar/eliminar y mocks de timeout/Prisma. Se verificaron JPG, PNG, WebP, WebP animado rechazado, MIME falso, corrupción, tamaño, dimensiones, reducción y eliminación de EXIF. No se subieron imágenes a Cloudinary real.

### 06-09 · Alto · Datos de biblioteca y enlaces heredados en la vista pública

**Reproducción:** `websiteView(false)` entregaba `mediaAssets`, incluidos IDs/URLs de archivos de biblioteca ajenos al contenido visible. `mapsUrl` y URLs del catálogo se heredaban sin filtro específico de la capa web.

**Corrección:** se omite la biblioteca del DTO público, preservándola en borrador/preview/BD. Se filtran imágenes y enlaces heredados por los esquemas de medios y enlaces seguros. No se demostró ejecución arbitraria de JavaScript: React ya bloqueaba protocolos peligrosos en parte de la salida. Pruebas: DTO público/privado, URL heredada `javascript:`, referencias de otro tenant y HTML de las cuatro plantillas sin API key ni IDs de biblioteca.

### 06-12 · Alto · Creación fallida por subdominio sugerido ocupado

**Reproducción:** otro sitio toma el slug del negocio antes de que este cree su web; `ensureWebsite` fallaba con `P2002`. Evidencia anterior a la corrección en `reproduction-subdomain.log`.

**Corrección:** reintentos acotados con dirección aleatoria ante conflicto único, manteniendo unicidad por negocio y subdominio. No se adopta el sitio que ocupa la dirección. Prueba PostgreSQL con dos negocios.

### 06-13 · Alto · Ritual ocultaba contenido sin JavaScript

**Reproducción:** navegador con JavaScript desactivado mostraba header y espacios vacíos; el ancestro del h1 tenía `opacity:0`. El recorrido real falló en `reproduction-ritual-nojs.log`.

**Corrección:** la ocultación de aparición se habilita después de inicializar la mejora de JavaScript. Sin `IntersectionObserver` o con movimiento reducido se muestra contenido directamente. El observer se limita a la raíz de esa instancia. Se conserva la composición y el tratamiento visual. Prueba real de navegador con/sin JavaScript y revisión de capturas finales.

### 06-14 · Alto · Faltaban exclusiones de la nueva rama

**Reproducción:** las listas aprobadas terminaban en Auditoría 05, de modo que esta nueva rama no tenía una exclusión explícita.

**Corrección:** exclusiones en `vercel.json`, rechazo del wrapper antes de CLI/migraciones y ambos jobs de `security.yml`, por `ref` y `head_ref`. La suite simula push, PR, dispatch y ambientes Vercel; conserva los controles de `main`, RC1 y los cron existentes. No se modificó configuración remota.

### 06-15 · Alto · El editor Ritual no permitía abrir preview en móvil

**Reproducción:** a 390 px, la regla común ocultaba `.previewArea`; Ritual no proporcionaba `data-mode` ni botones de edición/preview. El contenido del iframe estaba cargado, pero el iframe medía 0 × 0 y su ancestro tenía `display:none`. La comprobación de contenido real del iframe falló y se conservó en `iframe-diagnostic.log`, con tamaños y captura local.

**Corrección:** se reutilizan el estado y los controles Editar/Vista previa existentes en los otros editores; al abrir preview móvil se selecciona el viewport móvil. No se rediseña la plantilla. La prueba exige texto del borrador dentro del iframe, cambio de modo efectivo y ausencia de overflow en los tres tamaños.

### 06-10 · Medio · Preview de reserva y Origin malformado

**Reproducción:** `POST /api/website/book?preview=1` ignoraba la intención explícita de preview; `new URL(origin)` podía terminar en error interno ante un valor malformado.

**Corrección:** rechazo servidor de preview y validación de origen HTTP(S) completo antes de resolver el tenant. Se conserva la clave idempotente y la delegación al endpoint canónico: no se aceptan precios/duraciones del cliente ni se confirma una cita pendiente. Pruebas unitarias adversariales y reservas HTTP con repetición, colisión, IDs cruzados, precio inyectado, Origin ajeno y suspensión.

### 06-11 · Medio · Titulares compatibles omitidos al cambiar plantilla

**Reproducción:** el conjunto de campos universales excluía `headline`; cambiar Bella/Matchday/Ritual reiniciaba un titular compatible aunque el snapshot anterior sobrevivía.

**Corrección:** transferencia entre formatos compatibles, respetando las dos líneas y límites de Y2K. Los textos incompatibles permanecen en el snapshot original. El selector explica que cada diseño conserva sus secciones específicas. Pruebas puras y rotación PostgreSQL por las cuatro plantillas; versiones desconocidas continúan rechazadas.

### 06-17 · Medio/Bajo · Mantenimiento de dependencias de desarrollo pendiente

`npm audit --json`: **21 avisos moderados y 2 bajos**, sin altos/críticos. `npm audit --omit=dev --json`: **0 avisos**. Los avisos corresponden al árbol de herramientas de desarrollo. Algunas correcciones propuestas por npm implican retroceder versiones principales de ESLint/Next; no se ejecutó `audit fix --force` ni se cambió el lockfile durante esta auditoría. Se deja pendiente su actualización compatible, con regresión independiente. Resultados completos locales: `dependencies.json` y `dependencies-runtime.json`.

## Cobertura y matrices comerciales

| Escenario | Evidencia y resultado |
| --- | --- |
| Trial Puragenda / Plus | Solo Plus concede sitio; PostgreSQL y HTTP con alta real de ambos planes. |
| Pagado, autorizado sin pago, período futuro/vencido | Política unitaria, reconciliación comercial y PostgreSQL; autorización sin pago no habilita hosting. |
| Gracia, suspensión y recuperación | Frontera de 48 h compartida con Auditoría 05; interfaz y servidor coherentes; se conservan snapshots. |
| Renovación cancelada | Período pagado válido mantiene derechos; se niegan al vencer, sin cortes por la sola cancelación de renovación. |
| Upgrade/downgrade | Cambio de capacidad sin borrar datos; bloqueo de facturación adicional y guardado tras downgrade concurrente. |
| Legacy pagado / prueba / migración | Derechos históricos válidos; pruebas fundadoras acotadas; transición retirada no vuelve a conceder acceso; migración incompleta bloqueada. |
| Negocio eliminado / usuario revocado / profesional inactivo | Guard de sesión y negocio, políticas y regresiones de privacidad; sin acceso público ni escrituras del actor inválido. |
| Dos tenants / IDs intercambiados | Imágenes, dominios, publicación, catálogos y reservas aislados; unicidad global y permiso por sesión. |
| Borrador/publicación y concurrencia | Dos guardados con una revisión producen un ganador; publicación atómica y separada; borrador incompleto y revisión vieja rechazados. |
| Fallo de red/BD | Autosave conserva entrada fallida y no adelanta revisión; reintento de reserva devuelve la misma cita; errores parciales de medios limpian recursos propios. |
| Host / DNS / SEO | Header interno falsificado, ruta alternativa, TXT, dominios desconectados, canonical, sitemap, robots y JSON-LD. |
| Archivos y almacenamiento | Decodificación real, límite de bytes/píxeles, animación, EXIF, cuota concurrente y protección de imágenes referenciadas. |
| Reservas y pagos | Adaptador conserva el motor central, timezone, opciones, depósitos y resultado incierto; regresiones de agenda y pagos. |

No se modificó el catálogo: Puragenda desde $12.990 CLP, Plus desde $27.990 CLP, profesionales según catálogo central y anualidad de doce meses pagando diez. La compra del dominio continúa cotizándose por separado. No se inventaron reseñas, ratings, domicilios ni servicios.

## Validaciones finales

| Comprobación | Resultado |
| --- | --- |
| Vitest general | **1.908 aprobadas**, 727 condicionadas omitidas en este modo; 260 archivos aprobados y 25 condicionados. Ningún fallo final. |
| PostgreSQL comercial, registro, planes, Puri, Contact Flow, servicios, clientes y auditorías anteriores | **555 aprobadas**, 18 archivos. Incluye las **18 pruebas nuevas PostgreSQL** de esta auditoría. |
| PostgreSQL de agenda/reservas | **97 aprobadas**. |
| PostgreSQL y regresión MCP | **53 aprobadas**. |
| PostgreSQL de pagos, complementos e intención legacy | **85 aprobadas**. |
| PostgreSQL web final, después del último ajuste de presentación legacy | **18 aprobadas**; RLS, concurrencia y derechos incluidos. |
| HTTP de regresiones | Bootstrap, general, agenda, servicios/profesionales, clientes/privacidad, cobros y sitio: aprobados. Recibos bajo el staging privado y `scratch/audit04/`, `scratch/audit-03/`. |
| HTTP y Chromium, cuatro plantillas | **93 comprobaciones aprobadas**, 24 capturas de página/editor y una captura adicional sin JS; **0 excepciones JavaScript**. |
| Prisma | `generate` y `validate` aprobados. |
| Next y TypeScript | `next typegen` y `tsc --noEmit` aprobados. |
| ESLint | **0 errores, 32 advertencias**; avisos heredados, principalmente imágenes y herramientas. |
| Build aislado | Next 16.4.2, webpack, compilación, tipos y generación de 162 páginas estáticas aprobados; sin credenciales de proveedores. |
| Dependencias | Producción: **0 vulnerabilidades reportadas**. Desarrollo: 21 moderadas y 2 bajas pendientes, sin altas/críticas. |
| Secretos y Git | Escaneo de patrones sin hallazgos; `git diff --check` limpio. Excluidos secretos, recibos y capturas temporales. |
| Proveedores reales | **No ejecutado**: DNS productivo, emisión SSL, cambios Vercel, subida/borrado Cloudinary y cobros/cancelaciones reales. |

Se añadieron **48 pruebas**: 30 unitarias/regresiones y 18 PostgreSQL. Archivos nuevos: `tests/core/audit06-template-snapshots.test.ts`, `tests/server/audit06-domain-ownership.test.ts`, `tests/server/audit06-website-booking.test.ts` y `tests/integration/audit06-websites-postgres.integration.test.ts`. Se ampliaron biblioteca de medios, interfaz comercial y protecciones de despliegue; se adaptaron los mocks de acciones/servicio a la nueva frontera transaccional.

Las omisiones de PostgreSQL en Vitest general son intencionales; las suites condicionadas se ejecutaron en sus entornos aislados correspondientes. Las pruebas con proveedores mock no equivalen a certificación productiva.

El test HTTP heredado de servicios tenía una fecha única que, el día de esta auditoría, caía en sábado. Se corrigió el fixture para buscar disponibilidad en siete días, conservando las reglas del motor. El wrapper crea el directorio de recibos requerido por la regresión de clientes. Los intentos iniciales fallidos y los recorridos posteriores permanecen en `scratch/audit06/`.

Una corrida conjunta detectó además dos problemas del arnés: observación cacheada de `pg_stat_activity` dentro de la transacción que retenía el lock y navegación Chromium repetida durante cambios de viewport. La observación ahora se hace desde autocommit y el sitio público se redimensiona sobre una misma navegación, como una ventana real. Se repitieron PostgreSQL y navegador con resultado aprobado; los fallos iniciales no se contabilizan como defectos productivos.

Reproducción local: `npm ci --ignore-scripts`, `node scripts/test-audit-06.mjs init`, `node scripts/test-audit-06.mjs verify`, luego modos `general`, `commercial`, `booking`, `mcp`, `legacy` y `build`. Para HTTP: modos `prepare`, `staging` y `http-bootstrap`, seguidos de `http-general`, `http-agenda`, `http-services`, `http-clients`, `http-billing` y `http-websites`. El navegador requiere Playwright **solo en QA**, instalable con `npm install --prefix scratch/audit06/browser --no-audit --no-fund playwright`, y ejecuta `node scripts/test-audit06-websites-http.mjs` usando Chrome local. No añade dependencias al producto. `node scripts/test-audit-06.mjs stop` detiene exclusivamente el clúster propio.

El escaneo de secretos revisa líneas introducidas en todos los commits locales y cambios, con patrones de credenciales y revisión del diff. Es un control acotado, no una garantía frente a todos los formatos posibles. No se versionan credenciales sintéticas, cookies, certificados, recibos privados ni capturas.

## Evidencia visual

Capturas locales fuera de Git: `scratch/audit06/screenshots/`, con `{bella,matchday,ritual,y2k}-{public,editor}-{1440,768,390}.png` y `ritual-no-js.png`. Los reportes JSON HTTP incluyen sus nombres. Se inspeccionaron las composiciones públicas y del editor, con especial atención a móvil, y se comprobó ausencia de desbordamiento horizontal, destinos de anclas y alt en imágenes. Las capturas finales esperan imágenes y visibilidad de contenido; las primeras capturas transitorias no se utilizaron como evidencia de un defecto de diseño.

El entorno dev usa fuentes de respaldo cuando el guard bloquea Google Fonts; no certifica tiempos de carga ni Core Web Vitals de producción. La identidad, colores, estructura y componentes de las plantillas se preservaron. Los cambios visuales de Ritual corrigen la invisibilidad sin JavaScript y habilitan el control de vista previa móvil que faltaba en su editor.

## Migraciones y compatibilidad

**No se agregaron migraciones ni cambios Prisma.** Las migraciones aprobadas de Auditorías 03–05 se mantuvieron intactas. El bootstrap y las migraciones existentes se aplicaron en bases PostgreSQL desechables. Se verificó RLS de las nueve tablas de sitios, incluso concediendo SELECT a `anon` dentro de una transacción revertida: cero filas visibles.

Las correcciones usan transacciones y bloqueos PostgreSQL ya empleados por el proyecto; no añaden extensiones ni dependencias de filesystem al runtime productivo. La compatibilidad de despliegue Neon queda sujeta a su validación operativa habitual; no se conectó a Neon ni se aplicaron cambios remotos.

## Riesgos residuales y validaciones externas

1. Validar con autorización separada la integración real Vercel/DNS/SSL: propagación, certificados pendientes, transferencia, error del proveedor y recuperación tras timeout/rollback. La prueba local no demuestra emisión ni renovación de certificados reales.
2. Validar Cloudinary real: resultado incierto, borrado/CDN, fallos sostenidos y limpieza de huérfanos. La limpieza es de mejor esfuerzo si el propio proveedor también rechaza `destroy`; no se inventa una certificación de ausencia de huérfanos remotos.
3. Completar la certificación comercial de migraciones y cancelación legacy con evidencia canónica del proveedor. Contratos ya inconsistentes con dos acuerdos necesitan revisión explícita; no se cancelan ni convierten automáticamente. Los flujos nuevos rechazan superposición.
4. La prueba DNS pública dura 24 horas; tras vencer, la lectura requiere TXT actual y puede añadir hasta 3 segundos de latencia o negar acceso durante una caída DNS. No se usa una prueba almacenada indefinidamente. Confirmar que los clientes conservarán el TXT de titularidad.
5. Resolver los 23 avisos bajos/moderados de desarrollo de 06-17 y repetir la regresión de herramientas. El árbol de producción no reportó avisos en esta ejecución.
6. Realizar la comprobación final de rendimiento, CDN, encabezados de infraestructura y configuración de despliegue en staging autorizado. Las capturas dev y mocks no son mediciones de campo.

## Archivos y entrega Git

<!-- INVENTORY -->
44 archivos modificados respecto de RC1, incluido este informe:

- `.github/workflows/security.yml`
- `docs/puragenda-next/34-auditoria-06-sitios-web-2026-11-01.md`
- `scripts/scan-audit06-secrets.mjs`
- `scripts/test-audit-05.mjs`
- `scripts/test-audit-06.mjs`
- `scripts/test-audit06-websites-http.mjs`
- `scripts/test-commercial-postgres.mjs`
- `scripts/test-next-staging-services-staff.mjs`
- `scripts/vercel-build.mjs`
- `src/app/api/websites/purchase-intent/route.ts`
- `src/app/dashboard/website/legacy-contract-notice.tsx`
- `src/app/dashboard/website/page.tsx`
- `src/app/dashboard/website/ritual-editor.tsx`
- `src/app/dashboard/website/template-selector.tsx`
- `src/app/onboarding/website/page.tsx`
- `src/server/actions/website.actions.ts`
- `src/server/commercial-billing/mercadopago-v2.ts`
- `src/server/websites/billing-safety.ts`
- `src/server/websites/billing.ts`
- `src/server/websites/booking.ts`
- `src/server/websites/checkout.ts`
- `src/server/websites/commercial-access.ts`
- `src/server/websites/domain-ownership.ts`
- `src/server/websites/domains.ts`
- `src/server/websites/media.ts`
- `src/server/websites/mercadopago-billing.ts`
- `src/server/websites/service.ts`
- `src/websites/catalog.ts`
- `src/websites/template-snapshots.ts`
- `src/websites/templates/ritual/ritual.module.css`
- `src/websites/templates/ritual/Ritual.tsx`
- `tests/core/audit06-template-snapshots.test.ts`
- `tests/integration/audit06-websites-postgres.integration.test.ts`
- `tests/server/audit06-domain-ownership.test.ts`
- `tests/server/audit06-website-booking.test.ts`
- `tests/server/rc1-deployment-safety.test.ts`
- `tests/server/website-billing-lifecycle.test.ts`
- `tests/server/website-commercial-access.test.ts`
- `tests/server/website-domain-provider.test.ts`
- `tests/server/website-media.test.ts`
- `tests/server/websites.actions.test.ts`
- `tests/server/websites.billing.test.ts`
- `tests/server/websites.service.test.ts`
- `vercel.json`
<!-- /INVENTORY -->

La entrega consta de **11 commits locales en español y 44 archivos modificados** sobre la base exacta aprobada. RC1 local/remota y el merge-base permanecen en el SHA inicial; la rama de auditoría no existe en el remoto. El SHA final se entrega en el chat y se obtiene con `git rev-parse HEAD`; el informe no intenta autorreferenciar el hash del commit que lo contiene. El árbol se deja limpio tras el commit de cierre. No se hizo push, merge ni deploy, ni se crearon recursos remotos.

Al cerrar se detuvieron exclusivamente los procesos del staging y el clúster PostgreSQL propios de esta auditoría. Se comprobaron libres los puertos locales 3128, 3448 y 55446; no se detuvieron servicios de otros worktrees.
