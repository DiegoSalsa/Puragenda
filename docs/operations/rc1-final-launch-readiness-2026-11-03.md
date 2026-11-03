# Puragenda Next — cierre de preproducción y bloqueantes finales

**Fecha:** 2026-11-03  
**Base:** `release/puragenda-next-rc1` / `a3fd2a35480d8152a33550d42e510291a49664a7`  
**Rama de corrección:** `fix/puragenda-next-final-launch-blockers`  
**Clasificación actual:** **GO CON CONDICIONES — faltan controles externos para autorizar el lanzamiento**

## A. Build corregido

La causa raíz quedó reproducida: `.vercelignore` excluye `tests/`, mientras el `tsconfig.json` general incluye `**/*.ts`. Al simular la ausencia de `tests/`, el type-check falló exactamente en los cinco imports de fixtures que aparecieron en Vercel. Con `tests/` presente, el mismo type-check pasó.

La corrección separa el type-check de producción en `tsconfig.build.json` (`src/**`, `next.config.ts` y tipos generados de Next) y mantiene el `tsconfig.json` completo para QA. `next.config.ts` usa `typescript.tsconfigPath` con `ignoreBuildErrors: false`; no se desactivó TypeScript ni se copiaron fixtures al runtime.

Controles aprobados:

- `npx tsc -p tsconfig.build.json --noEmit`: aprobado.
- `npm run typecheck` (QA completa): aprobado.
- Build aislado con PostgreSQL 17 local desechable, `VERCEL_ENV=preview` y proveedores externos bloqueados: **aprobado**, incluyendo TypeScript y 164 páginas estáticas.
- Prisma validate: aprobado.
- ESLint: 0 errores, 32 advertencias existentes.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades productivas.

## B. Infraestructura y despliegues

El proyecto autenticado observado es `purocode-projects/puragenda`. Producción continúa en `main` con `e74c92237e47db43425a7d47209520967e51bfb0` y estado Ready. Project Settings → Git indica que no existen Deploy Hooks. Build and Deployment muestra raíz vacía, Node 24.x, Ignored Build Step automático y fuentes Git/deployment heredadas del equipo.

Los Previews históricos `GMx6UpcdjLCqUwLFRxt3ibuqy56A`, `dpl_3N4chkDiibVSaBUURZaFYTMDURnz` y `dpl_HcXve2Tnze5uCf7fM6KHhx6ui4sR` fallaron o fueron creados automáticamente por la integración GitHub/Vercel. La política versionada ahora usa `git.deploymentEnabled` con `**: false` y `main: true`, además de conservar las exclusiones explícitas históricas. Esto permite sólo `main` en el proyecto productivo; staging debe ser un proyecto separado y desplegarse bajo autorización.

La política debe verificarse tras publicar esta rama. Si GitHub informa un nuevo deployment para la rama de corrección, se detiene el proceso y no se hace ningún push adicional.

GitHub muestra cero rulesets y no lista protecciones clásicas existentes. El conector de lectura no permite certificar ni modificar las protecciones clásicas. Esta es una dependencia externa pendiente.

## C. Certificación de integraciones

| Área | Estado | Evidencia | Bloqueante |
|---|---|---|---|
| Vercel | CERTIFICADO CON OBSERVACIONES | Proyecto, producción, build settings y Deploy Hooks leídos; política versionada corregida | Verificación posterior al push; alertas de variables enmascaradas |
| PostgreSQL | CERTIFICADO LOCAL | Migraciones y build en base loopback sintética; backup/restore local 142/142 tablas | Falta base remota de staging |
| GitHub | CERTIFICADO CON OBSERVACIONES | Actions versionado y tests 47/47; cero rulesets visibles | Protecciones clásicas no verificadas |
| Registro y checkout | CERTIFICADO EN SIMULACIÓN | Registro HTTP, catálogo, planes CLP, trial, checkout sellado | Sin cuentas live |
| Mercado Pago | SIMULADO | Flags productivos apagados; billing HTTP no crea operaciones | Sandbox remoto no conectado |
| Resend | BLOQUEADO PARA EXTERNO | Mocks y delivery simulation; cero correos reales | Cuenta/dominio de staging no autorizados |
| Google Calendar | NO VERIFICADO | No se conectó OAuth de prueba | Cuenta sintética pendiente |
| Puri/OpenAI | CERTIFICADO CON OBSERVACIONES | Puri/Puri+ HTTP, ledger y cuotas locales; 0 llamadas facturables | Claves y cuotas remotas no verificadas |
| MCP | CERTIFICADO CON OBSERVACIONES | Flags apagados y controles locales | `MCP_OPERATION_ENCRYPTION_KEY` aparece Needs Attention en Vercel; valor no leído |
| Contact Flow | CERTIFICADO EN SIMULACIÓN | Consentimiento, supresión, cuotas, worker e idempotencia HTTP | Proveedor real apagado |
| Onboarding | CERTIFICADO CON OBSERVACIONES | Registro y recorridos integrados locales | Staging remoto no creado |
| Sitios web | CERTIFICADO EN SIMULACIÓN | Publicación, expiración, recuperación, medios y aislamiento HTTP | Sin dominios reales |
| Seguridad | CERTIFICADO CON OBSERVACIONES | RLS/aislamiento, escaneo de secretos, build guard y audit productivo | Protecciones remotas y proveedores pendientes |

Staging remoto no se creó: requiere proyecto Vercel separado, PostgreSQL independiente, dominio temporal, secretos nuevos y autorización de recursos externos. La preparación local quedó probada y no usa datos productivos.

## D. Plan de lanzamiento

1. El propietario confirma protecciones clásicas de `main` y RC1, política Git de Vercel y ausencia de deployments para ramas de trabajo.
2. Se crea el proyecto Vercel de staging y PostgreSQL aislado, sin copiar secretos productivos.
3. Se ejecutan migraciones forward-only, diff de schema, backup y restore en staging.
4. Se configura `VERCEL_ENV=preview`, `PURAGENDA_RC1_STAGING_BUILD=1` y todos los flags peligrosos apagados.
5. Se ejecutan smoke tests de registro, agenda, reservas, editor, sitios, Puri, MCP, Contact Flow y permisos.
6. Se habilita una capacidad por vez, siempre en sandbox o simulación, con límite de coste y rollback probado.
7. Se verifican logs, cuotas, cron, workers, proveedores y dominios antes de solicitar autorización de lanzamiento.
8. Producción sólo se toca con autorización explícita, ventana definida, backup confirmado y rollback compatible con el schema.

Abortar ante cualquier deployment de una rama no autorizada, drift de schema, secreto live en staging, escritura cross-tenant, fallo de proveedor, anomalía de coste o cambio de producción/DNS.

## Veredicto

El código queda técnicamente preparado y el build es reproducible en un entorno local aislado. El lanzamiento todavía no está autorizado: faltan staging remoto, protecciones clásicas de GitHub y certificación de proveedores externos. No se ejecutaron migraciones remotas, pagos reales, correos reales, cambios DNS ni operaciones sobre producción.
