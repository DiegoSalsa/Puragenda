# Iteración 8 — consolidación verificada y cierre pendiente

Fecha: 22-10-2026, America/Santiago. Worktree `C:\Users\diego\.codex\worktrees\puragenda-next-audit\agenda`, rama `feature/puragenda-next`. HEAD inicial de iteración 7: `b894e75`.

**La iteración 8 NO está completa ni certificada para activación comercial.** Se implementó y verificó la consolidación descrita abajo. Faltan el cierre del flujo comercial de facturación, su ensayo externo y el envío controlado real. No se presenta el laboratorio como pago o entrega externos. No hubo merge, push, despliegue, cobro productivo ni contacto con clientes reales.

## 1. Estado por componente

| Componente y alcance exacto | Clasificación | Evidencia o límite |
| --- | --- | --- |
| Catálogo Puragenda/Puragenda+ y preservación legacy | Implementado y verificado | El usuario confirmó el plan completo de $22.990 CLP mensual, IVA incluido, para sandbox. |
| Dashboard de oportunidades, propuestas, campañas, métricas y límites | Implementado y verificado | Chrome real en escritorio y móvil; componentes compartidos con el laboratorio, handlers en servicios propios. |
| Oferta y consulta del estado comercial en dashboard | Implementado y verificado | Presenta plan, período, pago y configuración; no equivale a un checkout terminado. |
| Checkout/gestión/cancelación comerciales del propietario | No implementado como flujo comercial completo | Permanecen los adaptadores/intenciones de la iteración 4; no se añadió un checkout ni una cancelación de renovación listos para vender. |
| Alta/cambio de contrato por proveedores sandbox | Implementado pero pendiente de verificación externa | Tests contractuales existentes; SDKs oficiales. No hubo una transacción externa V2. |
| Renovación recurrente V2 de principio a fin | No implementado de forma completa | La operación aplicada no avanza por sí sola el período en renovaciones posteriores. Paddle liga inicialmente la transacción de alta; requiere cerrar el tratamiento de transacciones recurrentes. |
| Prueba de facturación externa | Bloqueado por una decisión comercial o acceso externo | Ver sección 2; documentación MCP sin autenticar y credenciales específicas ausentes. |
| Autorización premium y vencimiento | Implementado y verificado localmente | Revalida sesión, tenant, rol, sucursal y pago; no extiende Puri+ por gracia después del período pagado. Evidencia externa pendiente. |
| Presupuestos y conciliación de IA | Implementado y verificado | Concurrencia PostgreSQL, límites de negocio/global/categoría/operación, alertas, UNKNOWN y conciliación auditada. |
| Adaptador Resend y recepción firmada | Implementado pero pendiente de verificación externa | SDK, dominio verificado antes de enviar, clave separada, allowlist, idempotencia, correlación firmada y consulta canónica. Sin envío externo. |
| Consentimiento widget, recurrentes, encargos y portal | Implementado y verificado en el alcance indicado | Reserva normal y portal probados en navegador; contratos/regresiones de recurrentes y encargos en suite. No certifica la revisión legal del texto. |
| Bajas/supresiones y atribución | Implementado y verificado | PostgreSQL y navegador; sin transferir consentimiento a otro correo, sin backfill histórico. |
| Worker finito, lease, cursor, expiración y kill switch | Implementado y verificado localmente | Carreras PostgreSQL; endpoint autenticado preparado. |
| Scheduler instalado en hosting de pruebas | Bloqueado por acceso externo | No hay un entorno de staging suministrado. No se contrató infraestructura ni se activó un cron externo. |
| Migraciones y RLS nuevas | Implementado y verificado | Bootstrap, upgrade legacy, deriva, repetición idempotente, grants y RLS. |
| Compatibilidad `main` y código inerte | Implementado y verificado | `origin/main` contenido en la rama, build y 11 comprobaciones HTTP de bloqueo. |
| Respaldo/restore de producción real | Bloqueado por acceso externo y aprobación operativa | Procedimiento preparado; no se descargaron datos personales ni se restauró una copia productiva. |

