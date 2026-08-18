# Códigos de descuento de reservas

Los códigos viven en `BookingDiscountCode`, con alcance por negocio mediante la clave única `(businessId, code)`. Se mantienen separados de `WidgetPromoBlock`, `PlatformDiscountCode` y `LoyaltyCode`.

El widget puede validar un código para mostrar una cotización, pero el endpoint `POST /api/business/[slug]/book` vuelve a buscarlo por negocio, comprueba estado y fechas, recalcula el subtotal desde servicios/opciones canónicos y aplica el descuento en servidor. Un código de reserva no se puede combinar con un banner ni con un premio de fidelización.

## Migraciones

La migración está espejada en:

- `prisma/migrations/20260817000000_booking_discount_codes/migration.sql`
- `supabase/migrations/20260817000000_booking_discount_codes.sql`

El comando de scaffolding de Supabase (`npx supabase migration new ...`) puede fallar en este entorno con `EPERM` al intentar registrar telemetría. El fallback seguro es conservar ambas migraciones versionadas (Prisma y Supabase), revisar que sean equivalentes y aplicar la migración en el entorno correspondiente mediante el pipeline autorizado. Este hotfix no ejecuta `db push`, `apply_migration` ni SQL remoto.
