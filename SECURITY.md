# Política de seguridad de Puragenda

## Alcance

Este repositorio contiene una aplicación SaaS multi-tenant con Next.js, Prisma/Postgres en Supabase, pagos mediante Paddle y Mercado Pago, correo, Cloudinary y Google Calendar. Solo debe analizarse código y entornos sobre los que exista autorización explícita.

## Modelo de amenazas

Activos principales:

- cuentas, sesiones y acceso de superadministración;
- aislamiento entre negocios, personal y clientes;
- citas, datos personales, historiales, direcciones y notas internas;
- suscripciones, pagos, webhooks y credenciales de proveedores;
- tokens de acceso por correo, recuperación, cancelación y reprogramación;
- integraciones de calendario y archivos cargados por usuarios.

Entradas controladas por atacantes:

- rutas públicas del widget y portal del cliente;
- parámetros, JSON, formularios, archivos y cabeceras HTTP;
- callbacks y webhooks expuestos a Internet;
- enlaces con token enviados por correo;
- metadatos configurables por negocios y contenido mostrado en páginas públicas.

Fronteras de confianza:

- navegador ↔ aplicación Next.js;
- aplicación ↔ Postgres/Supabase Data API;
- aplicación ↔ Paddle, Mercado Pago, Cloudinary, Resend y Google;
- usuario normal ↔ negocio ↔ superadministración;
- un tenant ↔ todos los demás tenants.

## Invariantes obligatorias

- Toda operación privada debe verificar una sesión firmada y vigente en el servidor.
- La versión de sesión almacenada en la base debe coincidir con la del token.
- Toda consulta multi-tenant debe quedar acotada al negocio autorizado.
- Las tablas del esquema `public` no pueden quedar accesibles a `anon` o `authenticated` sin RLS y políticas deliberadas.
- Las claves privadas y secretos nunca usan el prefijo `NEXT_PUBLIC_`, no se registran y no se devuelven al cliente.
- Los webhooks verifican autenticidad antes de interpretar o persistir eventos y su procesamiento es idempotente.
- Los cron jobs fallan cerrados cuando falta `CRON_SECRET`.
- Los tokens por correo son aleatorios, expiran, se almacenan con hash cuando permiten una acción sensible y se consumen una sola vez.
- Los identificadores de base de datos no sustituyen autenticación o autorización.
- Los pagos solo cambian estado después de consultar al proveedor y validar referencia, importe, moneda y tenant.

## Qué debe reportarse

Reportar rutas plausibles y reproducibles que permitan acceso entre tenants, escalada de privilegios, toma de cuentas, evasión de pago, falsificación de webhooks, lectura de secretos o datos personales, modificación no autorizada, ejecución de código, inyección, SSRF, XSS persistente, subida peligrosa o abuso material de recursos.

Los informes deben incluir archivo y ubicación, entrada controlada por el atacante, control ausente o roto, recorrido hasta el impacto, condiciones necesarias, severidad, evidencia y una corrección comprobable. No reportar únicamente presencia de una API sensible sin una ruta de explotación.

## Exclusiones y supuestos

- El widget se puede embeber intencionalmente en sitios de terceros.
- Sus rutas de reserva son públicas, pero deben resistir automatización y abuso mediante controles de tasa durables y límites de coste.
- Los tokens y claves visibles en el widget no deben considerarse secretos ni usarse para autorizar operaciones privadas.
- Los escaneos no deben enviar correos, cobrar dinero, cancelar suscripciones ni modificar cuentas de proveedores.
- Paddle se prueba en sandbox salvo autorización explícita para producción.

## Verificación mínima

Antes de desplegar: `npm audit`, lint, typecheck, tests, build, revisión de migraciones, comprobación de RLS/privilegios y revisión de cambios con Codex Security. Los hallazgos aceptados requieren una prueba de regresión cuando sea razonable.

## Divulgación

No publicar vulnerabilidades ni datos de clientes en issues públicos. Comunicar los hallazgos de forma privada al propietario del proyecto con evidencia mínima y sin datos personales reales.
