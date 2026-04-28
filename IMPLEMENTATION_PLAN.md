# Puragenda v6 — Reorganización + Nuevas Funcionalidades

Implementación de 5 cambios principales: reorganización del directorio raíz, mejoras en el widget branding, reservas múltiples, sistema de afiliados, y ajustes finales de precio/responsividad.

---

## User Review Required

> **Movimiento de `app/` a `src/app/`:** Next.js App Router soporta tener `app/` dentro de `src/` nativamente. Solo necesitamos mover la carpeta y ajustar `components.json`. Los imports internos no cambian porque los aliases `@/*` ya apuntan a `./src/*`.

> **Migración de Base de Datos:** Se crearán nuevas tablas (`Affiliate`) y campos (`maxServicesPerBooking`, `textMutedColor`, `nextBillingDiscount`). Esto requiere `prisma migrate dev`. Los datos existentes seguirán funcionando gracias a los valores por defecto.

> **Reserva Múltiple - Enfoque simplificado:** Al seleccionar múltiples servicios se sumará la duración/precio y se guardarán IDs adicionales en un campo array. Esto minimiza cambios en la estructura existente.

## Open Questions

> **Precio Individual:** El CONTEXT.md dice $14.990 y la solicitud pide $9.990. ¿Confirmas el cambio?

> **Sistema de Afiliados - Detección de pago:** Dado que no hay Stripe conectado, el "pasar de Trial a Paid" se detectará cuando el status cambie de TRIALING a ACTIVE. ¿Es correcto?

---

## Fases de Implementación

### Fase 1: Mover app/ a src/app/ y middleware.ts a src/middleware.ts
### Fase 2: Widget Branding (renombrar colores, persistir text colors, footer)
### Fase 3: Reserva Múltiple (maxServicesPerBooking, multi-select, sumas)
### Fase 4: Sistema de Afiliados (Affiliate model, referral codes, descuento 15%)
### Fase 5: Precios ($9.990) + Responsividad global
