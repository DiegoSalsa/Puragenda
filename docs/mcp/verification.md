# Informe de implementación y verificación

Fecha: 17 de octubre de 2026. Entorno Windows, Node 25.2.1, PostgreSQL 17 local,
Next 16.3.8, Prisma 7.10.0, MCP SDK 1.32.1 y Node OAuth 5.3.1. No se usaron
datos de clientes ni una base productiva para estas pruebas.

## A. Implementación

Servidor Streamable HTTP de Next.js con 30 herramientas: 18 lecturas privadas,
6 operaciones administrativas de preparación/ejecución y 6 públicas. Seis scopes:
`account:read`, `agenda:read`, `analytics:read`, `clients:read`, `loyalty:read` y
`appointments:write`. [Arquitectura y catálogo completos](README.md).

OAuth real con DCR, consentimiento de negocio explícito, PKCE S256, perfil
estable, refresh rotatorio, revocación y metadata estándar. La interfaz existente
incorpora conexiones, revocación y participación pública; las políticas legales
incorporan el tratamiento del conector. Se reutilizaron Puri, permisos, motor v1,
servicios de reservas/cancelación/reprogramación y mecanismos de concurrencia.

## B. Seguridad

Se verificaron concesión, membresía, roles, sucursal, profesional, scopes,
permisos y suscripción. No se admite `businessId` administrativo del modelo.
Las escrituras requieren recibo cifrado, aprobación del navegador, revalidación
y clave idempotente. Tokens/códigos sólo tienen hashes; RLS protege las tablas
nuevas del cliente SQL. Hay límites compartidos y logs MCP sin payloads.

Se corrigieron riesgos de fallback de roles y sucursal, importes sin scope,
referencias del catálogo a otras sucursales, carreras de precio/participación,
replay/rollback PKCE y duplicación en reintentos. Las pruebas de navegador
también corrigieron problemas reales de cookies, CSP y Origin durante OAuth.
[Controles, retención y riesgos residuales](security.md).

Límites relevantes: reservas públicas sólo gratuitas; sin abonos ni checkout;
CRM/fidelización de todo el negocio sólo para dueños; ciertos cambios complejos
de citas se resuelven manualmente. No hay OIDC/email verificado. Los efectos
reales de proveedores y la revisión OpenAI siguen pendientes externamente.

## C. Verificación ejecutada

El cierre final de comandos se registra en `evidence/checks.json`. Los logs de
ejecución locales están en `artifacts/mcp/` (ignorados por Git porque los logs de
desarrollo pueden incluir URLs temporales de OAuth/aprobación).

| Control | Resultado |
| --- | --- |
| `npm ci` | PASS: instalación limpia del lockfile, 831 paquetes; postinstall generó Prisma |
| `prisma generate` y `prisma validate` | PASS con Prisma 7.10.0 |
| Migración versionada | PASS: SQL real aplicado en schema PostgreSQL temporal, con FK, índices, RLS y grants |
| `npm run typecheck` | PASS, 0 errores |
| `npm run lint` | PASS, 0 errores y 32 advertencias heredadas |
| `npm test` | 1.269 aprobadas, 0 fallos, 102 omitidas; 196 archivos aprobados y 5 omitidos |
| Suite completa con PostgreSQL (`--all`) | 1.290 aprobadas, 0 fallos, 81 omitidas; 198 archivos aprobados y 3 omitidos |
| `npm run test:mcp:local` | PASS: 25 pruebas, 0 fallos (7 contratos/seguridad y 18 integraciones PostgreSQL) |
| Build de producción (`--build`) | PASS; base y proveedores locales de prueba |
| Cliente MCP oficial SDK | PASS: inicialización, 30 herramientas, seguridad mixta en wire, perfil y llamadas reales por HTTP |
| OAuth en navegador real | PASS: login, elección entre negocios, consentimiento, state/iss y PKCE; ver browser-oauth.json |
| Escritura pública en navegador + SDK | PASS: aprobación, una cita gratuita HTTP 201/PENDING y replay sin duplicar; ver browser-booking.json |
| Revocación en configuración | PASS en navegador; conexión retirada de la lista y token revocado probado por integración |
| Plugin y ZIP | PASS contra snapshots de ambos schemas Agent Plugins 1.0.0 y reglas locales de listing/assets/5 positivos/3 negativos |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| `npm audit` completo | 9 entradas high heredadas de desarrollo; no se corrigieron con downgrades incompatibles |
| Preflight de configuración | PASS de sintaxis con valores ficticios; no valida secretos ni servicios productivos |

Las suites PostgreSQL se ejecutan por separado sobre schemas desechables. En la
suite general las integraciones MCP quedan omitidas por su flag y se ejecutan
explícitamente en `test:mcp:local`. Las dos suites de compra/facturación de sitios
requieren su fixture `websiteqa:55439` y flags propios: no se cuentan como
aprobadas por este trabajo. En la ejecución general sin base también se omiten
reservas PostgreSQL y carreras de abonos; ambas sí se ejecutan con `--all`.

Durante el cierre, ejecutar dos suites completas junto al build saturó la máquina:
el test de hashes SEO agotó 5 s y el render PNG de calendario agotó 15 s. Se
conservaron sus logs como `*-concurrent-timeout.log` y se repitieron los controles
en secuencia con los límites originales, sin desactivar pruebas ni elevar timeouts.
La evidencia final distingue esos intentos del resultado del cierre.

