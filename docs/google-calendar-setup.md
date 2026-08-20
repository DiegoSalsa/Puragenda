# Google Calendar: configuracion y operacion

## Alcance

La integracion mantiene un solo evento organizador por cita para evitar duplicados:

- Si el profesional asignado conecto su calendario, ese calendario tiene prioridad.
- Si no lo hizo, se usa el calendario principal del negocio como respaldo.
- El cliente y el profesional reciben invitaciones de Google cuando tienen correo y no son el organizador.
- Crear, confirmar, editar, reprogramar o cancelar una cita sincroniza el evento inmediatamente.
- Los planes recurrentes sincronizan todas sus sesiones y eliminan los eventos anteriores antes de regenerarlas.
- Los periodos ocupados del Google Calendar personal del profesional bloquean disponibilidad en el widget publico.
- Una tarea horaria reconcilia citas que no pudieron sincronizarse por una falla temporal.

## Configuracion en Google Cloud

1. Crear o seleccionar un proyecto en Google Cloud Console.
2. Habilitar **Google Calendar API**.
3. Configurar la pantalla de consentimiento OAuth publicada y verificada.
4. Crear un OAuth Client ID de tipo **Web application**.
5. Registrar estos redirect URI exactos:
   - Local: `http://localhost:3000/api/google-calendar/callback`
   - Produccion: `https://TU_DOMINIO/api/google-calendar/callback`
6. Configurar las variables del entorno que ejecuta Next.js:

```env
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALENDAR_REDIRECT_URI="https://TU_DOMINIO/api/google-calendar/callback"
GOOGLE_TOKEN_ENCRYPTION_KEY="una-clave-aleatoria-de-al-menos-32-caracteres"
CRON_SECRET="..."
```

En local, `GOOGLE_CALENDAR_REDIRECT_URI` puede omitirse cuando `NEXT_PUBLIC_APP_URL=http://localhost:3000` ya esta configurado.

## Despliegue

1. Aplicar las migraciones `prisma/migrations/20260801162002_google_calendar_integration/migration.sql` y `prisma/migrations/20260801213000_secure_google_calendar_tables/migration.sql` en la base correspondiente.
2. Desplegar con las variables anteriores.
3. Ingresar a **Dashboard > Google Calendar** y conectar primero el calendario del negocio.
4. Cada trabajador puede ingresar a la misma seccion y conectar su calendario personal. Un administrador con permiso de configuracion tambien puede ayudar a conectarlo desde la lista del equipo, incluso si ese profesional todavia no tiene usuario de Puragenda.
5. Crear una cita de prueba, editarla y cancelarla; verificar que Google reciba los tres cambios.

## Seguridad y permisos

- Los access y refresh tokens se almacenan cifrados con AES-256-GCM.
- El estado OAuth esta firmado, expira en diez minutos y vuelve a validar negocio, usuario, permisos y profesional al regresar de Google.
- El trabajador solo puede administrar su propia conexion. La conexion del negocio exige permiso para administrar configuracion.
- Al desconectar se eliminan los eventos administrados por Puragenda y se intenta revocar el token en Google.
- La integracion solicita acceso offline, lectura de la lista de calendarios, administracion de eventos y lectura exclusiva de intervalos libre/ocupado.
- `calendar.events` es necesario porque el usuario puede elegir calendarios compartidos en los que tiene permiso de escritura; `calendar.events.owned` no permite operar ese caso.
- `calendar.events.freebusy` se usa para bloquear horas externas sin leer titulos, descripciones ni asistentes.
- La aplicacion OAuth de produccion esta verificada; cualquier usuario de Puragenda con los permisos internos correspondientes puede iniciar la conexion.

## Diagnostico

- La tarjeta de conexion muestra el ultimo error y la ultima sincronizacion.
- El cron `GET /api/cron/google-calendar-sync` procesa hasta 100 citas por ejecucion.
- Si Google no responde al consultar disponibilidad, Puragenda no bloquea el agendamiento: registra el error y el cron reintenta la sincronizacion de eventos.
- Cambiar el calendario seleccionado re-sincroniza las proximas 100 citas.
