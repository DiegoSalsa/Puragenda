# Google OAuth: registro de la verificacion completada

## Estado actual (20 de agosto de 2026)

- Proyecto: `Puragenda Production` (`puragenda-production`).
- Branding: verificado.
- Data access: verificado.
- La restriccion interna a usuarios de prueba fue retirada tras la aprobacion.
- Los scopes de Google Calendar estan disponibles para todos los usuarios de Puragenda que tengan permisos internos para conectar calendarios.
- Video actualmente registrado: `https://youtu.be/qbtgDjFloLo`.
- La aplicacion declara `https://www.googleapis.com/auth/calendar.events.freebusy`; el endpoint `freeBusy.query` no esta autorizado por `calendar.events`.

El resto de este documento se conserva como registro historico del proceso de revision.

## Scopes minimos y justificacion

### `calendar.calendarlist.readonly`

Puragenda lista solo los calendarios a los que el usuario tiene acceso de escritura para que elija el calendario de destino. No crea, elimina ni modifica calendarios ni sus permisos.

### `calendar.events`

Puragenda crea un evento por cita, lo actualiza cuando la cita se edita o reprograma y lo elimina cuando se cancela. El usuario puede escoger calendarios propios o calendarios compartidos del negocio en los que tiene acceso de escritura. `calendar.events.owned` no es suficiente porque no permite escribir en un calendario cuyo propietario es otra cuenta, aunque el usuario tenga permiso de escritor.

### `calendar.events.freebusy`

Puragenda consulta exclusivamente intervalos libre/ocupado del calendario seleccionado para evitar reservas superpuestas. No obtiene ni muestra titulos, descripciones, asistentes ni ningun otro contenido de eventos externos.

### `openid` y `userinfo.email`

Se usan para identificar y mostrar la cuenta de Google conectada. No se usa el perfil para publicidad ni analitica.

## Preparacion historica de las cuentas de demostracion

1. Desde una segunda cuenta de Google, crear `Puragenda Review - Shared Business Calendar` y compartirlo con la cuenta de demostracion con permiso para modificar eventos.
2. Crear en ese calendario compartido un evento externo llamado `PRIVATE BUSY BLOCK - CONTENT MUST NOT BE READ`, de 15:00 a 16:00 en un dia habilitado para reservas.
3. Preparar una cita de prueba sin datos personales reales: `Google Review Client`, `review-client@example.com`, servicio `Google OAuth Verification Test`.
4. Configurar Google y el navegador en ingles. Grabar la barra de direcciones completa y usar zoom legible.

## Guion de video (una sola toma, 6-8 minutos)

1. Mostrar la URL `https://www.puragenda.cl`, iniciar sesion y abrir `Dashboard > Google Calendar`.
2. Mostrar el aviso previo al consentimiento: lista de calendarios propios/compartidos, crear/actualizar/eliminar citas y consulta exclusiva de libre/ocupado.
3. Pulsar `Connect with Google`. Mostrar la URL de `accounts.google.com` y acercar la barra para que se vea el `client_id`.
4. Mostrar que la pantalla OAuth dice `Pురagenda` y todos los permisos solicitados. Expandir los detalles de cada permiso y aceptar con la cuenta de demostracion.
5. De vuelta en Puragenda, pulsar `Choose another calendar`. Mostrar el calendario principal y el compartido. Elegir `Puragenda Review - Shared Business Calendar`, marcado como compartido, y guardar.
6. Crear una cita en Puragenda. Abrir Google Calendar en otra pestana y demostrar que el evento fue creado en el calendario compartido, con fecha, hora, servicio y cliente correctos.
7. Editar o reprogramar la misma cita en Puragenda. Volver a Google Calendar y demostrar que el mismo evento se actualizo, sin duplicados.
8. Cancelar la cita en Puragenda. Volver a Google Calendar y demostrar que el evento se elimino.
9. Abrir el widget publico e intentar reservar el tramo 15:00-16:00 ocupado por el evento externo. Demostrar que el horario no esta disponible. No abrir el evento externo ni mostrar su contenido: Puragenda solo recibe free/busy.
10. Volver a `Dashboard > Google Calendar`, pulsar desconectar, aceptar la confirmacion y mostrar que se revoca la conexion y se retiran los eventos gestionados por Puragenda.
11. Cerrar mostrando la politica de privacidad en `https://www.puragenda.cl/politica-de-privacidad#google-calendar`.

## Texto para Data Access (ingles)

> Puragenda is an appointment scheduling SaaS. After explicit user authorization, calendar.calendarlist.readonly lists writable calendars for the destination selector. calendar.events creates one event per Puragenda appointment, updates that same event when the appointment is edited or rescheduled, and deletes it when cancelled. Users can select writable shared business calendars owned by another account, so calendar.events.owned is insufficient. calendar.events.freebusy returns only busy time ranges from the selected calendar to prevent double bookings; Puragenda does not read external event titles, descriptions, or attendees. openid and userinfo.email identify the connected account. Tokens are encrypted at rest, access can be revoked in-app, and Google data is not used for advertising.

## Respuesta al correo de Google (ingles)

Subject: Re: OAuth verification request - updated Calendar demonstration

Hello Third-Party Data Safety Team,

Thank you for the clarification. We have updated our scope implementation and prepared a new comprehensive, unlisted demonstration video: [INSERT NEW YOUTUBE URL].

The video shows the complete OAuth flow in English, including the Puragenda app name and the OAuth client ID in the browser address bar. It then demonstrates the maximum user-facing functionality for each requested Calendar scope: selecting a writable calendar shared by another Google account, creating an appointment event, updating and rescheduling that same event without duplication, deleting it when the appointment is cancelled, and blocking an externally busy time in the public booking widget using free/busy data only.

We require `calendar.events` rather than `calendar.events.owned` because customers can select shared business or staff calendars that they can edit but do not own. Puragenda only manages events created for Puragenda appointments. We use `calendar.calendarlist.readonly` only for the destination selector and `calendar.events.freebusy` only to receive busy time ranges; we do not read external event content.

While verification is pending, new OAuth grants are restricted to our named verification account and are not exposed to general production traffic. Our publishing status remains In Production.

Please continue the review using the updated video and scope configuration.

Best regards,
Puro Code / Puragenda

## Checklist antes de enviar

- [ ] El video nuevo esta en YouTube como **Unlisted** y reproduce sin inicio de sesion.
- [ ] La barra de direcciones muestra el `client_id` durante OAuth.
- [ ] La pantalla de consentimiento muestra `Puragenda` y cada scope.
- [ ] El video demuestra un calendario realmente compartido y no propiedad de la cuenta demo.
- [ ] Se ve crear, actualizar/reprogramar y eliminar el mismo evento.
- [ ] Se ve un horario externo bloqueado sin abrir ni exponer el evento externo.
- [ ] Data Access declara exactamente los mismos scopes que solicita el codigo.
- [ ] La justificacion y el enlace nuevo estan guardados en Google Cloud.
- [ ] La respuesta se envia como reply al hilo original.
