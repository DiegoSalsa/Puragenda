# Puragenda — Contexto Completo del Proyecto

> **Última actualización:** 2026-04-24  
> **Versión:** v5 (Staff Schedules + Appearance + Calendar Navigation)  
> **Stack:** Next.js 16 + Prisma 7 + PostgreSQL + TypeScript + Tailwind CSS  
> **Repositorio:** https://github.com/DiegoSalsa/Puragenda

---

## 🎯 Qué es Puragenda

Puragenda es un **SaaS multitenant de agendamiento** desarrollado por la agencia **PuroCode**. Permite a negocios crear su propio sistema de reservas con un widget embebible (iframe) totalmente personalizable en colores y marca.

## 🏗️ Arquitectura

```
c:\Users\diego\Desktop\agenda\
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page (público)
│   ├── login/                    # Auth: login
│   ├── register/                 # Auth: registro
│   ├── dashboard/                # Panel de administración (protegido)
│   │   ├── page.tsx              # Calendario semanal + stats
│   │   ├── weekly-calendar.tsx   # Componente calendario con navegación URL
│   │   ├── appointment-actions.tsx # Acciones de citas (confirmar/cancelar/etc)
│   │   ├── staff/                # Gestión de profesionales + horarios
│   │   ├── services/             # CRUD de servicios
│   │   ├── appearance/           # Personalización visual del widget
│   │   └── settings/             # Config: horarios del negocio, API key, iframe
│   ├── admin/                    # Panel SuperAdmin (solo admin@purocode.cl)
│   ├── widget/[slug]/            # Widget de reservas (público, embebible)
│   └── api/                      # API Routes
│       ├── auth/                 # login, register, logout, me
│       ├── business/[slug]/      # appointments, book, services
│       └── dashboard/            # appointments PATCH, services CRUD
├── src/
│   ├── core/
│   │   ├── constants.ts          # Precios, planes, configuración
│   │   └── entities/index.ts     # Tipos TypeScript del dominio
│   ├── server/
│   │   ├── auth/                 # session.ts, user-session.ts
│   │   ├── db/prisma.ts          # Singleton de Prisma
│   │   ├── actions/              # Server Actions (dashboard.actions.ts)
│   │   └── services/             # Business logic: auth, appointment, business, staff, subscription, businessHours
│   ├── components/
│   │   ├── dashboard/            # sidebar, subscription-banner, logout-button
│   │   └── ui/                   # Componentes reutilizables
│   ├── hooks/                    # Custom hooks
│   └── lib/utils.ts              # formatPrice, capitalize, cn
├── prisma/
│   ├── schema.prisma             # Schema v5
│   ├── seed.ts                   # Seeder con datos de prueba
│   └── migrations/               # Migraciones SQL
├── middleware.ts                  # Protección de rutas (/dashboard, /admin)
└── .env                          # Variables de entorno
```

## 🗄️ Modelos de Base de Datos (Prisma)

### Modelos Principales
| Modelo | Descripción |
|--------|-------------|
| `User` | Usuarios con roles OWNER/STAFF/SUPERADMIN. Tracking de trial/IP. |
| `Business` | Negocio multitenant. slug único, apiKey, colores personalizables. |
| `Service` | Servicios ofrecidos (nombre, duración, precio). |
| `Staff` | Profesionales del negocio. |
| `StaffSchedule` | Horario laboral individual por staff (7 días, hora inicio/fin). |
| `BusinessHours` | Horario de apertura del negocio (7 días). |
| `BlockedDate` | Fechas específicas bloqueadas (feriados, etc). |
| `Appointment` | Citas con estados: PENDING → CONFIRMED → CHECKED_IN/NO_SHOW/CANCELLED. |
| `Subscription` | Plan del negocio: INDIVIDUAL/BASIC/PRO con ciclo mensual/anual. |
| `BlacklistedIp` | IPs bloqueadas para prevención de fraude en trials. |

### Enums
- **UserRole:** OWNER, STAFF, SUPERADMIN
- **SubscriptionPlan:** INDIVIDUAL, BASIC, PRO
- **SubscriptionStatus:** ACTIVE, TRIALING, INACTIVE, CANCELLED
- **BillingCycle:** MONTHLY, ANNUAL
- **AppointmentStatus:** PENDING, CONFIRMED, CANCELLED, CHECKED_IN, NO_SHOW

## 💰 Modelo de Precios

| Plan | Precio/mes | Staff incluido | Staff extra |
|------|-----------|----------------|-------------|
| Individual | $14.990 CLP | 1 | No permitido |
| Base | $24.990 CLP | 1 | +$3.000/extra |
| Pro | $39.990 CLP | 1 | +$5.000/extra |

- **Trial:** 30 días gratis (anti-fraude por IP + email).
- **Anual:** Paga 10 meses, obtiene 12.
- **Nuevos registros** arrancan en plan INDIVIDUAL con trial.

## 🔐 Autenticación

- **Sesiones:** JWT stateless firmadas con `AUTH_SECRET`.
- **Cookie:** `puragenda_session` (7 días).
- **Middleware:** Protege `/dashboard/*` y `/admin/*`.
- **Edge compatible:** El middleware usa `atob()` para decodificar, no `crypto`.
- **SuperAdmin:** Emails configurados en `SUPERADMIN_EMAILS` en constants.ts.

## 🎨 Sistema de Diseño

