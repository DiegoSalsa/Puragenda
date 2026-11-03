# Auditoría de infraestructura Vercel de RC1

**Fecha:** 2026-11-03  
**Repositorio:** `DiegoSalsa/Puragenda`  
**Proyecto Vercel:** `puragenda` / equipo `purocode-projects`  
**SHA RC1 revisado:** `a3fd2a35480d8152a33550d42e510291a49664a7`  
**Resultado:** **NO-GO — existe un fallo de build y faltan garantías remotas de GitHub**

## Evidencia observada en Vercel

El panel autenticado identificó el proyecto correcto y mostró la producción en `main`, con el despliegue `e74c92237e47db43425a7d47209520967e51bfb0` en estado **Ready**. Los dominios visibles fueron `www.puragenda.cl`, `puragenda.vercel.app` y el dominio de despliegue de esa versión.

El despliegue `GMx6UpcdjLCqUwLFRxt3ibuqy56A` corresponde a:

- rama `integration/puragenda-next-onboarding-rc1-final`;
- SHA `a3fd2a3`;
- entorno **Preview**;
- estado **Error**;
- comando fallido: `node scripts/vercel-build.mjs`;
- duración aproximada: 1 min 49 s.

Los registros de build muestran compilación Next.js correcta y fallo posterior de TypeScript por módulos de fixtures ausentes:

```text
scripts/audit08-marketing-browser-qa.ts -> ../tests/fixtures/puri-growth
scripts/puri-plus-browser-qa.ts        -> ../tests/fixtures/puri-growth
scripts/puri-plus-browser-qa.ts        -> ../tests/fixtures/contact-flow
scripts/seed-next-staging.ts           -> ../tests/fixtures/contact-flow
scripts/seed-next-staging.ts           -> ../tests/fixtures/puri-growth
```

No se observó un despliegue de producción asociado a ese registro. Esta evidencia no sustituye una revisión de logs de runtime, facturación o tráfico del proyecto.

## Configuración remota visible

En **Project Settings → Git**:

- el repositorio conectado es `DiegoSalsa/Puragenda`;
- la sección **Deploy Hooks** indica explícitamente que el proyecto no tiene Deploy Hooks;
- los controles de comentarios/status de Git están presentes, pero la cuenta de lectura no permite modificar la configuración.

En **Project Settings → Build and Deployment**:

- framework detectado: Next.js;
- Root Directory vacío (raíz del repositorio);
- Build Command override desactivado y sin valor visible en el campo editable;
- Ignored Build Step: `Automatic`;
- Node.js: `24.x`;
- Git Sources y Deployment Sources: `Inherit from Team`;
- no se modificó ningún ajuste.

En **Project Environment Variables** se ven nombres enmascarados, sin leer ni revelar valores. Entre ellos están `MCP_ENABLED`, `MCP_ORIGIN`, `MCP_OPERATION_ENCRYPTION_KEY` (marcada **Needs Attention**), `MCP_PUBLIC_BOOKING_ENABLED`, `OPENAI_API_KEY`, `PURI_MODEL`, `WEBSITE_LAUNCH_ENABLED` y variables de privacidad. La presencia de una variable no demuestra que su valor habilite una función; el propietario debe revisar los valores y sus entornos antes de preproducción.

## Controles versionados contrastados

En RC1 se revisaron `vercel.json`, `scripts/vercel-build.mjs` y `.github/workflows/security.yml`.

- `vercel.json` fija `node scripts/vercel-build.mjs`, mantiene exclusiones de ramas de auditoría y de RC1, y no declara Deploy Hooks.
- `scripts/vercel-build.mjs` bloquea ramas de auditoría y RC1 salvo el modo de staging explícito; las migraciones sólo se intentan en producción.
- `security.yml` limita sus eventos de push/pull request a `main`; no habilita un despliegue ni invoca la API de Vercel.
- Las pruebas de seguridad de despliegue y roles de migración pasaron **47/47**.

La comprobación de código no encuentra un workflow, script o URL versionada que invoque Deploy Hooks o la API de despliegue al publicar la rama de preproducción. Se mantiene como condición de revisión del propietario comprobar integraciones externas del equipo Vercel/GitHub que no estén versionadas.

## Resultado posterior al push de esta rama

El push de `release/puragenda-next-preproduction-readiness` activó la integración GitHub/Vercel automáticamente y creó un segundo despliegue **Preview**, `3N4chkDiibVSaBUURZaFYTMDURnz` (deployment id `dpl_3N4chkDiibVSaBUURZaFYTMDURnz`). GitHub informó primero `Vercel is deploying your app` y después `Deployment has failed`; no fue un Deploy Hook invocado por este trabajo. El estado de producción no cambió según la evidencia disponible.

Este hecho demuestra que una exclusión en el repositorio no basta para impedir la creación de Previews si la configuración Git de Vercel sigue heredándose del equipo. Antes de volver a publicar una rama de revisión se debe configurar o confirmar una exclusión remota equivalente, o usar un proyecto Vercel separado.

## GitHub

La página autenticada de GitHub muestra **cero rulesets** para `DiegoSalsa/Puragenda`. La página de protecciones clásicas no lista reglas existentes y sólo ofrece crear una nueva; la API del conector no tiene permisos de administración para certificar detalles de protección clásica. Por ello, la protección de `main` y RC1 contra push directo, force push y merge no queda certificada por este acceso.

## Decisión

La publicación de un artefacto de revisión puede continuar sólo como rama aislada cuando el build corregido esté disponible. El lanzamiento de preproducción queda bloqueado hasta:

1. corregir o excluir de forma explícita los cinco scripts de QA que rompen el type-check de Vercel;
2. repetir el build en un proyecto de staging con base de datos aislada;
3. obtener confirmación de protecciones GitHub para `main` y RC1;
4. revisar los valores de variables de producción y la alerta de `MCP_OPERATION_ENCRYPTION_KEY` sin exponer secretos;
5. confirmar backup/restore y límites de plan antes de cualquier tráfico real.

No se ejecutaron Deploy Hooks, redeploys, migraciones remotas, cambios de dominios ni cambios de producción.
