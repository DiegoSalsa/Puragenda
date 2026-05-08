# Puragenda — Contexto Completo del Proyecto

> **Última actualización:** 2026-05-08  
> **Versión:** v7 (Billing + Affiliates + Loyalty + Marketing + Discounts)  
> **Stack:** Next.js 16 + Prisma 7 + PostgreSQL + TypeScript + Tailwind CSS 4 + MercadoPago  
> **Repositorio:** https://github.com/DiegoSalsa/Puragenda  
> **Producción:** https://www.puragenda.cl

---

## 🎯 Qué es Puragenda

Puragenda es un **SaaS multitenant de agendamiento** desarrollado por la agencia **PuroCode**. Permite a negocios crear su propio sistema de reservas con un widget embebible (iframe) totalmente personalizable en colores y marca. Incluye sistema de pagos con MercadoPago, programa de afiliados, fidelización de clientes (tarjetas de sellos), y marketing por email.

## 🏗️ Arquitectura

```
c:\Users\lucas\Downloads\ProyectosInteresantes\Puragenda\
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Landing page (público, ~35KB)
│   │   ├── login/                    # Auth: login
│   │   ├── register/                 # Auth: registro (con planIntent + referralCode)
│   │   ├── auth/                     # Forgot/New password flows
│   │   │   ├── forgot-password/
│   │   │   └── new-password/
│   │   ├── pricing/                  # Página de precios pública
│   │   ├── dashboard/                # Panel de administración (protegido)
│   │   │   ├── page.tsx              # Calendario semanal + stats + CopyWidgetLink
│   │   │   ├── layout.tsx            # Layout con PaymentWall gate
│   │   │   ├── weekly-calendar.tsx   # Componente calendario con navegación URL
│   │   │   ├── appointment-actions.tsx # Acciones de citas
│   │   │   ├── copy-widget-link.tsx  # Componente copiar link del widget
│   │   │   ├── staff/                # Gestión de profesionales + horarios
│   │   │   ├── services/             # CRUD de servicios
│   │   │   ├── appearance/           # Personalización visual del widget
│   │   │   ├── settings/             # Config: horarios, API key, iframe, plan, upgrade
│   │   │   ├── clients/              # CRM: tabla de clientes con stats
│   │   │   ├── loyalty/              # Config de fidelización (tarjetas de sellos)
│   │   │   ├── marketing/            # Campañas de email marketing
│   │   │   └── referrals/            # Sistema de afiliados y premios
│   │   ├── mis-premios/[clientId]/   # Portal público de premios del cliente
│   │   ├── para/x7k9m2v4q8/         # Panel SuperAdmin (ruta secreta)
│   │   ├── widget/[slug]/            # Widget de reservas (público, embebible)
│   │   ├── alternativa-agendapro/    # Landing SEO
│   │   ├── sobre-nosotros/           # Página "Sobre nosotros"
│   │   ├── politica-de-privacidad/   # Política de privacidad
│   │   ├── terminos-y-condiciones/   # Términos y condiciones
│   │   └── api/                      # API Routes
│   │       ├── auth/                 # login, register, logout, me, cancel-registration
│   │       ├── billing/              # subscribe (MercadoPago), verify
│   │       ├── business/[slug]/      # appointments, book, services (público)
│   │       ├── dashboard/            # appointments PATCH, services CRUD
│   │       ├── cron/                 # Jobs programados
│   │       ├── marketing/            # Envío de campañas
│   │       └── webhooks/mercadopago/ # Webhook de MercadoPago
│   ├── core/
│   │   ├── constants.ts              # Precios, planes, configuración
│   │   ├── entities/index.ts         # Tipos TypeScript del dominio
│   │   └── validators/               # Zod validators (slug, etc.)
│   ├── server/
│   │   ├── auth/                     # session.ts, user-session.ts
│   │   ├── db/prisma.ts              # Singleton de Prisma
│   │   ├── actions/                  # Server Actions
│   │   │   ├── dashboard.actions.ts  # Acciones del dashboard (~18KB)
│   │   │   ├── auth.actions.ts       # Forgot/reset password
│   │   │   ├── admin.actions.ts      # SuperAdmin actions
│   │   │   └── loyalty.actions.ts    # Acciones de fidelización
│   │   ├── services/                 # Business logic
│   │   │   ├── auth.service.ts       # Register (con referral + planIntent), login
│   │   │   ├── affiliate.service.ts  # Referidos, premios, descuentos
│   │   │   ├── appointment.service.ts
│   │   │   ├── business.service.ts
│   │   │   ├── businessHours.service.ts
│   │   │   ├── discount.service.ts   # Descuentos via MercadoPago PreApproval
│   │   │   ├── marketing.service.ts
│   │   │   ├── service.service.ts
│   │   │   ├── staff.service.ts
│   │   │   └── subscription.service.ts
│   │   ├── email/                    # Emails transaccionales (Resend)
│   │   │   ├── send.ts              # Funciones de envío
│   │   │   ├── templates.ts         # 11 templates HTML (~650 líneas)
│   │   │   └── resend.ts            # Config de Resend
│   │   ├── validations/             # Zod schemas (auth, etc.)
│   │   └── lib/                     # Utilidades server-side
│   ├── components/
│   │   ├── dashboard/               # sidebar, subscription-banner, payment-wall, upgrade-button, logout-button, theme-toggle
│   │   ├── landing/                 # navbar
│   │   ├── pricing-cards.tsx        # Cards de precios (~19KB)
│   │   ├── cookie-banner.tsx
│   │   ├── pwa/                     # PWA components
│   │   └── ui/                      # Componentes reutilizables (shadcn)
│   ├── hooks/                       # Custom hooks
│   ├── lib/utils.ts                 # formatPrice, capitalize, cn
│   └── middleware.ts                # Protección de rutas + CORS
├── prisma/
│   ├── schema.prisma                # Schema v7 (17 modelos)
│   ├── seed.ts                      # Seeder con datos de prueba
│   └── migrations/                  # Migraciones SQL
├── public/                          # Assets estáticos
├── contexto/                        # Documentos de contexto
├── components.json                  # Config de shadcn
├── prisma.config.ts                 # Config de Prisma
├── setup-admin.ts                   # Script para setup SuperAdmin
├── test-mp.ts                       # Script de prueba MercadoPago
├── vercel.json                      # Config de Vercel
└── .env                             # Variables de entorno
```

