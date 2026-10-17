# Seguridad y privacidad del conector

## Fronteras y controles

El cliente conversacional, los argumentos de herramientas y todo texto de
negocios/clientes son no confiables. El grant OAuth validado establece negocio
y usuario. Un ID recibido sólo puede seleccionar un objeto dentro de ese
ámbito; jamás establece autorización. También se valida membresía activa antes
de aplicar permisos, evitando los fallbacks globales de roles de la aplicación.

Se comprueban revocación, vencimiento, `tokenVersion`, suscripción operativa,
scopes y permisos actuales en cada llamada. Los empleados sólo acceden a sus
sucursales activas asignadas, incluso con permisos de agenda global. La agenda
propia restringe el profesional; las citas históricas sin sucursal sólo entran
en la sucursal principal. No se devuelve el modelo Prisma completo de usuario,
negocio, cliente o cita.

| Superficie | Defensa y evidencia |
| --- | --- |
| Robo/replay de códigos | PKCE S256, código de 120 s de un solo uso, bloqueo transaccional del intercambio, consumo incluso tras verificador incorrecto |
| Refresh robado | Rotación, hash, vínculo cliente/recurso, reutilización revoca toda la concesión; no se restablecen los 30 días |
| Confusión de tenant/audience | Perfil persistido por usuario/negocio, resource/issuer exactos; no `businessId` en herramientas privadas |
| Consentimiento forzado | Sesión Puragenda real, elección explícita del negocio, origen exacto, cookie HttpOnly, CSRF de un uso y 10 min; state devuelto intacto con issuer |
| Redirect/SSRF | Allowlist exacta HTTPS; loopback sólo con opción explícita, `/callback` o `/callback/ID` acotado, sin query/fragmento/credenciales. DCR nunca obtiene URLs remotas; autorización e intercambio exigen el redirect registrado exacto |
| Escritura declarada por el modelo | Recibo servidor y aprobación POST separada en navegador, vinculados a conexión y parámetros; un booleano de confirmación es inválido |
| Carreras y duplicación | Motor v1, bloqueo PostgreSQL de capacidad, checkpoints `BookingOperation`, clave persistente, snapshot completo y guardia de precio/duración dentro de la transacción |
| Exposición SQL/Supabase | RLS en las siete tablas nuevas, sin políticas cliente y sin privilegios PUBLIC/anon/authenticated; acceso exclusivamente servidor |
| Abuso/carga | Cuerpo acotado, períodos/resultados limitados y rate limit compartido en PostgreSQL que falla cerrado |
| Logs/prompt injection | Logs MCP sólo de nombre, duración y código seguro; no argumentos/tokens/conversaciones. Textos devueltos son datos, no instrucciones |
| Páginas de aprobación | HTML escapado, no-store, CSP sin scripts ni frames, noindex, CSRF SameSite Strict y Referrer-Policy same-origin |

La conexión PostgreSQL del servidor debe tener los permisos apropiados; RLS no
sustituye la autorización multi-tenant de la aplicación. Las pruebas usan un
rol real sin BYPASSRLS para demostrar que una tabla no queda expuesta a cliente.
El despliegue debe conservar una capa de proxy confiable para la IP de origen;
no se deben aceptar cabeceras `x-forwarded-for` arbitrarias desde Internet en
un servidor alternativo.

## Límites de solicitudes

Todos los buckets son compartidos entre instancias y su clave se almacena como
SHA-256, con reloj de PostgreSQL. Límites por minuto salvo indicación:

- HTTP MCP por IP: 180.
- Usuario: 120; negocio y cliente OAuth: 240 cada uno.
- Herramienta privada/conexión: 60 lecturas; 20 preparaciones/ejecutores.
- Herramienta pública/IP: 120 lecturas; 10 preparaciones/ejecuciones por 5 min.
- OAuth/IP/acción: 10 registros y 40 demás solicitudes; cliente: 120;
  decisiones por usuario: 20.
- Aprobación por recibo: 10.
- Disponibilidad pública: además de IP/herramienta, 60 por negocio/minuto entre
  todos los solicitantes, antes de cargar/calcular disponibilidad.
- Preparaciones públicas nuevas: 30 por negocio/hora, 5 por email/negocio/hora
  y 5 por teléfono normalizado/negocio/hora. Las claves se almacenan hasheadas;
  el replay con la misma operationKey recupera la preparación sin consumir esos
  cupos adicionales. Un intento inválido nuevo puede consumir cupo.

Las reservas públicas están deshabilitadas por defecto mediante
`MCP_PUBLIC_BOOKING_ENABLED=false`. La participación del negocio permite
descubrimiento, pero no habilita escrituras por sí sola. Catálogo, preparación
y ejecución respetan el flag; desactivarlo después de aprobar también bloquea
la ejecución. Sólo el fixture controlado lo habilita para comprobar el flujo.
Los límites reducen carga/spam; no verifican email/teléfono y un atacante puede
variar contactos o agotar el cupo compartido. No habilitarlo para público general
hasta contar con controles de identidad y abuso validados.

