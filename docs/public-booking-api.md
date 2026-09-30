# API pública de reservas v1

Implementada para consumidores con formulario propio. Puragenda conserva catálogo,
precios, duración, reglas, disponibilidad y escritura de citas. No requiere el widget.
Los ejemplos son fixtures; no describen el catálogo de `estetica-bella`.

## Alcance, autenticación y versiones

| Operación | Ruta | Contrato |
| --- | --- | --- |
| Catálogo | `GET /api/business/{slug}/booking-catalog` | `version: "1"` |
| Horarios finales | `GET /api/business/{slug}/availability` | `version: "1"` |
| Reserva | `POST /api/business/{slug}/book` | Cabecera `Puragenda-Booking-Version: 1` |

Enviar `x-api-key` de ese negocio en las tres rutas. Los nuevos GET nunca aceptan
la clave por query ni por cuerpo. Esta es la clave pública de reservas que ya usa
el widget, no una credencial administrativa: no permite administrar servicios,
clientes, cuentas, pagos ni leer datos de otras citas. El consumidor PuroCode debe
mantenerla en su servidor, sin `NEXT_PUBLIC_` ni logs. Los IDs deben pertenecer al
negocio, sucursal, servicio y profesional consultados.

Los GET y las nuevas escrituras requieren una suscripción operativa: ACTIVE,
TRIALING con prueba vigente o PAST_DUE dentro de su gracia. Devuelven 403
`SUBSCRIPTION_INACTIVE` cuando no hay acceso. La recuperación de una operación ya
iniciada sigue disponible con la clave correcta aunque la suscripción haya vencido.

El POST sin cabecera de versión ni `Idempotency-Key` mantiene su respuesta legacy
(incluidos `id`, `status`, `depositRequired`, `paymentUrl`, `feedbackToken` y demás
campos existentes). `Idempotency-Key` implica v1, con una respuesta mínima y sin
modelos Prisma ni contactos. Se versiona solamente esta proyección porque eliminar
campos de la respuesta antigua rompería consumidores.

v1 admite una cita de un servicio con opciones, selección de sucursal y profesional
cuando corresponda. Producción, recurrencia, grupos simultáneos, promociones,
premios, descuentos y Gift Cards quedan fuera de este contrato. Sus rutas/flujos
legacy siguen disponibles. `staffId: "any"` no es un ID válido.

## Unidades y valores nulos

`price`, `priceDelta` y `depositAmount` son unidades mayores de la moneda ISO del
negocio: 20000 CLP son veinte mil pesos, 12.75 USD son doce dólares con 75 centavos;
no son centavos ni cadenas formateadas. Precio y deltas se suman sin redondear.
La configuración actual de abonos usa enteros en unidades mayores y limita el
abono al total restante redondeado como hace la ruta existente. `duration` y
`durationDelta` son minutos enteros, sumados al servicio base. Las opciones actuales
solo admiten deltas no negativos. No hay precios/duraciones autoritativos del cliente.

`imageUrl`, `description`, `category`, dirección y enlace de mapas pueden ser
`null`; no se rellenan con imágenes o ubicaciones ficticias. Los arrays pueden estar
vacíos. En agenda BUSINESS `staff` es `[]`, `staffId` de un slot es `null` y debe
omitirse del POST; la capacidad es por sucursal, sin profesional público inventado.
En agenda STAFF se elige un profesional habilitado.

## Catálogo

Request: `GET /api/business/{slug}/booking-catalog` con `x-api-key`.
Respuesta completa de ejemplo:

```json
{
  "version": "1",
  "business": {"id":"business-fixture","slug":"fixture","name":"Negocio de prueba","timezone":"America/Santiago","currency":"CLP"},
  "services": [{
    "id":"service-fixture","name":"Tratamiento de prueba","description":null,"imageUrl":null,"category":null,
    "price":20000,"duration":60,"depositAmount":5000,"locationIds":["location-fixture"],
    "optionCategories":[{
      "id":"category-fixture","name":"Formato","isRequired":true,"maxSelections":1,
      "alternatives":[
        {"id":"option-local","name":"En local","priceDelta":0,"durationDelta":0,"isHomeService":false},
        {"id":"option-home","name":"A domicilio","priceDelta":5000,"durationDelta":30,"isHomeService":true}
      ]
    }]
  }],
  "staff":[{"id":"staff-fixture","name":"Profesional de prueba","imageUrl":null,"serviceIds":["service-fixture"],"locationIds":["location-fixture"],"allServices":false}],
  "locations":[{"id":"location-fixture","slug":"principal","name":"Local de prueba","address":null,"mapsUrl":null,"timezone":"America/Santiago","isPrimary":true}],
  "capabilities":{"singleAppointment":true,"production":false,"recurring":false,"firstAvailable":true,"idempotency":true,"maxDaysAhead":90},
  "rules":{
    "scheduleMode":"STAFF","staffSelection":"REQUIRED","slotInterval":30,
    "minAdvanceBookingMinutes":60,"advanceAppliesTo":"SAME_DAY","allowSameDayBookings":true,"depositEnabled":true,
    "customerFields":{"name":true,"email":true,"phone":true,"address":"HOME_OPTIONS_ONLY"}
  }
}
```

Cada categoría requerida exige al menos una alternativa; ninguna puede superar
`maxSelections`. IDs desconocidos o repetidos son inválidos. Una alternativa
`isHomeService: true` exige `customerAddress` con al menos cinco caracteres.
Las asignaciones vacías de servicios de un profesional significan que puede
realizar todos los servicios, según la regla existente; el DTO declara
`allServices: true` y entrega esos IDs explícitos. Las asignaciones de sucursales
siempre son reales y activas. Cruzar `service.locationIds`, `staff.serviceIds` y
`staff.locationIds` para construir las elecciones, sin inferir especialidades.

Solo se publican servicios APPOINTMENT sin `recurringPlan`, asignados a alguna
sucursal activa. No se publican horarios privados, bloqueos, claves, contactos,
tokens ni credenciales. El máximo implementado es 500 servicios, 100 profesionales
y 50 sucursales: excederlo falla explícitamente con 422 `CATALOG_LIMIT`.

## Disponibilidad

Los parámetros usan codificación estándar URLSearchParams / percent encoding:

| Parámetro | Obligatorio | Codificación exacta |
| --- | --- | --- |
| `date` | Sí | Fecha civil existente `YYYY-MM-DD`, en zona de la sucursal |
| `serviceId` | Sí | ID del catálogo, hasta 100 caracteres |
| `locationId` | No | ID; omitir elige principal y luego orden configurado |
| `staffId` | En STAFF | ID público habilitado, nunca `any` |
| `firstAvailable` | No | Literal `true` o `false`; excluyente con staffId |
| `selectedOptionAlternativeIds` | Según opciones | Repetir la clave una vez por ID; máximo 50, sin CSV ni JSON |

Ejemplo:
`?date=2026-10-01&serviceId=service-fixture&locationId=location-fixture&staffId=staff-fixture&selectedOptionAlternativeIds=option-home`.
Parámetros desconocidos o parámetros escalares repetidos devuelven 400. URL máxima
8192 caracteres. Solo se admite un día por solicitud, desde hoy hasta hoy+90 días
civiles inclusive. No se permite consultar el pasado ni un rango sin límite.

```json
{
  "version":"1","date":"2026-10-01","timezone":"America/Santiago","locationId":"location-fixture",
  "selection":{"serviceId":"service-fixture","selectedOptionAlternativeIds":["option-home"],"duration":90,"price":25000,"currency":"CLP","requiresAddress":true},
  "slots":[{"startTime":"2026-10-01T12:00:00.000Z","endTime":"2026-10-01T13:30:00.000Z","staffId":"staff-fixture"}]
}
```

