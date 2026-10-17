# Justificación individual de herramientas 1.0.1

**VALIDADO MEDIANTE CLIENTE MCP**: 30 descriptores descubiertos con SDK e
Inspector sobre HTTPS; 30 herramientas invocadas con éxito en el fixture.
[Descriptores y schemas completos](evidence/tools.json),
[llamadas y argumentos saneados](evidence/https-client.json).
**VALIDADO EN CHATGPT REAL**, con captura aportada por el usuario y backend:
`get_connected_account` y `list_appointments`.
[Alcance exacto](chatgpt-real-confirmation.md). La evaluación completa de selección
y tool scan siguen pendientes externamente.

Se aplican los criterios actuales de
[App review](https://developers.openai.com/plugins/deploy/app-review) y
[Authentication](https://developers.openai.com/plugins/build/auth).
`R/D/O` significa `readOnlyHint/destructiveHint/openWorldHint`; T/F son booleanos.
Los contadores y auditorías técnicos no hacen que una consulta sea una operación
de negocio. Guardar una preparación sí crea estado significativo del flujo.
Un correo es irreversible; un calendario privado conectado sigue siendo un
ámbito acotado de la cuenta aunque esté alojado en un proveedor externo.

Todas las entradas son objetos estrictos (`additionalProperties=false`) y sus
descripciones están publicadas en el descriptor enlazado. `locationId` es
opcional en lecturas y siempre se comprueba; su omisión usa la principal
autorizada. No existe `businessId` administrativo introducido por el modelo.
Se anuncia el scope indicado tanto en `securitySchemes` como en `_meta`.
Scopes, membresía, sucursal y permisos internos se vuelven a validar al llamar.

| Herramienta | R/D/O | Auth / scope | Entrada y salida útiles | Justificación concreta |
| --- | --- | --- | --- | --- |
| `get_connected_account` | T/F/F | OAuth `account:read` | `{}` → id estable, nombre y nickname del negocio | Identifica el perfil vinculado; no modifica la cuenta ni publica información. Declara `openai/profile`. |
| `get_business_profile` | T/F/F | OAuth `account:read` | `{}` → nombre, zona horaria y moneda | Lee atributos mínimos del negocio de la concesión, sin buscar terceros. |
| `list_accessible_locations` | T/F/F | OAuth `account:read` | `{}` → sucursales activas autorizadas | Enumera permisos actuales; no crea sucursales ni concede acceso. |
| `get_today_overview` | T/F/F | OAuth `agenda:read` | sucursal opcional → resumen local de hoy | Consulta agenda existente; sólo muestra importes con permiso/scope financiero adicional. |
| `list_appointments` | T/F/F | OAuth `agenda:read` | período, cursor/estado/sucursal opcionales → hasta 50 citas y nextCursor | Lee citas dentro de agenda propia/global; no reserva horarios. |
| `get_appointment_details` | T/F/F | OAuth `agenda:read` | appointmentId y sucursal opcional → fecha, servicio, profesional, estado | Proyecta una cita autorizada sin notas privadas ni efectos. Un ID ajeno no amplía el ámbito. |
| `get_available_slots` | T/F/F | OAuth `agenda:read` | fecha, servicio, opciones, profesional/sucursal → selección y slots | Calcula disponibilidad canónica sin bloquear slots ni alterar citas. |
| `list_services` | T/F/F | OAuth `agenda:read` | sucursal opcional → servicios, opciones, moneda | Lee catálogo del negocio/sucursal, sin cambiar precios ni vender. |
| `list_staff` | T/F/F | OAuth `agenda:read` | sucursal opcional → profesionales y asignaciones filtradas | Lista profesionales permitidos; no invita usuarios ni modifica permisos. |
| `search_clients` | T/F/F | OAuth `clients:read` | query y sucursal opcional → hasta 10 clientes | Búsqueda CRM del dueño con permiso global; no contacta personas ni revela notas privadas. Sellos requieren loyalty:read. |
| `get_client_summary` | T/F/F | OAuth `clients:read` | clientId y sucursal opcional → visitas/actividad mínima | Agrega datos existentes del cliente autorizado. Finanzas y sellos requieren scopes adicionales; no cambia su ficha. |
| `get_client_activity` | T/F/F | OAuth `clients:read` | sort y sucursal opcional → hasta 10 clientes de últimos 90 días | Clasifica actividad existente del negocio; no envía campañas ni mensajes. |
| `get_revenue_summary` | T/F/F | OAuth `analytics:read` | período y sucursal opcional → cobrado, pendiente, valor reservado | Agrega citas/cobros autorizados por fecha de cita; no cobra, factura ni concilia pagos. |
| `compare_periods` | T/F/F | OAuth `analytics:read` | current, previous, sucursal opcional → comparación de métricas | Lee ambos períodos con los mismos filtros y permisos; no cambia datos históricos. |
| `get_popular_services` | T/F/F | OAuth `analytics:read` | período y sucursal opcional → reservas y valor por servicio | Ordena agregados del negocio; no publica rankings externos ni modifica servicios. |
| `get_staff_performance` | T/F/F | OAuth `analytics:read` | período y sucursal opcional → citas/valor por profesional | Requiere agenda global y finanzas; consulta métricas privadas sin decisiones ni cambios laborales. |
| `get_loyalty_summary` | T/F/F | OAuth `loyalty:read` | sucursal opcional → sellos/recompensas | Lee saldos del dueño con permiso; no otorga ni canjea. Nombres requieren clients:read. |
| `get_gift_cards_summary` | T/F/F | OAuth `loyalty:read` | sucursal opcional → cantidades/saldos por moneda | Consulta agregados con permiso específico; no devuelve códigos, compra ni canjea tarjetas. |
| `prepare_appointment_creation` | F/F/F | OAuth `appointments:write` | UUID operationKey, selección, fecha y contacto → resumen, recibo, vencimiento y approvalUrl | Persiste preparación cifrada del negocio vinculado. No crea cita, envía correo ni bloquea horario; el recibo es reutilizable idempotentemente. |
| `create_appointment` | F/T/T | OAuth `appointments:write` | receipt → resultado canónico, estado y sync | Crea la cita aprobada y puede enviar correos a destinatarios indicados. Esos efectos irreversibles y destinatarios abiertos justifican D/O=true aunque la cita pertenezca a la cuenta. |
| `prepare_appointment_reschedule` | F/F/F | OAuth `appointments:write` | UUID, appointmentId, locationId, nueva fecha → resumen y aprobación | Guarda propuesta cifrada; la cita y el calendario aún no cambian. Ámbito privado y sin efectos irreversibles. |
| `reschedule_appointment` | F/T/F | OAuth `appointments:write` | receipt → cita y estado de calendario | Cambia el horario previo y puede sincronizar el calendario privado conectado. Afecta un compromiso existente; no publica ni admite destinatarios externos abiertos. |
| `prepare_appointment_cancellation` | F/F/F | OAuth `appointments:write` | UUID, appointmentId, locationId → resumen y aprobación | Persiste propuesta de cancelación; no libera capacidad ni cancela la cita todavía. |
| `cancel_appointment` | F/T/F | OAuth `appointments:write` | receipt → estado cancelado/sync | Cancela compromiso y libera capacidad; puede actualizar calendario privado. Rechaza pagos aprobados y no añade correos. |
| `search_public_businesses` | T/F/T | `noauth` | query y cursor opcional → hasta 20 negocios participantes | Busca en catálogo público de negocios que optaron por aparecer. No cambia participación ni busca datos privados. |
| `get_public_business_details` | T/F/T | `noauth` | slug → negocio y sucursales públicas | Lee datos de un negocio participante fuera de una cuenta vinculada, sin revelar datos privados. |
| `get_public_service_catalog` | T/F/T | `noauth` | slug → servicios/opciones/precios y capacidades | Consulta catálogo público; informa precios sin vender ni iniciar checkout. El flag apagado devuelve mcpBooking=false/mcpBookable=false. |
| `get_public_availability` | T/F/T | `noauth` | slug, fecha y selección → slots públicos | Consulta motor real de un negocio participante sin exponer citas ni retener capacidad. Tiene límite compartido de negocio. |
| `prepare_public_booking` | F/F/T | `noauth`; flag de pruebas + opt-in | selección/contacto, slug y UUID → preparación cifrada y aprobación | Crea estado de preparación en un negocio público elegido. No crea cita ni contacta aún. Deshabilitada por defecto; habilitada sólo para evaluar servicios gratuitos. |
| `confirm_public_booking` | F/T/T | `noauth`; flag de pruebas + opt-in | receipt → reserva gratuita y estado real | Ejecuta una reserva pública aprobada y puede enviar notificaciones irreversibles a contacto aportado. No procesa pagos; se revalidan flag, gratuidad, precio, opt-in y disponibilidad. |

Las seis escrituras privadas y las seis herramientas públicas anuncian
`idempotentHint=true`; las 18
lecturas privadas omiten ese hint opcional. La repetición de una preparación
requiere la misma operationKey y parámetros; el ejecutor requiere el mismo
receipt. El hint no promete que una consulta temporal mantenga sus valores.

`get_connected_account` declara un output schema estricto con `id` requerido y
campos de perfil opcionales. Las otras 29 devuelven `structuredContent` y texto
JSON equivalente, sin prometer un output schema adicional que no anuncian.
Los errores son códigos seguros con `isError=true`; errores de autenticación
incluyen `_meta["mcp/www_authenticate"]`. El límite de respuesta es 100.000
caracteres; los agregados financieros rechazan más de 5.000 citas. Los schemas
completos de entrada/salida y las descripciones actuales están en la evidencia.

Pruebas: el cliente oficial comprueba el conjunto exacto de las 30 y las llama
mediante dispatch/validación del SDK. Las integraciones también verifican
schemas, scopes, metadatos, gating, cuotas y aprobación. Proveedores externos
están desactivados/simulados en el fixture: sus efectos reales no se certifican.
