# Fase 09-A — Integración del onboarding V2

Rama exclusiva `integration/puragenda-next-onboarding-v2`. Base RC1 comprobada: `7f1971c3058fa61d449c5791d87cc314edfc201a`. Original limpio en `feature/puri-onboarding-v2`, SHA `803447bbe7afdb12d92fd3dbbd8512c189b772ac`; ancestro común `f19553368d8317f66ac9b11fd2306bbc1839fba1`. Sus cambios exclusivos son `14a4b19a5a1bd331206a4b40f31cb8f64673ff78` y `803447bbe7afdb12d92fd3dbbd8512c189b772ac`.

## Comparación previa y decisiones de traslado

El original modifica 55 archivos. Conserva rutas Setup y learning, tres entidades persistentes, comandos con revisión e idempotencia, catálogo de guías, conversación Puri, selectores de módulos canónicos, pruebas PostgreSQL y Playwright y documentación. Se adapta ese desarrollo, sin una segunda implementación ni merge de la rama antigua.

Cinco archivos solapan con cambios posteriores de RC1: API de Puri, asistente de Puri, ayuda contextual, orquestador y tipos de Puri. Se preservan las revalidaciones, lectura limitada del body, errores, telemetría, respuestas verificables y ledger actuales. La extensión Setup agrega propuestas editables sin conceder escrituras al modelo.

Contratos semánticos a adaptar: autorización efectiva de `mutateSetup` y `saveLearning` dentro de la transacción; sesión/versiones y pertenencia tras esperar bloqueos; transporte Setup sin bifurcación legacy; runtime único de Driver.js; disponibilidad canónica y progreso invalidado por entidades archivadas; runner local sin entorno ambiental ni escape a proveedores. La nueva migración se revisa contra RC1 y no modifica las históricas.

La defensa del icono al desmontarse y su prueba de integridad se conservan porque protegen el cierre de Puri. La diferencia de nivel de encabezado en AGENTS.md no es una funcionalidad del onboarding; se conserva inicialmente la versión de RC1.

## Adaptaciones y correcciones aplicadas

- Se trasladaron los dos commits originales con aplicación de tres vías, sin merge de la rama antigua. Los conflictos se limitaron a la ruta de Puri, el asistente y la ayuda contextual; se conservaron el runtime único de overlays de RC1, la sesión persistente, los controles de overlay y el orquestador auditado.
- `mutateSetup` vuelve a leer sesión/token, negocio, permisos y entitlement dentro de la transacción después de adquirir el lock de negocio. Una revocación durante la espera no escribe ni cambia el progreso.
- `saveLearning` vuelve a leer sesión, permisos, entitlement y catálogo de tutoriales después del advisory lock. Una guía que deja de estar autorizada se rechaza antes del upsert.
- Puri Setup implementa `authorize` y usa siempre `withCommercialPuriUsage`: las llamadas reales pasan por el transporte y ledger existentes, con reserva, límite de contexto, `maxRetries: 0`, settlement desconocido en timeout y revalidación de sesión antes del proveedor. El modo determinista no llama OpenAI y las propuestas nunca escriben.
- La migración `20261031200000_puri_setup_learning_v2` se conserva como única migración nueva de esta fase. Sus tres tablas tienen claves, índices, checks, RLS habilitado y revocación a `PUBLIC`, `anon` y `authenticated`.
- La rama de integración se añadió a `vercel.json`, `scripts/vercel-build.mjs`, ambos guards de Actions y la prueba de protección. RC1, main y el onboarding original no se modifican.

## Certificación reproducible

La base desechable PostgreSQL 17 pertenece al worktree, escucha sólo en `127.0.0.1:55449` y usa `puragenda_commercial_test_onboarding`. `onboarding-local.mjs --reset --prepare` aplicó la migración y creó cuentas sintéticas; `--iteration2 --test` repitió la preparación y ejecutó **17/17** pruebas. La suite específica final alcanzó **19/19**: las cuatro revocaciones después del lock (sesión, pertenencia, propietario y suscripción), una revocación de learning tras advisory lock, dos pestañas concurrentes, idempotencia, borradores, límites, sucursales, disponibilidad real, RLS, CSRF y aislamiento.

