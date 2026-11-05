# Puragenda Next — certificación para lanzamiento

3 de noviembre de 2026. **NO-GO para producción: CI remota bloqueada por facturación y revisión/integración pendientes.** El núcleo comercial ya tiene pagos sandbox, publicación Plus con Cloudinary, reserva desde el sitio, móvil y recuperación operativa comprobados. No se autoriza un despliegue productivo.

## Referencias

| Referencia | SHA / estado |
|---|---|
| main / producción | `e74c92237e47db43425a7d47209520967e51bfb0`, intacta |
| RC1 | `a3fd2a35480d8152a33550d42e510291a49664a7`, intacta |
| Código correctivo certificado | `2dbda7ebf6f7ad4bc13e6ac9169ed3d0b6d2fa13` |
| Entrega | [fix/puragenda-next-final-launch-blockers](https://github.com/DiegoSalsa/Puragenda/tree/fix/puragenda-next-final-launch-blockers), sin reescrituras |
| Staging | [Login protegido](https://project-8xjzo.vercel.app/login), Ready |
| Deployment del correctivo | `dpl_GR3cPZhNj7cBsEAb9fYTEWrhoByB`, target staging / runtime Preview |

La misión final añadió una corrección funcional pequeña y pruebas reproducibles: las notificaciones oficiales de suscripciones v8 omiten `live_mode`. Se acepta su ausencia sólo en tópicos de suscripción; pagos lo siguen exigiendo. Permanecen firma HMAC oficial, antigüedad máxima de cinco minutos, ID coincidente, aplicación declarada y consulta canónica de cuenta, entorno, contrato y recurso. Una firma válida no concede acceso por sí sola.

## Evidencia nueva de la misión final

Los logs y capturas sintéticos están en `scratch/mission-final/`, excluido de Git. Los archivos privados de credenciales/sesiones no se publican. [Evidencia anterior](evidence/rc1-final-launch-evidence-2026-11-03.json) y [preparación existente](rc1-final-launch-external-plan-2026-11-03.json) son antecedentes; no se cuentan como nuevas ejecuciones.

| Comprobación | Resultado nuevo |
|---|---|
| Regresión crítica | **198 pruebas Vitest únicas aprobadas**, cero fallos/omitidas en la ejecución final; PostgreSQL real local con proveedores simulados donde se indica |
| Mercado Pago externo | Vendedor test autenticado `3468148589`, aplicación test `1712173371015642`, Chile/MLC y etiqueta test_user verificados; nunca se dedujo entorno por prefijo del token |
| Mensual base | Checkout oficial con comprador y tarjeta de prueba; CLP 12.990; pago canónico confirmado y contrato ACTIVE por un mes |
| Anual Plus | Checkout oficial CLP 279.900, un profesional; pago canónico y contrato ACTIVE por un año |
| Trial Plus/equipo | Dos profesionales, CLP 32.990 mensual; autorización oficial, 30 días gratuitos y primer cobro el **3 de diciembre de 2026**; no se inventó un pago anticipado |
| Recorrido completo en staging | Registro UI Plus anual/dos profesionales → contrato CLP 329.900 → checkout test → pago → retorno/conciliación → ACTIVE |
| Webhook | Simulador oficial firmado → túnel temporal de ruta exacta → receptor real de staging → **200 OK**; antes de corregir: 401 reproducible |
| Idempotencia y ciclo de vida | Conciliación repetida conserva una evidencia; downgrade sandbox programado para renovación; cancelación/replay confirmados; acceso y periodo pagado conservados |
| Renovación/reintentos/fallos futuros | Contratos PostgreSQL controlados: mensual/anual, timeout, resultado incierto, recuperación, rechazo, duplicados y devolución. **No son cargos futuros ejecutados en Mercado Pago** |
| Plus real | Subida HTTP a Cloudinary autorizado, portada/editor/autosave, publicación, consulta HTTP 200, edición y republicación; revisión publicada 4 |
| Reserva desde Plus | Playwright 360×800 sobre el sitio realmente publicado; una cita canónica con cliente/profesional; datos exclusivamente sintéticos |
| Responsive | 1440×1000, 390×844 y 360×800 medidos con innerWidth/innerHeight/scrollWidth: precios, registro, onboarding, Puri determinista, agenda, editor, publicación, revisión/resultado de reserva y contratación cancelada; sin desbordamiento documental ni excepciones de página registradas |
| Checkout móvil externo | Formulario de tarjeta y revisión oficiales medidos en los tres tamaños, sin desbordamiento con perfil móvil; no se simuló el checkout mediante mocks |
| Calendar | **53 pruebas nuevas** de OAuth, FreeBusy, múltiples calendarios, escritura, acceso/revocación y colisiones con mocks; configuración productiva preservada; sin nueva cuenta/OAuth externo |
| Compilación | TypeScript completo, Prisma validate y ESLint afectado aprobados; build aislado local Node 24 y build remoto del correctivo aprobados; 164 páginas |
| Secretos/dependencias | Escaneo por patrones de líneas introducidas, incluidos commits intermedios, sin hallazgos; audit productivo nuevo: **0** |

Fallos tratados con transparencia: dos pruebas nuevas reprodujeron el formato rechazado antes de la corrección. Algunos harnesses necesitaron corregir selectores, esperar el catálogo o usar la ruta real `/dashboard/agenda`; un 404 de una ruta inventada no se contó como agenda aprobada. El intento externo negativo OTHE no obtuvo evidencia visual concluyente: su recurso quedó cancelado y el negocio inactivo; rechazo/recuperación sí se comprobaron en PostgreSQL controlado. No se declara ese intento como pago rechazado externo certificado.

**Límite demostrado del proveedor:** el sandbox rechazó Plus anual/tres profesionales, CLP 374.900, con HTTP 400: «Cannot pay an amount greater than $ 350000.00». No se cambiaron catálogo, periodos ni importes ni se repitió un POST incierto. Antes de ofrecer ese importe debe confirmarse con Mercado Pago el límite de la cuenta destinada al lanzamiento y una solución admitida. No extrapolar el límite test a producción ni declarar esa combinación operativa.

## Infraestructura y protección al cerrar

- Se utilizó el staging existente `prj_ma5nkDSDzQGBCFMhroTTzsGi07YD`; no se creó otra infraestructura. Dos builds adicionales acotados en esta misión, ambos Ready, con crédito incluido comprobado. Última lectura: US$0,46 usados de US$20; aproximadamente US$19,54 disponibles. Una alerta de presupuesto no es un tope duro.
- Vercel Authentication **All Deployments**, sin Git conectado, cron vacío, Basic fijo/Node 24. Automatización QA revocada: **cero bypasses**; login y alias del sitio vuelven a SSO sin cookies.
- El túnel gratuito aceptaba sólo POST a `/api/webhooks/mercadopago-v2`, máximo 32 KiB, firma/vigencia/aplicación verificadas, TTL y límite de solicitudes. No reenviaba dashboard ni revelaba el bypass de Vercel. Túnel y relay detenidos; URL de **Modo de prueba** restaurada a su valor anterior. Callback productivo sin cambios.
- El sitio se consultó en un alias `vercel.app` propio del proyecto staging. Se añadió una regla de host exacto sólo a ese proyecto y una prueba de titularidad sintética acotada en su base. **No certifica TXT externo ni modifica DNS/dominios de clientes.**
- Cloudinary se utilizó tras autorización expresa del propietario, sólo con una imagen sintética nueva bajo el negocio de QA. El entorno no se presume aislado por llamarse Test; no se modificaron imágenes anteriores ni configuración del proveedor.
- Mercado Pago queda configurado exclusivamente con identidad test en Preview, writers productivos apagados. Todas las suscripciones creadas para la certificación quedaron canceladas canónicamente; periodos y datos sintéticos se conservan.
- [Rulesets](https://github.com/DiegoSalsa/Puragenda/settings/rules): ambos Active; main/RC1 sin force push ni eliminación y main por PR/revisión. Protecciones versionadas y guardas de staging aprobadas, incluidas las de install/build.
- Producción observada: `dpl_C29ToGLShM1ba5KedPkPchToUYLg`, Ready sobre main `e74c922...`; Only build production conservado. No se ejecutaron despliegues, migraciones, cambios comerciales, DNS, correos ni cobros productivos.

## Base, migraciones y recuperación

Neon Free PostgreSQL 17, proyecto `divine-glade-04170205`, branch `br-quiet-fog-bebr4tlj`, base `puragenda_next_staging`: certificación anterior de 17 migraciones/idempotencia/drift conservada. **Cero migraciones nuevas o modificadas** en esta misión; no se repitió la migración remota.

El runtime usa rol de aplicación sin privilegios DDL; conserva BYPASSRLS requerido por Prisma. El aislamiento se garantiza y prueba en la aplicación, no se atribuye a RLS bajo ese rol. Backup/restore sintético previo: 142 tablas/130 filas; dump SHA-256 `267bed60c46c22033d3a7d6f94b592542a83656c08db7b738e42a2bf3037c912`; portable sin owner/ACL, que se verifican/reponen por separado.

**No volver directamente al main antiguo sobre esquema Next**: incompatibilidad P2023 del enum PURAGENDA_PLUS. Alternativa ya ensayada: artefacto Next compatible, pagos/IA/envíos desactivados, sobre clon sintético. Once comprobaciones HTTP aprobadas: login de ambos planes, clientes, contratos/estados, disponibilidad, reserva, idempotencia, rechazo multi-tenant, cancelación, identidades y dashboard.

Archivo local inmutable `scratch/mission-final/recovery-next-compatible.zip`, 45.623.020 bytes, SHA-256 **`fdd4a07a144108c8962d79db15e402eea80f9cb21a47dd2c31cac4c71dfc847d`**; código compatible 40b455b, Node 24, manifiesto de 7.650 archivos, sin credenciales. Incluye lock; requiere `npm ci`. El smoke usó dependencias instaladas coincidentes: no se afirma un paquete autónomo con node_modules. Usar recuperación compatible/forward-fix; no down migrations ni restore productivo sin autorización y conciliación de escrituras posteriores.

## Capacidades conservadas y diferidas

Calendar, Resend y Puri productivos no se desactivaron ni se cambiaron sus credenciales. Puri determinista y onboarding funcionan en staging sin OpenAI. Puri+ IA, proactividad, Contact Flow externo, MCP externo, cron y worker siguen apagados; pruebas de flags, permisos, recibos/cifrado y rechazo de ejecución aprobadas. No hubo inferencias facturables ni correos a clientes. La verificación previa de remitentes/quota Resend no demuestra una nueva entrega externa.

Puri estándar con inferencia conserva su ruta de aplicación, pero necesita **asignaciones explícitas de presupuesto legacy antes de activar Next para cuentas históricas**; no se inventaron cuotas ni se eludió el ledger. Política de retención 07-20 —responsable, plazos, eliminación y evidencia— pendiente antes de lanzar IA/MCP. Las funciones diferidas no se declaran disponibles por esta certificación.

23 avisos exclusivamente de desarrollo (21 moderados, dos bajos) conservados en [Auditoría 07](../puragenda-next/35-auditoria-07-puri-mcp-onboarding-2026-11-01.md#11-dependencias-de-desarrollo); sin actualizaciones masivas. Auditoría productiva actual cero.

## Cierre de CI e integración

Actions está habilitado, pero [baseline 41501071169](https://github.com/DiegoSalsa/Puragenda/actions/runs/41501071169) no inicia pasos: «The job was not started because your account is locked due to a billing issue.» Matriz crítica **local aprobada**, CI remota **pendiente**. No se cambió plan, método de pago ni se eludió el bloqueo. Se envió una solicitud autorizada de revisión a GitHub Support; su resolución está pendiente. La documentación oficial contempla [revisión del billing lock por soporte](https://docs.github.com/en/billing/how-tos/troubleshooting/locked-account).

Publicar sólo el correctivo y preparar PR a RC1, solicitando revisión al socio. **No integrar hasta aprobación y checks disponibles**, sin bypass/force push/squash. Conservar main y RC1 en sus SHA de la tabla mientras falta ese cierre. Tras desbloquear billing: ejecutar Security checks, comprobar baseline real y sólo entonces preparar su obligatoriedad.

Antes de producción siguen siendo necesarios: revisión e integración controlada; resolución del límite de cobro para los importes anunciados superiores al aceptado en sandbox; presupuesto legacy aprobado si se conserva inferencia estándar; política de retención para IA/MCP que se decida activar; autorización productiva separada con backup, runner certificado y smoke. Nada de esta entrega adelanta esas activaciones.
