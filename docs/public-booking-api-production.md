# API de reservas: despliegue de producción

Publicado el 30-09-2026 con autorización explícita del usuario para aplicar la
migración y desplegar a producción.

- Dominio activo: https://www.puragenda.cl (proyecto Vercel `puragenda`).
- Revisión de código: `891bb56`, rama `feature/public-booking-api`.
- Despliegue: `dpl_GGrvMf6dious2a4qJPcn447dew1z`, estado `READY`.
- URL de versión: https://puragenda-jsoo5ts66-diegosalsas-projects.vercel.app.
- Versión anterior: `dpl_qBe31tGERGV5WPfYe8JcXbhm5CdN`.

Se publicó desde una copia Git limpia de los commits de esta API. Los cambios
ajenos de la carpeta original quedaron fuera del despliegue. No hubo push ni
merge de ramas; el código publicado continúa en los commits locales indicados.

## Base de datos y seguridad

La única migración pendiente era `20260930120000_public_booking_operations`.
El proceso de build de producción ejecutó `prisma migrate deploy`; su registro
confirma aplicación completa a las **2026-09-30 21:33:26 UTC**.

Antes de aplicarla se añadió RLS a `BookingOperation` y se retiraron los permisos
de `PUBLIC`, `anon` y `authenticated`. Las 49 pruebas locales pasaron con ese
ajuste, incluida la comprobación del aislamiento de la tabla. Typecheck y lint
del test modificado también pasaron.

Comprobaciones posteriores sobre la base de producción, en transacción de lectura:

- Migración terminada, sin rollback.
- RLS activo en `BookingOperation`.
- Roles `anon` y `authenticated` sin permisos de lectura/escritura en la tabla.
- Trigger `Appointment_capacity_guard` habilitado.

La consulta previa no encontró pares de citas futuras que solaparan la capacidad
protegida. No se cambiaron citas ni el catálogo para desplegar. Se observaron cuatro
diferencias históricas de checksum en migraciones anteriores; esos archivos son
idénticos a `origin/main`, quedaron sin modificaciones y no se volvieron a ejecutar.

## Publicación y comprobación HTTP

Primero se creó la versión con `vercel deploy --prod --skip-domain`. El build
terminó correctamente y la nueva ruta devolvió 401 sin clave en esa versión.
Después se ejecutó `vercel promote` y se confirmó que `www.puragenda.cl` apunta al
nuevo despliegue `dpl_GGrvMf6dious2a4qJPcn447dew1z`.

Comprobaciones en el dominio público para `estetica-bella`:

| Comprobación | Resultado |
| --- | --- |
| Catálogo autenticado | 200; 3 servicios simples, 5 profesionales, 2 sucursales |
| Catálogo sin clave | 401 `UNAUTHORIZED` |
| Disponibilidad autenticada, 01-10-2026 | 200; 7 slots para la selección comprobada |
| Precio/duración de selección | Coinciden con servicio y opciones del catálogo |
| Respuestas de catálogo/disponibilidad | `Cache-Control` contiene `no-store` |
| POST v1 con JSON malformado | 400 `INVALID_JSON`, sin crear operación ni cita |
| Widget `/widget/estetica-bella` | 200 |
| Página principal | 200 |

La clave de reservas se obtuvo internamente y no se imprimió ni se guardó en este
documento. No se crearon citas, no se ejecutaron cobros y no se enviaron
notificaciones reales. La concurrencia, idempotencia y creación se comprobaron
con PostgreSQL local y proveedores simulados en la entrega de implementación.

## Alcance restante

La API está publicada. El formulario de PuroCode todavía debe integrar los
contratos en su propio repositorio. No se declara conectada la demo ni realizada
la aceptación de una cita real visible en el dashboard.

Se mantiene el contrato de recuperación 202 ante efectos externos inciertos y el
límite HTTP por proceso/IP descritos en `public-booking-api.md`. Una publicación
posterior desde `main` debe incluir estos commits para conservar la API.
