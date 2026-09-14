# Reseñas verificadas y reputación

Módulo nativo de Puragenda. No reemplaza el feedback interno de producto (`BookingFeedback`, POSITIVE/IMPROVE, panel SuperAdmin). Ese flujo sigue midiendo la experiencia de reservar con Puragenda.

Las reseñas de negocio viven en `AppointmentReview` y solo se crean a partir de una reserva real.

## Principio

Una opinión pública exige:

- una reserva existente del negocio;
- un cliente asociado;
- atención ya realizada (`CHECKED_IN` o `COMPLETED` y `endTime` en el pasado);
- autenticación de Mi agenda **o** un token HMAC atado a esa reserva;
- como máximo una valoración por `appointmentId` (constraint UNIQUE).

Nunca se convierte feedback privado histórico en reseña pública.

## Estados

- Visibilidad: `PRIVATE` | `PUBLIC`
- Moderación: `PENDING` | `PUBLISHED` | `REPORTED` | `REMOVED`
- Combinación bloqueada en base de datos: `PRIVATE` + `PUBLISHED`

Una reseña cuenta para el promedio público solo si es `PUBLIC` + `PUBLISHED` y no está retirada (`withdrawnAt`).

Pendiente pública no reportada se auto-publica a las 72 horas (`REVIEW_AUTO_PUBLISH_DELAY_MS`).

## Flujo

1. Atención completada.
2. Invitación (cron o “Solicitar reseñas” en el dashboard).
3. Cliente puntúa 1–5, comentario opcional, elige privado o público.
4. Si es pública: `PENDING`. El negocio puede publicar, responder y publicar, o reportar con motivos predefinidos.
5. Sin reporte válido, cron `/api/cron/reviews-auto-publish` publica.
6. SuperAdmin modera reportes en `/para/x7k9m2v4q8/reviews`.

El negocio no puede borrar una crítica porque sea negativa.

## Promedio

`Business.publicReviewCount` y `Business.publicReviewRatingSum` se actualizan en la misma transacción que el cambio de estado. El marketplace lee esos contadores en un query por lote (no N+1).

## Datos demo de Estética Bella

Estética Bella (`estetica-bella`) es la cuenta demo oficial de Puragenda.

```
npm run seed:reviews-demo
```

- Solo modifica Estética Bella. Nunca Soccerbarber, Modern Women, Cinnamon Nails ni otros negocios reales.
- Es idempotente: IDs `clevrebella*`. Ejecutarlo dos veces no duplica reseñas.
- Puede dejar el listing marketplace en `ACTIVE` (con autorización vigente) para que el escaparate sea visible en `/negocios`.
- Puede ejecutarse deliberadamente contra el entorno que use esa cuenta demo, incluida producción.

## Rutas

- Cliente: `/valorar/[token]`, `/valorar/cita/[appointmentId]`, historial de `/mi-agenda`
- Negocio: `/dashboard/reviews`
- Marketplace: `/negocios` (cards) y `/negocios/[slug]` (ficha, `noindex`)
- Admin: `/para/x7k9m2v4q8/reviews`

## Permisos

`reviews.manage` — ADMIN y RECEPCIONISTA por defecto. STAFF no.

## Seguridad

Tokens HMAC con `purpose: verified_review`, expiración, same-origin, rate limit. Endpoints no revelan datos de la reserva ante token inválido.