## Datos y retención implementada

Los tokens y códigos se guardan sólo como hashes. El contenido de preparaciones
(contacto necesario, snapshot y recibo recuperable) se cifra con AES-256-GCM y una
clave de servidor independiente. No se guarda el historial de conversación.

El cron diario a las 04:00 UTC borra tokens con refresh vencido, solicitudes y
códigos vencidos hace más de un día, payloads de operaciones de más de 24 horas
y buckets antiguos. El acceso al payload ya falla a las 24 horas aunque el cron
se retrase. La eliminación física depende de que el cron funcione; con
frecuencia diaria puede ocurrir en la siguiente ejecución. Alertar por fallo.

Se conservan perfiles estables, concesiones/revocaciones, hashes de idempotencia,
resultados mínimos e IDs de auditoría. No hay un plazo automático nuevo para
esos metadatos: aplicar la política de eliminación de cuentas y revisión legal
del proyecto. Los contactos incorporados a una reserva quedan en los registros
canónicos de agenda/CRM con su política propia; borrar un payload no borra una
reserva. La retención de backups y los datos recibidos por ChatGPT dependen de
sus operadores. Revocar bloquea futuras llamadas; no retira respuestas previas.

## Riesgos resueltos durante la implementación

- Roles ADMIN/SUPERADMIN sin membresía no constituyen acceso a otro negocio.
- La ubicación única del usuario no activa el fallback de citas sin sucursal
  cuando su ubicación autorizada es secundaria.
- El catálogo privado proyecta también los IDs de sucursal y servicio asignados:
  una fila compartida no arrastra referencias a sucursales fuera de la consulta.
- El scope de agenda/CRM no arrastra importes financieros o sellos sin sus
  scopes adicionales.
- El cambio de precio o de participación pública se comprueba dentro de la
  escritura canónica, además de al preparar.
- Un verificador PKCE inválido no deja reutilizable el código por rollback.
- Las carreras/reintentos preservan la misma reserva y un checkpoint incompleto
  no se presenta como cita confirmada.
- Las pruebas reales de navegador detectaron y corrigieron la pérdida de cookie
  por normalización localhost/127.0.0.1, el bloqueo CSP de callback OAuth y el
  Origin opaco causado por `no-referrer`. La excepción form-action se limita a
  `/oauth/consent` y a los orígenes de callback registrados.

## Riesgos residuales y revisión humana

- DCR identifica un cliente registrado, no verifica la identidad comercial de su
  nombre. El consentimiento lo identifica como externo y pide comprobarlo.
- No hay OIDC/email verificado ni restricción empresarial por dominio. No
  anunciar esa capacidad en el portal. Si OpenAI la exige para una distribución
  elegida, debe integrarse un proveedor que demuestre esos atributos.
- Una aprobación pública es una capability temporal accesible a quien tiene su
  URL. No demuestra identidad de email/teléfono. Los datos son visibles en la
  página para revisión del cliente y las reservas mantienen su estado real.
  Por eso el canal de escritura pública queda deshabilitado por defecto.
- La política de retención del proveedor de hosting debe excluir/redactar
  query strings OAuth y rutas de recibos. El código MCP no los registra, pero
  el proxy y los logs HTTP del hosting son una frontera adicional.
- Google Calendar, email y Mercado Pago se sustituyeron por fixtures/control
  local en las pruebas. No se han certificado sus efectos externos reales.
  Una sincronización pendiente requiere resolución operativa; no repetir la cita.
- La auditoría MCP de creación se termina después del checkpoint canónico. Un
  corte en ese intervalo conserva la reserva/idempotencia; recuperar con el
  mismo recibo antes de su límite y reconciliar por `BookingOperation` si hace
  falta. Cancelación y reprogramación guardan mutación y auditoría juntas.
- El audit completo de npm informa nueve entradas high del árbol de desarrollo
  heredado (`braces` vía herramientas). El audit de producción tiene cero.
  No se aplicó una degradación incompatible de Next/ESLint/shadcn. Revisar
  [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  cuando exista versión corregida; no exponer herramientas dev a entradas no confiables.
- Revisar legalmente responsable/contacto, base jurídica de datos de clientes,
  operadores/subencargados, conservación de metadatos/backups y uso por negocios
  de salud. El conector excluye notas clínicas, pero no certifica cumplimiento
  regulatorio. Los textos de privacidad/términos reflejan mecanismos reales y
  deben ser aprobados por el responsable legal antes de publicación.

Esta es una revisión de diseño, código y pruebas del cambio; no se presenta como
un escaneo independiente de Codex Security ni una certificación de seguridad.
