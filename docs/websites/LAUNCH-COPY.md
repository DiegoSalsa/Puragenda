# Website launch copy

| Variant | Heading / supporting message | Clarity | Value | Trust | Brevity | Puragenda |
| --- | --- | --- | --- | --- | --- | --- |
| A (selected) | Llegaste antes. Este precio es tuyo. / Gracias por confiar en Puragenda antes de este lanzamiento. Este beneficio queda reservado para tu negocio. | 5 | 5 | 5 | 4 | 5 |
| B | Precio fundador desbloqueado. / Tu negocio ya era parte de Puragenda. Prueba tu web 15 días y conserva $5.990 al mes para siempre. | 4 | 5 | 4 | 5 | 4 |
| C | Tu confianza tiene un beneficio. / Tu propia web, tus servicios y tus reservas. 15 días gratis; después, si decides quedártela, $5.990 al mes para siempre. | 5 | 4 | 5 | 4 | 4 |

Editorial scores, not user research. A thanks existing customers and clearly reserves the benefit for their business. Normal $9.990/month price is shown as a comparison only in the available founder offer. Dismissal does not start a trial or change eligibility. Trialing/paid/expired states cannot see an offer for a new trial. Standard never sees founder price as available.

Prepared email copy; no messages sent and no scheduler enabled:

- Launch founder: “Llegaste antes. Este precio es tuyo. Prueba tu web 15 días gratis cuando tú decidas. Después, si te la quedas, $5.990 al mes para siempre. Probar mi web gratis.”
- Trial started: “Tu prueba comenzó hoy y termina el {trialEndsAt}. Diseña, publica y recibe reservas. Si decides quedártela, tu precio fundador es $5.990 al mes para siempre.”
- Three days remaining: “Te quedan 3 días para disfrutar tu web gratis. Puedes contratar hoy sin perder esos días. El primer cobro será el {trialEndsAt}: $5.990 al mes.”
- Last day: “Tu prueba termina el {trialEndsAt}. Tu beneficio fundador sigue reservado: $5.990 al mes para siempre. Conservarás todo lo que creaste.”
- Expired: “Tu web sigue aquí. Guardamos tus fotos, textos y configuración. Puedes activarla cuando quieras por $5.990 al mes para siempre.”
- Activated: “Tu Sitio Web está activo. Tu suscripción es mensual y puedes cancelar solo este add-on desde Mi sitio.”

Any future dispatcher must deduplicate by businessId + trial end + reminder kind, respect communication preferences, and never restart a trial. Existing booking emails remain subject to their existing delivery policy.
