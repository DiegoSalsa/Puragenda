# Preparación de producción Chile

Auditoría 2026-10-02: **NO-GO**. Se inspeccionó `.env` del checkout y DB remota con BEGIN READ ONLY/ROLLBACK. No se verificaron variables del panel del hosting ni se migró, desplegó, cobró, envió correo o modificó DNS.

| Variable | Uso | Observación del checkout |
| --- | --- | --- |
| DATABASE_URL | Prisma runtime/pool | Presente, conexión remota de solo lectura PASS REAL |
| DIRECT_URL | Migración/snapshot | Presente; operador debe verificar conexión apta para migraciones |
| AUTH_SECRET o NEXTAUTH_SECRET | Sesión, mínimo 32 caracteres | **FAIL: ninguna alternativa válida** |
| NEXT_PUBLIC_APP_URL | Retorno MP, origen público HTTPS | Presente; validar origen del deployment |
| WEBSITE_ROOT_DOMAIN | Routing/canonical | No explícita; fallback puragenda.cl |
| WEBSITE_LAUNCH_AT | Corte ISO UTC fijo del snapshot | **Ausente; no inventar fecha** |
| WEBSITE_CHECKOUT_ENABLED | 1 habilita trial/checkout/recovery | Ausente: adquisición apagada por defecto |
| WEBSITE_LAUNCH_ENABLED | 1 expone popup/changelog v2.2.0 | Ausente: comunicación apagada |
| MERCADOPAGO_ACCESS_TOKEN | SDK servidor/vendedor Chile | Presente; GET /users/me HTTP200, MLC. No prueba pagos |
| MERCADOPAGO_WEBHOOK_SECRET | Firma del webhook | **Ausente, P0** |
| CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET | Uploads | Presentes; escritura remota NOT_RUN |
| WEBSITE_DOMAIN_PROVIDER=vercel | Provider dominios propios | Activar tras comprobar ownership/infraestructura |
| WEBSITE_VERCEL_WRITES_ENABLED=true, VERCEL_TOKEN, VERCEL_PROJECT_ID | Escrituras al proyecto esperado | NOT_RUN; no habilitados/usados en QA |
| VERCEL_TEAM_ID | Equipo si aplica | Opcional |
| NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, NEXT_PUBLIC_POSTHOG_HOST | Analytics con consentimiento | Opcionales; rechazo no bloquea producto |
| RESEND_API_KEY | Correos existentes de reserva | Entrega remota NOT_RUN; campaña solo borradores |
| WEBSITE_QA, WEBSITE_BILLING_SIMULATOR, WEBSITE_MEDIA_MOCK, WEBSITE_BUILD_QA | QA local | No configurar en deployment |
| WEBSITE_PRICE_STANDARD, WEBSITE_PRICE_BETA_FOUNDER y variables Paddle sandbox | Internacional | No requeridas para Chile; NOT_RUN |

Faltan las migraciones de launch offers y Mercado Pago en la DB remota. Snapshot/ofertas/eventos comerciales/operaciones MP y columnas MP aún no existen. Las tablas Website presentes tienen RLS habilitado. Ver nombres exactos en el reporte y `prisma migrate status`; la nueva migración es aditiva, con RLS y sin políticas de acceso de navegador.

El API oficial documenta auto_recurring.start_date para el primer cobro. Se envía trialEndsAt y se verificaron días 1/5/10/14 con simulador. **Primer cobro diferido real NOT_RUN: bloquea GO**. Se necesitan vendedor/comprador de prueba compatibles y sus credenciales; el prefijo del token o GET de cuenta no prueba checkout de test.

Para GO: secretos/origen correctos, backup recuperable, migraciones sin drift, matriz oficial MP con cobro diferido/cancelación/recovery/BASE intacta, fecha aprobada y snapshot sellado, smoke de hosting/TLS/subdominio/uploads. Dominios propios quedan pendientes de validación externa autorizada.

Fuentes: [PreApproval](https://www.mercadopago.cl/developers/en/reference/online-payments/subscriptions/create-preapproval/post), [gestión](https://www.mercadopago.cl/developers/es/docs/subscriptions/subscription-management), [webhooks](https://www.mercadopago.cl/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks), [cuentas de prueba](https://www.mercadopago.cl/developers/es/news/2023/11/16/Questions-on-how-to-test-your-integration--).
