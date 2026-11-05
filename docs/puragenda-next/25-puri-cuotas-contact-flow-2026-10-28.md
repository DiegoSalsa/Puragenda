# Puri, cuotas comerciales y Contact Flow — cierre del 28-10-2026

**Implementación funcional y comprobada en entorno aislado. Puri estándar y avanzado respondieron contra OpenAI con consumo reservado y liquidado. Contact Flow completó el recorrido con cuatro entregas simuladas. Las cuotas comerciales propuestas requieren aprobación del propietario; los envíos productivos permanecen cerrados.**

Se trabajó en `feature/puragenda-next`, worktree `puragenda-next-audit/agenda`. Los 49 archivos locales iniciales se respaldaron y verificaron con SHA-256 en `C:\Users\diego\.codex\backups\puri-contact-close-20261028-122932`. No hubo reset, rebase, merge, commit, push, deploy, cambios de DNS ni escrituras en datos productivos. No se reabrió ni reescribió Mercado Pago V2.

## Funciones operativas

| Capacidad | Puragenda | Puragenda+ |
| --- | --- | --- |
| Puri estándar, agenda, clientes y gestión | Sí | Sí |
| Puri avanzado, análisis y recomendaciones comerciales | No | Sí |
| Contact Flow | No | Sí, con autorización del propietario |
| Sitio web incluido | No | Sí, conforme al gate comercial existente |
| Prueba gratuita de 30 días | Funciones del plan dentro de su asignación | Funciones del plan dentro de su asignación |

La autorización se comprueba en servidor y admite una prueba vigente sin pago. Al vencer el periodo, se bloquean las capacidades y nuevas reservas de consumo; no se eliminan datos. Los contratos legacy mantienen su tratamiento previo.

La política continúa siendo `COMMERCIAL_USAGE_POLICY_JSON`. No se creó otro sistema de cuotas: Puri utiliza `PuriBudgetBucket` y `PuriUsageReservation`; Contact Flow utiliza sus reservas, asignaciones y `CfQuotaBucket` existentes. Se conserva el consumo ante reintentos, cambios de selección y cruces de mes durante una prueba. Los límites globales y de negocio se reservan bajo locks, antes de llamar al proveedor. Una respuesta incierta retiene su compromiso máximo y bloquea nuevo gasto de IA del negocio hasta conciliación.

Se completaron las asignaciones de número de campañas por periodo y contactos máximos por campaña. El mismo ledger cuenta una autorización una sola vez, incluso bajo concurrencia. Cancelar una campaña ya autorizada no devuelve el cupo de campañas. Las estrategias de contratos registrados toman sus techos de la asignación configurada; no prometen los antiguos valores del laboratorio. Una política incompleta sigue cerrando el consumo con `COMMERCIAL_USAGE_LIMITS_UNDEFINED`.

Puri estándar V2 utiliza el servicio Standard con timeout y sin reintentos automáticos, y rechaza entradas superiores al límite de tamaño. Los precios verificados siguen sujetos a modelo exacto, uso completo, modalidad y fecha de vencimiento; no se sustituye un costo desconocido por cero. La telemetría puede registrar el costo verificado con cache writes cuando el proveedor informa los campos necesarios.

## Experiencia del cliente

`CommercialUsagePanel` aparece en Configuración, Puri+ y el asistente estándar. Muestra utilizados, consultas en curso, cupo restante, reinicio, aviso desde el 80 %, agotamiento, pausa y funciones exclusivas de Plus. El periodo de prueba termina en su fecha original; el cupo pagado de Puri se renueva por mes calendario UTC y se presenta con fecha/hora local. Contact Flow conserva sus cuotas diarias y mensuales en la zona del negocio y su límite total de prueba.

Los paneles se actualizan después de operaciones de Puri y Contact Flow y también permiten actualización manual. El dashboard público ya no muestra tokens, USD internos, categorías SQL ni estado del worker global. Las respuestas de la API del dashboard omiten presupuestos internos y costos del modelo. La pantalla de Plus evita atribuir sitio web y Contact Flow al precio del plan básico, y aclara que la prueba no requiere un pago.

