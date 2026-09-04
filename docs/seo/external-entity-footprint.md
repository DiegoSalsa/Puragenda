# External entity footprint — SEO-013 + SEO-014

Fecha investigación (SEO-013): 4 de septiembre de 2026  
Fecha ejecución (SEO-014): 4 de septiembre de 2026

Producto: Puragenda (`https://www.puragenda.cl`)

Empresa/desarrollador: PuroCode (`https://www.purocode.com`)

Ficha corporativa first-party: `https://www.purocode.com/labs`

**No se tocó el producto.** No se cambió marketplace, `indexingEnabled`, rutas SEO, schema, landings, robots, sitemap, precios, funcionalidades ni analytics.

SEO-013 preparó el paquete y no envió altas. SEO-014 envió las dos altas P0 gratuitas. No se pagó nada, no se pidieron reviews, no se activó PPC ni leads.

## Resumen ejecutivo

| Plataforma | Entidad | Resultado | Estado |
|---|---|---|---|
| Capterra / G2 Digital Markets | Puragenda, vendor PuroCode | Solicitud enviada a review | SUBMITTED / PENDING REVIEW |
| GetApp | Puragenda | No solicitar hasta que Capterra esté LIVE | REQUIRES USER (dependiente de Capterra LIVE) |
| ComparaSoftware.cl | Puragenda, fabricante PuroCode | Solicitud enviada a review | SUBMITTED / PENDING REVIEW |
| Crunchbase | PuroCode / Puragenda | No ejecutado: social auth + campos no verificables | REQUIRES USER |
| LinkedIn Company PuroCode | — | Sin nuevos intentos | BLOCKED / REQUIRES USER |
| LinkedIn Company Puragenda | — | Sin nuevos intentos | BLOCKED / REQUIRES USER |
| Google Business Profile Puragenda | Puragenda | Perfil existente | EXISTING |

### SEO-014 — ejecución

| Campo | Capterra / G2DM | ComparaSoftware |
|---|---|---|
| Cuenta | `contacto@purocode.com` en app.g2digitalmarkets.com | fabricante en comparasoftware.cl/panel-usuario/register |
| Producto | Puragenda | Puragenda |
| Vendor / fabricante | PuroCode | PuroCode |
| Website | https://www.puragenda.cl | https://www.puragenda.cl |
| Request / reference | `81028715-7431-469c-9bc6-e98313eca26e` | panel de fabricante; URL pública aún no indexada |
| Fecha submission | 2026-09-04 | 2026-09-04 |
| Categoría pedida | Appointment Scheduling (no 360 Degree Feedback) | agenda / reservas / citas |
| Pricing | CLP; Individual 12990/mes; Equipo 29990/mes; trial 30 días sin tarjeta | consistente con precios públicos si el formulario lo pidió |
| Coste | $0 | $0 listado gratis |
| Upsell rechazado | PPC / brand building / lead generation | PPC, Reputación Digital, Generación de Demanda |
| URL pública | aún no (pending review; publicación puede tardar semanas) | aún no (pending review) |

Cambio de proceso respecto de SEO-011: Gartner Digital Markets pasó a **G2 Digital Markets** (cierre febrero 2026). El alta gratuita de Capterra ahora parte de `https://app.g2digitalmarkets.com/get-listed/start`. Una sola cuenta de vendor. La ficha inicial se publica en Capterra; GetApp y Software Advice se piden después desde el mismo cabinet. No crear un segundo producto.

## Relación de entidad a mantener

```
PuroCode  → empresa / desarrollador  → https://www.purocode.com
Puragenda → SaaS de agendamiento y reservas desarrollado por PuroCode
            → https://www.puragenda.cl
```

Marca oficial del producto: **Puragenda**. No usar Pura Agenda, PuraAgenda ni Puragenda App.

## Paquete de datos verificables

Usar solo esto. Si un formulario pide algo que no está aquí: dejarlo vacío o marcar REQUIRES USER. No inventar.

### Identidad