Una selección válida en un día cerrado, bloqueado, sin profesionales libres o sin
horas devuelve **200 con `slots: []`**. Una selección inválida produce un error;
una lista vacía de `/appointments` nunca se interpreta como disponibilidad.
`firstAvailable=true` devuelve un slot por inicio y resuelve el profesional de menor
ID entre los elegibles libres a esa hora. Enviar el `staffId` resuelto en el POST.
El POST no recibe el selector de primera disponible; reserva ese profesional.

Motor compartido: `buildSlots` + `buildBookingSlots` + restricciones del servicio.
Incluye horario de sucursal (con fallback al negocio igual que el widget), pausas,
excepciones de negocio y profesional, horario de la asignación a la sucursal,
servicios especiales, duración con opciones, cadencia, fechas bloqueadas, citas y
bloqueos públicos, Google Calendar y reglas por plan. PENDING y AWAITING_PAYMENT
ocupan capacidad; únicamente CANCELLED libera el intervalo. La anticipación mínima
se aplica al mismo día, como en el widget existente, con inicio estrictamente
posterior al corte. Se mantiene esta semántica explícita, sin extenderla a otros días.

La zona efectiva es `location.timezone` y luego `business.timezone`. Timestamps de
respuesta son UTC con `Z`; el consumidor formatea sus etiquetas. El motor valida
el viaje local→UTC→local: excluye horas inexistentes y rangos cuya duración real
cambia al cruzar un salto DST. En horas repetidas publica una sola ocurrencia,
seleccionada consistentemente por `date-fns-tz`, no dos slots indistinguibles.
La consulta interna de bloqueos cubre un margen acotado alrededor del mediodía
local para incluir colisiones que atraviesan medianoche o un cambio de horario;
solo se devuelven slots del día civil solicitado. En BUSINESS se consideran los
bloqueos y calendarios de personal interno de la sucursal sin exponer ese personal.

## Creación, resultado y abono

```http
POST /api/business/{slug}/book
x-api-key: <PURAGENDA_API_KEY>
Puragenda-Booking-Version: 1
Idempotency-Key: <UUID_DE_LA_OPERACION>
Content-Type: application/json
```

```json
{
  "serviceId":"service-fixture","locationId":"location-fixture","staffId":"staff-fixture",
  "selectedOptionAlternativeIds":["option-home"],
  "customerName":"Cliente de prueba","customerEmail":"cliente@example.invalid","customerPhone":"+56911111111",
  "customerAddress":"Dirección de prueba",
  "startTime":"2026-10-01T12:00:00.000Z","endTime":"2026-10-01T13:30:00.000Z"
}
```

`endTime` se conserva por compatibilidad: debe coincidir con la duración canónica.
El servidor calcula el fin que escribe. Campos de precio/duración enviados por el
consumidor se descartan. Nombre de 2–100 caracteres, email válido hasta 255,
teléfono según validador existente (8–18 caracteres de números/formato telefónico),
dirección opcional hasta 300. Cuerpo JSON v1 máximo 32 KiB incluso sin Content-Length;
el límite legacy es 256 KiB para conservar selecciones amplias de opciones.

La ruta existente vuelve a validar los datos y usa `createAppointment`, con CRM,
notificaciones, abonos e integraciones existentes. v1 revalida selección,
suscripción, precio, duración y horarios con datos actuales dentro de la
transacción de escritura. Colisiones y bloqueos se comprueban de nuevo bajo un
advisory lock por negocio. El trigger de la migración es el guard final para TODOS
los escritores de citas, incluyendo SQL directo y actualizaciones: una capacidad
por sucursal en INDIVIDUAL, una por profesional en EQUIPO/TEST. Un profesional
no puede solaparse entre sucursales; una cita sin profesional bloquea su sucursal.
Intervalos adyacentes son permitidos. Ninguna llamada a proveedor ocurre bajo
el lock de creación. Los conflictos públicos no incluyen nombres de otras citas.

Respuesta 201 sin abono:

```json
{
  "id":"appointment-fixture","status":"PENDING","depositRequired":false,"paymentUrl":null,
  "booking":{"version":"1","state":"pending","startTime":"2026-10-01T12:00:00.000Z","endTime":"2026-10-01T13:30:00.000Z","staffId":"staff-fixture","locationId":"location-fixture","price":25000,"duration":90,"currency":"CLP","depositAmount":0}
}
```

Respuesta 201 con abono:

```json
{
  "id":"appointment-fixture","status":"AWAITING_PAYMENT","depositRequired":true,
  "paymentUrl":"https://payments.example.invalid/checkout",
  "booking":{"version":"1","state":"awaiting_payment","startTime":"2026-10-01T12:00:00.000Z","endTime":"2026-10-01T13:30:00.000Z","staffId":"staff-fixture","locationId":"location-fixture","price":25000,"duration":90,"currency":"CLP","depositAmount":5000}
}
```

`CONFIRMED` se proyecta como `state: "confirmed"`; `PENDING` como `pending`;
`AWAITING_PAYMENT` como `awaiting_payment`. HTTP 201 significa cita creada, **no
confirmación ni pago**. Este contrato simple normalmente crea PENDING o
AWAITING_PAYMENT. La confirmación posterior sigue los flujos existentes.
`paymentUrl` puede ser null; puede apuntar a la página de abono manual de Puragenda
con autorización incluida, o al checkout existente de Mercado Pago. Tratar el
enlace como dato sensible de esa operación. El navegador decide cómo presentar
el resultado o continuar al abono; no automatizar pagos en pruebas.

## Idempotencia persistente y fallos

La cabecera es opcional para legacy y recomendada para todo consumidor externo.
Debe ser ASCII imprimible sin espacios, de 8–128 caracteres (un UUID funciona).
Guardar una clave por intención de reserva **antes** de enviar el primer POST.
No generar otra clave ante timeout. La clave se almacena hasheada por negocio en
PostgreSQL, junto con hash del payload validado, lease de 120 segundos, checkpoint
y resultado mínimo. No hay mapa de idempotencia en memoria.

Payloads equivalentes normalizan email, espacios de campos según Zod, orden de
opciones, orden de propiedades, timestamps UTC equivalentes y lista de un único
servicio equivalente al servicio principal. Campos desconocidos se descartan.
Una clave con payload distinto devuelve 409 `IDEMPOTENCY_PAYLOAD_CONFLICT`.

Mientras una operación tiene lease activo, otra solicitud devuelve 409
`BOOKING_IN_PROGRESS` y `Retry-After: 2`. Al terminar, el replay devuelve el mismo
cuerpo/HTTP almacenado y `Idempotency-Replayed: true`, sin nuevas citas, correos,
preferencias de pago ni sincronizaciones. El resultado es el snapshot original,
no una consulta del estado de pago posterior.

Si cae el proceso **antes de la cita**, un lease vencido puede reclamarse. Un token
de propietario con bloqueo de fila impide que el trabajador antiguo escriba. Los
errores 5xx sin cita permiten volver a ejecutar la misma operación.

La cita y su vínculo/checkpoint se guardan **atómicamente**. Si cae el proceso
después de esa escritura, pero antes de almacenar el resultado final, un reintento
tras el lease devuelve 202 con el mismo ID y checkpoint:

```json
{
  "id":"appointment-fixture","status":"PENDING","depositRequired":false,"paymentUrl":null,
  "booking":{"version":"1","state":"pending","startTime":"2026-10-01T12:00:00.000Z","endTime":"2026-10-01T13:30:00.000Z","staffId":"staff-fixture","locationId":"location-fixture","price":25000,"duration":90,"currency":"CLP","depositAmount":0},
  "operationStatus":"RECOVERY_REQUIRED","code":"BOOKING_RECOVERY_REQUIRED"
}
```