Las cuotas se consultan usando la membresía del servidor: un parámetro de negocio forjado no permite leer otro negocio. Los créditos se comparten entre usuarios y funciones del negocio. Una pregunta puede requerir varios créditos; en las dos pruebas completas contra OpenAI se utilizaron dos créditos por pregunta.

## Contact Flow y seguridad operacional

El recorrido verificado fue: detectar clientes inactivos → preparar recomendación → revisar y aprobar propuesta → preparar campaña → revisar correo y destinatarios → autorizar expresamente esa versión → ejecutar dentro de cuotas → conciliar y consultar resultados. La IA puede preparar un borrador; no tiene herramientas de aprobación ni envío.

Se añadió revisión de destinatarios paginada en grupos de 25, limitada al propietario, negocio, alcance y versión. Las identidades no entran en los snapshots que consulta Puri. La interfaz mostró cuatro destinatarios elegibles y uno excluido por ausencia de consentimiento verificable. Una reserva previa o `acceptsMarketing` no acredita opt-in comercial. La ruta antigua de marketing rechaza ambos planes V2 antes de seleccionar audiencia o invocar Resend, evitando saltarse Contact Flow.

Se corrigió la actualización de políticas que podía borrar un kill switch persistido: refrescar una asignación no reabre una pausa del operador. La baja, supresión, permisos, propietario, catálogo, próxima reserva, vigencia y autorización se vuelven a comprobar durante la ejecución. Una supresión verificada de Resend produce un bloqueo administrativo del proveedor y no se revierte por una entrega posterior. El procesamiento conserva firmas Svix, correlación, idempotencia y precedencia de estados.

Las campañas graduales autorizadas vuelven a consultar los datos de la ventana de observación revisada. El mero cambio de día ya no vuelve obsoleta una campaña; cambiar reservas subyacentes sigue exigiendo nueva revisión. Preparación y autorización iniciales continúan exigiendo evidencia actual. La ejecución mantiene sus verificaciones actuales de acceso, destinatario, próxima reserva, consentimiento y bajas. Se probó el envío gradual en dos días y se conservó la prueba que bloquea datos de reservas modificados.

No se añadieron colas ni workers paralelos. Se reutilizan los leases, fences, outbox y reintentos existentes, con idempotencia del proveedor y tratamiento conservador de timeouts. La recepción de eventos firmados continúa funcionando aunque se apague el envío; apagar un canal no debe perder confirmaciones o rebotes de intentos previos.

## Activación futura de Resend

`CONTACT_FLOW_EXTERNAL_RELEASE=false` permanece intacto. Ninguna clave, variable, autorización de campaña ni kill switch abre ese sello. El modo controlado está prohibido en un despliegue productivo y conserva destinatarios técnicos explícitos, negocio aislado, HTTPS y remitente verificado. Un preview compilado con `NODE_ENV=production` solo admite estas pruebas con su fingerprint de base aislada y los guardas de preview explícitamente aprobados.

La configuración productiva futura tiene variables propias y una aprobación instalada en servidor que vincula: negocios piloto, remitente, dominio, origen HTTPS, SHA-256 de la credencial, hash de la política, responsable, referencia de aprobación y vencimiento máximo de 30 días. Las claves comercial, transaccional y de pruebas deben ser distintas; la separación real de cuentas/equipos requiere además verificación del operador. Cada envío verifica el dominio en Resend. Se preparó conciliación en el worker existente para ese futuro modo, manteniéndola detrás del sello.

Antes de abrirlo, el operador debe:

1. Aprobar cuotas y asignaciones, comprobar el modelo/precio vigente y preparar un preview aislado.
2. Provisionar cuenta/equipo y credencial comercial separados; verificar dominio/subdominio remitente, SPF/DKIM y un buzón que reciba solicitudes de baja. No se creó ni modificó un dominio en esta ejecución.
3. Configurar `CONTACT_FLOW_PRODUCTION_RESEND_API_KEY`, `CONTACT_FLOW_PRODUCTION_RESEND_WEBHOOK_SECRET`, `CONTACT_FLOW_PRODUCTION_DOMAIN_ID`, `CONTACT_FLOW_PRODUCTION_FROM` y origen HTTPS permanente. Instalar el webhook firmado de `/api/contact-flow/webhooks/resend`.
4. Instalar la aprobación revisada en `CONTACT_FLOW_PRODUCTION_APPROVAL_JSON`; ejecutar `resendReleaseReadiness()` para comprobar la vinculación estática sin abrir entregas. La verificación DNS y del buzón se comprueba por separado.
5. Completar una entrega real de prueba, baja, rebote/error y recuperación de timeout con destinatarios técnicos autorizados. Después revisar explícitamente el cambio del sello de código; no basta un flag.
6. Instalar el scheduler alojado con el secreto del worker existente y límites acotados. Supervisar `MONITOR` en `/api/dashboard/contact-flow`, reservado a superadmin: último éxito/error, cola pendiente, antigüedad, UNKNOWN, rebotes, denuncias y readiness. Los negocios ven solo sus campañas y cupos, no contadores globales de otros negocios.

La configuración no habilita sobreconsumo automático del proveedor. Los secretos permanecen en variables del servidor. La política de consentimiento y las bajas no se sustituyen por una aprobación del negocio.

## Costos observados y precios verificados

Se consultó la telemetría existente de la base remota configurada mediante **una transacción de solo lectura** con timeout y `ROLLBACK`, sin IDs de clientes ni contenido de conversaciones. En los últimos 30 días había nueve solicitudes de `gpt-6-luna`: ocho SUCCESS y una NO_DATA, 28.499 tokens de entrada, 636 de salida y 14.941 cacheados. Ninguna tenía costo monetario registrado. La muestra es demasiado pequeña para describir un cliente comercial típico y no se inventó un costo histórico exacto con cache writes desconocidos.