## 2. Facturación y sandbox

El catálogo distingue Puragenda base ($12.990 CLP) y Puragenda+ ($22.990 CLP), ambos con un profesional y recargos marginales. Puri+ no es un complemento de $22.990 sobre Individual/Equipo. Puragenda+ incluye Contact Flow y web. Equipo legacy conserva cinco profesionales y sus condiciones; no se convierte automáticamente a V2. Tampoco se alteraron descuentos, anualidad, overrides ni contratos de clientes actuales.

Se leyó el catálogo autenticado de Paddle sandbox: Individual USD 13,99/mes, Equipo USD 32,99/mes y profesional adicional USD 3,49/mes. Son precios legacy, no equivalentes aprobados para V2 en CLP. No se crearon, actualizaron ni archivaron precios externos.

Bloqueos comprobados, sin exponer valores secretos:

- `paddle-docs` no está registrado entre las herramientas de la sesión. Se intentó conectar directamente al endpoint oficial MCP `https://paddlehq.mcp.kapa.ai`; devolvió **401 / invalid_token / Authentication required**. Sigue pendiente la consulta al usuario sobre usar la referencia del MCP sandbox y las páginas oficiales como alternativa. `AGENTS.md` exige: “Before suggesting or changing Paddle integration code, use the `paddle-docs` MCP server to check current Paddle documentation.” No se modificaron los adaptadores ni el webhook Paddle.
- No hay `COMMERCIAL_V2_PADDLE_API_KEY`, `COMMERCIAL_V2_PADDLE_WEBHOOK_SECRET` ni mapa V2 aprobado disponible para el proceso SDK. El acceso del MCP a su catálogo no exporta una clave utilizable por la aplicación.
- No hay `COMMERCIAL_V2_MP_ACCESS_TOKEN`, ID de vendedor test ni secreto de webhook comercial MP configurados. La clave legacy presente no tiene prefijo `TEST-`; no se reutilizó ni se supuso que fuera sandbox.
- Se confirmó precio con IVA incluido para sandbox. Política de trial, descuentos, anualidad, importes/monedas internacionales y migración de clientes existentes siguen sin aprobación suficiente. No se inventaron condiciones.

Los tests existentes cubren firmas, deduplicación, carreras, pendientes/rechazados, montos, moneda, recursos equivocados y resultados ambiguos. Esos transportes siguen marcados como **CONTRACT_FIXTURE**. No demuestran una compra externa, una renovación real ni una cancelación externa pagada. El escenario comercial de 22 pasos solicitado no queda aprobado.

## 3. Precio, costos y margen

