# Revisión privada y lanzamiento para negocios

El servidor puede estar disponible para validar ChatGPT sin permitir que los
demás negocios activen la integración. Son dos controles independientes:

- `MCP_ENABLED=false` o ausente apaga MCP/OAuth, recibos y su interfaz. Las
  rutas devuelven 404 antes de consultar tablas MCP. La limpieza autenticada
  sigue disponible para cumplir la retención.
- Con `MCP_ENABLED=true`, la ausencia de `McpRolloutState.global` equivale a
  acceso cerrado para negocios. Sólo acceden los usuarios y negocios cuyos
  IDs coinciden con ambas listas privadas `MCP_REVIEW_USER_IDS` y
  `MCP_REVIEW_BUSINESS_IDS`.

La política se comprueba en Configuración, consentimiento, perfiles, acceso a
herramientas, refresh de tokens, aprobación y ejecución de operaciones. Un
token antiguo no permite eludir una pausa. La búsqueda pública aplica la misma
restricción a negocios, además del opt-in individual; no basta conocer un ID.
No hay variables públicas ni parámetros HTTP para cambiar esta política.

## Revisión con Estética Bella

El responsable autorizó usar producción y el negocio existente Estética Bella
como cuenta de pruebas. No se crea una base ni una cuenta nueva, ni se ejecutan
seeds, resets o `db push` en producción. Los IDs y credenciales se configuran
exclusivamente en el servidor y en el campo privado del portal de revisión.

Configurar las dos listas con un único usuario y negocio, `MCP_ENABLED=true`,
`MCP_ORIGIN=https://www.puragenda.cl`, una clave de operaciones aleatoria de 32
bytes y `MCP_PUBLIC_BOOKING_ENABLED=false`. No reutilizar claves del fixture
local. Cambiar variables de Vercel requiere un nuevo despliegue.

`MCP_REVIEW_SUPPRESS_EFFECTS=true` evita correos, recordatorios y escrituras en
Google Calendar exclusivamente para las operaciones MCP de los negocios de
revisión. El calendario puede consultarse para comprobar conflictos. Las citas
se guardan realmente con el motor canónico y se pueden reprogramar o cancelar
con su aprobación; la página de aprobación identifica el modo de revisión.
Las reservas habituales conservan sus notificaciones y sincronización.

Mantener el acceso global cerrado durante toda la revisión. La disponibilidad
del endpoint y el ZIP del plugin no acreditan aprobación ni publicación en OpenAI.

## Botón de lanzamiento

En el panel de superadmin, **Integraciones → ChatGPT y Codex**, el control
**Habilitar para negocios** requiere sesión de superadmin, verificación reciente,
confirmación de haber verificado la aprobación de OpenAI y su referencia.
El servidor guarda el cambio y la auditoría en una misma transacción y rechaza
cambios sobre una versión antigua del estado. La base también exige una
referencia y fecha de aprobación para permitir el estado habilitado.

Al habilitar, cada negocio debe conectar su propia cuenta y autorizar los scopes;
esto no conecta cuentas automáticamente ni publica el plugin en OpenAI. El botón
**Deshabilitar para negocios** vuelve a cerrar el acceso inmediatamente para
conexiones nuevas y existentes; los revisores configurados conservan el acceso.
No se debe pulsar el botón de lanzamiento durante las pruebas.

## Migración y despliegue

`scripts/vercel-build.mjs` ejecuta `prisma migrate deploy` únicamente en producción.
Las migraciones pendientes de esta integración son:

1. `20261017021050_mcp_oauth_connector`: siete tablas privadas y
   `Business.mcpPublicDiscovery=false`.
2. `20261018055923_mcp_rollout_control`: tabla privada de control global,
   restricciones de aprobación y singleton. No inserta ningún estado habilitado.

Las ocho tablas MCP tienen RLS y privilegios revocados a PUBLIC, anon y
authenticated. Las migraciones son aditivas. El preflight compara el historial
productivo con la rama y sólo admite las cuatro diferencias históricas de checksum
ya documentadas en `docs/operations/cinnamon-production-runbook.md`; no altera
sus archivos ni sus checksums. Los previews no ejecutan migraciones.

## Validación

Se comprueban el apagado total, aislamiento por pares usuario/negocio, permisos
actuales, consentimiento, tokens existentes tras pausa, descubrimiento público,
restricciones SQL y acceso denegado a roles de la Data API. Las pruebas del
control de lanzamiento usan también una sesión real firmada de superadmin.
La revisión crea, reprograma y cancela citas sin efectos externos, y verifica
que una reserva normal sigue notificando.

Los resultados actuales están en
[review-rollout-validation.json](iteration-2/evidence/review-rollout-validation.json).
La evidencia HTTP de la fase anterior con el interruptor general apagado permanece
en [hidden-rollout-http.json](iteration-2/evidence/hidden-rollout-http.json).
Los resultados locales no se presentan como pruebas ejecutadas desde ChatGPT.

GitHub Actions no pudo iniciar los jobs por un bloqueo de facturación de la
cuenta. La auditoría de producción no detectó vulnerabilidades; la auditoría
completa conserva nueve entradas high de herramientas de desarrollo, reproducidas
con el lockfile del main anterior. No se han relajado esos workflows.
