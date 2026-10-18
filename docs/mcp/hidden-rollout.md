# Incorporar el código sin lanzar la integración

`MCP_ENABLED` es un interruptor exclusivo del servidor, **apagado por defecto**.
La ausencia de la variable equivale a `false`; sólo el texto exacto `true`
habilita la integración. No existe una variable pública que permita activarla
desde el navegador. Incorporar la rama no requiere lanzar el conector a usuarios.

## Producción apagada

Con `MCP_ENABLED=false` o sin la variable:

- Configuración no renderiza la tarjeta ChatGPT/Codex, conexiones ni opt-in.
  El componente retorna antes de consultar las tablas MCP.
- Las páginas de instrucciones, conexiones propias y consentimiento devuelven
  not-found. No se anuncian las secciones nuevas del conector en los textos
  legales renderizados.
- MCP, OAuth, metadata y challenge de dominio devuelven 404 sin consultar sesión,
  límites, operaciones o concesiones. También se bloquean aprobaciones por recibo.
- Las acciones servidor para cambios de participación y revocación rechazan
  `MCP_DISABLED` antes de leer sesión o escribir en base.
- La limpieza autenticada sigue disponible para cumplir retención si se apaga
  una integración previamente utilizada. No aparece en la interfaz de negocios.
- `MCP_PUBLIC_BOOKING_ENABLED` sigue apagado por defecto e independiente; no basta
  por sí solo para abrir el canal mientras el interruptor general esté apagado.

Las pruebas comprueban tanto que la interfaz no se renderiza como que las URLs
y acciones no permiten usar el backend oculto. No se depende sólo de esconder enlaces.
La autenticación, permisos y funciones existentes de Puri siguen su flujo actual.

## Entorno de pruebas

Los runners `--mcp`, `--mcp-preview` y `resume-mcp-review.mjs` establecen
`MCP_ENABLED=true` únicamente en sus procesos aislados. No modifican variables
de Vercel. Los otros modos de regresión/build del runner lo fuerzan a `false`.
Cambiar variables de entorno de un despliegue requiere desplegarlo de nuevo;
el cambio no publica el plugin en el directorio de OpenAI.

## Qué implica integrar en main

El build configurado en `vercel.json` usa `scripts/vercel-build.mjs`. En
`VERCEL_ENV=production` valida el entorno y ejecuta `prisma migrate deploy`
antes del build. La migración MCP añade `Business.mcpPublicDiscovery` con
default false y siete tablas privadas, con FK, índices y RLS. El flag **no
omite ni reemplaza esa migración**: las consultas Prisma compartidas deben
corresponder al schema desplegado aunque la integración permanezca apagada.

Antes de integrar:

1. Revisar todos los commits/migraciones pendientes contra el main vigente.
   No ejecutar seed ni `db push` sobre producción. El runner de pruebas sí usa
   schemas locales desechables y aplica el SQL MCP real para verificarlo.
2. Mantener `MCP_ENABLED` ausente/false y reservas públicas apagadas en el
   entorno de producción. No copiar variables/secretos del fixture.
3. Revisar el PR y el efecto del despliegue/migración. El trabajo de esta fase
   prepara la rama y pruebas; no cambia producción ni configura Vercel.
4. Tras un merge/despliegue expresamente autorizado, comprobar con la cuenta
   de negocio que Configuración no tiene tarjeta y las rutas MCP/OAuth retornan
   404. Mantener el preview separado habilitado para la revisión de OpenAI.

La integración todavía no se ha fusionado a `main` ni desplegado a producción.
El encendido público y el envío a revisión se autorizan aparte de incorporar el
código oculto.

## Validación local del interruptor

La rama incorpora `origin/main` en `84bdb63`, incluidos los cambios comerciales
y de administración. Se repitieron los controles sobre esa combinación.

- Typecheck y lint correctos; lint mantiene 32 advertencias existentes.
- 32 pruebas MCP/OAuth correctas, incluidas cuatro de apagado/encendido.
- Suite general: 1.335 correctas y 125 omitidas; con PostgreSQL aislado:
  1.356 correctas y 104 omitidas, sin fallos.
- Build de producción correcto con `MCP_ENABLED=false`, en un directorio de
  salida separado del preview habilitado.
- Smoke HTTP del build: 17 combinaciones de ruta/método devuelven 404.
  El login del negocio ficticio funciona y Configuración responde 200 sin
  renderizar la tarjeta; tampoco aparecen las secciones legales MCP.
- Control de encendido con el mismo build: `MCP_ENABLED=true` vuelve a exponer
  metadata, instrucciones y la tarjeta de conexiones en Configuración.

Evidencia sin credenciales: [hidden-rollout-http.json](iteration-2/evidence/hidden-rollout-http.json).
La comprobación HTTP es local; no afirma una inspección visual del navegador ni
verifica las variables o el estado de un despliegue de producción.

La auditoría de dependencias de producción no detecta vulnerabilidades. La
auditoría completa conserva nueve entradas high de herramientas de desarrollo
(`braces` y sus dependientes); se comprobó el mismo resultado con el lockfile
del main `84bdb63`. El workflow `Security checks` ejecuta la auditoría completa,
por lo que este bloqueo heredado debe resolverse antes de considerar el PR con
CI verde. No se han bajado versiones de Next ni relajado el workflow para omitirlo.