| Ejecución nueva | Resultado |
| --- | --- |
| Vitest general de RC1 | **1.986 aprobadas**, 833 omitidas condicionales en esta invocación, 0 fallidas |
| PostgreSQL comercial transversal | **609 aprobadas**, 21 suites |
| Agenda y reservas | **97 aprobadas** |
| MCP/OAuth | **58 aprobadas** |
| Compatibilidad legacy | **85 aprobadas** |
| Onboarding/Puri Setup PostgreSQL | **19 aprobadas** en la ejecución final; la primera matriz de cuatro archivos tuvo 43 aprobadas antes de las pruebas de lock |
| Protecciones de despliegue | **38 aprobadas** |
| Chrome/Playwright real | **10 escenarios**, 14 capturas, escritorio/móvil, 0 errores de página y 0 overflow |
| Prisma generate/validate, Next typegen y TypeScript | Aprobados |
| ESLint | 0 errores, 32 advertencias preexistentes |
| Build aislado webpack | Aprobado; 162 páginas estáticas |

El recorrido de navegador cubrió registro básico y Plus, propuesta determinista, horarios, tres servicios, agenda pública reservable, finalización, persistencia tras logout/otro dispositivo, Puri sin transporte, diagnóstico sin disponibilidad, negocio existente, profesional limitado, tutoriales, coordinación de overlays y móvil 390×844. El navegador se ejecutó con `node --import tsx`; un intento previo sin ese loader falló en la preparación y no se cuenta como prueba de producto.

Los 833 casos condicionales omitidos por la invocación general se cubrieron en las suites PostgreSQL/agenda/MCP/legacy indicadas; las repeticiones se mantienen separadas. No se ejecutaron proveedores reales, OpenAI facturable, pagos, DNS, Cloudinary, migraciones remotas ni despliegues.

## Dependencias, secretos y migraciones

`npm audit --omit=dev` reportó **0** vulnerabilidades. La auditoría completa mantiene **23 avisos de desarrollo** (21 moderados, 2 bajos), 30 nodos afectados instalados y todos con `dev: true`; no se actualizaron dependencias ni lockfile. El escaneo de secretos sobre los 12 commits de la rama y líneas nuevas terminó con 0 hallazgos. No hay temporales, `.env` locales ni credenciales versionadas.

La migración se aplicó y se repitió sólo en PostgreSQL loopback. La prueba de RLS confirmó las tres tablas nuevas aisladas. No se modificaron migraciones históricas, Supabase remoto, Neon ni ninguna base productiva.

## Entrega local y riesgos

La demo local queda preparada en `http://127.0.0.1:3116/login` con cuentas sintéticas documentadas en `onboarding-v2.md`; la contraseña se suministra fuera del repositorio mediante `ONBOARDING_DEMO_PASSWORD`. OpenAI está ausente y el correo es simulado. El servidor se dejará activo sólo después de una comprobación HTTP 200 final; si el proceso se detiene, esta URL no se considera disponible.

Persisten fuera de esta fase: retención 07-20/08-F09, continuidad contractual de marketing legacy, certificación de Resend/Mercado Pago/Vercel, presupuestos IA legacy y las 23 advertencias de desarrollo. La integración no habilita Puri+, MCP, Contact Flow, workers, marketing legacy ni onboarding en producción.

## Commits y estado de la rama

La rama parte de RC1 sin modificarla y conserva la rama original `feature/puri-onboarding-v2`. Los commits de integración limpia son pequeños y en español: protección de despliegue, integración del Setup V2 y correcciones de autorización/activación. No se hace merge a RC1/main, rebase, squash, cherry-pick ni deploy. La rama queda congelada para revisión independiente.

## Restricciones y pendientes de lanzamiento

Sin push, integración en RC1/main, despliegue ni migración remota. Sin OpenAI facturable, correos reales, pagos, DNS, recursos Cloudinary productivos ni activaciones globales. Los permisos de demostración son exclusivamente locales.

Permanecen fuera de esta fase: retención 07-20/08-F09 y responsables/plazos/procedimientos aprobados, continuidad contractual de marketing legacy, certificación de proveedores reales, presupuestos IA legacy y mantenimiento de los 23 avisos de desarrollo. No se implementa una purga ni se reabre marketing.

## Cierre correctivo 09A-C1/C2 y rama limpia

