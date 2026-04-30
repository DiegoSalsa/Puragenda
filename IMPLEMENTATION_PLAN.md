# Puragenda: Notificaciones, Roles, Google Cal UI & Refactorización Visual

Implementar el sistema de emails transaccionales, permisos de roles, la UI de Google Calendar (PRO-only), la corrección maestra de temas light/dark, y los componentes Navbar + Footer de la landing.

## User Review Required

> [!IMPORTANT]
> **Resend como proveedor de email**: Usaré `resend` (SDK oficial, gratis hasta 100 emails/día, API key simple). Necesitarás crear una cuenta en resend.com, obtener tu API key, y agregarla como `RESEND_API_KEY` en `.env`. ¿Estás de acuerdo o prefieres `nodemailer` con SMTP?

> [!IMPORTANT]
> **Google Calendar**: Solo se implementa la UI + estado DB. El botón "Conectar con Google Calendar" quedará como placeholder visual (sin OAuth real aún). ¿Correcto?

> [!WARNING]
> **Rol MANAGER**: El schema actual solo tiene `OWNER | STAFF | SUPERADMIN`. ¿Quieres que agregue `MANAGER` al enum `UserRole` en Prisma, o prefieres manejarlo como un flag sin modificar el schema?

## Open Questions

> [!IMPORTANT]
> **Email del remitente**: ¿Quieres que los correos salgan desde `noreply@puragenda.com`, `notificaciones@purocode.com`, u otro? (Resend requiere verificar dominio; mientras tanto `onboarding@resend.dev` para testing).

> [!IMPORTANT]
> **Redes sociales del Footer**: Necesito las URLs reales de Instagram y LinkedIn de PuroCode. ¿Tienes los links o uso placeholders?

---

## Proposed Changes

### 1. Email System (Backend)

#### [NEW] `src/server/email/resend.ts`
- Configurar cliente Resend con `RESEND_API_KEY`
- Exportar instancia singleton

#### [NEW] `src/server/email/templates.ts`
- Funciones que retornan HTML con branding Puragenda para:
  - `newBookingOwnerEmail(data)` → Resumen de cita al dueño
  - `newBookingStaffEmail(data)` → Detalle de cita al profesional
  - `newBookingClientEmail(data)` → "Tu reserva ha sido solicitada" al cliente
  - `confirmedBookingClientEmail(data)` → "¡Reserva Confirmada!" al cliente

#### [NEW] `src/server/email/send.ts`
- `sendBookingNotifications(appointment, business)` → 3 correos de nueva reserva
- `sendConfirmationEmail(appointment, business)` → Correo de confirmación al cliente
- Errores silenciosos (log, no bloquea flujo)

#### [MODIFY] `src/app/api/business/[slug]/book/route.ts`
- Post-createAppointment: llamar `sendBookingNotifications()` async

#### [MODIFY] `src/app/api/dashboard/appointments/[id]/route.ts`
- Post-updateStatus CONFIRMED: llamar `sendConfirmationEmail()` async

---

### 2. Roles y Permisos

#### [MODIFY] `prisma/schema.prisma`
- Agregar `MANAGER` al enum `UserRole` (si aprobado)

#### [MODIFY] `sidebar.tsx`
- OWNER/SUPERADMIN: ve todo
- MANAGER: todo excepto `/dashboard/settings`
- STAFF: solo `/dashboard` (su agenda)

#### [MODIFY] `settings/page.tsx` + `dashboard.actions.ts`
- Bloquear Settings a solo OWNER/SUPERADMIN
- STAFF solo puede confirmar sus propias citas

---

### 3. Google Calendar UI (PRO exclusive)

#### [MODIFY] `prisma/schema.prisma`
- Staff: `+ googleCalendarConnected Boolean @default(false)`, `+ googleCalendarEmail String?`

#### [NEW] `src/app/dashboard/staff/google-calendar-section.tsx`
- Plan != PRO → badge "Disponible en Plan PRO" + upsell
- Plan == PRO → botón conectar (placeholder visual)

---

### 4. Corrección Maestra de Temas (Light/Dark)

#### [MODIFY] `globals.css`
- `:root`: `--background: #FFFFFF`, `--card: #FFFFFF`, `--border: #E5E7EB`, `--foreground: #0F172A`, `--muted-foreground: #64748B`

#### Auditoría de ~20 archivos con colores hardcoded

| Archivo | Cambio |
|---------|--------|
| `weekly-calendar.tsx` | `bg-[#111]`→`bg-card`, `border-white/[0.06]`→`border-border` |
| `staff-list.tsx` | `bg-[#0E0E0E]`→`bg-card`, `bg-[#1a1a1a]`→`bg-muted` |
| `services-client.tsx` | Cards, modales, inputs a semánticos |
| `settings/page.tsx` | Cards a `bg-card border-border` |
| `business-hours-editor.tsx` | Inputs y toggles |
| `login-form.tsx` | Card `bg-[#111]`→`bg-card` |
| `register-form.tsx` | Card e inputs |
| `pricing-cards.tsx` | Cards a `bg-card border-border` |
| `pricing/page.tsx` | Header a semantic |
| `referrals/*.tsx` | Cards y textos |
| `appearance/*.tsx` | Textos |
| `admin/*.tsx` | Cards |

---

### 5. Navbar Component (Landing)

#### [NEW] `src/components/landing/navbar.tsx`
- Logo + enlaces ancla (#caracteristicas, #precios) + ThemeToggle + botones auth
- Mobile: hamburger → drawer lateral
- `sticky top-0 z-50 bg-background/80 backdrop-blur-xl`

---

### 6. Footer Component (Landing)

#### [NEW] `src/components/landing/footer.tsx`
- Grid 4 cols: Logo, Links, Contacto (email + tel), Redes sociales
- Bottom bar: "© 2026 Puragenda by PuroCode"
- Light/dark compatible, responsive

---

## Verification Plan

```bash
npx prisma generate   # Schema válido
npm run build          # Sin errores TS
```

Manual: Emails en logs, roles filtran sidebar, Google Cal badge, light mode consistente, navbar/footer responsive.