### Cobertura de las 18 integraciones MCP con PostgreSQL

- DCR → authorize → sesión Puragenda firmada → consentimiento → código → PKCE →
  token → cliente SDK HTTP, perfil y descubrimiento.
- Callbacks Codex `/callback/ID`, registro exacto, host/path cambiados rechazados;
  redirect falso, CSRF, state/issuer, replay y resource equivocado.
- PKCE incorrecto consume el código; refresh rotatorio, replay revoca familia;
  scope escalation, código/token vencidos, issuer/audience incorrectos,
  revocación y cambio de `tokenVersion`.
- Dueños A/B, elección sin membresía, empleado y sucursal limitada, agenda propia,
  IDs de otra cuenta y scopes/permisos financieros/CRM insuficientes.
- Entradas inválidas, body excesivo, métodos JSON-RPC desconocidos y challenge
  de autenticación; schemas y anotaciones comprobados también por cliente SDK.
- Preparación cifrada, recibo vencido, aprobación por usuario incorrecto, cambios
  de snapshot/precio, reserva simultánea, replay y recuperación de checkpoint.
- Creación, cancelación y reprogramación canónicas; ausencia de notificaciones
  duplicadas y conservación del resultado real ante operación en curso.
- Agregados exactos: 50.000 CLP de valor, 5.000 cobrados y 45.000 pendientes;
  notas privadas e importes sin scope no aparecen.
- Opt-in público obligatorio, retirada antes de ejecutar, servicio gratuito
  permitido y pagado/abono rechazado, slot ocupado excluido.
- Rate limit persistente, limpieza y siete tablas con RLS; un rol real sin
  privilegios obtiene cero filas y no puede borrar tokens.

Las regresiones existentes de Puri, selección/disponibilidad de reservas,
widget, traducciones, SEO y contratos de API se incluyen en la suite completa.
Las simulaciones no demuestran entrega real de email, conciliación de pagos o
sincronización real de Google Calendar. Tampoco equivalen a una conexión desde
los clientes alojados de ChatGPT/Codex o al tool scan de su portal.

## D. Publicación

URL local comprobada: `http://localhost:3108/mcp`, con el fixture reproducible
`npm run dev:mcp:review`. Objetivo HTTPS propuesto:
`https://www.puragenda.cl/mcp`. Su comprobación previa devolvía 404: no se anuncia
como servicio ya desplegado. Homepage/contacto/privacidad/términos devolvieron
200 ([registro](evidence/public-url-checks.json)); sus textos nuevos necesitan
despliegue y revisión visual/legal.

ZIP: `dist/puragenda-plugin-1.0.0.zip`.
SHA-256: `a42650df17d498ddaba0327071522c848b4eccac499ec1e558a1802f2851a8e5`.
Incluye manifiestos, habilidad de uso e iconos/logotipo oficiales, sin secretos.

[Runbook exacto](deployment.md): variables por entorno, migración única,
configuración HTTPS, desafío de dominio, alta en builder, cuenta ficticia privada,
grabación, tool scan, actualización y rollback. Quedan pendientes autorización
de despliegue/migración, credenciales y verificaciones externas del portal,
pruebas en clientes oficiales y aprobación legal/política. No existe un enlace
público del plugin ni una grabación pública inventada. La discrepancia entre
extensiones de auth documentadas y el schema MCP se explica en el runbook.

La CLI Supabase no completó su preflight local por EPERM en telemetría del perfil
Windows. El SQL se generó con Prisma a partir de la base y se validó realmente
en PostgreSQL. No se afirma haber ejecutado advisors de un proyecto Supabase
remoto ni migrado ese proyecto.

## E. Git

Rama `feature/puragenda-chatgpt-mcp`, worktree aislado
`C:/Users/diego/Desktop/agenda-chatgpt-mcp`. Base inicial:
`685de216bf4cc65be6eef71069217ad8903cbe93` (`origin/main` inspeccionado).
`testingGeneral` estaba completamente contenido en esa base: 137 commits sólo
del lado main, cero del lado testingGeneral.

El worktree original, con cambios ajenos de publicidad/SEO y otros trabajos,
permanece en `reel/puragenda-publicitario-20261015` (`731582e`). No se copiaron
sus cambios a esta rama. Main local permanece en
`a3d90a652268e7770dd0c53cac2786d6e5bf63e7`; testingGeneral permanece en
`97088bf1ebf5bc660b2c6e762d2c7e8f56d34f3b`.

Los commits se separan en OAuth/seguridad, reservas y Puri compartidos,
herramientas/escrituras MCP, interfaz/configuración, pruebas y documentación/ZIP.
El SHA final y el estado remoto se comprueban después del último commit con:

```powershell
git log --reverse --oneline 685de216..HEAD
git status --porcelain
git rev-parse HEAD
git ls-remote origin refs/heads/feature/puragenda-chatgpt-mcp refs/heads/main
```

No se hizo merge, deploy ni migración de producción. El push autorizado publica
únicamente esta rama después de los controles; no sustituye la autorización de
despliegue del backend.