## 🗄️ Modelos de Base de Datos (Prisma Schema v7)

### 17 Modelos
| Modelo | Descripción |
|--------|-------------|
| `User` | Usuarios con roles ADMIN/RECEPTIONIST/STAFF/SUPERADMIN. Tracking de trial/IP. |
| `PasswordResetToken` | Tokens para flujo "Olvidé mi contraseña" (1 hora). |
| `BlacklistedIp` | IPs bloqueadas para prevención de fraude en trials. |
| `Subscription` | Plan del negocio: INDIVIDUAL/EQUIPO/TEST. Integración MercadoPago. |
| `Business` | Negocio multitenant. slug, apiKey, colores, loyalty config, referral. |
| `BusinessHours` | Horario de apertura (7 días). |
| `BlockedDate` | Fechas específicas bloqueadas. |
| `Staff` | Profesionales del negocio con schedule. |
| `StaffSchedule` | Horario laboral individual por staff (7 días). |
| `ScheduleBlock` | Bloques de tiempo bloqueados por staff. |
| `Service` | Servicios ofrecidos (con relación M:N a Staff). |
| `Appointment` | Citas con estados + soporte multi-servicio. |
| `Client` | CRM: clientes con stats (gasto total, no-shows, stamps, marketing). |
| `LoyaltyCode` | Códigos de premio generados por fidelización. |
| `Affiliate` | Sistema de afiliados con referralCode. |
| `MarketingCampaign` | Campañas de email enviadas. |

### Enums
- **UserRole:** ADMIN, RECEPTIONIST, STAFF, SUPERADMIN
- **SubscriptionPlan:** INDIVIDUAL, EQUIPO, TEST
- **SubscriptionStatus:** ACTIVE, TRIALING, INACTIVE, CANCELLED
- **BillingCycle:** MONTHLY, ANNUAL
- **AppointmentStatus:** PENDING, CONFIRMED, CANCELLED, CHECKED_IN, COMPLETED, NO_SHOW