| Campo | Valor verificable | Fuente |
|---|---|---|
| Marca del producto | Puragenda | `puragenda.cl`, `/labs`, `llms.txt` |
| Developer / vendor | PuroCode | `purocode.com`, JSON-LD `creator` / `parentOrganization` |
| URL del producto | `https://www.puragenda.cl` | Sitio oficial |
| URL corporativa | `https://www.purocode.com` | Sitio oficial |
| Ficha corporativa | `https://www.purocode.com/labs` | SEO-012 |
| País | Chile | `areaServed`, mercado publicado |
| Correo | `contacto@purocode.com` | JSON-LD, privacidad, notificaciones admin |
| Teléfono público | `+56949255006` | JSON-LD `PUBLIC_CONTACT` |
| Idioma | Español de Chile | Sitio |
| Deployment | Web / cloud | SoftwareApplication `operatingSystem: Web` |
| Logo producto | `public/logos/logoPuragendaSVG.svg`, `public/android-chrome-512x512.png` | Repo |
| Instagram PuroCode | `https://www.instagram.com/purocodecl/` | `sameAs` |
| Facebook PuroCode | `https://www.facebook.com/PuroCode.com` | SEO-011, no tocar aquí |

### Descripción base (adaptar, no copiar idéntica en todos)

> Puragenda es una plataforma SaaS de agendamiento y reservas desarrollada por PuroCode para negocios y profesionales que gestionan citas.

Variante corta para directorios en español:

> Puragenda es un software de reservas online para negocios de servicios en Chile, desarrollado por PuroCode. Permite publicar disponibilidad, recibir reservas, cobrar abonos con Mercado Pago y administrar profesionales, clientes y horarios desde un panel web.

Variante corta para directorios en inglés:

> Puragenda is an online appointment scheduling and booking SaaS for service businesses in Chile, developed by PuroCode. Businesses publish availability, take bookings, collect deposits via Mercado Pago, and manage staff, clients, and schedules from a web dashboard.

### Precios públicos actuales

Verificados el 2026-09-04 en `src/core/constants.ts` y en `https://www.puragenda.cl/pricing`.

| Plan | Precio | Incluye |
|---|---|---|
| Individual | $12.990 CLP / mes | 1 profesional, reservas ilimitadas |
| Equipo | $29.990 CLP / mes | 5 profesionales |
| Extra staff (Equipo) | $3.000 CLP / mes por profesional extra | Desde el 6.º |
| Anual | Paga 10 meses, usa 12 | Descuento publicado |
| Prueba | 30 días, sin tarjeta | Planes Individual y Equipo |
| Comisión por reserva | No | Publicado en FAQ de pricing |

**Decisión de pricing en fichas:** si el campo es opcional, **sí informar el precio de entrada** ($12.990 CLP/mes, Individual) porque ya es público. Si la plataforma no acepta CLP y exige USD u otra moneda: **no convertir**. Dejar “contact vendor” / “ver sitio” y anotar el riesgo. No hardcodear un equivalente USD.

Riesgo: el listing se desactualiza si cambia el precio. Mitigación: revisar la ficha cuando cambie `PRICING` en el producto.

### Features que sí se pueden afirmar

Solo si la plataforma tiene un checkbox equivalente. No traducir a claims de resultado.

- Reservas online / booking
- Agenda / calendar management
- Catálogo de servicios
- Profesionales / staff / multi-profesional
- Horarios y disponibilidad
- Bloqueos de horario
- Reagendamiento y cancelación
- Historial / clientes (CRM básico de reservas)
- Recordatorios por **email**
- Abonos / depósitos con Mercado Pago
- Integración Google Calendar
- Widget / iframe / link de reservas
- Personalización de marca (colores / widget)
- Prueba de 30 días

### Features que no se pueden afirmar

- Recordatorios por WhatsApp
- Recordatorios por SMS
- App nativa móvil
- Comisiones de staff
- POS completo
- Funciones médicas generales / ficha clínica
- Reducción de no-shows, aumento de reservas, facturación, uptime, ratings, reviews, funding, empleados, founders no verificados, partnerships

### Categorías permitidas

Solo categorías realmente de:

- Appointment scheduling
- Booking / online booking
- Scheduling software
- Equivalentes de agenda/reservas para negocios de servicios

No elegir categorías por visibilidad (médico general, POS, ERP, marketing automation, etc.).

