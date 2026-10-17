# Puragenda para ChatGPT y Codex

Implementación 1.0.0 preparada para conexión y revisión. No está publicada ni
aprobada por OpenAI. El endpoint propuesto es `https://www.puragenda.cl/mcp`;
su disponibilidad productiva requiere un despliegue autorizado.

- [Despliegue, revisión y rollback](deployment.md)
- [Verificación ejecutada y límites de la evidencia](verification.md)
- [Decisiones de seguridad y privacidad](security.md)
- [Documentación oficial consultada](sources.md)
- Paquete: `plugins/puragenda/`; distribución: `dist/puragenda-plugin-1.0.0.zip`.

## Arquitectura

Route Handler de Next.js, runtime Node, con el SDK oficial MCP 1.32.1 y Zod.
Streamable HTTP funciona por POST, sin estado de sesión de transporte y con
respuestas JSON. GET y DELETE devuelven 405; no hace falta mantener SSE o un
proceso residente en Vercel. Cada petición crea/cierra su servidor. Los límites
son 60 segundos por petición y 32 KiB de entrada; no hay tareas largas de IA.

```mermaid
flowchart LR
  C[ChatGPT / Codex] -->|Streamable HTTP| M[/mcp]
  C -->|DCR + PKCE S256| O[/oauth/*]
  O --> L[Login y consentimiento Puragenda]
  O --> D[(PostgreSQL: hashes y concesiones)]
  M --> A[Identidad, membresía, scopes y permisos actuales]
  A --> P[Herramientas existentes de Puri]
  A --> B[Catálogo y motor de reservas v1]
  M --> U[Participación pública explícita]
  U --> B
  B --> R[Preparación cifrada y aprobación en Puragenda]
  R --> W[Servicios canónicos, bloqueo de capacidad e idempotencia]
```

No se añade otro modelo de IA. `src/server/mcp/` adapta servicios existentes:

- `access.ts`, `oauth.ts`, `metadata.ts`, `security.ts`: autorización y límites.
- `read-tools.ts`: Puri, proyecciones mínimas y catálogo/disponibilidad v1.
- `public.ts`: participación pública y catálogo publicado.
- `operations.ts`: preparación, aprobación, ejecución y recuperación.
- `server.ts`: registro, anotaciones, autenticación por herramienta y errores.
- `retention.ts`: limpieza diaria autenticada con `CRON_SECRET`.

La creación HTTP existente se extrajo completa a
`src/server/booking/create-http.ts`; la ruta pública conserva su envoltorio.
El argumento interno de negocio autorizado nunca es un parámetro HTTP ni MCP.
Se reutilizan `BookingOperation`, el motor v1, el servicio de cancelación que
protege abonos y el servicio compartido de reprogramación. No se usan API keys
públicas ni cookies inventadas para acceder a la lógica canónica.

## OAuth y scopes

Authorization Code con PKCE S256 obligatorio, DCR de clientes públicos (`none`),
redirects registrados exactos, `resource` e issuer exactos y `iss` en respuestas
redirigidas de consentimiento. El motor mantenido `@node-oauth/oauth2-server`
5.3.1 valida el intercambio. No hay password grant, implicit grant ni tokens de
cliente. Access tokens opacos de 10 minutos; códigos de 2 minutos; concesión de
30 días como máximo, con refresh rotatorio limitado por esa concesión.

Cada conexión pertenece a un usuario y un negocio seleccionado explícitamente.
El perfil conserva un UUID por pareja usuario/negocio entre reconexiones; nunca
expone un identificador de sesión como perfil. La herramienta de perfil declara
`openai/profile` y un output schema estricto. No se anuncia OIDC ni email
verificado: el login actual no demuestra esos requisitos.

| Scope | Acceso solicitado; siempre sujeto al permiso interno |
| --- | --- |
| `account:read` | Perfil, negocio y sucursales accesibles; incluido y visible en todo consentimiento |
| `agenda:read` | Agenda, servicios, profesionales y disponibilidad |
| `analytics:read` | Estadísticas autorizadas |
| `clients:read` | CRM sin notas privadas |
| `loyalty:read` | Sellos, recompensas y saldos de gift cards sin códigos |
| `appointments:write` | Preparar y ejecutar cambios tras aprobación en Puragenda |

## Las 30 herramientas

Todas tienen schemas de entrada estrictos. Las lecturas son `readOnlyHint=true`,
`destructiveHint=false`. Las preparaciones guardan estado; no se anuncian como
lecturas. Los ejecutores privados declaran `destructiveHint=true`. Las seis
públicas declaran `noauth` y `openWorldHint=true`; las privadas, OAuth y
`openWorldHint=false`. Las anotaciones no sustituyen las comprobaciones servidor.

