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

La rama parte de RC1 sin modificarla y conserva la rama original `feature/puri-onboarding-v2`. Los commits de integración son pequeños y en español: protección de despliegue, integración del Setup V2 y corrección de revalidación post-lock. No se hizo push, merge a RC1/main, rebase, squash, cherry-pick ni deploy. La rama queda congelada localmente para revisión independiente.

## Restricciones y pendientes de lanzamiento

Sin push, integración en RC1/main, despliegue ni migración remota. Sin OpenAI facturable, correos reales, pagos, DNS, recursos Cloudinary productivos ni activaciones globales. Los permisos de demostración son exclusivamente locales.

Permanecen fuera de esta fase: retención 07-20/08-F09 y responsables/plazos/procedimientos aprobados, continuidad contractual de marketing legacy, certificación de proveedores reales, presupuestos IA legacy y mantenimiento de los 23 avisos de desarrollo. No se implementa una purga ni se reabre marketing.