La recuperación es deliberadamente conservadora: no vuelve a ejecutar un efecto
externo cuyo resultado pueda ser incierto. Un operador debe revisar esa cita,
preferencia de pago y entregas; puede faltar un correo o la URL de pago. No crear
otra cita ni pagar desde un resultado incierto. Si el trabajador original todavía
termina, un reintento posterior obtiene su resultado final. No se promete entrega
exactamente una vez a proveedores externos ni recuperación automática de una
preferencia o email cuya respuesta se perdió. Los checkpoints de URL se actualizan
antes de notificar. Un fallo conocido al crear el enlace cancela la cita y conserva
el 502 como resultado idempotente, sin repetir la preferencia al reintentar.

Ventana de uso/replay: 24 horas desde el primer intento. Después devuelve 409
`IDEMPOTENCY_EXPIRED`. La fila se conserva como tombstone; no se reutiliza la clave
silenciosamente aunque se haya cancelado o eliminado físicamente la cita. El ID y
checkpoint de la operación permanecen como snapshot. No borrar operaciones pendientes
o tombstones sin una política de retención que preserve esta garantía.

## Errores, límites y CORS

Errores v1 tienen `{ "error": "mensaje", "code": "CODIGO" }`; algunos errores de
validación legacy conservan `details`. No interpretar el texto traducible como código.

| HTTP | Códigos | Acción |
| --- | --- | --- |
| 400 | INVALID_QUERY, INVALID_SELECTION, INVALID_REQUEST, INVALID_JSON, INVALID_IDEMPOTENCY_KEY, UNSUPPORTED_CAPABILITY, UNSUPPORTED_VERSION, DATE_OUT_OF_RANGE | Corregir selección/entrada |
| 401 | UNAUTHORIZED | Revisar clave del negocio |
| 403 | SUBSCRIPTION_INACTIVE, NO_SHOW_BLOCKED, BOOKING_FORBIDDEN | Detener flujo; negocio debe resolverlo |
| 404 | BUSINESS_NOT_FOUND, RESOURCE_NOT_FOUND | Revisar negocio/servicio |
| 409 | SLOT_CONFLICT, SELECTION_CHANGED | Refrescar catálogo/horarios; nueva intención si cambia selección |
| 409 | BOOKING_IN_PROGRESS | Esperar Retry-After y repetir misma clave/payload |
| 409 | IDEMPOTENCY_PAYLOAD_CONFLICT, IDEMPOTENCY_EXPIRED | No repetir con otra clave automáticamente |
| 409 | BOOKING_CONFLICT | Revisar configuración de abono u otra regla del negocio |
| 413 | REQUEST_TOO_LARGE | Reducir cuerpo/URL |
| 422 | CATALOG_LIMIT | Reducir catálogo o ampliar capacidad del servidor |
| 429 | RATE_LIMITED | Respetar Retry-After |
| 500 | INTERNAL_ERROR | Reintentar misma clave, conservar estado incierto |
| 502 | PAYMENT_LINK_FAILED | En fallo conocido la cita se cancela; misma clave conserva ese resultado |
| 202 | BOOKING_RECOVERY_REQUIRED | Cita existe; revisar efectos pendientes, no volver a crear |

GET: 120 solicitudes/minuto/IP usando el limiter existente; POST: 10 por cinco
minutos/IP. Son límites por instancia con la whitelist existente. Para un despliegue
con múltiples instancias configurar además el límite compartido en gateway; el
store de idempotencia y la capacidad sí son compartidos en PostgreSQL.

Catálogo y disponibilidad: `Cache-Control: private, no-store`, `Vary: x-api-key`.
No cachear slots ni usar resultados anteriores como autorización de escritura.
Respuestas v1 de reserva también son no-store. Cada GET consulta datos actuales.

El proxy legacy reflejaba Origin en `/api/business`; se conserva para el widget y
las rutas existentes, agregando las cabeceras de versión e idempotencia a su
preflight. Los nuevos GET no agregan Access-Control-Allow-Origin: su consumo
previsto es servidor a servidor, sin CORS abierto. CORS no autentica peticiones;
la clave siempre se verifica. `allowedOrigins` sigue siendo configuración legacy
no aplicada por estos handlers; no prometer una allowlist administrativa aquí.