| Herramientas | Scope / condición |
| --- | --- |
| `get_connected_account`, `get_business_profile`, `list_accessible_locations` | `account:read` |
| `get_today_overview`, `list_appointments`, `get_appointment_details` | `agenda:read`, agenda propia/global y sucursal |
| `get_available_slots`, `list_services`, `list_staff` | `agenda:read`, catálogo y disponibilidad canónicos |
| `search_clients`, `get_client_summary`, `get_client_activity` | `clients:read`, permiso CRM y dueño del negocio |
| `get_revenue_summary`, `compare_periods`, `get_popular_services`, `get_staff_performance` | `analytics:read`, permisos financieros y de agenda aplicables |
| `get_loyalty_summary`, `get_gift_cards_summary` | `loyalty:read`, permiso interno y dueño del negocio |
| `prepare_appointment_creation`, `create_appointment` | `appointments:write`, permiso de gestión propia/global, sin abonos |
| `prepare_appointment_reschedule`, `reschedule_appointment` | `appointments:write`, cita sencilla elegible |
| `prepare_appointment_cancellation`, `cancel_appointment` | `appointments:write`, cita elegible sin pago aprobado |
| `search_public_businesses`, `get_public_business_details`, `get_public_service_catalog`, `get_public_availability` | Participación pública explícita y suscripción operativa |
| `prepare_public_booking`, `confirm_public_booking` | Participación pública, servicio completamente gratuito, sin abonos y aprobación del cliente |

Los agregados CRM/fidelización existentes cubren todo el negocio; por eso se
deniegan a empleados hasta disponer de filtros canónicos de sucursal. Nunca se
amplía su autorización para completar una respuesta. Los importes de clientes
exigen además `analytics:read` y permiso financiero; los nombres en fidelización
exigen `clients:read`. Las gift cards sólo permiten consultar saldos con su
permiso específico: no se compran ni canjean.

Las citas tienen páginas de 50 y `nextCursor`; búsqueda pública, 20; CRM, 10.
Los períodos son enumerados, la disponibilidad llega a 90 días y la actividad
CRM usa 90 días. Los cálculos de ingresos rechazan más de 5.000 citas y las
respuestas mayores de 100.000 caracteres fallan con un error seguro.
Zona horaria y moneda proceden de la sucursal/negocio. Cobrado, pendiente y
valor reservado se distinguen; los períodos financieros siguen fecha de cita,
no fecha contable del pago.

## Cambios de citas

1. Obtener IDs autorizados mediante herramientas de lectura.
2. Preparar con un `operationKey` UUID que se conserva en reintentos.
3. Mostrar resumen, vencimiento y `approvalUrl`; el usuario revisa en Puragenda.
4. La página comprueba sesión del usuario de la conexión en cambios privados,
   origen, CSRF y recibo. El POST sólo aprueba; no modifica la cita.
5. Ejecutar con el mismo recibo. El servidor vuelve a comprobar permisos,
   participación, snapshot, disponibilidad y precio/duración canónicos.
6. Comunicar el estado real. `PENDING`, HTTP 202 y `calendarSync=pending`
   requieren explicaciones explícitas; no significan confirmación ni pago.

El recibo es aleatorio, limitado a conexión, negocio, acción y datos, y vence a
los 10 minutos desde preparación. La repetición devuelve el mismo resultado.
Un cambio de parámetros con la misma clave falla. Un resultado temporal pide
reintentar con el mismo recibo; nunca generar otra clave para eludirlo. Tras
vencer sólo se recupera un checkpoint de una reserva ya persistida, sin crear
otra. Los datos cifrados dejan de ser accesibles a las 24 horas.

Reprogramación/cancelación rechazan recurrencias, múltiples servicios, gift
cards aplicadas y pagos aprobados. Reprogramar conserva servicio, profesional,
duración y valor de la cita. El calendario se intenta sincronizar después del
commit; una indisponibilidad del proveedor se informa como pendiente. Estas
dos operaciones no añaden nuevos correos de notificación.

## Interfaz y comercio

Configuración incorpora una tarjeta con conexiones, scopes, revocación y opt-in
público, usando los componentes actuales. Los empleados pueden revocar sus
conexiones en `/integraciones/chatgpt/conexiones` aunque no gestionen ajustes.
`/integraciones/chatgpt` explica conexión, permisos y límites. Se añadieron
mensajes es/en; el resto de idiomas usa el fallback inglés existente.

Las políticas consultadas limitan el comercio a bienes físicos. El conector no
vende planes, no procesa abonos ni devuelve checkout para vender servicios.
Las reservas públicas son exclusivamente gratuitas; el catálogo puede mostrar
servicios pagados como información, marcados como no reservables por MCP.
La gestión privada administra citas de una cuenta existente, sin realizar
transacciones de pago. La revisión OpenAI debe confirmar este alcance.