El modelo utilizado por Puri estándar y avanzado es `gpt-6-luna`. La [ficha oficial de OpenAI](https://developers.openai.com/api/docs/models/gpt-6-luna) consultada el 28-10-2026 publica, por millón de tokens Standard: entrada **US$0,10**, entrada cacheada **US$0,01**, cache write **US$0,125**, salida **US$0,50**. El snapshot del proyecto se renovó hasta el 28-11-2026; otros modelos/modalidades y datos incompletos conservan costo desconocido.

Resend informó por [GET /usage](https://resend.com/docs/api-reference/usage/retrieve-usage): **861/3.000** correos mensuales y **33/100** diarios usados; contactos 0/1.000. El dominio existente `puragenda.cl` figuraba verificado. Esos límites coinciden con la oferta Free publicada; no se consultó una factura ni se presupuso un contrato pagado. La [tarifa oficial](https://resend.com/pricing?product=transactional) publica Free 3.000/mes y 100/día, y Pro **US$20/mes por 50.000**, con excedente **US$0,90/1.000** si se habilita. Contact Flow usa `/emails`; no se presupuestó un producto de Broadcasts que no utiliza esta implementación.

No había credencial comercial aislada ni lista de destinatarios autorizados configurada. Por ello **no se enviaron correos externos**; la consulta de dominio/uso fue de lectura.

## Propuesta comercial pendiente de aprobación

Estos valores **no se instalaron en el entorno ni se aprobaron automáticamente**. [Propuesta estructurada](evidence/puri-contact-quota-proposal-2026-10-28.json): estado `PENDING_OWNER_APPROVAL`, `active=false`, envío desactivado y kill switch cerrado. Es una asignación inicial por negocio; no se infiere un aumento por profesional adicional.

| Cupo | Puragenda pagado | Puragenda+ pagado | Prueba Puragenda, 30 días | Prueba Puragenda+, 30 días |
| --- | ---: | ---: | ---: | ---: |
| Créditos de Puri estándar | 500/mes | 1.000/mes | 100 totales | 200 totales |
| Créditos avanzados | — | 500/mes | — | 100 totales |
| Créditos de recomendaciones | — | 100/mes | — | 25 totales |
| Análisis del negocio sin cargo de modelo | — | 500/mes | — | 100 totales |
| Detecciones periódicas sin cargo de modelo | — | 124/mes | — | 30 totales |
| Tope de gasto de IA | US$2/mes | US$5/mes | US$0,30 total | US$0,80 total |
| Correos Contact Flow | — | 150/mes, 10/día | — | 30 totales, 5/día |
| Campañas autorizadas | — | 3/mes | — | 1 total |
| Contactos máximos por campaña | — | 50 | — | 30 |
| Frecuencia por destinatario | — | Una comunicación cada 30 días | — | Una comunicación cada 30 días |

La cantidad de créditos y el presupuesto monetario son límites simultáneos. Una pregunta puede consumir varios créditos; con la muestra real de este ensayo, 500 créditos equivaldrían aproximadamente a 250 preguntas de dos llamadas. No se garantiza esa equivalencia para todas las preguntas. El contenido largo y los resultados inciertos conservan su protección de costos. Los análisis sin modelo comparten el contador total del plan y tienen su propio tope para proteger la base de datos.

Propuesta transaccional **para aprobación de capacidad y avisos**, sin cambiar el flujo existente: 1.000 correos/mes en Puragenda, 2.000 en Plus, 200 durante la prueba, y 500 por profesional adicional. Priorizar confirmaciones, seguridad y recordatorios; no descartar silenciosamente correos ni tomar cupo comercial. Objetivo inicial global: 30.000/mes y 1.000/día, dentro de una capacidad transaccional contratada separada. Estos umbrales no están implementados como nuevos recortes del servicio transaccional; el límite actual del proveedor sigue siendo 3.000/mes y 100/día.

Para un piloto de **30 negocios básicos, 20 Plus y hasta 50 pruebas simultáneas**, propongo un máximo global de **US$200 de IA y 100.000 unidades/mes**, más **10.000 correos comerciales/mes y 500/día**. Los techos de IA por plan sumarían como máximo US$160 para pagados y US$40 para pruebas Plus, dentro del techo global. El correo comercial reservado del piloto sería hasta 4.500/mes; la capacidad Pro aislada propuesta de 50.000 tiene margen y cuesta US$20/mes. No se activó ni contrató ese plan.

### Escenarios económicos

Supuesto de estrés: **1 USD = 1.000 CLP**, usado solo para comparar rentabilidad; no es una cotización observada. Precios de venta: 12.990 y 27.990 CLP, IVA incluido. El ingreso mensual sin el IVA del catálogo es aproximadamente 10.916 y 23.521 CLP.

Se modelan 3.000/400, 8.000/800 y 20.000/1.200 tokens de entrada/salida por crédito en uso bajo/medio/intensivo, sin ahorro por caché y cobrando conservadoramente toda la entrada a precio de cache write. Son hipótesis, no consumo observado. Costos por crédito: US$0,000575; US$0,0014; US$0,0031.

| Escenario mensual | Créditos básico / Plus | IA básico | IA Plus | Correos Plus | Plus IA + parte del plan comercial de correo |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bajo | 100 / 320 | US$0,058 | US$0,184 | 25 | US$1,184 |
| Medio | 300 / 960 | US$0,420 | US$1,344 | 75 | US$2,344 |
| Intensivo | 500 / 1.600 | US$1,550 | US$4,960 | 150 | US$5,960 |

El correo reparte US$20 de plan comercial entre 20 Plus: **US$1 por negocio/mes**; los mensajes modelados caben en el plan y no se suma además un excedente ficticio. Con solo cinco Plus esa parte fija subiría a US$4 por negocio: conviene un piloto escalonado. Los límites globales no autorizan más negocios ni envíos fuera del piloto aprobado.

En los topes propuestos, IA básica representa alrededor del 18,3 % del ingreso mensual neto del catálogo; Plus IA + correo comercial, 25,5 %. Para anualidades equivalentes a diez mensualidades con doce meses de uso, esas proporciones subirían aproximadamente a 22,0 % y 30,6 %. No son margen neto: faltan hosting, base de datos, soporte, comisiones de cobro y otros gastos. El escenario global máximo de US$200 IA + US$20 correo comercial + eventual US$20 de capacidad transaccional sería US$240 frente a unos US$797,90 de ingresos mensuales netos del piloto bajo el supuesto cambiario utilizado. La capacidad debe aprobarse antes de crecer; no se autorizaron gastos nuevos.

## Pruebas y evidencia

- **PostgreSQL real aislado:** nueve suites, **255 pruebas aprobadas**, sin omisiones. Cubren ambos planes, pruebas vigentes/vencidas, Puri básico/avanzado, concurrencia, cuotas, cancelación, consentimiento/bajas/supresión, idempotencia, reintentos, recuperación, aislamiento y legacy. No se añadieron tests para replicar estilos o textos triviales.
- **Suite general final:** **1.601 aprobadas**, 102 omisiones condicionales de otros entornos. Las cuatro pruebas nuevas de rutas verifican membresía contra un negocio forjado y bloqueo de la ruta legacy para V2. El preview compilado se prueba con fingerprint correcto e incorrecto. No se presentan esas 102 omisiones como ejecutadas en esta revisión.
- **Typegen, TypeScript, ESLint y build aislado con webpack:** aprobados. El intento con Turbopack en la copia con `node_modules` por junction no pudo resolver `next/package.json` dentro de su raíz hermética; se utilizó el bundler soportado `--webpack`, sin cambiar la configuración del repositorio ni omitir chequeos de tipos.
- **OpenAI real, datos sintéticos:** Puri estándar y avanzado respondieron sin fallback, dos llamadas cada uno; cuatro reservas `SETTLED`, costo calculado y registrado de **US$0,000471**. Hubo además una llamada sintética mínima de inspección de uso. No es una factura del proveedor ni una prueba con datos de clientes.
- **Resend real:** solo lectura de dominio y uso. Firmas y eventos de supresión se probaron localmente con SDK/Svix y PostgreSQL. Entregas, rebotes, reintentos y bajas de campañas continúan validados con fixtures/simulador, no como eventos auténticos de Resend.
- **Navegador:** escritorio efectivo 1365 px y móvil 389 px, sin desbordamiento horizontal. Se verificaron aviso a 8/10, agotamiento a 10/10 tras el consumo real estándar, avanzado 2/10, correo 4/10, funciones exclusivas y periodo vencido. El recorrido de campaña terminó con cuatro entregas simuladas y una exclusión por falta de consentimiento.

Ver [evidencia consolidada](evidence/puri-contact-close-2026-10-28.json), [consumo de Plus](evidence/puri-contact-plus-quota-desktop.jpg), [cuota móvil](evidence/puri-contact-basic-quota-mobile.jpg) y [Contact Flow móvil](evidence/puri-contact-flow-mobile.jpg). Los cupos de las capturas son fixtures pequeños de QA; no son la propuesta comercial instalada. La propuesta pasó la validación del esquema sin activarse. El servidor web y el clúster local de pruebas quedaron detenidos; se conservaron los fixtures y las evidencias.

## Bloqueos reales restantes

La implementación queda utilizable en el entorno controlado. Para activar producción faltan **aprobación de las cuotas**, credenciales/cuenta comercial y remitente aislados, destinatarios técnicos autorizados para certificar entrega/baja/rebote real, instalación y supervisión del scheduler alojado y revisión explícita del sello de código. La propuesta transaccional requiere además aprobar capacidad y prioridades del servicio existente. No se afirma un envío de Resend, un scheduler remoto funcionando ni un lanzamiento conjunto listo mientras falte esa certificación.