## Adaptador consumidor y ejemplos

Variables exclusivamente servidor:

```sh
export PURAGENDA_BASE_URL='https://<HOST_PURAGENDA>'
export PURAGENDA_BUSINESS_SLUG='<SLUG_DEL_NEGOCIO>'
export PURAGENDA_API_KEY='<CLAVE_PUBLICA_DEL_NEGOCIO>'
```

```sh
curl --fail-with-body "$PURAGENDA_BASE_URL/api/business/$PURAGENDA_BUSINESS_SLUG/booking-catalog" \
  -H "x-api-key: $PURAGENDA_API_KEY"

curl --fail-with-body --get "$PURAGENDA_BASE_URL/api/business/$PURAGENDA_BUSINESS_SLUG/availability" \
  -H "x-api-key: $PURAGENDA_API_KEY" \
  --data-urlencode 'date=2026-10-01' --data-urlencode 'serviceId=<SERVICE_ID>' \
  --data-urlencode 'locationId=<LOCATION_ID>' --data-urlencode 'staffId=<STAFF_ID>' \
  --data-urlencode 'selectedOptionAlternativeIds=<OPTION_ID>'

curl --fail-with-body "$PURAGENDA_BASE_URL/api/business/$PURAGENDA_BUSINESS_SLUG/book" \
  -H "x-api-key: $PURAGENDA_API_KEY" -H 'Content-Type: application/json' \
  -H 'Puragenda-Booking-Version: 1' -H 'Idempotency-Key: <UUID_GUARDADO>' \
  --data-binary @booking-request.json
```

`booking-request.json` debe contener el request completo mostrado arriba, con IDs
y slot obtenidos del catálogo/disponibilidad reales. En BUSINESS omitir staffId.
Ejemplo de transporte servidor (añadir validación runtime de los DTOs en el adaptador):

