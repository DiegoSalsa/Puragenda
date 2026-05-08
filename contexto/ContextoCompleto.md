# Puragenda - ContextoCompleto

Fecha: 2026-04-24
Repositorio: https://github.com/DiegoSalsa/Puragenda
Commit revisado: 488cac1 (main)

## 1) Resumen ejecutivo
Puragenda es un SaaS multitenant de reservas online (agenda) construido con Next.js App Router + Prisma + PostgreSQL.
Incluye:
- Landing publica
- Registro/Login con sesion en cookie
- Dashboard para negocio (citas, servicios, staff, configuracion)
- Widget embebible por iframe para reservas publicas
- API publica con API key por negocio
- Personalizacion visual del widget (colores/logo)
- Logica anti-colisiones de horarios y anti-fraude basico de trial

## 2) Stack tecnico
- Frontend/Fullstack: Next.js 16.2.4 + React 19 + TypeScript
- Estilos: Tailwind CSS v4
- ORM: Prisma 7.7.0
- DB: PostgreSQL
- Validaciones: Zod (disponible en varias rutas)
- Fechas: date-fns + date-fns-tz
- Seguridad de contrasenas: bcrypt

## 3) Estructura principal
- app/: rutas App Router (publicas, dashboard, admin, widget y API)
- src/core/: tipos, constantes y validaciones puras
- src/server/: auth, db y servicios de negocio
- prisma/: schema, migrations y seed
- middleware.ts: proteccion de rutas y reglas de acceso

## 4) Funcionalidades encontradas
- Auth:
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/logout
  - GET /api/auth/me
- Widget publico:
  - GET /widget/[slug]
  - GET /api/business/[slug]/services
  - GET /api/business/[slug]/appointments?date=YYYY-MM-DD
  - POST /api/business/[slug]/book
- Dashboard:
  - Calendario semanal y gestion de citas
  - Gestion de servicios
  - Gestion de staff + horarios individuales
  - Configuracion visual y API key
- Admin:
  - Seccion admin dedicada (acceso por superadmin)

## 5) Modelo de datos (alto nivel)
Entidades principales en Prisma:
- User (OWNER/STAFF/SUPERADMIN)
- Business
- Subscription
- Service
- Staff
- StaffSchedule
- BusinessHours
- BlockedDate
- Appointment (PENDING/CONFIRMED/CANCELLED/CHECKED_IN/NO_SHOW)
- BlacklistedIp

## 6) Como levantar el proyecto localmente
Prerequisitos:
- Node.js 20+
- PostgreSQL activo

Pasos:
1. Instalar dependencias
   npm install
2. Crear .env en la raiz con:
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME"
   AUTH_SECRET="un_secreto_largo_y_unico"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
3. Aplicar migraciones
   npx prisma migrate dev
4. (Opcional) Cargar datos de prueba
   npm run seed
5. Levantar en desarrollo
   npm run dev
6. Abrir en navegador
   http://localhost:3000

Comandos utiles:
- npm run build
- npm run start
- npm run lint

## 7) Riesgos / brechas observadas
- Falta README operativo completo en la raiz (onboarding tecnico rapido).
- No se observa suite de tests automatizados (unitarios/integracion/e2e) como estandar minimo.
- Anti-fraude basico: requiere evolucion a rate limit, fingerprint y auditoria robusta.
- No se aprecia observabilidad completa (logs estructurados, metricas, trazas).
- Falta CI/CD explicita (lint, typecheck, tests, migraciones seguras, build).
- Falta documentacion formal de hardening de seguridad y gestion de secretos por entorno.

## 8) Roadmap propuesto por fases
### Fase 0 - Estabilizacion (1 semana)
- Crear README tecnico de arranque y troubleshooting.
- Estandarizar .env.example con variables minimas.
- Agregar scripts de calidad: typecheck, lint estricto.
- Definir politica de ramas y convencion de commits.

### Fase 1 - Calidad base (1-2 semanas)
- Unit tests para servicios criticos (auth, appointment, staff schedule).
- Tests de integracion API (rutas auth/business/dashboard).
- Mock/fixtures de datos para escenarios de colisiones y timezone.

### Fase 2 - Seguridad y cumplimiento (1-2 semanas)
- Rate limiting por IP/endpoint.
- Auditoria de intentos fallidos y eventos sensibles.
- Rotacion de API keys por negocio + expiracion opcional.
- Mejorar politicas CORS y validaciones de origen.

### Fase 3 - Operacion y DevOps (1-2 semanas)
- Pipeline CI/CD: lint + typecheck + test + build.
- Entornos dev/staging/prod con migraciones controladas.
- Observabilidad: logs estructurados, alertas basicas y panel de errores.

### Fase 4 - Producto y crecimiento (2-4 semanas)
- Recordatorios por WhatsApp/Email pre-cita.
- Confirmacion automatica y reprogramacion por link.
- Roles/permisos mas granulares para staff.
- Reportes de ocupacion, no-show y revenue por periodo.

## 9) Estado del contexto generado
Se creo la carpeta contexto y se incluyeron:
- contexto/ARCHITECTURE.md
- contexto/CONTEXT.md
- contexto/ContextoCompleto.md

Este documento funciona como base para onboarding, handoff tecnico y plan de evolucion.