La rama `integration/puragenda-next-onboarding-v2-clean` se creó directamente desde RC1 (`7f1971c3058fa61d449c5791d87cc314edfc201a`). Se aplicó el diff del estado final de la integración publicada sin importar sus cinco commits como ancestros. Por ello, los commits nuevos de esta rama no contienen la contraseña sintética histórica. La rama publicada anterior se conserva congelada; sus objetos históricos pueden seguir accesibles en GitHub y no se afirma que esta rama los purgue.

Se corrigió 09A-C1: una operación Setup ya confirmada vuelve a adquirir el lock de negocio y revalida sesión/token, pertenencia, permisos y entitlement antes de devolver el snapshot de replay. Una key con payload distinto conserva el conflicto 409. La prueba PostgreSQL reproduce una ejecución, revoca el token y rechaza el replay sin exponer el snapshot obsoleto.

Se corrigió 09A-C2: un negocio nuevo sólo pasa a `unshared`, `no_bookings` o `first_booking` después de evidencia de disponibilidad vigente. Configuración estructural válida sin Check, slots bloqueados, verificación caducada o pérdida de horarios queda `incomplete`. Un negocio existente sin `BusinessSetup` se reconoce como `habitual` y no se obliga a rehacer onboarding. No se modifica el motor público de disponibilidad ni se ejecutan comprobaciones externas adicionales al abrir Hoy.

La rotación de cuentas sintéticas se realizó únicamente en PostgreSQL loopback de demostración, actualizando hashes y `tokenVersion` sin borrar avances. La contraseña no se escribe en este informe, scripts, migración ni commits; la preparación de demo continúa exigiendo `ONBOARDING_DEMO_PASSWORD` fuera del repositorio. Las sesiones anteriores quedan invalidadas por el incremento de versión.

## Corrección 09A-C3 — progreso de tutoriales por autorización específica

La causa raíz era que `learningContext` filtraba el catálogo con permisos/capacidades del tutorial, pero `saveLearning` exigía además `canManageSetup`. Esa condición mezclaba autorización para modificar Setup con autorización para guardar el progreso de una guía independiente. Se eliminó sólo esa condición; Setup/Puri conserva `canManageSetup`, mientras que `saveLearning` exige la entrada actual de `allowedTutorials`, entitlement, pertenencia, sesión/token y revisión.

La revalidación permanece dentro de la transacción después del advisory lock. Se comprueban usuario activo y token, negocio y pertenencia, permisos efectivos, suscripción/capacidades y la guía/versiones permitidas. Una guía revocada, un negocio ajeno o una sesión vencida no puede crear ni actualizar progreso. No se modifican precios, catálogo comercial ni el motor de reservas.

La nueva matriz C3 incluye propietario, administrador con `appointments.view_all`, profesional parcial autorizado para `today`, profesional sin autorización para `staff`, revocación de pertenencia durante el lock, revocación de sesión, progreso concurrente/versionado, pausa/reanudación/reinicio y aislamiento entre negocios. La prueba de interfaz en móvil inicia `Preparar tu día` para el profesional parcial y confirma que `staff` no aparece; no hubo errores de página.

Ejecuciones nuevas de esta corrección: **30/30** pruebas PostgreSQL/Puri Setup, **38/38** protecciones, TypeScript, Prisma y ESLint aprobados, build aislado aprobado, y una prueba Playwright focalizada de permisos con `apiAuthorizedToday=true`, `apiDeniedStaff=true`, `uiStartedToday=true`, `pageErrors=0`. El recorrido completo Playwright de C1/C2 se conserva como evidencia previa de esta misma rama limpia y no se cuenta nuevamente. Proveedores reales, OpenAI facturable, pagos y migraciones remotas siguen omitidos.

Se intentó preparar una base PostgreSQL C3 independiente en un segundo cluster loopback. La aplicación de una migración histórica (`20261022180000_commercial_migration_web_plus`) falló durante esa preparación; el cluster se detuvo y no se usó ninguna base remota. Las demos 3116/3117 se conservaron y la demo C3 queda en 3118 sobre la base local ya certificada, con esta limitación documentada.

## Clasificación