En Capterra.cl la categoría canónica de competidores es [Software para agendar citas](https://www.capterra.cl/directory/30757/appointment-scheduling/software). GetApp.cl tiene [barbershop](https://www.getapp.cl/directory/1567/barbershop/software) como directorio del **mismo** producto G2DM, no como segunda ficha.

### Campos que ninguna plataforma recibió de nosotros en esta fase

No verificados / no rellenar todavía:

- RUT / razón social legal
- Año de fundación
- Dirección de oficina (el GBP existe; no copiar NAP desde el share link)
- Número de empleados
- Founders nominados como dato corporativo
- Funding, investors, rounds, revenue
- Ratings / número de clientes / número de reservas

## Tabla de footprint

| Platform | Entity | Profile URL | Status | Created/Existing | Description used | Website | Category | Requires review | Requires user action | Cost | Block reason | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Capterra (G2 Digital Markets) | Puragenda, vendor PuroCode | request `81028715-7431-469c-9bc6-e98313eca26e` (aún no hay URL pública) | SUBMITTED / PENDING REVIEW | Created 2026-09-04 | SaaS de agendamiento y reservas; developer PuroCode | https://www.puragenda.cl | Appointment Scheduling | Sí | Esperar publicación; luego pedir GetApp en el mismo cabinet | $0 | — | No duplicar producto. No PPC. Currency CLP. Trial 30 días, sin tarjeta. |
| GetApp | Puragenda | — | REQUIRES USER | No | Misma ficha G2DM | https://www.puragenda.cl | Mismo producto, no segundo alta | No hasta Capterra LIVE | Sí, **después** de Capterra LIVE | $0 si se pide desde el cabinet | Capterra aún no está LIVE | No registrar otra instancia |
| Software Advice | Puragenda | — | SKIPPED | No | — | — | — | No en esta fase | No | $0 teórico | Fuera del P0 de esta fase | Cubierto por el mismo vendor account; no solicitar ahora |
| G2.com (cabinet distinto) | Puragenda | — | SKIPPED | No | — | — | — | No | No | Listing gratis existe; no es P0 LATAM | SEO-011 lo dejó en P2 | Un listing G2.com no crea Capterra. No fragmentar entidad |
| ComparaSoftware.cl | Puragenda, fabricante PuroCode | — (pendiente de publicación) | SUBMITTED / PENDING REVIEW | Created 2026-09-04 | consistente con Capterra y /labs | https://www.puragenda.cl | agenda / reservas / citas | Sí | Esperar ficha LIVE; ignorar upsell | $0 Presencia en listados | — | Cuenta fabricante, no partner. No Reputación Digital ni leads. |
| Crunchbase | PuroCode (org) | — | REQUIRES USER | No | Ver paquete Crunchbase | https://www.purocode.com | Software / SaaS | Posible moderación | Sí: cuenta + **social auth** | $0 crear/editar. No Pro | Social auth + campos no verificables | Priorizar org PuroCode y mencionar Puragenda. No forzar producto separado |
| Crunchbase | Puragenda (producto/org) | — | SKIPPED | No | — | https://www.puragenda.cl | — | — | No hasta que exista PuroCode | $0 | Arquitectura incierta | Crear solo si Crunchbase permite producto hijo sin inventar campos |
| LinkedIn Company | PuroCode | — | BLOCKED / REQUIRES USER | No | — | https://www.purocode.com | — | — | Sí, cuando la cuenta cumpla el umbral de red | $0 | LinkedIn no deja crear Company Page con la cuenta actual | Sin nuevos intentos |
| LinkedIn Company / Product | Puragenda | — | BLOCKED / REQUIRES USER | No | — | https://www.puragenda.cl | — | — | Igual | $0 | Mismo bloqueo | Sin nuevos intentos |
| Google Business Profile | Puragenda | https://share.google/EI7MRiUwv4xO6xEH3 | EXISTING | Existing | No se editó | Esperable puragenda.cl; no verificado aquí | Local GBP | No | No | $0 | — | No duplicar. No modificar. El share link no es `sameAs` estable |

Estados usados: EXISTING, SUBMITTED, PENDING REVIEW, REQUIRES USER, BLOCKED / REQUIRES USER, SKIPPED.

---

## 1. Capterra / GetApp (P0)

### Cómo funciona el alta en 2026

G2 adquirió Capterra, GetApp y Software Advice (anuncio 29 ene 2026; cierre ~5 feb 2026). El portal de vendors ya no es “Gartner Digital Markets” en la práctica: redirige a **G2 Digital Markets**.

Fuentes:

- [G2 to acquire Capterra, Software Advice, and GetApp](https://www.prnewswire.com/news-releases/g2-to-acquire-capterra-software-advice-and-getapp-from-gartner-302673901.html)
- [Gartner Digital Markets → G2 Digital Markets](https://www.gartner.com/en/digital-markets)
- Alta: [Get your product listed](https://app.g2digitalmarkets.com/get-listed/start)
- Login: `https://app.g2digitalmarkets.com/login`
- Perfiles: [g2digitalmarkets.com/profiles](https://www.g2digitalmarkets.com/profiles)

Proceso oficial residual (página Gartner claim-profile, aún citada): si se aprueba, la ficha se publica en **Capterra**. GetApp y Software Advice se añaden **después**. Una solicitud = un producto. Pedir fichas paralelas produce duplicación.

G2.com es **otro cabinet** (`my.g2.com`). Un perfil G2.com no crea Capterra. No abrir G2.com en esta fase.

Listing básico: **gratis**. Costes que existen y **no se toman**:

- Engaged Buyers / PPC
- Qualified Leads / HQL
- Review collection paga / incentivos

Reviews: no generar, no copiar testimonios, no pedir masivamente. SEO-013 solo establece entidad.

### Búsqueda previa de duplicados

Consultado 2026-09-04:

| Query | Resultado |
|---|---|
| `Puragenda` en Capterra / Capterra.cl | Sin ficha. El buscador cae en homónimos de **otra** categoría (ProAgenda golf, Pur Social, PUREDI billing, Agenda HR Alemania, BitAgenda México) |
| `Pura Agenda` / `PuraAgenda` | Sin ficha propia |
| `PuroCode` + Capterra | Sin vendor propio |
| `https://www.capterra.cl/software/puragenda` | Cloudflare 403; no hay título de producto |
| `https://www.capterra.com/p/puragenda` | Redirect 308 a trailing slash; no hay ficha indexada |
| GetApp.cl / GetApp.com `Puragenda` | Sin ficha. Sí está AgendaPro (`/software/2039943/agendapro`) |

Homónimo a no reclamar: **ProAgenda** (`capterra.com/p/204217/ProAgenda-com/`) es booking para golf, no este producto.

### Estado

**SUBMITTED / PENDING REVIEW** (SEO-014, 2026-09-04)

Request ID: `81028715-7431-469c-9bc6-e98313eca26e`  
Cuenta: `contacto@purocode.com`  
Producto: Puragenda. Vendor: PuroCode. Website: `https://www.puragenda.cl`.  
Categoría pedida: Appointment Scheduling.  
Pricing: CLP, Individual 12990, Equipo 29990, trial 30 días, sin tarjeta.  
Upsell PPC/leads: no.

GetApp: **no solicitado**. Mismo cabinet, solo cuando Capterra esté LIVE.

### Instrucción de envío (usuario)

1. Abrir `https://app.g2digitalmarkets.com/get-listed/start` con `contacto@purocode.com`.
2. Producto: Puragenda. Vendor: PuroCode. Website: `https://www.puragenda.cl`. País: Chile.
3. Categoría: Appointment Scheduling (o equivalente de reservas). No medical/POS.
4. Descripción: paquete de arriba.
5. Features: solo la lista afirmable. Reminders = email.
6. Pricing: starting price $12.990 CLP/mes, free trial 30 días, no free version, no per-booking commission.
7. Assets: logo oficial del repo. No generar logo con IA.
8. No activar PPC, leads ni review campaigns.
9. No crear un segundo producto para GetApp.
10. Cuando Capterra publique, pedir GetApp desde el mismo cabinet (categoría scheduling; barbershop solo si el taxón G2DM lo trata como categoría del mismo producto).

---

## 2. GetApp

Sin ficha. Comparte backend con Capterra bajo G2 Digital Markets.

Acción separada: **sí, pero después y desde el mismo login**, no como segundo producto.

Coste de existir: $0. Coste de destacar: PPC, no tomar.

Estado: REQUIRES USER (dependiente de Capterra).

---

## 3. ComparaSoftware (P0 LATAM/Chile)

### Búsqueda previa

| URL | HTTP | Título |
|---|---|---|
| `https://www.comparasoftware.cl/puragenda` | 404 | Content not found |
| `https://www.comparasoftware.cl/purocode` | 404 | Content not found |
| `https://www.comparasoftware.cl/pura-agenda` | 404 | Content not found |
| `https://www.comparasoftware.com/puragenda` | 404 | Content not found |

AgendaPro sí existe: `https://www.comparasoftware.cl/agendapro`. Reservo sí: `https://www.comparasoftware.cl/reservo`. Puragenda no.

### Cómo listar (gratis)

Fuente: [Nuestros servicios](https://www.comparasoftware.cl/nuestros-servicios)

- Plan **Presencia en listados**: “crea y edita tu perfil, lista y gestiona tus productos”. Incluido / gratuito.
- CTA: [Crear Perfil](https://www.comparasoftware.cl/panel-usuario/register) — rol **desarrollador**.
- Login: `https://www.comparasoftware.cl/panel`
- Rol partner: `https://www.comparasoftware.cl/panel-usuario/partner-register` — **no usar**. PuroCode es el fabricante de Puragenda, no un partner de implementación de un tercero.

Declaración pública de ComparaSoftware (home AR, coherente con CL): registrarse es gratuito; cobran a vendors por conexión/leads, no por existir en el catálogo.

### Qué no aceptar

Planes **Reputación Digital** y **Generación de Demanda** (posicionamiento preferencial, créditos de contenido, leads, API CRM, eventos). CTA “Cotizar”. Pagos: transferencia USD a ComparaSoftware LLC o tarjeta.

También hay un formulario “Contactar” (nombre, WhatsApp, correo, plan de interés) que dispara un ejecutivo comercial. **No se envió.** Encaja en “llamada comercial obligatoria” del brief.

Si después del alta gratuita intentan vender: no implica aceptación. No firmar, no pagar.

### Estado

**SUBMITTED / PENDING REVIEW** (SEO-014, 2026-09-04)

Cuenta de fabricante con `contacto@purocode.com`. Producto Puragenda, fabricante PuroCode, plan Presencia en listados. URL pública aún no indexada (`/puragenda` seguía 404 al investigar). Upsell de leads/PPC no aceptado.

### Instrucción de envío (usuario)

1. `https://www.comparasoftware.cl/panel-usuario/register` con `contacto@purocode.com`.
2. Fabricante: PuroCode. Producto: Puragenda.
3. Web producto: `https://www.puragenda.cl`. Corporativa: `https://www.purocode.com`. Labs: `https://www.purocode.com/labs`.
4. País: Chile.
5. Categoría: la de reservas/citas/agenda de negocios de servicios. No médico general.
6. Descripción y features: paquete verificable. Recordatorios = email. Precios CLP públicos si el campo existe.
7. Quedarse en Presencia en listados. Ignorar upsell.
8. No copiar testimonios como reseñas.

---

## 4. Crunchbase (P1)

### Búsqueda previa

No aparece organización **PuroCode** (Chile, purocode.com) ni **Puragenda** (puragenda.cl).

El fetch directo a `crunchbase.com/organization/purocode` y `/puragenda` fue bloqueado por Cloudflare. La evidencia de ausencia es:

- SEO-011 ya lo clasificó NO EXISTENTE.
- Búsqueda web `site:crunchbase.com/organization` + PuroCode/Puragenda/puragenda.cl no devolvió ficha propia.
- Los hits son homónimos.

### Homónimos (no mezclar)

| Nombre | Qué es | URL / evidencia |
|---|---|---|
| PureCode AI / PureCode Software | Austin, UI codegen, funding | LinkedIn `purecodesoftwarecompany`, Tracxn, CB Insights |
| Puro Código | Software RD, `purocodigo.com` | LinkedIn `company/purocodigo`, sede Santiago **DO** |
| PURECODE LTD | UK Companies House 11065288 | No es esta empresa |
| Pure Code Digital Agency | Louisville, HubSpot | No es esta |
| ProAgenda | Golf booking en Capterra | No es Puragenda |

Cualquier ficha nueva debe atarse a `purocode.com` + Chile y `puragenda.cl`.

### Arquitectura recomendada

Ideal conceptual: PuroCode = organización, Puragenda = producto.

Crunchbase modela sobre todo **organizations**. Un “producto” como entidad hija no está garantizado. Por eso:

1. Crear **solo PuroCode** si se puede autenticar.
2. En la descripción, nombrar Puragenda y su URL.
3. No crear una segunda org “Puragenda” que compita con PuroCode.
4. No rellenar funding, employees, founders, HQ exacto, founded date si no hay fuente first-party verificable.

Descripción propuesta para org PuroCode (si se llega a crear):

> PuroCode is a software company in Chile. It develops Puragenda, a SaaS platform for online appointment scheduling and bookings for service businesses (https://www.puragenda.cl). Corporate site: https://www.purocode.com.

No Pro. No PitchBook. No Wikipedia.

### Bloqueo real

[Cómo crear un perfil](https://support.crunchbase.com/hc/en-us/articles/115011823988-How-do-I-create-a-Crunchbase-profile): cualquier usuario registrado y **socially authenticated** puede añadir una página. Flujo: Resources → Create Profile, o `https://www.crunchbase.com/add-new`.

LinkedIn Company está BLOCKED. Esa es la vía social más natural para autenticar una empresa chilena. No se evadió con otra red ni con perfiles duplicados.

Campos que Crunchbase “quiere” para un perfil completo (logo, founded date, HQ, industries, founders, funding, employees) y que **no** podemos afirmar: founded date, HQ exacto, founders, funding, employee count.

Estado: **REQUIRES USER**. Puragenda como org separada: **SKIPPED** hasta que exista PuroCode y se vea si el modelo de producto hijo encaja sin inventar.

---

## 5. LinkedIn

Confirmado, sin nuevos intentos.

| Entidad | Estado | Motivo |
|---|---|---|
| PuroCode | BLOCKED / REQUIRES USER | La cuenta administradora no cumple el umbral de red/contactos para Company Pages |
| Puragenda | BLOCKED / REQUIRES USER | Igual |

No se crearon cuentas alternativas, no se compraron contactos, no se automatizó networking.

LinkedIn no bloquea el cierre de SEO-013.

---

## 6. Google Business Profile

Estado: **EXISTING**

Referencia suministrada: `https://share.google/EI7MRiUwv4xO6xEH3`

No se modificó. No se creó duplicado. No se usó el share link como `sameAs`. No se hizo SEO local adicional.

---

## 7. URLs externas públicas creadas o encontradas

**Creadas en esta fase:** ninguna.

**Encontradas, nuestras:**

- Producto: `https://www.puragenda.cl`
- Corporativo: `https://www.purocode.com`
- Labs: `https://www.purocode.com/labs`
- GBP share (existente, inestable para schema): `https://share.google/EI7MRiUwv4xO6xEH3`
- Instagram PuroCode: `https://www.instagram.com/purocodecl/`
- Facebook PuroCode: `https://www.facebook.com/PuroCode.com`

**Encontradas, no nuestras (homónimos / competidores útiles como referencia de categoría):**

- Capterra AgendaPro: `https://www.capterra.cl/software/218709/agendapro`
- GetApp AgendaPro: `https://www.getapp.cl/software/2039943/agendapro`
- ComparaSoftware AgendaPro: `https://www.comparasoftware.cl/agendapro`
- ComparaSoftware Reservo: `https://www.comparasoftware.cl/reservo`
- Capterra ProAgenda (golf, homónimo de producto): `https://www.capterra.com/p/204217/ProAgenda-com/`
- LinkedIn PureCode AI: `https://www.linkedin.com/company/purecodesoftwarecompany`
- LinkedIn Puro Código RD: `https://do.linkedin.com/company/purocodigo`

**Alta (aún no usadas):**

- G2DM listing: `https://app.g2digitalmarkets.com/get-listed/start`
- ComparaSoftware developer register: `https://www.comparasoftware.cl/panel-usuario/register`
- Crunchbase add: `https://www.crunchbase.com/add-new`

---

## 8. Solicitudes pendientes de revisión

Ninguna. No hay SUBMITTED ni PENDING REVIEW.

---

## 9. Acciones que requieren intervención humana

1. **P0 — Capterra / G2 Digital Markets.** Crear vendor con `contacto@purocode.com`, verificar el mail, enviar un producto Puragenda. Rechazar PPC/leads.
2. **P0 — GetApp.** Cuando Capterra esté live, reclamar/añadir GetApp desde el mismo cabinet. No un segundo producto.
3. **P0 — ComparaSoftware.** Register desarrollador, plan Presencia en listados, ignorar cotización.
4. **P1 — Crunchbase.** Solo si hay un usuario socially authenticated que no implique crear LinkedIn Company de forma bloqueada/evasiva. Org PuroCode, campos mínimos.
5. **LinkedIn.** Cuando la cuenta cumpla el requisito de red. Fuera de esta fase.
6. **Inbox.** Alguien con acceso a `contacto@purocode.com` (y opcionalmente `diego@purocode.com`) tiene que completar verificaciones.

---

## 10. Datos pedidos / no verificables

Ninguna plataforma llegó a pedirlos en un formulario enviado. Sí los pedirían, y no están verificados:

| Dato | Por qué no |
|---|---|
| RUT / razón social | No está en first-party público usado aquí |
| Año de fundación | No confirmado |
| Founders nominados | Hay correos `diego@purocode.com`; no se afirma cargo/founder sin autorización |
| Employee count | No |
| HQ street address | GBP existe; el share link no es NAP estable; no copiar |
| Funding / investors / revenue | No hay |
| Ratings / nº clientes / nº reservas | Prohibido inventar |
| Precio en USD | El público es CLP |

---

## 11. Costes encontrados

| Ítem | Coste | Decisión |
|---|---|---|
| Listing Capterra/GetApp/Software Advice básico | $0 | Tomar cuando el usuario pueda autenticarse |
| G2DM PPC / Qualified Leads | Pago (no se contrataron cifras; SEO-011 citó PPC ~USD 2/clic y piso ~USD 500/mes) | No |
| ComparaSoftware Presencia en listados | $0 | Tomar |
| ComparaSoftware Reputación / Demanda / leads | Cotizar, USD LLC | No |
| Crunchbase crear/editar perfil | $0 | Tomar si hay social auth |
| Crunchbase Pro | ~USD 49/mes | No |
| LinkedIn Company | $0 cuando esté desbloqueado | Bloqueado |
| GBP | $0 | Ya existe |
| SoftwareWorld listing nuevo | USD 99 (SEO-011, P2) | Fuera de alcance |

Nada se pagó.

---

## 12. Duplicados / homónimos

Ver tabla Crunchbase. Adicional en comparadores:

- **ProAgenda** (golf) en Capterra: riesgo de confusión de nombre, no de entidad. Al listar, el website `puragenda.cl` y el vendor PuroCode desambiguán.
- **BitAgenda** (México, BitEvolution) y **Agenda** (HR Alemania): irrelevantes, no reclamar.
- **Pure Chat**, **Pur Social**, **PUREDI**: ruido de buscador, no nuestra marca.

No se encontró ficha legítima nuestra que hubiera que “claim” en vez de crear.

---

## 13. Consistencia PuroCode ↔ Puragenda

First-party (SEO-012) sigue siendo la única fuente coherente:

- PuroCode desarrolla Puragenda.
- `/labs` lo dice en HTML/SSR.
- Puragenda enlaza a PuroCode.
- JSON-LD: `creator` / `parentOrganization` = PuroCode.
- Claims de WhatsApp, métricas, uptime y partnerships **no** se reintrodujeron en este paquete externo.

Terceros: todavía no hay ficha que pueda contradecir esa relación, porque no hay ficha. El riesgo futuro es listar Puragenda sin vendor PuroCode, o listar PuroCode como si fuera el producto.

Regla de envío: **producto = Puragenda, vendor/developer/manufacturer = PuroCode**, en las tres plataformas P0/P1.

---

## 14. Riesgos

1. **Alta gated.** Sin inbox corporativo no hay listing. El documento no sustituye el envío.
2. **Upsell Capterra/ComparaSoftware.** El listing gratis convive con un motor comercial. Aceptar PPC o leads no es autoridad; es adquisición paga.
3. **Duplicar G2DM.** Un producto en Capterra + otro en GetApp + otro en G2.com fragmenta entidad. Una cuenta, un producto.
4. **Homónimos PureCode / Puro Código.** Un Crunchbase o Capterra mal atado al dominio incorrecto atribuye Puragenda a Austin o a RD.
5. **Crunchbase social auth** mientras LinkedIn Company está bloqueado. No evadir.
6. **Pricing stale.** Publicar $12.990 CLP obliga a actualizar la ficha si cambia `PRICING`.
7. **Reviews.** Un listing sin reviews es correcto. Inventarlas o copiar testimonios rompe SEO-002/010.
8. **Share link de GBP** como URL de entidad: inestable, no usar.
9. **Formulario WhatsApp de ComparaSoftware.** Usarlo mezcla canal comercial con alta de entidad.
10. **Cloudflare.** Capterra/GetApp/Crunchbase bloquean scrapers; la ausencia de ficha se trianguló con búsqueda indexada + 404 ComparaSoftware + hueco Semrush de SEO-011. No se afirma un 404 HTML limpio de Capterra.

---

## 15. SEO-014 — cerrado

Ejecutado el 2026-09-04:

1. Capterra / G2DM: SUBMITTED / PENDING REVIEW. Request `81028715-7431-469c-9bc6-e98313eca26e`.
2. ComparaSoftware: SUBMITTED / PENDING REVIEW. Fabricante + producto, plan gratis.
3. GetApp: no solicitado. Esperar Capterra LIVE y usar el mismo cabinet.
4. Crunchbase: no ejecutado (social auth + campos no verificables).
5. LinkedIn: BLOCKED, sin intentos.
6. GBP: EXISTING, sin cambios.
7. Reviews: no.

### Qué haría SEO-015 (no ejecutar ahora)

1. Vigilar publicación de Capterra y ComparaSoftware; guardar URLs LIVE.
2. Cuando Capterra esté LIVE: pedir GetApp desde el mismo producto G2DM, sin segundo alta y sin pago.
3. Crunchbase org PuroCode solo si hay social auth limpio y sin inventar founding/employees/funding.
4. LinkedIn cuando la cuenta cumpla el umbral.
5. Reviews de clientes reales: todavía no.
6. No Chiletec, prensa, Product Hunt, AlternativeTo ni outreach.

---

## Fuera de alcance (explícito)

SEO-013 no envió altas. SEO-014 sí envió Capterra y ComparaSoftware, ambos gratis.

Ninguna de las dos fases:

- activó marketplace ni `indexingEnabled`;
- creó `/manicure` ni `/bienestar`;
- inventó métricas, reviews ni ratings;
- pagó listings, PPC o leads;
- tocó GBP;
- intentó LinkedIn;
- hizo outreach a clientes;
- avanzó a SEO-015.

## Fuentes

- First-party: `https://www.puragenda.cl`, `https://www.puragenda.cl/pricing`, `https://www.puragenda.cl/caracteristicas`, `https://www.purocode.com/labs`, `src/core/constants.ts`, `src/lib/json-ld.ts`, `src/app/llms.txt/route.ts`
- SEO-011: `docs/seo/authority-opportunities.md`
- G2DM: `https://www.g2digitalmarkets.com/profiles`, `https://app.g2digitalmarkets.com/get-listed/start`, PR Newswire 2026-01-29
- ComparaSoftware: `https://www.comparasoftware.cl/nuestros-servicios`, 404s de slugs 2026-09-04
- Crunchbase help: create profile / add-new / social authentication
- Competidores de referencia: capterra.cl/software/218709/agendapro, getapp.cl/software/2039943/agendapro, comparasoftware.cl/agendapro
