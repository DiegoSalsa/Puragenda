# Matriz de certificación de preproducción RC1

**Fecha:** 2026-11-03  
**Base:** `release/puragenda-next-rc1` en `a3fd2a35480d8152a33550d42e510291a49664a7`  
**Criterio:** sólo se marca aprobado lo ejecutado en este entorno o demostrado por evidencia reproducible.

| Área | Estado | Evidencia y límite |
|---|---|---|
| Vercel build/deployment | **BLOQUEADO** | Preview `GMx6UpcdjLCqUwLFRxt3ibuqy56A` falla en TypeScript por cinco fixtures ausentes. |
| Vercel producción | **CERTIFICADO CON OBSERVACIONES** | El panel muestra `main`/`e74c922` Ready y producción separada del Preview fallido; no se auditaron facturación ni logs de runtime. |
| Deploy Hooks | **CERTIFICADO** | Project Settings → Git indica que no existen hooks. |
| GitHub rulesets | **CERTIFICADO CON OBSERVACIONES** | La página autenticada indica cero rulesets. Protecciones clásicas no certificables con el permiso disponible. |
| Controles versionados de despliegue | **CERTIFICADO** | `rc1-deployment-safety` y `commercial-migration-roles`: 47/47. |
| Prisma/schema | **CERTIFICADO** | `prisma validate` pasó con `prisma/schema.prisma`. |
| Build local | **BLOQUEADO** | Tras generar Prisma Client, compila TypeScript pero falla al recopilar `/barberias/[city]` por acceso denegado a la base de datos local ausente. |
| Dependencias productivas | **CERTIFICADO** | `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades. Persisten 23 avisos de desarrollo (21 moderados, 2 bajos). |
| PostgreSQL remoto/backup/restore | **NO VERIFICADO** | No se accedió a una base de preproducción ni se ejecutó migración remota. |
| Mercado Pago | **CERTIFICADO CON OBSERVACIONES** | La aplicación mantiene flags sandbox/off; no se usaron cuentas live ni pagos reales en esta certificación. |
| Resend | **NO VERIFICADO** | No hay cuenta de proveedor aislada conectada. El build local informa `RESEND_API_KEY` ausente y usa mocks. |
| Google Calendar | **NO VERIFICADO** | No se conectó una cuenta OAuth sintética en preproducción. |
| OpenAI/Puri | **CERTIFICADO CON OBSERVACIONES** | No se realizaron llamadas facturables; las claves visibles en Vercel están enmascaradas y sus valores no se certifican. |
| Contact Flow | **CERTIFICADO CON OBSERVACIONES** | Flags de laboratorio/simulación permanecen apagados por defecto; proveedor real no verificado. |
| MCP | **CERTIFICADO CON OBSERVACIONES** | Controles locales y flags por defecto están apagados; Vercel contiene variables MCP enmascaradas, incluida una en Needs Attention. |
| Onboarding V2 | **CERTIFICADO CON OBSERVACIONES** | La rama independiente y sus evidencias históricas se preservan; no se desplegó un entorno remoto nuevo. |
| Seguridad/secretos | **CERTIFICADO CON OBSERVACIONES** | No se añadieron secretos ni temporales; no se leen valores de Vercel. Falta certificar protecciones clásicas y rotación/alertas. |

## Estrategia de staging aprobable

Usar un proyecto Vercel separado y una base PostgreSQL dedicada a staging. El proyecto `puragenda` observado está vinculado a producción y contiene variables de producción; no debe reutilizarse como staging sin una revisión explícita de entornos y accesos. La base debe ser sintética, con backup y restore probados, y sin credenciales de Mercado Pago, Resend, Google u OpenAI live.

El build de staging debe ejecutarse únicamente con `VERCEL_ENV=preview` y `PURAGENDA_RC1_STAGING_BUILD=1`, usando el comando versionado. No se deben habilitar flags comerciales, Contact Flow, MCP global, proactividad ni cron sobre datos reales.

## Variables y costes

La matriz de variables debe registrar nombre, entorno, propietario, fecha de rotación y valor booleano efectivo sin guardar secretos en el repositorio. Debe incluir `PURAGENDA_NEXT_ENABLED`, `PURAGENDA_MP_V2_ENABLED`, `CONTACT_FLOW_*`, `MCP_ENABLED`, `PURI_PLUS_*`, `WEBSITE_*` y las credenciales de proveedores.

La evidencia histórica del proyecto indica plan Hobby. Antes de habilitar cron, observabilidad, tráfico comercial o más concurrencia se debe confirmar el plan y sus límites actuales en Vercel, proveedores y base de datos. No se hizo ningún cambio de plan.

## Veredicto

**NO-GO para preproducción pública y lanzamiento.** La corrección del build y una certificación remota aislada son requisitos de salida. Las pruebas locales aprobadas no convierten en aprobado el despliegue Preview fallido.