## 💰 Modelo de Precios

| Plan | Precio/mes | Staff incluido | Staff extra |
|------|-----------|----------------|-------------|
| Individual | $12.990 CLP | 1 | No permitido |
| Equipo | $29.990 CLP | 3 | +$3.000/extra |
| Test | $1.000 CLP | 1 | No permitido |

- **Trial:** 30 días gratis plan Equipo (anti-fraude por IP + email).
- **Pago:** MercadoPago Preapproval (suscripción recurrente mensual).
- **Descuentos:** Sistema de descuentos vía MercadoPago (referidos 25%, premios 50%).
- **Nuevos registros:** pueden elegir plan en `/register?plan=EQUIPO`, trial con `?trial=1`, o sin parámetros → Equipo trial si elegible.

## 💳 Sistema de Billing (MercadoPago)

### Flujo de Pago
1. **Registro:** Usuario elige plan → se crea cuenta con estado INACTIVE (si plan directo) o TRIALING (si trial).
2. **PaymentWall:** Dashboard bloqueado con `<PaymentWall>` si status === INACTIVE.
3. **Subscribe:** `POST /api/billing/subscribe` crea PreApproval en MercadoPago.
4. **Checkout:** Usuario redirigido a MercadoPago checkout.
5. **Webhook:** `POST /api/webhooks/mercadopago` recibe notificación de pago.
6. **Activación:** Webhook actualiza status → ACTIVE, cuenta referidos, revierte descuentos.
7. **Verify:** `POST /api/billing/verify` verifica estado polling (fallback).
8. **Cancel Registration:** `DELETE /api/auth/cancel-registration` borra cuenta si INACTIVE.

### Campos MercadoPago en Subscription
- `mpSubscriptionId` — ID de la PreApproval en MercadoPago
- `mpCustomerId` — ID del pagador
- `currentPeriodEnd` — Fecha de renovación
- `pendingDiscountPercentage` — Descuento pendiente para próximo cobro
- `hasCountedAsPaidReferral` — Si ya se contó como referido pagado

## 🤝 Sistema de Afiliados

### Flujo
1. Cada negocio tiene un `Affiliate` con `referralCode` (formato PG-XXXXXX).
2. Nuevos registros pueden usar `referralCode` → negocio referido recibe 25% descuento primer mes.
3. Cuando referido paga → `incrementPaidReferrals` incrementa contador del afiliador.
4. **Premios:** Umbrales en 3, 5, 10, 15 y cada 15 adicionales → cada premio = 50% descuento.
5. Premios se canjean manualmente desde `/dashboard/referrals`.

### Dashboard de Referidos
- Código de referido copiable
- Stats: referidos totales, pagados, premios disponibles
- Barra de progreso hacia próximo premio
- Botón canjear premio (50% off)
- Lista de negocios referidos con estado

## 🎫 Sistema de Fidelización (Loyalty)

### Configuración (por negocio)
- `isLoyaltyEnabled` — Toggle on/off
- `stampsRequired` — Número de sellos para completar tarjeta
- `rewardName` — Nombre del premio
- `discountType` — 'PERCENTAGE' | 'FIXED'
- `discountValue` — Valor del descuento

### Flujo
1. Negocio configura tarjeta en `/dashboard/loyalty`.
2. Al confirmar cita → se suma un sello al `Client.currentStamps`.
3. Al completar tarjeta → se genera `LoyaltyCode` con código único.
4. Cliente recibe email con código + puede ver en `/mis-premios/[clientId]`.
5. Stamps se reinician a 0 tras completar.

## 📧 Emails Transaccionales (Resend)

### 11 Templates
| Template | Trigger |
|----------|---------|
| `newBookingOwnerEmail` | Nueva reserva → dueño |
| `newBookingStaffEmail` | Nueva reserva → staff asignado |
| `newBookingClientEmail` | Nueva reserva → cliente (status: pendiente) |
| `confirmedBookingClientEmail` | Cita confirmada → cliente |
| `cancellationClientEmail` | Cita cancelada → cliente |
| `welcomeEmail` | Registro exitoso → owner |
| `staffInviteEmail` | Staff agregado → credenciales temporales |
| `forgotPasswordEmail` | Solicitud reset → link con token |
| `newRegistrationAdminEmail` | Nuevo registro → admins de plataforma |
| `loyaltyStampEarnedEmail` | Sello ganado → cliente |
| `loyaltyRewardWonEmail` | Tarjeta completada → cliente con código |
| `reminderEmail` | Recordatorio día anterior → cliente |
| `marketingCampaignEmail` | Campaña marketing → clientes |