Fuente de tarifas: [modelo GPT-6 Luna, documentación oficial](https://developers.openai.com/api/docs/models/gpt-6-luna), consultada el 22-10-2026. Standard por millón: entrada USD 0,10; entrada cacheada 0,01; escritura de caché 0,125; salida 0,50. La implementación Puri+ fuerza `service_tier=default`, exige uso de caché completo para la tarifa verificada y conserva UNKNOWN si no puede costear. La reserva cubre el caso más caro de escritura de caché. El snapshot requiere selección explícita y vence el 22-11-2026; después debe verificarse de nuevo. No cambia el mapa ni el presupuesto de Puri estándar.

Puri estándar y Puri+ comparten actualmente `PURI_MODEL` (`gpt-6-luna` por defecto) y Responses API. Las explicaciones de señales y propuestas pasan por el orquestador compartido con presupuesto Plus. Las señales/cohortes, detección proactiva y plantillas de mensajes son SQL/código determinista: no se les atribuye una llamada ficticia a otro modelo. No se añadieron herramientas que cobren, descuenten, aprueben o envíen desde la IA.

El ingreso neto de IVA, bajo la política confirmada y tasa chilena del 19%, es **$19.319,33 CLP**. [Tasa oficial SII](https://www.sii.cl/preguntas_frecuentes/impuestos_mensuales/001_130_0572.htm).

La matriz es reproducible con `node scripts/commercial-economics.mjs`. Es un escenario sintético, no una distribución medida de clientes. Llamadas incluyen explicaciones/preparación y reintentos; cada llamada puede ser una ronda del asistente. La banda IA va desde entrada normal hasta toda la entrada cobrada como escritura de caché, sin asumir ahorro de caché.

| Uso | Llamadas con reintentos | Tokens entrada | Tokens salida | IA USD/mes | Correos previstos | Remanente CLP antes de costos desconocidos, FX supuesto 950 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Bajo | 110 | 880,000 | 66,000 | 0.1210–0.1430 | 100 | 19,204.38 |
| Habitual | 690 | 8,280,000 | 621,000 | 1.1385–1.3455 | 500 | 18,237.75 |
| Intensivo | 3,750 | 75,000,000 | 4,500,000 | 9.7500–11.6250 | 2,000 | 10,056.83 |
| Extremo | 30,000 | 960,000,000 | 36,000,000 | 114.0000–138.0000 | 10,000 | -88,980.67 |

**El remanente no es margen bruto.** Correo comercial, hosting web, Vercel, PostgreSQL, soporte, comisiones contratadas, liquidación y FX no están verificados por cuenta. Se guardan como `null`, no cero. La sensibilidad usa 850/950/1.050 CLP por USD como supuestos explícitos, no como tipo de cambio vigente.

Para el precio confirmado, un cap de IA de USD 2 dejaría, a FX supuesto 950, $3.895,80 CLP para todos los demás costos si se quisiera un margen del 70%. Sin cap, el escenario intensivo ya necesita un precio bruto mínimo de aproximadamente $36.742 CLP sólo para cubrir IA y aspirar a ese margen; el extremo, $429.590 CLP, ambos antes de costos desconocidos. Son umbrales matemáticos, no nuevos precios comerciales. No se publicó ni fijó un precio definitivo nuevo.

Las asignaciones de prueba preparadas son USD 2/negocio/mes y USD 20 globales, con 600 rondas interactivas, 50 explicaciones, 120 análisis SQL y 60 proactivos; no son cuotas productivas aprobadas. Hay tope independiente por operación (USD 0,02 por defecto), bytes/rondas/salida acotados y cero retries automáticos después de un cargo ambiguo. La conciliación de UNKNOWN exige operador Superadmin y hash de evidencia; queda auditada e idempotente. La IA no puede liberar presupuesto ambiguo.

## 4. Comunicaciones y pruebas externas

La API existente de Resend respondió que **`puragenda.cl` está verificado**. Esa consulta fue de lectura; no envió correos ni prueba recepción. La configuración comercial exige una clave propia (`CONTACT_FLOW_RESEND_API_KEY`), confirmación de separación de cuenta, dominio, remitente, secreto Svix, HTTPS, un negocio de pruebas y entre uno y cinco destinatarios técnicos expresamente autorizados. Nunca recurre automáticamente a la clave transaccional.

El worker selecciona el adaptador por mensaje. Resend se ejecuta fuera de la transacción corta, después de persistir STARTED y revalidar permisos/consentimiento/cuotas. Usa la misma clave idempotente; pasado el horizonte seguro no reenvía a ciegas. Los tags incluyen correlación firmada para recuperar una respuesta perdida por webhook. Una entrega tardía no elimina una denuncia/baja. La conciliación consulta el email canónico y verifica sus tags. El remitente muestra el nombre congelado del negocio y su dirección aprobada.

El SDK verifica el cuerpo crudo Svix antes de interpretar eventos. Se probaron firma válida, alteración, duplicados y correlación perdida en PostgreSQL usando evidencia contractual local. Las reglas/cuotas/supresiones de Contact Flow permanecen separadas de los recordatorios. Para evitar una cuota/supresión global del proveedor compartida por accidente, se requiere separación operativa explícita de la cuenta comercial; no se certificó que exista hoy.

**Pruebas externas de envío: 0.** Falta respuesta a la consulta de destinatario técnico, cuenta/remitente comercial aislados y credencial/secreto propios. No se contactó a ningún cliente real. [Idempotencia Resend](https://resend.com/docs/dashboard/emails/idempotency-keys), [firmas](https://resend.com/docs/webhooks/verify-webhooks-requests), [consulta canónica](https://resend.com/docs/api-reference/emails/retrieve-email).

## 5. Consentimiento, entradas públicas y bajas

La reserva normal, recurrente y de encargos admite una elección comercial opcional y no preseleccionada. Se separa de los términos de reserva, salud y notificaciones operativas. Rechazarla no crea consentimiento ni impide reservar. El recibo congela finalidad, canal, texto/versionado, dirección HMAC, fuente, fecha y evidencia firmada.

Una aceptación anónima crea `PENDING_VERIFICATION`, que una constraint SQL impide convertir en GRANTED. El usuario con cuenta y correo verificado puede otorgar su consentimiento explícito en Mi agenda; el servidor comprueba la cuenta persistida y el negocio asociado a su correo. Puede revocarlo ahí o mediante baja anónima firmada. Los registros históricos y `acceptsMarketing` de CRM no se convierten en elegibilidad. Una nueva dirección exige evidencia nueva; una supresión existente sigue teniendo prioridad.

Chrome verificó la casilla inicialmente vacía, que el botón de reserva está habilitado sin marcarla, una reserva real del widget con recibo pendiente, confirmación desde portal y revocación con supresión. Las otras entradas conservaron sus regresiones de la suite. No hubo captación productiva: los flags permanecen cerrados.

La lectura agregada de producción sólo encontró negocios con país CL. Esto no prueba la residencia de todos sus clientes. Se revisaron [Ley 19.496, art. 28 B](https://www.bcn.cl/leychile/navegar?idNorma=61438&idParte=8542441) y [Ley 21.719](https://www.bcn.cl/leychile/navegar?f=2026-12-01&i=1209272), cuya vigencia general indicada es 01-12-2026. Identidad/asunto/baja son obligaciones relevantes, además de las bases de tratamiento de datos. Requieren revisión jurídica: texto final, roles responsable/encargado, menores y datos sensibles, retención, reconsentimiento y transferencias internacionales. No se certifica cumplimiento jurídico mediante el código.

## 6. Workers, outbox e infraestructura

`/api/cron/puragenda-next` y `scripts/run-commercial-worker.ts` ejecutan ticks finitos. El estado durable incluye lease, fencing, cursor, inicio/éxito/error y resumen sin PII. Un runner viejo no adelanta el cursor de otro. Se recuperan reservas IA abandonadas, trabajos vencidos y leases de outbox; se concilia Resend cuando está habilitado y se ejecuta SQL proactivo con plazo/lotes acotados. El kill switch global del worker corta el tick; Contact Flow mantiene además sus políticas globales y por negocio.

Se usa secreto propio de al menos 32 caracteres y comparación constante; no se reutiliza CRON_SECRET de recordatorios. `maxDuration=60` y todos los pasos esperados se aguardan antes de responder. Los resultados ambiguos conservan cuota/evidencia. No hay proceso residente iniciado dentro de una función.

El repositorio configura cron diarios en Vercel. No se verificó el plan contratado. [Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing) limita Hobby a una ejecución diaria por cron y no garantiza precisión por minuto; no se agregó un cron de minuto ni se cambió de plan. La consulta de extensiones de producción no encontró `pg_cron` ni `pg_net`; no se instalaron. El scheduler de hosting queda pendiente del entorno de staging y acceso operativo. Se puede invocar el tick con un scheduler existente compatible con su frecuencia/costo autorizado; no se contrató uno nuevo.

## 7. Seguridad y multi-tenancy

Se mantienen comprobaciones server-side de sesión, membresía, permisos, sucursal y entitlement en análisis, aprobación y cada intento de envío. La IA sólo prepara; no tiene tools de autorización, envío, facturación ni descuentos. Se mantienen CSRF, rate limit distribuido, validación estricta, hashes/versiones, snapshots inmutables, exclusiones y auditoría sin prompts/listas de emails.

Las nuevas constraints no abren RLS ni grants de navegador. CommercialWorkerState tiene RLS y revocación para PUBLIC/anon/authenticated. Las pruebas PostgreSQL previas y nuevas cubren FKs de tenant, permisos, firmas, supresiones, cuotas, concurrencia, fences y evidencia manipulada. La selección de staging necesita `VERCEL_ENV=preview`, opt-in explícito y SHA-256 de su conexión exacta; el despliegue production sigue bloqueado independientemente de flags.

Next.js se actualizó de 16.3.8 a 16.4.2 con paquetes Next alineados. También se actualizaron transitorios productivos afectados. `npm audit --omit=dev`: **0 vulnerabilidades**. Persisten avisos de herramientas de desarrollo en el audit completo; no se aplicaron downgrades/overrides mayores de forma ciega. La comprobación de secretos es de patrones sobre textos versionados/nuevos, con su alcance explícito en evidencia; no se presenta como detección universal.

## 8. Interfaz

Rutas de trabajo `/dashboard/puri-plus`, `/dashboard/puri-plus/settings` y APIs `/api/dashboard/puri-plus` / `/api/dashboard/contact-flow`. Navegación y shell actuales, mascota y componentes propios de Puragenda. Los handlers viven en servicios compartidos, sin que el dashboard llame a rutas de laboratorio. La ruta interna sigue disponible sólo para regresión/test.

Incluye oportunidades, evidencia, propuestas, revisión, autorización humana separada, campañas, exclusiones, previews, pausas/cancelación/kill, historial técnico, atribución y métricas. Configuración muestra presupuestos, consumo, alertas, pendientes de consentimiento y supresiones. Un modo Resend controlado se anuncia expresamente como envío técnico real; no se etiqueta como simulación.

Chrome: 1440×1050 y 390×844, sin overflow ni errores de página. Se corrigió la hidratación de fechas debida a espacios/localización diferentes entre Node y Chrome. **La contratación/cancelación comercial aún no está integrada en esta UI.**

## 9. Migraciones y estado real de la base

Cuatro migraciones aditivas nuevas: consentimiento público/portal, estado durable del worker, transporte Resend controlado y tokens de escritura de caché. Bootstrap desde cero y actualización del esquema legacy representativo pasaron; datos/overrides/historial legacy se conservaron; despliegue repetido sin cambios; Prisma diff final vacío; constraints/grants/RLS verificados.

La conexión existente de producción se usó con transacción **READ ONLY** y timeout, para metadatos/agrupaciones sin nombres ni datos de clientes. Su última migración es `20261020000000_payment_holds_google_read_calendars`. No tiene aún CommercialSubscription, CfConsent/CfMessage, PuriBudgetBucket ni CommercialWorkerState. El proyecto correspondiente no está entre los accesibles por el MCP Supabase conectado; no se emitieron mutaciones remotas por otra vía.

No se asumió que el bootstrap histórico sin baseline fuera válido ni se alteraron migraciones ya aplicadas. El ensayo es representativo del esquema versionado, no una restauración de una copia autorizada de producción.

## 10. Resultados de validación

| Verificación | Resultado |
| --- | --- |
| Suite PostgreSQL comercial | 199 aprobadas, 0 fallidas |
| Resto de suite | 1.544 aprobadas, 131 omitidas por destino; 0 fallidas |
| Combinación principal | **1.743 aprobadas, 131 omitidas, 0 fallidas** |
| 131 heredadas ejecutadas por separado | **131 aprobadas** |
| Casos únicos comprobados combinados | **1.874 aprobados**; incluye 16 nuevos de iteración 8 |
| Prisma validate/generate | Correctos |
| Bootstrap / legacy / repetición / RLS | Correctos |
| TypeScript | Correcto |
| ESLint | 0 errores, 32 advertencias preexistentes |
| Build Next 16.4.2 | Correcto, aislado y sin credenciales de proveedor |
| Production start, flags de prueba deliberadamente abiertos | 11 comprobaciones: 2 rechazos de auth y 9 rutas selladas |
| Chrome | 23 controles, 0 page errors, sin overflow |
| Dependencias productivas | 0 avisos en npm audit --omit=dev |

Las 131 omisiones del runner general son guardas de destinos aislados distintos, no pruebas eliminadas: reservas 19, MCP 27, web MP 30, compra web 33, suscripción legacy 20 y carrera de pagos 2. Todas se ejecutaron satisfactoriamente en sus runners/destinos propios. No se suman duplicados de tests unitarios incluidos en esos runners. No hubo nuevas omisiones para obtener verde.

El escenario de navegador usa proveedor simulado, cuatro aceptaciones/cuatro entregas y una reserva atribuida; además crea una reserva desde UI y realiza opt-in/revocación en portal. Sus **23 controles** son locales. Checkout externo, webhook externo de pago, cancelación real y recepción en buzón no están validados por ese recorrido.

## 11. Operaciones externas efectuadas

Sólo lecturas: catálogo Paddle sandbox, estado de dominio Resend, documentación oficial e inspección agregada/metadatos PostgreSQL productivo con READ ONLY. Intento de documentación MCP Paddle: 401. Sin transacciones externas V2, simulaciones de cuenta presentadas como pagos, envíos reales, nuevas cuentas pagadas, cambios de precio o cancelaciones externas.

## 12. Comparación con main

Se hizo fetch al inicio y al cierre. `origin/main` continúa en `34187de43a860b88b7328b5e11743da21b48db7c` y es ancestro de la rama. Antes de los commits nuevos: 29 commits propios, 0 detrás. Ya incluye holds de pago MP, limpieza diaria y selección de múltiples calendarios Google. No hubo conflictos de integración ni sobrescritura del checkout del escritorio, que tenía cambios ajenos.

## 13. Commits

- `cbc2085` — fix(deps): patch Next.js and production transitive vulnerabilities
- `8ba9b23` — feat(puragenda-next): consolidate dashboard consent budgets and controlled workers
- `6b14ac8` — fix(puri-plus): bound request parsing and contain preference failures

La documentación y evidencia quedan en un commit separado de esta entrega (consultar `git log -4`).

No se ejecutó merge, push ni despliegue. El código inerte puede revisarse con la evidencia de esta entrega; no se aprueba aún su lanzamiento comercial.

## 14. Dependencias que impiden cerrar la aceptación

1. Autenticar `paddle-docs` o resolver la autorización alternativa ya consultada; suministrar por gestor de secretos las credenciales SDK/webhook comerciales sandbox y un entorno de callback accesible.
2. Cerrar la modalidad externa V2 aprobada: trial/descuentos/anualidad/internacional, precios propios y convivencia con legacy. Completar checkout, renovación y cancelación conservando el período pagado, y probarlos por proveedor. Es trabajo funcional pendiente, no una validación que se haya dado por aprobada.
3. Destinatario técnico expresamente autorizado y cuenta/dominio/remitente comercial aislados con sus secretos Resend. Ejecutar envío, recepción, webhook, baja y conciliación reales.
4. Staging representativo autorizado, acceso de scheduler/hosting, plan/costos efectivos y respaldo/restore probado. El fingerprint de preview por sí solo no es una prueba de infraestructura externa.
5. Revisión jurídica de consentimiento, retención y alcance territorial. Las asignaciones de prueba no son promesas comerciales definitivas.

## 15. Despliegue, activación y rollback

Procedimiento exacto y comandos de verificación en [22 — operación](./22-iteracion-8-operacion.md). Ningún paso productivo se ejecutó. La venta/activación comercial está bloqueada hasta completar los puntos anteriores. No existe hoy un interruptor que convierta por sí solo este conjunto en un lanzamiento comercial terminado.

Evidencia: [economía](./evidence/iteration-8-economics.json), [navegador](./evidence/iteration-8-browser-result.json), [sello production](./evidence/iteration-8-production-seal.json), [validación consolidada](./evidence/iteration-8-validation.json), [dashboard escritorio](./evidence/iteration-8-dashboard-desktop.png), [dashboard móvil](./evidence/iteration-8-dashboard-mobile.png), [portal](./evidence/iteration-8-portal-consent-mobile.png).
