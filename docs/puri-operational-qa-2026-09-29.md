# QA operativo de Superadmin → Puri · 29-09-2026

## Estado y alcance

- Rama: `feature/puri-assistant`. HEAD antes y después de QA: `7ec13ca623ec4a6ef894a0eaec4467631eaf8771`. No se hizo commit, merge ni deploy.
- El árbol ya contenía la implementación de Puri sin commit y cambios ajenos en `skills-lock.json`, `src/app/dashboard/layout.tsx`, `.agents/skills/`, `artifacts/`, scripts y archivos SEO/social. Se conservaron.
- La única migración nueva del módulo es `20260929180000_puri_operational_telemetry`. **Actualización posterior:** se aplicó a producción por autorización expresa del usuario el 29-09-2026; véase la sección final.

## Migración

- El SQL sólo crea `PuriRequest`, `PuriToolCall`, `PuriFeedback` y `PuriUiEvent`, sus índices y dos foreign keys entre tablas nuevas. No altera ni elimina tablas/columnas existentes, no exige backfill y las columnas obligatorias de las tablas nuevas tienen defaults donde corresponde.
- Se redujeron índices redundantes; quedan seis índices de consulta en request, dos en tool call, uno más la unicidad de `requestId` en feedback y dos en UI event. Las FK usan `ON DELETE CASCADE` entre tablas de telemetría. Los locks de DDL afectan principalmente tablas nuevas; la duración real de la migración no se midió.
- `prisma validate` pasó. Antes del ajuste de seguridad Supabase, el SQL coincidió línea por línea (sin comentarios ni orden de líneas) con `prisma migrate diff` entre el schema de HEAD y el schema actual. Se añadieron después cuatro sentencias `ENABLE ROW LEVEL SECURITY` en las tablas nuevas, sin políticas para clientes.
- En la revisión inicial, `DATABASE_URL` y `DIRECT_URL` apuntaban a un host PostgreSQL remoto sin identificación verificable de staging. Por ello no se aplicó entonces la migración ni se ejecutó `EXPLAIN ANALYZE`. Más tarde el usuario confirmó expresamente que la base era producción y autorizó esta migración concreta. No se usó `prisma db push`.

## Validación y correcciones

- Fixtures de ruta comprobaron IDs del contexto autenticado, modelo devuelto, tokens del proveedor, duraciones y estados `SUCCESS`, `NO_DATA`, `DENIED`, `ERROR`, `TIMEOUT`; el objeto enviado a Prisma no contiene texto de prompt/respuesta ni marcadores de email, teléfono o credenciales. Se comprobó `ACTION_REQUEST_UNSUPPORTED` y clasificación por tool en los tests existentes. Esto es validación del payload persistible **mockeado**, no inspección de filas reales.
- Los eventos de apertura devuelven 403 sólo ante `PuriAccessError`; un fallo de escritura devuelve 503 genérico. Feedback hace upsert por `requestId`: `👍→👍→👎` conserva una valoración actual. El frontend usa un bloqueo sincrónico para evitar dos envíos de la misma consulta antes del rerender.
- El lookup de metadata de respuesta respeta período, negocio, plan, rol, sucursal, tool e intent. Un ID de B no abre metadata dentro de una vista filtrada por A. La página y el layout verifican sesión Superadmin en servidor; la suite de sesiones cubre rechazo de usuarios sin `isSuperAdmin`. Las rutas de eventos/feedback autentican, validan origen y no aceptan business ID del cliente. No existe una API de lectura de analytics separada de la página protegida.
- Las ventanas de Hoy/custom ahora reutilizan `startOfLocalDay`; el test detectó y corrigió un desfase de una hora durante el DST chileno. Los filtros de página mal formados se normalizan, y el offset máximo queda acotado. Consultas aplica su filtro de intent también al panel de categorías. El funnel no se presenta bajo filtros de tool/intent, porque los eventos de impresión/apertura no pueden portar esos atributos.
- Los códigos de modelo/proveedor se separaron de fallos de tools. La tabla de negocios ancla “últimos 7 días” al final del período seleccionado. La query de retención evita agregar indiscriminadamente todo el histórico antes de seleccionar la cohorte.
- Percentiles: PostgreSQL usa `PERCENTILE_CONT(0.5/0.95)`, interpolación continua. Para `[100, 200, 300, 400, 1000]` la expectativa es p50 = 300 ms y p95 = 880 ms. Falta ejecutar el fixture sobre PostgreSQL aislado para validar el resultado persistido.
- Con período/negocio sin actividad, los agregados SQL usan `COUNT`/`COALESCE`, el UI divide sólo con denominador positivo y muestra empty states. El formato de costo usa `Sin tarifa` cuando `estimatedCostUsd` es null; una tarifa de test se ejercitó sólo en proceso de test y se eliminó al terminar. No se configuró precio ficticio en el entorno.

## Gates ejecutados

- `prisma validate`: pasa.
- `prisma migrate diff` estático y comparación de SQL: pasa.
- TypeScript: pasa.
- Lint de archivos Puri modificados: pasa. `npm run lint` global falla por una regla de React Hooks en `.agents/skills/media-use/scripts/recipe.mjs`, archivo ajeno ya presente. También informa warnings preexistentes; no se editó ese contenido.
- Suite Puri: 13 archivos, 48 tests pasaron en la corrida previa a los últimos ajustes de QA.
- Suite completa final: 160 archivos pasaron, uno omitido; 887 tests pasaron, dos omitidos.
- Build de producción final: compiló y generó las rutas esperadas, incluida `/para/x7k9m2v4q8/puri`.

## Pendientes operativos con base aislada

1. Generar fixtures A/B en staging y consultar las filas persistidas directamente para confirmar IDs, timestamps, estados, tokens, duraciones, costo e idempotencia. Buscar en columnas y errores persistidos patrones de PII/secretos; el schema y mocks no sustituyen esta inspección.
2. Ejecutar `EXPLAIN (ANALYZE, BUFFERS)` para resumen 30d, negocio, tools, funnel, habitual y retención con volumen representativo en staging.
3. Probar con sesiones reales de admin de negocio y profesional, tanto URL directa como rutas de escritura; revisar tablet y los estados loading/error con datos de staging. La sesión real Superadmin y las siete vistas vacías se verificaron tras la migración.
4. Verificar con proveedor de test el usage real y los fallos/rate limits. No se enviaron solicitudes al proveedor ni se indujeron timeouts reales. El producto usa respuestas no streaming, por lo que no existe completion por chunk ni first token fiable.

La clasificación `navegación` no tiene emisor determinístico en V1: un click de acción se mide como evento UI, y las preguntas sin tool pueden quedar `unknown`. Se mantuvo así por el alcance congelado; no se fabricó una categoría sin evidencia.

## Ejecución posterior en producción

Tras confirmar expresamente que la base remota era producción y autorizar esta migración, se ejecutó `npx prisma migrate deploy` para `20260929180000_puri_operational_telemetry`. Prisma informó éxito y `prisma migrate status` indicó que el schema quedó al día. La base tenía 8 negocios y 25 usuarios antes y después. Las cuatro tablas nuevas existen, están vacías, tienen RLS activo y cero políticas; el rol de aplicación y migración coincide y tiene `BYPASSRLS`. No se hizo deploy de la aplicación ni merge.

La ruta local `/para/x7k9m2v4q8/puri` se recargó con sesión Superadmin real y mostró Resumen con ceros/“Sin tarifa”, sin el error `42P01`. Se abrieron las otras seis vistas sin error de servidor. El servidor local quedó corriendo.