**APTO CON OBSERVACIONES.** C3 está corregido y sus pruebas críticas pasan, C1/C2 permanecen cubiertos, y la rama está protegida. La certificación integral queda condicionada a resolver la aplicación limpia de la migración histórica en un cluster nuevo y a ejecutar las suites transversales completas y proveedores reales; no se autoriza integrar RC1 por este cierre.

La comparación de estado frente a RC1 conserva 60 archivos y una sola migración nueva (`20261031200000_puri_setup_learning_v2`). La historia nueva no contiene los cinco commits de la rama publicada anterior ni la contraseña sintética. Las nuevas pruebas de esta rama son 29/29 en PostgreSQL/Puri Setup, 38/38 protecciones, TypeScript aprobado y 10 escenarios Playwright con 0 errores de página en el servidor limpio. Los resultados transversales de las ocho auditorías se conservan como evidencia previa y no se presentan como nuevas ejecuciones de este cierre.

La demo del servidor limpio responde en `http://127.0.0.1:3117/login`; el servidor anterior se conserva aparte en `http://127.0.0.1:3116/login`. Ninguna contraseña aparece en este informe, documentación ni historia nueva.

## Certificación definitiva de migraciones — 2026-11-02

### Causa raíz reproducida

La preparación histórica se reprodujo en un clúster PostgreSQL 17 estándar, vacío y sin los roles de Supabase. `prisma migrate deploy` abrió correctamente las migraciones `00000000000000_legacy`, `20261021120000_commercial_infrastructure_v2` y `20261022120000_commercial_billing_sandbox`, pero falló al ejecutar la línea 145 de `20261022180000_commercial_migration_web_plus`:

```sql
REVOKE ALL ON "CommercialMigrationProposal","CommercialWebsiteTransition","CommercialMigrationEvidence" FROM PUBLIC, anon, authenticated;
```

El error exacto fue `SQLSTATE 42704: role "anon" does not exist`. La sentencia está dentro de la transacción de la migración: PostgreSQL revierte sus tablas, índices, claves, trigger, RLS y revocación, y `_prisma_migrations` conserva una fila de esa migración con `finished_at` nulo. La consulta posterior mostró 108 tablas públicas del bootstrap y ausencia de `CommercialMigrationProposal`; no quedó un esquema parcial aplicable. La reproducción fue sistemática.

Al aislar el siguiente paso del historial también apareció la misma causa en la línea 306 de `20261022210000_puri_plus_growth`. Las migraciones anteriores ya utilizaban bloques `IF EXISTS`; no se encontraron otras sentencias comerciales sin guardia en el tramo que certifica el runner.

### Corrección compatible

No se modificaron los SQL históricos ni sus checksums. `scripts/commercial-migrations.mjs` detecta si faltan `anon` o `authenticated`. En ese caso despliega el prefijo anterior con Prisma, ejecuta una copia transaccional de sólo esas dos migraciones con `REVOKE ... FROM PUBLIC` y bloques `IF EXISTS` para cada rol, verifica el esquema mediante `migrate diff`, y registra cada migración con `prisma migrate resolve --applied` después de que su efecto real haya sido aplicado. No crea roles ficticios, no actualiza `_prisma_migrations` manualmente, no usa `db push`, reset ni down migrations. Con ambos roles presentes usa el SQL histórico sin adaptación; con una instalación existente que ya registró las migraciones conserva exactamente los checksums originales.

Las migraciones 03 (`20261029180000_preserve_service_staff_history`) y 04 (`20261030120000_client_portal_privacy`) permanecen byte a byte intactas. No se añadieron directorios de migración; el inventario conserva 101 migraciones versionadas y la única adaptación está en el runner.

### Escenarios de certificación

| Escenario | Resultado |
| --- | --- |
| PostgreSQL 17 nuevo sin roles, clúster loopback 55453 | **17/17 migraciones, schemaMatches=true, sin drift** |
| Repetición PostgreSQL 17 nuevo sin roles, clúster loopback 55454 | **17/17 migraciones, schemaMatches=true, sin drift** |
| PostgreSQL 17 nuevo con `anon` y `authenticated`, clúster loopback 55453 | **17/17 migraciones, RLS activo y acceso público revocado** |
| Reejecución de cada base certificada | **Idempotente, sin cambios de historial ni datos** |
| Actualización legacy con datos sintéticos | **Conservados 1 negocio, 1 usuario, 1 profesional, 1 servicio, 1 cliente, 1 reserva, 1 suscripción y 1 WebsiteAddon; schemaMatches=true** |
| `prisma migrate status` y `migrate diff` | **Base nueva al día; `This is an empty migration`** |

