# Puragenda v6 — Task Tracker

## Fase 1: Reorganización
- [ ] Mover `app/` → `src/app/`
- [ ] Mover `middleware.ts` → `src/middleware.ts`
- [ ] Actualizar `components.json`
- [ ] Verificar que build pasa

## Fase 2: Widget Branding
- [ ] Agregar campos en schema (textColor, textMutedColor, widgetFontSize)
- [ ] Renombrar "Color Secundario" → "Color de Acentos y Bordes"
- [ ] Persistir textColor/textMutedColor en saveAppearanceAction
- [ ] Widget: aplicar --widget-text-muted
- [ ] Widget: footer "PurAgenda Powered by PuroCode"

## Fase 3: Reserva Múltiple
- [ ] Agregar maxServicesPerBooking al schema
- [ ] Agregar additionalServiceIds, totalDuration, totalPrice al Appointment
- [ ] UI dashboard: slider maxServicesPerBooking
- [ ] Widget: multi-select si maxServices > 1
- [ ] API: book con serviceIds[]

## Fase 4: Sistema de Afiliados
- [ ] Modelo Affiliate en schema
- [ ] Business: referredByAffiliateId
- [ ] Subscription: nextBillingDiscount
- [ ] affiliate.service.ts
- [ ] Registro con referralCode
- [ ] Contar referido al pagar (TRIALING→ACTIVE O registro sin trial)

## Fase 5: Ajustes Finales
- [ ] Precio Individual $14.990 → $9.990
- [ ] Responsividad dashboard
- [ ] Responsividad widget
- [ ] Actualizar seed
- [ ] Actualizar CONTEXT.md

## Final
- [ ] Migrar DB
- [ ] Seed
- [ ] Build
- [ ] Dev server
