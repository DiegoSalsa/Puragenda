# 07 — UX/UI y pricing

## Superficies actuales

La página pública vive en src/app/pricing/page.tsx y usa PricingHero, PricingComparisonTable, PricingCards y WebsiteCommercialSection. src/components/pricing-cards.tsx contiene ciclo, extras Equipo, trial y toggle de web, y limita extras a 20. El checkout se inicia por POST /api/billing/subscribe y Paddle internacional usa src/components/paddle/checkout.ts.

El dashboard usa mi-plan, el panel Superadmin de subscriptions, el billing panel de website y banners de suscripción. El editor web usa website.manage. Esta sección solo planifica; no se modificó la interfaz.

## Experiencia objetivo

### Página pública

- Dos tarjetas con nombres exactos Puragenda y Puragenda+.
- Plus destacado con el símbolo +, contraste propio y beneficios claros.
- Selector de profesionales común, inicial 1 y sin máximo visual arbitrario.
- Ciclo mensual/anual solo si anualidad sigue aprobada.
- Precio proveniente del quote del catálogo.
- Desglose de base, cupos, total y moneda.
- Plus muestra Puri+, Contact Flow, web y analítica comercial.
- Puragenda muestra widget/link y Puri estándar.

### Contratación

Elegir plan, profesionales, revisar precio, confirmar negocio, crear checkout con idempotency key, esperar estado pending, activar tras webhook y mostrar periodo. El redirect del provider no es prueba de activación.

### Gestión

Mostrar plan, versión de catálogo, profesionales contratados/activos/históricos, próximo cargo, cambios programados, promociones, provider, web incluida o add-on legacy y botones con fecha efectiva.

Una reducción por debajo de Staff activos guía a desactivar/reasignar; nunca borra automáticamente.

### Puri y web

El launcher Puri sigue siendo uno. Sin Plus, una señal comercial muestra upgrade sin llamar al modelo. Puragenda estándar conserva link/widget y ve el editor bloqueado con una explicación. Una web existente muestra continuidad y no otra contratación.

## Estados y accesibilidad

Diseñar loading, quote no disponible, checkout creado, pendiente, webhook pendiente, aprobado, rechazado/gracia, programado, UNKNOWN, legacy y mismatch. Cada estado debe explicar acción segura.

El selector funciona a 320–390 px, usa foco visible, aria-live para precio, encabezados semánticos, contraste y no depende solo del color. Plus no requiere un rediseño total de marca ni degradados genéricos.

## Eventos

pricing_viewed, plan_selected, professional_count_changed, quote_viewed, checkout_started, checkout_returned, checkout_confirmed, checkout_failed, migration_reviewed, migration_confirmed y plus_feature_locked. No incluir email, tokens ni provider IDs.

## Copy pendiente

Aprobar IVA/precio final, trial, ausencia/presencia de tarjeta, profesionales ilimitados, prorrateo, add-on web, gracia, beneficios Plus, límites Contact Flow y cancelación/reembolso.

## Aceptación

- Solo Puragenda/Puragenda+ para nuevos contratos.
- Tarjeta coincide con quote en 1, 2, 7, 8 y cantidad alta.
- Plus destaca sin rediseñar toda la marca.
- Legacy ve su acuerdo y no cambia en silencio.
- Web no se anuncia incluida para Puragenda estándar.
- Móvil conserva selector y CTA.
- Pending, past_due y UNKNOWN no prometen activación.
