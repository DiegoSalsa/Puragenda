# Runbook de preproducción y lanzamiento de Puragenda Next RC1

Este runbook describe una ejecución controlada. No autoriza desplegar, migrar producción, habilitar cobros ni modificar DNS.

## 0. Criterios de entrada

1. Confirmar que `release/puragenda-next-rc1` sigue en `a3fd2a35480d8152a33550d42e510291a49664a7` y que `main` no cambió por esta operación.
2. Revisar diff y migraciones: sólo se aceptan migraciones ya certificadas; no crear ni ejecutar nuevas en este ciclo.
3. Obtener lectura autenticada de Vercel y GitHub. Registrar proyecto, equipo, rama de producción, Root Directory, Build Command, Ignored Build Step, Deploy Hooks, deployment sources y protecciones de `main`/RC1.
4. Confirmar explícitamente que la integración Git de Vercel no crea Preview para la rama candidata. Un push de documentación de esta auditoría creó el Preview `3N4chkDiibVSaBUURZaFYTMDURnz` y terminó en error; ese comportamiento debe quedar bloqueado o aislado antes de repetir un push.
5. Confirmar backup verificable de la base de staging y un restore ensayado. El responsable de datos debe aprobar cualquier migración.
6. Ejecutar escaneo de secretos, `npm audit --omit=dev`, Prisma validate, TypeScript, ESLint, build aislado y pruebas de despliegue.

## 1. Preparar staging aislado

1. Crear (por el propietario, fuera de este runbook) un proyecto Vercel separado y una base PostgreSQL sintética.
2. Conectar únicamente la rama candidata de preproducción. Root Directory debe ser la raíz del repositorio y el build debe usar `node scripts/vercel-build.mjs`.
3. Configurar `VERCEL_ENV=preview` y `PURAGENDA_RC1_STAGING_BUILD=1`. Nunca copiar credenciales live.
4. Mantener apagados `PURAGENDA_NEXT_ENABLED`, `PURAGENDA_MP_V2_ENABLED`, `PURI_PLUS_*`, `CONTACT_FLOW_*`, `MCP_ENABLED`, proactividad y escrituras de proveedores hasta pasar smoke tests.
5. Desactivar cron, workers y Deploy Hooks en staging salvo que exista una prueba sintética explícita y reversible.

## 2. Smoke tests

Ejecutar con datos sintéticos y registrar SHA, URL, timestamp y resultado:

- login, recuperación y revocación de sesión;
- aislamiento de negocio, sucursal, profesional y cliente;
- editor/autosave/publicación y rollback de borrador;
- dominio primario/secundario y estado de verificación DNS;
- reservas canónicas e idempotencia;
- Puri/Puri+ con ledger y límites sin llamada facturable;
- MCP OAuth, scopes, aprobación y rechazo de escritura;
- Mercado Pago, Resend y Calendar usando mocks o sandbox;
- canonical, sitemap, robots y headers;
- páginas de error y recuperación ante fallo de base.

Guardar logs de aplicación y Vercel sin tokens, cookies ni valores de variables.

## 3. Activación progresiva

Después de un smoke verde, habilitar una capacidad por vez y repetir pruebas:

1. lectura de Puragenda Next;
2. escritura comercial sandbox;
3. Puri estándar;
4. Puri+ interno;
5. MCP para un usuario sintético;
6. Contact Flow en simulación.

Cada paso requiere aprobación del responsable, límite de coste y métrica de rollback. No habilitar cobros, emails, OAuth real o proactividad en esta fase.

## 4. Observabilidad y abortar

Abortar inmediatamente si aparece cualquiera de estas condiciones:

- build que omite el guard versionado, despliega una rama excluida o promueve Preview a producción;
- Vercel remoto no coincide con el proyecto/repositorio esperado;
- variables live en staging, secreto expuesto o `MCP_OPERATION_ENCRYPTION_KEY` en Needs Attention sin resolución;
- migración no aprobada, drift de schema o restore no verificable;
- error sostenido de proveedor, escritura no idempotente, acceso cross-tenant o anomalía de coste;
- cambios de DNS, dominios o producción no planificados.

## 5. Rollback

1. Detener la activación y conservar logs sanitizados.
2. Volver a la última versión de aplicación compatible mediante la función de rollback de Vercel, sin force push.
3. No ejecutar migraciones down ni reset. Las migraciones son forward-only; restaurar base sólo con aprobación de incidente y un backup identificado.
4. Revocar tokens de staging y desactivar flags de la capacidad afectada.
5. Documentar SHA, causa, impacto, decisión y evidencia de recuperación.

## 6. Salida a producción

Sólo después de que Vercel, GitHub, base de datos, proveedores y smoke tests estén certificados: aprobar una ventana, congelar RC1, ejecutar el cambio autorizado y verificar que `main` y la producción observada corresponden al SHA aprobado. Cualquier despliegue inesperado detiene el runbook y requiere revisión humana.