## 📊 Marketing por Email

- Límites por plan (`MARKETING_LIMITS`): Individual 50 emails/1 campaña, Equipo 100 emails/1 campaña.
- Dashboard en `/dashboard/marketing` con editor de campañas.
- API en `/api/marketing/send`.

## 🔐 Autenticación

- **Sesiones:** JWT stateless firmadas con `AUTH_SECRET`.
- **Cookie:** `puragenda_session` (7 días).
- **Middleware:** Protege `/dashboard/*`, `/api/dashboard/*`, `/para/x7k9m2v4q8/*`, `/api/admin/*`.
- **CORS:** Habilitado para `/api/business/*` (APIs públicas del widget).
- **Edge compatible:** El middleware usa `atob()` para decodificar, no `crypto`.
- **SuperAdmin:** Emails configurados en `SUPERADMIN_EMAILS`: admin@purocode.com, diego@purocode.com, contacto@purocode.com.
- **Admin Panel:** Ruta secreta `/para/x7k9m2v4q8`.
- **Forgot Password:** Flujo completo con PasswordResetToken (1 hora de expiración).

## 🎨 Sistema de Diseño

- **Tema:** Light/Dark con theme-toggle (next-themes).
- **Color primario:** `#7C3AED` (purple-600).
- **Color secundario:** `#5B21B6` (purple-800).
- **Framework CSS:** Tailwind CSS 4 con `@tailwindcss/postcss`.
- **UI Components:** shadcn/ui con base-ui.
- **Cards:** `rounded-2xl border border-border bg-card`.
- **Gradientes:** `bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#5B21B6]`.

## 📅 Dashboard — Calendario Semanal

- **Navegación URL:** Usa query param `?date=YYYY-MM-DD` para persistir semana.
- **Flechas prev/next:** Navegan entre semanas.
- **Botón "Hoy":** Aparece cuando no estás en la semana actual.
- **Grid:** 7 columnas (Lun-Dom) × filas horarias.
- **Click en cita:** Modal con detalle + acciones de estado.
- **Flujo de estados:** PENDING → CONFIRMED → CHECKED_IN / NO_SHOW / CANCELLED / COMPLETED.
- **Filtrado por rol:** Staff solo ve sus propias citas.

## 👥 Gestión de Profesionales (/dashboard/staff)

- **CRUD:** Crear staff con nombre + email, toggle activo/inactivo.
- **Horario individual:** Cada staff tiene horario por día de la semana.
- **Servicios:** Relación M:N entre Staff y Service.
- **Cuenta de usuario:** Al crear staff con email → genera User STAFF + contraseña temporal + email de invitación.
- **Expandible:** Click en "Horario" despliega editor de 7 días con toggles.

## 🎨 Personalización del Widget (/dashboard/appearance)

- **Color picker nativo** para primaryColor, secondaryColor, backgroundColor, textColor, textMutedColor.
- **Font size:** Widget font size configurable.
- **Logo URL:** Input de texto con preview.
- **Live preview:** iframe del widget con colores aplicados.
- **Persistencia:** Guarda en Business model vía Server Action.

## 🔌 Widget de Reservas

### Flujo del Widget
1. **Selección de servicio(s)** → duración y precio (multi-select si maxServicesPerBooking > 1).
2. **Selección de profesional** (solo si multi-staff, filtrado por servicios que atiende).
3. **Selección de fecha** → filtra días cerrados + días sin staff disponible.
4. **Selección de hora** → genera slots según horario del negocio AND horario del staff.
5. **Datos del cliente** → nombre, email, teléfono.
6. **Confirmación** → booking via API.

### Cascade de Color
`URL param (?primary=HEX)` → `business.brandColor` → `business.primaryColor` → `#7C3AED` default.