- **Tema:** Dark premium con gradiente morado.
- **Color primario:** `#7C3AED` (purple-600).
- **Color secundario:** `#5B21B6` (purple-800).
- **Fondo:** `#0A0A0A` (near-black).
- **Bordes:** `border-white/[0.06]` (ultra-sutil).
- **Cards:** `bg-[#111]` con `rounded-2xl`.
- **Dropdowns/Selects:** `bg-[#1a1a1a] text-white` con `[&>option]` styling.

## 📅 Dashboard — Calendario Semanal

- **Navegación URL:** Usa query param `?date=YYYY-MM-DD` para persistir semana.
- **Flechas prev/next:** Navegan entre semanas.
- **Botón "Hoy":** Aparece cuando no estás en la semana actual.
- **Grid:** 7 columnas (Lun-Dom) × 12 filas (7:00-18:00).
- **Click en cita:** Modal con detalle + acciones de estado.
- **Flujo de estados:** PENDING → CONFIRMED → CHECKED_IN / NO_SHOW / CANCELLED.

## 👥 Gestión de Profesionales (/dashboard/staff)

- **CRUD:** Crear staff con nombre + email, toggle activo/inactivo.
- **Horario individual:** Cada staff tiene horario por día de la semana.
- **Expandible:** Click en "Horario" despliega editor de 7 días con toggles.
- **Guardado:** Server Action `saveStaffScheduleAction`.

## 🎨 Personalización del Widget (/dashboard/appearance)

- **Color picker nativo** para primaryColor, secondaryColor, backgroundColor.
- **Input hex** junto al picker.
- **Logo URL:** Input de texto con preview.
- **Live preview:** iframe del widget con colores aplicados.
- **Persistencia:** Guarda en Business model vía Server Action.

## 🔌 Widget de Reservas

### Flujo del Widget
1. **Selección de servicio** → duración y precio.
2. **Selección de profesional** (solo si multi-staff).
3. **Selección de fecha** → filtra días cerrados + días sin staff disponible.
4. **Selección de hora** → genera slots según horario del negocio AND horario del staff.
5. **Datos del cliente** → nombre, email, teléfono.
6. **Confirmación** → booking via API.

### Cascade de Color
`URL param (?color=HEX)` → `business.primaryColor` → `business.brandColor` → `#7C3AED` default.

### Embebido
```html
<iframe src="/widget/{slug}?color=HEX" width="100%" height="700" frameborder="0"></iframe>
```

## 🛡️ Anti-Fraude

- Al registrarse, se captura la IP del usuario.
- Si la IP o email ya tienen un trial previo, no se otorga trial nuevo.
- Tabla `BlacklistedIp` registra IPs usadas.

## 📡 API Routes

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro con anti-fraude |
| POST | `/api/auth/login` | Login + JWT |
| POST | `/api/auth/logout` | Logout (borra cookie) |
| GET | `/api/auth/me` | Usuario actual |
| GET | `/api/business/[slug]/appointments?date=` | Slots ocupados (widget) |
| POST | `/api/business/[slug]/book` | Crear reserva (widget) |
| GET | `/api/business/[slug]/services` | Servicios públicos |
| PATCH | `/api/dashboard/appointments/[id]` | Cambiar estado de cita |
| GET/POST | `/api/dashboard/services` | CRUD servicios |

## 🧪 Datos de Prueba

| Rol | Email | Password | Plan | Staff |
|-----|-------|----------|------|-------|
| 👑 SuperAdmin | `admin@purocode.cl` | `purocode123` | PRO | 3 (mañana/tarde/mixto) |
| 👤 Owner | `vale@esteticabella.cl` | `purocode123` | BASIC Trial | 2 (full/tarde) |
| 👤 Owner | `carlos@barberia.cl` | `purocode123` | INDIVIDUAL | 1 |

### Staff en PuroCode Demo
- **Diego Salazar:** Lun-Vie 08:00-14:00 (turno mañana)
- **Camila Rojas:** Lun-Vie 14:00-20:00 (turno tarde)
- **Matías Torres:** Lun/Mié/Vie 09:00-18:00 + Sáb 10:00-14:00 (mixto)

## ⚙️ Variables de Entorno (.env)

```
DATABASE_URL="postgresql://..."
AUTH_SECRET="tu-secreto-jwt"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 🚀 Comandos

```bash
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npx prisma migrate dev   # Crear migración
npx prisma generate      # Regenerar client
npx prisma db seed       # Ejecutar seeder
```

## 📦 Dependencias Clave

- `next@16.2.4` — Framework React full-stack
- `prisma@7.7.0` + `@prisma/client` — ORM
- `bcrypt` — Hash de passwords
- `date-fns` — Manipulación de fechas
- `lucide-react` — Iconos
- `tailwindcss` — Estilos
- `zod` — Validación (disponible pero no usado extensamente aún)

## 🏷️ Convenciones de Código

- **Server Components** por defecto, `"use client"` solo cuando necesario.
- **Server Actions** en `src/server/actions/` para mutaciones.
- **Services** en `src/server/services/` para lógica de negocio.
- **Constants** centralizados en `src/core/constants.ts`.
- **Tipos** en `src/core/entities/index.ts`.
- **Estilo:** Dark theme con `bg-[#111]`, `border-white/[0.06]`, gradientes morados.
- **Dropdowns/Selects:** Siempre usar `bg-[#1a1a1a] text-white [&>option]:bg-[#1a1a1a] [&>option]:text-white`.