```ts
const base = process.env.PURAGENDA_BASE_URL!;
const slug = process.env.PURAGENDA_BUSINESS_SLUG!;
const key = process.env.PURAGENDA_API_KEY!;
async function call(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}/api/business/${encodeURIComponent(slug)}/${path}`, {
    ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
    headers: { "x-api-key": key, ...init.headers },
  });
  const value = await response.json();
  if (!response.ok) throw { status: response.status, code: value.code, retryAfter: response.headers.get("Retry-After") };
  return { status: response.status, value };
}
export async function getCatalog() {
  return (await call("booking-catalog")).value;
}
export async function getAvailability(query: {
  date: string; serviceId: string; locationId?: string; staffId?: string;
  firstAvailable?: boolean; selectedOptionAlternativeIds: string[];
}) {
  const params = new URLSearchParams({ date: query.date, serviceId: query.serviceId });
  if (query.locationId) params.set("locationId", query.locationId);
  if (query.staffId) params.set("staffId", query.staffId);
  if (query.firstAvailable) params.set("firstAvailable", "true");
  for (const id of query.selectedOptionAlternativeIds) params.append("selectedOptionAlternativeIds", id);
  return (await call(`availability?${params}`)).value;
}
export async function createBooking(request: object, operationKey: string) {
  return await call("book", { method: "POST", headers: {
    "Content-Type": "application/json", "Puragenda-Booking-Version": "1", "Idempotency-Key": operationKey,
  }, body: JSON.stringify(request) });
}
```

Recorrido del adaptador: `getCatalog()` → filtrar servicios/opciones/sucursal y
profesionales compatibles → `getAvailability(query)` → elegir slot y conservar
profesional resuelto → completar datos y dirección condicional → guardar clave
de operación → `createBooking(request, operationKey)` → mapear `booking.state`
a resultado propio y ofrecer `paymentUrl` cuando corresponda. `status === 202`
necesita resultado incierto/revisión, aunque `Response.ok` sea true. Ante 409 de
slot volver a disponibilidad; ante 429 esperar; ante timeout mantener misma clave
y payload. Cambiar selección crea una intención nueva después de resolver la anterior.
El contrato no conoce estilos, rutas `/studio` ni marcas del consumidor.

## Implementación, pruebas y habilitación

Archivos principales:

- `src/server/booking/contracts.ts`: DTOs públicos explícitos.
- `src/server/booking/read.service.ts`, `http.ts`, `response.ts`: catálogo, selección, autenticación y respuestas.
- `src/core/booking-selection.ts`: cálculo y validación de opciones compartidos con `/book`.
- `src/core/booking-availability.ts`: motor final compartido con el widget, sobre `availability.ts` y `service-availability.ts` existentes.
- `src/server/booking/idempotency.ts`: PostgreSQL, leases, fencing y checkpoints.
- Nuevas rutas `booking-catalog` y `availability`; ampliación de `book`, `appointments`, validadores y proxy.
- `appointment.service.ts`: comprobación transaccional de capacidad y validación v1 al escribir.
- `src/server/email/send.ts` y `resend.ts`: logs de entrega sin destinatarios ni payloads; mock sin volcados de correos.
- `widget-client.tsx`: reutiliza motor y duración total con opciones; mantiene flujos de producción/recurrencia.
- `prisma/schema.prisma` y migración `20260930120000_public_booking_operations`.
- Tests `booking-selection`, `booking-availability`, `booking-read`, `booking-api.integration`; fixture local; ajustes de mock de colisiones Google y expectativas de privacidad en logs de correo.
- `scripts/test-booking-api-local.mjs`, script npm `test:booking:local`.

Auditoría sobre la rama inicial: las observaciones de `6f0ab22` siguen vigentes.
`/services` y `/appointments` permanecen disponibles; el primero no se convierte
en un bootstrap y el segundo sigue devolviendo rangos bloqueados. Se corrigieron la
zona de sucursal y fechas bloqueadas en estos rangos para que el widget concuerde.
La comprobación antigua de colisión leía fuera de la transacción y divulgaba el
nombre del cliente; ahora se comprueba bajo lock y el error público es genérico.

Validación ejecutada el 30-09-2026:

- Base previa: typecheck y suite original, 889 tests pasados / 2 omitidos.
- `npm run test:booking:local`: 49 tests pasados; esquema PostgreSQL efímero en loopback, migración SQL real, proveedores simulados.
- `npm run test`: 919 tests pasados; 21 omitidos incluyen las 19 pruebas de BD ejecutadas por separado y las 2 omisiones previas.
- `npm run typecheck`: correcto.
- Build Next.js completo sobre base local: correcto (`node scripts/test-booking-api-local.mjs --build`, mismo Next build del script npm).
- `npm run lint`: falla por regla de hooks en `.agents/skills/media-use/scripts/recipe.mjs:83`, archivo ajeno que ya estaba sin seguimiento al iniciar; 34 warnings. Lint de archivos de esta ampliación se verifica por separado, sin corregir cambios ajenos.
- Verificación de navegador y detalles finales: ver `public-booking-api-verification.md`.

No se aplicó migración a producción, ni se modificó el catálogo de Estética Bella,
ni se enviaron pagos/correos reales. No hubo push, merge, deploy ni cambios en PuroCode.

Para habilitar posteriormente: revisar y aplicar la migración con autorización en
el entorno elegido (`prisma migrate deploy`), generar cliente Prisma, desplegar
la rama con autorización, configurar gateway si hay varias instancias y asignar
la clave de reservas al servidor consumidor. Revisar solapamientos existentes
antes del despliegue: el trigger no reescribe ni valida retroactivamente filas,
pero rechaza nuevas escrituras/actualizaciones que solapen capacidad. Operadores
deben tener un procedimiento para 202 de recuperación de efectos inciertos.
Integrar y probar PuroCode en otra tarea; solo entonces ejecutar con autorización
la aceptación de una cita real del negocio de prueba visible en dashboard.
La demo sigue sin declararse conectada.
