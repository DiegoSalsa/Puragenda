# Actualización de Autenticación, Onboarding y Emails — Puragenda

Implementación de 5 módulos: modelo PasswordResetToken, mejora del registro con `businessName`, gestión de staff con acceso al panel (User + email), nuevos templates de email, y flujo completo de "Olvidé mi contraseña".

---

## Proposed Changes

### Módulo 1 — Base de Datos (Prisma Schema)

#### [MODIFY] schema.prisma

- **Nuevo modelo `PasswordResetToken`** con campos: `id`, `email`, `token` (`@unique`), `expires` (`DateTime`), `createdAt`.
- El modelo `Staff` ya tiene `userId` opcional y relación con `User` — no requiere cambios estructurales.

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  expires   DateTime
  createdAt DateTime @default(now())

  @@index([email])
}
```

Después: `npx prisma migrate dev --name add-password-reset-token`

---

### Módulo 2 — Registro (Onboarding) + Settings

- **registerSchema**: agregar `businessName` (obligatorio)
- **register-form.tsx**: nuevo input `businessName`
- **auth.service.ts**: usar `businessName` para crear Business + disparar Welcome Email
- **settings/page.tsx**: nueva card "Nombre del Negocio"
- **dashboard.actions.ts**: nueva action `updateBusinessNameAction`

---

### Módulo 3 — Staff con Acceso al Panel

- Email obligatorio en formulario de staff
- `createStaffAction`: generar contraseña, crear User STAFF, vincular a Staff, enviar invite email

---

### Módulo 4 — Nuevos Emails Transaccionales

4 templates: Welcome, Staff Invite, Cancellation, Forgot Password
4 funciones de envío en send.ts
Integración del cancellation email en appointment PATCH route

---

### Módulo 5 — Flujo "Olvidé mi Contraseña"

- `/auth/forgot-password` — formulario email
- `/auth/new-password` — formulario nueva contraseña (con token URL)
- `auth.actions.ts` — forgotPasswordAction + resetPasswordAction
- Link en login form

---

## Verification Plan

1. `npx prisma migrate dev` — migración exitosa
2. `npm run build` — sin errores TypeScript
3. Verificación manual de todos los flujos
4. Push a GitHub