### Parámetros URL del Widget
`?color=`, `?primary=`, `?secondary=`, `?bg=`, `?text=`, `?textSecondary=`, `?fontSize=`

### SEO del Widget
- Metadata dinámica por negocio (title, description, OG, Twitter)
- JSON-LD `LocalBusiness` con `ReserveAction`
- Viewport dinámico con themeColor

### Embebido
```html
<iframe src="/widget/{slug}" width="100%" height="700" frameborder="0" style="border-radius: 16px; border: 1px solid #222;"></iframe>
```

## 🛡️ Anti-Fraude

- Al registrarse, se captura la IP del usuario.
- Si la IP o email ya tienen un trial previo, no se otorga trial nuevo.
- Tabla `BlacklistedIp` registra IPs usadas.

## 📡 API Routes

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro con anti-fraude + referral |
| POST | `/api/auth/login` | Login + JWT |
| POST | `/api/auth/logout` | Logout (borra cookie) |
| GET | `/api/auth/me` | Usuario actual |
| DELETE | `/api/auth/cancel-registration` | Cancelar registro y borrar cuenta |
| POST | `/api/billing/subscribe` | Crear suscripción MercadoPago |
| POST | `/api/billing/verify` | Verificar estado de pago |
| POST | `/api/webhooks/mercadopago` | Webhook de MercadoPago |
| GET | `/api/business/[slug]/appointments?date=` | Slots ocupados (widget) |
| POST | `/api/business/[slug]/book` | Crear reserva (widget) |
| GET | `/api/business/[slug]/services` | Servicios públicos |
| PATCH | `/api/dashboard/appointments/[id]` | Cambiar estado de cita |
| GET/POST | `/api/dashboard/services` | CRUD servicios |
| POST | `/api/marketing/send` | Enviar campaña de marketing |
| GET | `/api/cron/*` | Jobs programados |

## ⚙️ Variables de Entorno (.env)

```
DATABASE_URL="postgresql://..."
AUTH_SECRET="tu-secreto-jwt"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MERCADOPAGO_ACCESS_TOKEN="..."
RESEND_API_KEY="..."
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

## 🚀 Comandos

```bash
npm run dev              # Servidor de desarrollo (webpack, --host 0.0.0.0)
npm run dev:turbo        # Servidor de desarrollo (turbopack)
npm run build            # Build de producción
npm run start            # Servidor de producción
npx prisma migrate dev   # Crear migración
npx prisma generate      # Regenerar client
npm run seed             # Ejecutar seeder
```

## 📦 Dependencias Clave

- `next@16.2.4` — Framework React full-stack
- `react@19.2.4` — React 19
- `prisma@7.7.0` + `@prisma/client` + `@prisma/adapter-pg` — ORM con adapter PG
- `pg` — PostgreSQL driver
- `bcrypt@6` — Hash de passwords
- `date-fns@4` + `date-fns-tz` — Manipulación de fechas + timezone
- `lucide-react` — Iconos
- `tailwindcss@4` + `@tailwindcss/postcss` — Estilos
- `shadcn` + `@base-ui/react` — UI components
- `zod@4` — Validación de schemas
- `mercadopago@2` — SDK MercadoPago (PreApproval)
- `resend@6` — Emails transaccionales
- `cloudinary@2` — Upload de imágenes (logos)
- `next-themes` — Light/Dark mode
- `class-variance-authority` + `clsx` + `tailwind-merge` — Utilidades CSS

## 🏷️ Convenciones de Código

- **Server Components** por defecto, `"use client"` solo cuando necesario.
- **Server Actions** en `src/server/actions/` para mutaciones.
- **Services** en `src/server/services/` para lógica de negocio.
- **Constants** centralizados en `src/core/constants.ts`.
- **Tipos** en `src/core/entities/index.ts`.
- **Validations** en `src/server/validations/` con Zod schemas.
- **Email templates** en `src/server/email/templates.ts`.
- **Estilo:** Dark/Light theme con border-border, bg-card, rounded-2xl, gradientes morados.
- **Deploy:** Vercel (vercel.json configurado).
- **PWA:** Componentes en `src/components/pwa/`.