Las bases fueron locales, desechables y sin credenciales productivas. La actualización legacy se ejecutó mediante `db:commercial:legacy`; no reconstruyó el esquema ni borró filas.

### Regresión nueva de esta certificación

- PostgreSQL comercial transversal: **609/609** en 21 suites.
- Onboarding C1/C2/C3 sobre la base recién migrada: **30/30** (incluye Puri Setup).
- Protecciones de despliegue: **44/44**; guardas de roles del runner: **2/2**.
- Playwright real en `http://127.0.0.1:3119`: **10/10 recorridos**, 0 errores de página y 0 overflow; artefactos en `scratch/migration-certification/browser`.
- Suites no integradas (registro, checkout, agenda, servicios, clientes, web, Puri, MCP, Contact Flow, legacy y seguridad): **1.989 aprobadas, 175 omitidas condicionales, 0 fallidas**.
- TypeScript, Prisma generate/validate, build webpack aislado (164 páginas), escaneo de secretos y `npm audit --omit=dev`: **aprobados**.
- ESLint: **0 errores y 32 advertencias preexistentes**.

Una invocación mixta de todas las suites en paralelo no se considera certificación: tuvo 126 fallos de arnés por no propagar `CONTACT_FLOW_TOKEN_SECRET` y por compartir una base con fixtures concurrentes. Las suites PostgreSQL se repitieron de forma separada con el entorno correcto y son los resultados que figuran arriba.

### Dependencias y seguridad

`npm audit --omit=dev` mantiene **0 vulnerabilidades productivas**. La auditoría completa conserva **23 avisos exclusivamente de desarrollo** (21 moderados y 2 bajos): ESLint/eslint-config-next, TypeScript ESLint, Vitest, shadcn/ts-morph, minimatch, deepmerge y sus transitivas. No son alcanzables desde el runtime productivo; no se ejecutó `npm audit fix`, `--force` ni actualización masiva. El escaneo de los 19 commits de la rama terminó con 0 hallazgos y no se añadieron secretos, credenciales, datos reales ni temporales al diff; los archivos `scratch` ya versionados en la base no fueron modificados.

### Estado de integración

El SHA base confirmado es `fc2ffad6819eacb9ed9dfedae437f7a6a4f706a9`, en la rama exclusiva `fix/puragenda-next-onboarding-migration-certification`. RC1 (`7f1971c3058fa61d449c5791d87cc314edfc201a`), main (`e74c92237e47db43425a7d47209520967e51bfb0`), la rama C3 y las ramas históricas permanecen sin cambios. La nueva rama está excluida en `vercel.json`, `scripts/vercel-build.mjs` y ambos guards de `.github/workflows/security.yml`; no ejecuta migraciones ni despliegues automáticos. No se consultó Vercel directamente. No se hicieron despliegues, migraciones remotas, llamadas facturables, pagos, DNS, Cloudinary ni proveedores reales.

La demostración certificada se mantiene activa en `http://127.0.0.1:3119/login` y devuelve HTTP 200; usa la base recién migrada `puragenda_commercial_test_onboarding` del clúster loopback 55452 y la contraseña externa `ONBOARDING_DEMO_PASSWORD`. Las demos 3116, 3117 y 3118 permanecen intactas.

### Clasificación definitiva

**APTA PARA RC1, sin autorización de despliegue productivo.** La instalación limpia es reproducible con y sin roles Supabase, la actualización legacy conserva datos e historial, no hay drift, C1/C2/C3 siguen aprobados y las regresiones nuevas no muestran fallos críticos. La integración a RC1 sigue siendo una operación separada y no se ejecutó en esta rama.

Persisten como riesgos operativos: revisión independiente del diff del runner, validación de configuración remota de Vercel antes de cualquier despliegue, certificación posterior de proveedores reales y mantenimiento de los 23 avisos de desarrollo. Ninguno bloquea técnicamente integrar esta rama a RC1; ninguno autoriza publicar a producción.
