# SEO-011 — Autoridad, citas y backlinks

Fecha: 4 de septiembre de 2026

Fase: investigación y priorización. **No se crearon perfiles, no hubo outreach, no se enviaron formularios, no se pagó nada, no se publicó nada y no se modificó el producto.**

Producto: Puragenda (`https://www.puragenda.cl`)

Empresa: PuroCode (`https://www.purocode.com`)

Mercado: Chile primero, luego LATAM, luego directorios SaaS globales de calidad.

## Resumen ejecutivo

Puragenda casi no existe como entidad fuera de su propio sitio. Semrush no mostró backlinks ni referring domains visibles, ni presencia en plataformas de IA. Eso coincide con lo que se puede verificar en abierto: no hay perfil en Capterra.cl, GetApp.cl, ComparaSoftware.cl, G2, Crunchbase, LinkedIn Company, Clutch, Product Hunt, AlternativeTo, Chiletec ni Google Business.

Los competidores relevantes no ganan autoridad “comprando enlaces”. Aparecen en un grafo pequeño y repetible:

1. **Gartner Digital Markets** (Capterra / GetApp / Software Advice, con sitio `.cl`).
2. **ComparaSoftware.cl** (catálogo español LATAM).
3. **Prensa de funding** (AgendaPro: Emol, DF, Chócale; no aplica a un SaaS sin ronda).
4. **Páginas “mejores software Chile 2026” escritas por competidores** (Turnito, Encuadrado, Bolo, Clinera).
5. **Perfiles de empresa** (LinkedIn, Crunchbase, YC si hay aceleradora).

Los 39 dominios del backlink gap de Semrush son **leads, no recomendaciones**. Tras validarlos en vivo, casi todos son ruido: acortadores, scrapers, PBN, sitios de usuarios (Hostinger/Webnode), directorios pagados de baja calidad o **competidores**.

La prioridad no es maximizar backlinks. Es construir un grafo mínimo, legítimo y citable:

**Puragenda existe + es software chileno + se puede comparar + tiene NAP verificable + aparece donde un modelo de IA ya cita a AgendaPro y Reservo.**

## Inventario de entidad actual

Comprobado antes de recomendar perfiles. No crear duplicados.

| Superficie | ¿Existe? | Evidencia |
|---|---|---|
| Sitio de producto | Sí | `https://www.puragenda.cl` — Organization + SoftwareApplication en JSON-LD; `sameAs` de la empresa madre apunta a Instagram de PuroCode |
| Sitio de la agencia | Sí | `https://www.purocode.com` — indexable, sitemap activo, robots permite Google y bots de IA |
| Mención Puragenda en purocode.com | **No en sitemap** | El sitemap (lastmod 2026-09-02) no incluye ninguna URL de Puragenda. El JSON-LD de la home describe “soluciones SaaS a medida”, no el producto |
| Instagram | Sí, PuroCode | `https://www.instagram.com/purocodecl/` |
| Facebook | Sí, PuroCode | `https://www.facebook.com/PuroCode.com` (declarado en `sameAs` de purocode.com) |
| LinkedIn Company Puragenda | **No encontrado** | No confundir con homónimos |
| LinkedIn Company PuroCode Chile | **No encontrado** | Homónimos: [Puro Código RD](https://do.linkedin.com/company/purocodigo), [PureCode AI](https://www.linkedin.com/company/purecodesoftwarecompany) |
| Google Business / Maps | **No encontrado** | |
| Crunchbase / PitchBook / Wikidata / Wikipedia | **No encontrado** | |
| Capterra.cl / GetApp.cl / G2 / AlternativeTo / Product Hunt | **No encontrado** | |
| ComparaSoftware.cl | **No encontrado** | AgendaPro sí: `https://www.comparasoftware.cl/agendapro` |
| Chiletec socios | **No encontrado** | Roster: `https://chiletec.org/socios/` |
| Clutch / GoodFirms | **No encontrado** | [Clutch PureCode Software](https://clutch.co/profile/purecode-software) es una empresa de Austin, no esta |
| SII / Registro de Empresas | No consultable sin RUT | No inventar ficha |

**Colisión de nombres.** Cualquier perfil nuevo debe usar exactamente **PuroCode** + `purocode.com` + Chile / Gran Concepción, y **Puragenda** + `puragenda.cl`. No reclamar ni mezclar: PureCode AI (Austin), Puro Código (República Dominicana), PureCode Software (Clutch).

## Método

- Se partió del backlink gap de Semrush (`semrush-puragenda/08-backlink-gap/`) y de los competidores ya usados en fases 001–010.
- Cada candidato se abrió o buscó en vivo el 4 de septiembre de 2026.
- Un dominio que enlaza a AgendaPro/Fresha/Reservo es un lead. Si es granja, competidor, acortador o irrelevante para un SaaS chileno, se descarta aunque tenga Authority Score alto.
- **Backlink opportunity** y **Citation/Entity opportunity** se registran por separado. Un backlink no es una cita de IA.
- Usar una API no es partnership. Solo se anotan programas públicos donde Puragenda o PuroCode podrían aparecer con nombre.

### Escala 0–5

| Criterio | 0 | 5 |
|---|---|---|
| Relevancia | Otro mercado o otra categoría | Comprador chileno de agenda / entidad de producto |
| Autoridad | Granja o abandonado | Fuente que Google y modelos ya usan |
| Facilidad | Programa cerrado o ronda de inversión | Formulario o activo propio |
| Legitimidad | Venta de enlaces / spam | Perfil real, editorial o gremio |
| SEO | Nofollow/scraper | Follow + Chile commercial SERP |
| GEO/AEO | Nadie lo cita | Capterra, prensa, KG, directorios que ya alimentan “alternativas a AgendaPro” |

Prioridad: **P0** (hacer primero, cuando se abra ejecución), **P1**, **P2**, **DESCARTAR**.

---

## 1. Validación de leads Semrush

Los cinco dominios nombrados en el brief:

| Dominio | Qué es en vivo | ¿Oportunidad? |
|---|---|---|
| `softwareworld.co` | Directorio SaaS indio con fichas de AgendaPro, Fresha, Booksy, Reservo y comparativas. Listing nuevo **USD 99**. Claim de ficha existente gratis; Puragenda no tiene ficha. | **P2** — categoría sí, Chile no. Solo si se quiere estar en el mismo grafo de comparativas automáticas |
| `ebool.com` | Agregador de “alternatives”. [AgendaPro](https://www.ebool.com/alternatives/agendapro) existe; Reservo aparece como “From Chile”. Cola gratis ~6 meses; Premium USD 47 / Pro USD 117. Booksy figura “from Afghanistan”. | **DESCARTAR** — molino de citas pagadas, datos sucios |
| `medesk.net` | Software médico británico. **Competidor de categoría clínica**, no directorio. AgendaPro ya publicó una comparativa contra Medesk | **DESCARTAR** |
| `bookia.cl` | Marketplace chileno de reservas de servicios, experiencias y cabañas. Activo. “¿Tienes un negocio? Publica tus servicios”. No es catálogo de software | **DESCARTAR como ficha SaaS**. Los backlinks a AgendaPro/Fresha/Reservo son del ecosistema de reservas, no de un directorio de productos |
| `turnito.app` | SaaS LATAM de turnos (Grupo Vansur). Competidor directo. Publica rankings “mejores software Chile 2026” donde se pone #1 frente a AgendaPro/Reservo | **DESCARTAR**. No pedir mención a un competidor |

El resto del CSV de 39 filas: Crunchbase **P1** (entidad); TodosNegocios **P2** (NAP Chile, no SaaS); ZoftwareHub **P2** (MENA, claim gratis si aparece stub). El resto: scrapers (`sitelike.org`, `siteprice.org`, `chinaz.com`), acortadores (`bye.fyi`, `shortenurls.eu`), link-in-bio (`linktr.ee`, `lnk.bio`), builders de usuarios (`hostingersite.com`, `webnode.es`), dumps inseguros (`softwareadviser.ai` filtraba credenciales en debug bar), PBN (`metamagic.top`) o sitios muertos.

**Conclusión del gap Semrush:** Authority Score alto ≠ oportunidad útil. El 80 %+ de esa lista no debería tocarse.

---

## 2. Patrones de competidores

### Dónde aparecen de verdad

| Competidor | Directorios | Prensa | Partners reales (dominio del tercero) | Chile off-site |
|---|---|---|---|---|
| **AgendaPro** | Capterra 4.8 / 158 reviews; Capterra.cl “Producto local”; GetApp; ComparaSoftware (0 reseñas); G2 seller **0 reviews** | Fuerte y gatillada por Serie B USD 35 M: Emol, DF, Axios, Chócale, Contxto, ADN, El Dínamo | Clip México (prensa 2022); YC. MercadoPago = tutorial de credenciales, no ficha de partner. Google Reserve y CENS/FONASA: **claim propio, no verificado en listas públicas** | Alta en branded y vs-pages |
| **Fresha** | Capterra ~1.447 reviews (slug Shedul); G2 débil frente a Capterra | Global (KKR / unicorn) | **Google Reserve** (lista oficial), Adyen, Twilio | Marketplace consumidor, no “software Chile” |
| **Booksy** | Capterra ~482 | Wikipedia (raro en este set) | Google Reserve documentado por Booksy; presencia en lista pública de Google menos clara que Fresha | Débil en Chile |
| **Reservo** | Capterra 4.8 / 60 reviews; Capterra.cl “Producto local”; ComparaSoftware | Casi nula | APIs de pago, no partnerships nombradas | Vendor pages + vs Encuadrado |
| **Encuadrado** | Capterra 5.0 / 24 reviews; GetApp; Software Advice; Product Hunt (2021) | Bloomberg Línea 2021 | YC S21 | Vs-pages propias |
| **Calendly** | Capterra 4k+; G2 2.5k; GetApp.cl | Innecesaria | Grafo enorme de integraciones | Aparece como “alternativa” automática, no como OS de salón |
| **Turnito / TUU Reserva / ReservaSimple / EasyAgenda / Bookara** | Casi ausentes de Capterra/G2/ComparaSoftware | — | — | Own-site SEO. Turnito ocupa el vacío de “mejores software Chile” con blogs propios |

### Qué implica para Puragenda

- **Reservo con 60 reseñas Capterra ya es “Producto local”.** No hace falta escala Fresha.
- **G2 no es el canal LATAM.** AgendaPro tiene 0 reviews ahí y sigue dominando Chile.
- No hay un roundup chileno independiente de software de barberías/peluquerías. El hueco lo llenan Capterra, ComparaSoftware y blogs de competidores.
- Prensa nacional (Emol, DF) cubre **rondas y marketplaces**, no el lanzamiento de un SaaS pyme. El medio realista es **Diario Concepción / BioBioChile** con gancho local (Gran Concepción).
- “Integramos MercadoPago / Google Calendar” no produce ficha de partner. Fresha sí aparece en `google.com/maps/reserve/partners` porque es integrador de Reserve with Google, no porque use Calendar OAuth.

---

## 3. Matriz de oportunidades

Leyenda de tipo: A perfil empresarial · B directorio SaaS · C marketplace/comparador · D medio · E ecosistema startup · F asociación · G partnership/integración · H cliente/caso · I artículo comparativo · J universidad · K otro.

Costo: lo verificado en páginas públicas. “No determinado” = no hay precio publicado.

### P0 — ejecutar primero (cuando se abra la fase de ejecución)

| Dominio | URL | Tipo | País | Competidor/evidencia | Cómo podría aparecer Puragenda | Costo conocido | Rel | Leg | SEO | GEO | Dif | Prioridad | Notas |
|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| capterra.cl / getapp.cl / softwareadvice.com | [Vendors CL](https://www.capterra.cl/company/vendors) · [AgendaPro](https://www.capterra.cl/software/218709/agendapro) · [Reservo](https://www.capterra.cl/software/1018313/reservo) · [Alternativas AgendaPro](https://www.capterra.cl/alternatives/218709/agendapro) · [GetApp AgendaPro](https://www.getapp.cl/software/2039943/agendapro) | B / C / I | Chile + global | AgendaPro 158 reviews “Producto local”; Reservo 60; Encuadrado 24; Fresha 1.447 | **Un** perfil de producto Puragenda (Appointment Scheduling + Salón/Spa), país Chile, traducciones LATAM. Después reseñas verificadas de clientes reales | Listing básico **gratis**. PPC desde ~USD 2/clic, piso ~USD 500/mes. No hace falta PPC para existir | 5 | 5 | 5 | 5 | 2 | **P0** | Misma familia G2 Digital Markets. No crear fichas duplicadas en GetApp/G2/Software Advice: un producto, locales Chile. Máxima probabilidad de cita IA para “alternativas a AgendaPro” |
| comparasoftware.cl | [AgendaPro](https://www.comparasoftware.cl/agendapro) · [Servicios vendor](https://www.comparasoftware.cl/nuestros-servicios) · [Reservas](https://www.comparasoftware.cl/reservas) | B / C | Chile / LATAM | AgendaPro y Reservo listados; categoría salón ocupada por Zagenda, ReservApp, TIMP, etc. | Perfil de fabricante PuroCode + producto Puragenda en software para salón / citas | **Gratis** listar. Planes pagos de leads/reputación. Ellos declaran cobro a vendors por conexión | 5 | 4 | 4 | 4 | 1 | **P0** | Mejor catálogo español Chile-first. Contenido delgado (AgendaPro 0 reseñas) pero indexa. Lead-gen comercial, no granja |
| linkedin.com | Company Pages (no existe slug propio) | A | Chile | AgendaPro y Reservo tienen company page | Dos páginas: **PuroCode** (agencia, Gran Concepción) y **Puragenda** (producto de PuroCode, website puragenda.cl). Mismos NAP | Gratis | 5 | 5 | 2 | 5 | 1 | **P0** | Semilla de knowledge graph. No usar “Puro Código” ni “PureCode” |
| purocode.com | [Home](https://www.purocode.com) · [Sitemap](https://www.purocode.com/sitemap.xml) · [Portafolio](https://www.purocode.com/portafolio) | A / K | Chile | — | Página crawlable que nombre Puragenda, enlace a `https://www.puragenda.cl` y declare la relación builder/producto. Recíproco en JSON-LD `sameAs` / `parentOrganization` | $0 (activo propio) | 5 | 5 | 4 | 5 | 1 | **P0** | **No es backlink externo; es la cita de entidad más fácil y hoy ausente.** Esta fase no la ejecuta. No es “SEO técnico de Puragenda”; es contenido de PuroCode |
| google.com (Business Profile) | Google Business Profile | A | Chile | — | GBP de **PuroCode** como desarrollo de software / agencia, área Gran Concepción, teléfono +56 9 4925 5006, web purocode.com, producto Puragenda. Puragenda SaaS no necesita un segundo GBP salvo oficina pública | Gratis | 4 | 5 | 3 | 3 | 2 | **P0** | NAP alineado con LinkedIn y sitios. Verificación postal/teléfono |
| crunchbase.com | [Crunchbase](https://www.crunchbase.com/) · AgendaPro aparece en búsquedas de inversor (YC, CORFO, Fen, Riverwood) | A | Global | AgendaPro org; Puragenda no | Org **PuroCode** + producto **Puragenda**. Sin ronda. No pagar Pro | Add/claim gratis | 4 | 5 | 2 | 4 | 2 | **P0** | Valor de entidad / AEO, no tráfico de comprador chileno |
| terapiasec.cl | [https://terapiasec.cl/](https://terapiasec.cl/) | H | Chile | — | Botón “Reserva tu hora” / “Agenda tu masaje” al widget Puragenda. WhatsApp se puede conservar para consultas | $0 (sitio del cliente) | 5 | 5 | 4 | 3 | 3 | **P0** | Único cliente con web propia verificada. Hoy el CTA va a `wa.me/56952965077`. **No contactar en esta fase.** Implementación legítima, no anchor exacto |

### P1

| Dominio | URL | Tipo | País | Competidor/evidencia | Cómo podría aparecer Puragenda | Costo conocido | Rel | Leg | SEO | GEO | Dif | Prioridad | Notas |
|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| alternativeTo.net | [Fresha alternatives](https://alternativeto.net/software/fresha-shedul/) | B / I | Global | Fresha listado; AgendaPro no destacado | Añadir Puragenda como alternativa a AgendaPro/Fresha; Chile, SaaS, appointment | Gratis | 3 | 4 | 3 | 3 | 2 | **P1** | Inglés-first. Útil para queries “alternatives”. Un alta, no granja |
| chiletec.org | [Socios](https://chiletec.org/socios/) · ejemplo ficha [Baufest](https://chiletec.org/socio/baufest/) | F / A | Chile | Roster de empresas TI chilenas; Puragenda/PuroCode ausentes | Socio **PuroCode**; Puragenda como producto en la ficha | Membresía (precio no publicado en la home) | 4 | 5 | 3 | 4 | 3 | **P1** | Gremio legítimo de software Chile. No es directorio de compradores de barberías |
| google.com/maps/reserve | [Partners](https://www.google.com/maps/reserve/partners) · [docs](https://developers.google.com/maps-booking) | G / C | Global; Chile soportado | Fresha está en la lista. AgendaPro lo **afirma** en su blog/ayuda; no se vio en el grid público recortado | Integrador Actions Center / Reserve with Google. “Book” en Maps. **No es Calendar OAuth** | Gratis aplicar; exige feed de disponibilidad y matching | 5 | 5 | 5 | 4 | 5 | **P1** | Partnership real si se aprueba. Calendar sync ≠ partner. No reclamarlo hoy |
| mercadopago.cl | [Partners developers](https://www.mercadopago.cl/partners/developers/es) · [Detalle Chile](https://www.mercadopago.cl/partners/developers/es/details) · [Centro de Partners](https://centrodepartners.mercadolibre.cl/) | G | Chile / LATAM | SuperSaaS aparece en Partnerbase; Puragenda no. AgendaPro usa credenciales MP, no ficha de partner | Certificación Checkout + Integrator ID. Posible vitrina en Centro de Partners **si el programa acepta una plataforma SaaS**, no solo agencias WooCommerce | Programa **gratis**; niveles por volumen CLP | 4 | 5 | 3 | 3 | 4 | **P1** | Usar la API no basta. Encaja más que Cloudinary/Vercel/Resend. No garantizar listado |
| diarioconcepcion.cl | [Diario Concepción](https://www.diarioconcepcion.cl) | D | Chile (Biobío) | Cubre startups IncubaUdeC | Nota local: SaaS de reservas construido en Gran Concepción | Earned; $0 si hay gancho real | 5 | 5 | 4 | 5 | 4 | **P1** | Mejor medio Chile-first. Requiere historia verificable (clientes, empleo, producto), no un “comunicado SEO” |
| biobiochile.cl | [BioBioChile](https://www.biobiochile.cl) | D | Chile | — | Mismo gancho regional/nacional pyme-tech | Earned | 4 | 5 | 4 | 4 | 4 | **P1** | Después de que existan Capterra + LinkedIn para que el periodista verifique entidad |
| latercera.com | [Emprendimiento](https://www.latercera.com/emprendimiento/) | D | Chile | Cubre Start-Up Chile | Solo con dato (clientes, empleo, diferenciación vs AgendaPro sin claims inflados) | Earned | 3 | 5 | 4 | 4 | 5 | **P1** | No forzar. AgendaPro llega aquí por funding |
| asech.cl | [ASECH](https://asech.cl/) | F | Chile | ~52.000 socios | Membresía del emprendedor/empresa | ~CLP 150.000 / año (cifra citada en comunicación ASECH; confirmar al postular) | 3 | 5 | 1 | 2 | 2 | **P1** | Legitimidad gremial, SEO débil. No es catálogo de software |
| incubaudec.cl | [IncubaUdeC](https://www.incubaudec.cl) | E / J | Chile (Concepción) | Medios locales cubren su portafolio | Relación de incubación **si hay fit real**. No badge comprado | Postulación | 4 | 5 | 3 | 3 | 4 | **P1** | Fit geográfico. Level UP climático/food es mal fit de producto |
| instagram.com / link-in-bio propio | [purocodecl](https://www.instagram.com/purocodecl/) | A / K | Chile | — | Bio y destacado: Puragenda como producto, PuroCode como builder. Link a puragenda.cl o a un link-in-bio **propio** (no hace falta Linktree) | $0 | 4 | 5 | 1 | 2 | 1 | **P1** | `linktr.ee`/`lnk.bio` en Semrush son nofollow de terceros. El valor está en el perfil propio ya existente |
| github.com | Repo público [DiegoSalsa/Puragenda](https://github.com/DiegoSalsa/Puragenda) (citado en CONTEXT.md) | A / K | Global | — | Si el repo es público: topics, descripción, website `puragenda.cl`. No es directorio SaaS | $0 | 2 | 5 | 2 | 2 | 1 | **P1** | Entidad de software. Verificar visibilidad pública antes de contar con él |
| getapp.cl directory barbershop | [Barbershop](https://www.getapp.cl/directory/1567/barbershop/software) | B / C | Chile | AgendaPro y Fresha featured | Mismo perfil Gartner, categoría barbería | Cubierto por el listing P0 | 5 | 5 | 4 | 4 | 2 | **P1** | No es un segundo perfil: es categoría adicional del mismo producto |

### P2

| Dominio | URL | Tipo | País | Competidor/evidencia | Cómo podría aparecer Puragenda | Costo conocido | Rel | Leg | SEO | GEO | Dif | Prioridad | Notas |
|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| softwareworld.co | [Get listed](https://www.softwareworld.co/get-listed/) · [AgendaPro](https://www.softwareworld.co/software/agendapro-reviews/) · [Fresha vs AgendaPro](https://www.softwareworld.co/compare/fresha-vs-agendapro/) · [Reservo](https://www.softwareworld.co/software/reservo-reviews/) | B / I | India / global | AgendaPro, Fresha, Booksy, Reservo (Chile 2015), Calendly | Ficha de producto + entrar al grafo de comparativas automáticas | **USD 99** listing nuevo; claim gratis; sponsored extra | 3 | 3 | 2 | 2 | 2 | **P2** | Lead Semrush válido como categoría, no como Chile. Sin sponsor. Solo después de Capterra |
| g2.com | [AgendaPro seller](https://www.g2.com/sellers/agendapro) (0 reviews) · [Fresha](https://www.g2.com/es/products/fresha/reviews) | B | Global | AgendaPro casi invisible en G2 pese a dominar Chile | Perfil de producto si el vendor dashboard Gartner no lo cubre | Listing gratis; planes pagos para badges/ads | 3 | 4 | 2 | 2 | 3 | **P2** | Canal US-enterprise. Baja prioridad LATAM |
| producthunt.com | [Encuadrado](https://www.producthunt.com/products/encuadrado) · [TopAgenda](https://www.producthunt.com/products/topagenda) | E / A | Global | Encuadrado lanzó en 2021 | Un launch honesto de Puragenda (Chile, sin comisión, abonos) | Gratis | 2 | 4 | 2 | 3 | 2 | **P2** | Registro de producto fechado. No es canal de comprador chileno |
| clutch.co | [Web designers Chile](https://clutch.co/cl/web-designers) | A | Global / Chile filter | Homónimo Austin. PuroCode no está | Perfil **agencia PuroCode** + Puragenda como caso, no como “software product” | Básico gratis; featured pago | 3 | 4 | 2 | 2 | 3 | **P2** | Solo agencia. Reseñas reales o no vale |
| todosnegocios.com | [Home](https://www.todosnegocios.com/) | A / K | LATAM | No lista SaaS competidores como productos | Claim/corrección NAP si existe fila PuroCode/Puragenda | No determinado | 2 | 3 | 1 | 2 | 3 | **P2** | Citación NAP, no comprador SaaS |
| zoftwarehub.com | Product pages Fresha/Booksy | B | MENA | Fresha, Booksy, Calendly; no AgendaPro | Claim gratis si aparece stub. No pagar prominencia | Claim aparentemente gratis | 1 | 3 | 1 | 1 | 3 | **P2** | Fuera de mercado |
| amarillas.cl | [Amarillas](https://www.amarillas.cl) (paquetes vía Guru Soluciones) | A | Chile | — | Ficha PuroCode desarrollo web Concepción | Típicamente **pago** | 2 | 3 | 2 | 1 | 2 | **P2** | Directorio local envejecido. Después de GBP |
| startupchile.org | [Apply](https://startupchile.org/en/apply/) · [Portfolio](https://startupchile.org/en/portfolio/) | E | Chile | AgendaPro/Encuadrado llegaron a YC, no es el mismo programa | Solo si se quiere aceleración real + grant. No es listing | Postulación competitiva | 3 | 5 | 3 | 3 | 5 | **P2** | No tratarlo como directorio SEO |
| uddventures.udd.cl / chrysalis.cl / 3ie.cl | Sitios de incubadoras | E / J | Chile | UDD recap de AgendaPro en YC | Relación si hay fit; no badge | Postulación | 2 | 5 | 2 | 2 | 4 | **P2** | Chiletec + IncubaUdeC primero por geografía |
| facebook.com | [PuroCode.com](https://www.facebook.com/PuroCode.com) | A | Chile | Ya declarado en sameAs | Completar About: Puragenda + puragenda.cl. No crear página duplicada | $0 | 3 | 5 | 1 | 2 | 1 | **P2** | Ya existe. Completar, no duplicar |
| softwareadvice.com | [Encuadrado](https://www.softwareadvice.com/appointment-scheduling/encuadrado-profile/) | B | Global | Comparte backend Gartner | Cubierto por listing Capterra si se configuran locales | Incluido | 3 | 5 | 3 | 3 | 2 | **P2** | No duplicar producto |

### DESCARTAR

| Dominio | Motivo |
|---|---|
| ebool.com | Molino de alternatives pagado; datos erróneos |
| medesk.net | Competidor clínico, no directorio |
| bookia.cl | Marketplace de reservas para negocios, no catálogo de software. Listar ahí pondría oferta en un canal ajeno |
| turnito.app | Competidor. Sus blogs “mejores software Chile” son contenido propio |
| fresha.com / booksy.com / agendapro.com marketplaces | Listar clientes en el marketplace rival cede demanda |
| softwareadviser.ai | Sitio roto; debug bar con secretos. No enviar datos |
| krowdbase.com, dirbear.com, sitelike.org, siteprice.org, chinaz.com, example3.com | Scrapers / directorios masivos |
| linktr.ee, lnk.bio | Link-in-bio de terceros; nofollow; no es gap de autoridad |
| bye.fyi, shortenurls.eu, metamagic.top | Acortadores / spam TLD |
| hostingersite.com, webnode.es | Sitios de usuarios, no publishers. Webnode además es familia de Reservio |
| clodura.ai, fastbase.com, poidata.io, openli.com | Bases B2B / privacy SaaS, no listing |
| chilopina.com | Scraper de reseñas Google de locales (barberías Osorno, etc.), no SaaS |
| indianbusinessdirectory.in | País incorrecto |
| smyte.com, archivo.biz, viralist.ai, ithy.com, dejan.ai | Muertos, agencia, o no-directorio |
| microlinksite.com, southfwb.com, sergechel.info | Superficie spam/PBN |
| wikipedia.org | Sin notabilidad (fuentes independientes insuficientes) |
| wikidata.org | Prematuro hasta tener 2–3 fuentes chilenas independientes |
| sourceforge.net, slashdot.org, saassworthy.com | Vendor mills; peor señal que no listar |
| empresachile.cl, pymesdechile.cl, yelu.cl, basededatoschile.cl, “top directories Chile” farms | Thin / stale / lead-db |
| PitchBook profundidad, Latka, unicorn press | Teatro de funding |
| Resend / Cloudinary / Vercel partner directories | Programa real para **otro tipo de partner** (agencias, ISV, marketplace de dev tools). Ser cliente de la API no califica |
| Paddle partners | Código existe; no hay partnership. No listar como partner |
| Google Cloud partner directory / Workspace Marketplace | Calendar OAuth no es add-on ni reseller |
| CONACO, Cámara Cosmética | Fit débil o relación B2B cosmética, no software |
| AGEPBEC (gremio peluqueros Concepción) | Constitución 2021 en Diario Oficial; **sin sitio vivo encontrado**. Verificar antes de tratarlo como canal |
| CCS Santiago | Menos prioridad que cámara Concepción + Chiletec |

---

## 4. Oportunidades de entidad (resumen)

Objetivo: que un sistema de recuperación pueda afirmar “Puragenda es un software de reservas chileno hecho por PuroCode”.

Hoy esa frase solo se sostiene en `puragenda.cl`. Falta corroboración.

| # | Acción de entidad | Duplicado? | Valor |
|---|---|---|---|
| 1 | Página Puragenda en purocode.com + `sameAs` recíproco | No | Máximo, propio |
| 2 | LinkedIn Company ×2 | No existen | KG |
| 3 | GBP PuroCode | No existe | NAP local |
| 4 | Crunchbase org + product | No existe | KG / AEO |
| 5 | Capterra.cl SoftwareApplication de terceros | No existe | Cita comercial |
| 6 | ComparaSoftware producto | No existe | Cita Chile |
| 7 | Chiletec socio | No está en roster | Empresa TI chilena |
| 8 | Completar Facebook ya existente | Existe | No duplicar |
| 9 | Instagram: mencionar producto | Existe | Bio |
| 10 | Wikidata/Wikipedia | No | **No ahora** |

---

## 5. GEO / AEO vs backlinks

Las queries de esta fase **no muestran Puragenda** en resultados de terceros. La página propia `/alternativa-agendapro` existe; las alternativas indexadas por Capterra/G2/GetApp no la incluyen.

### Fuentes con probabilidad de ser citadas por Google AI Overviews / ChatGPT Search / Gemini

| Query | Quién ocupa el SERP | Fuentes citable (terceros) | Puragenda |
|---|---|---|---|
| mejores sistemas de reservas Chile | ComparaSoftware, GetApp.cl, Capterra.cl, blogs de Turnito/SimpleReserva, Hora12 (restaurantes) | comparasoftware.cl, capterra.cl, getapp.cl | No |
| software de agendamiento Chile | Homepages de AgendaPro/Reservo/Encuadrado + ComparaSoftware | comparasoftware.cl/agendapro | No |
| alternativas a AgendaPro | Capterra, G2, GetApp, Software Advice + blogs Encuadrado/Bolo/Clinera | capterra.cl/alternatives/218709/agendapro | No |
| software para barberías | GetApp.cl barbershop, Capterra, vendor pages | getapp.cl/directory/1567/barbershop/software | No |
| agenda para peluquerías | Agendas de papel + Turnito 2026 + AgendaPro blog | turnito.app/blog/… (sesgado) | No |
| sistema de agendamiento online | Forbes Advisor, Odoo, AgendaPro blog; landing propia de Puragenda | forbes.com/advisor/… | Landing propia, no cita de tercero |

**Alta probabilidad de cita IA:** `capterra.com` / `capterra.cl`, `getapp.com` / `getapp.cl`, `ycombinator.com` (solo si hay YC), `emol.com`/`df.cl` (solo con noticia real), `crunchbase.com`, `google.com/maps/reserve/partners`.

**Media:** `comparasoftware.cl`, `chocale.cl`, blogs de competidores que hoy llenan el vacío (Turnito, Encuadrado). Un modelo puede citarlos; no son autoridad deseable.

**Baja / ignorar para AEO:** softwareworld.co, ebool.com, krowdbase.com. Pueden dar backlink; no deben usarse como “fuente”.

Separación pedida:

| Tipo | Qué es | Ejemplo útil |
|---|---|---|
| **Backlink opportunity** | Enlace follow desde un dominio relevante | Widget del cliente, ficha Capterra, socio Chiletec, nota de Diario Concepción |
| **Citation/Entity opportunity** | El sistema puede recuperar “Puragenda = software chileno de reservas” aunque el enlace sea nofollow o no exista | LinkedIn, Crunchbase, Capterra, ComparaSoftware, NAP, página en purocode.com |

---

## 6. Clientes (solo documentación)

No se contactó a nadie. No se pidió anchor exacto.

| Cliente | Evidencia en producto | Sitio propio | Estado del enlace | Implementación legítima |
|---|---|---|---|---|
| **Soccerbarber** (Nicolás) | Testimonio público; widget `https://www.puragenda.cl/widget/soccerbarber` responde 200; Search Console histórico “soccer barber / barbería Osorno” | **No encontrado** (sin `soccerbarber.cl` indexado) | El widget es la presencia web | GBP + Instagram “Agenda tu hora” → widget. Si algún día hay sitio: botón “Reserva tu hora”, no “mejor software de agendamiento Chile” |
| **Terapias SEC / Terapias Sanando el Corazón** (Ricardo) | Testimonio; widget slug `terapias-sanando-el-corazon` | **Sí:** [terapiasec.cl](https://terapiasec.cl/) (WordPress). Ricardo Aguirre Sandoval, Graneros. También en Yelu | **No menciona Puragenda.** CTA “Agenda” → WhatsApp `wa.me/56952965077` | Añadir (o poner al lado de WhatsApp) “Reserva tu hora” / “Agenda tu masaje” al widget. Mejor enlace de los tres |
| **Lotty Skin** | Testimonio; docs internos de MercadoPago `MLA` | **No encontrado** | Widget / checkout | Igual que Soccerbarber: GBP + IG “Agenda tu hora” |

Patrón útil: el enlace de valor es **marca del local + CTA de reserva → URL de su agenda**. No una campaña de anchors comerciales hacia `puragenda.cl`.

Widgets indexables ya traen clics (Soccerbarber en GSC). Eso es distribución, no autoridad de entidad del SaaS. Conviene medirlos como segmento aparte (decisión ya anotada en el estudio 2026-09-01).

---

## 7. Partners / integraciones reales

Integraciones **reales** del producto (código/docs): MercadoPago (billing + OAuth marketplace), Google Calendar OAuth, Resend, Cloudinary, Vercel (hosting), Paddle (código; cobro internacional aún no es el camino de producción Chile).

| Vendor | ¿Programa público? | ¿Puragenda aparece? | Claim seguro hoy |
|---|---|---|---|
| **MercadoPago** | Sí: Partners developers + Centro de Partners | No | “Pagos con Mercado Pago”. “Partner” solo después de certificación y listado |
| **Google Calendar** | No hay directorio para apps OAuth | N/A | “Sincroniza con Google Calendar” |
| **Reserve with Google** | Sí, lista de partners | No | No reclamar. Aplicar si se decide el producto |
| **Resend** | No hay vitrina de clientes SMB | No | Herramienta de email, no partner |
| **Cloudinary** | Partners para agencias/ISV | No | Hosting de imágenes, no partner |
| **Vercel** | Solution Partners + Marketplace de **servicios para developers** | No | Hosting. No partner |
| **Paddle** | Referrals / integrations; app marketplace TBD | No | Omitir hasta que sea billing real |

Regla: **si el dominio del tercero no nombra a Puragenda, no es partnership para GEO.**

---

## 8. Top 10 acciones recomendadas

**No ejecutar en esta fase.** Orden de cuando se abra autoridad externa:

1. **Capterra.cl / G2 Digital Markets:** un perfil de producto Puragenda, país Chile, categorías citas + salón/spa. Sin PPC al inicio. Luego pedir reseñas verificadas a clientes reales (nunca compradas).
2. **ComparaSoftware.cl:** perfil fabricante PuroCode + producto Puragenda, listado gratis en software para salón/citas.
3. **PuroCode.com:** una URL pública que nombre Puragenda y enlace a `https://www.puragenda.cl`. Completar `sameAs` / relación Organization. (Cambio en el sitio de la agencia, no en el runtime de reservas.)
4. **LinkedIn Company:** PuroCode y Puragenda, NAP idéntico, sin homónimos.
5. **Google Business Profile** de PuroCode (Gran Concepción).
6. **Crunchbase:** org + producto, ficha factual, sin Pro.
7. **Cliente Terapias SEC:** cuando haya conversación comercial normal, proponer botón “Reserva tu hora” al widget. No outreach SEO.
8. **Soccerbarber y Lotty Skin:** GBP + bio Instagram “Agenda tu hora” → widget. No inventar sitios.
9. **Chiletec:** evaluar membresía de PuroCode como empresa TI chilena.
10. **Reserve with Google y/o MercadoPago Centro de Partners:** solo si el producto cumple el programa. No por el logo.

Fuera del top 10, pero siguiente: AlternativeTo, Diario Concepción (earned), Instagram/Facebook ya existentes, IncubaUdeC si hay fit real.

---

## 9. Conteos

| Métrica | N |
|---|---:|
| Dominios investigados (únicos, con URL abierta o búsqueda indexada) | 78 |
| DESCARTAR | 46 |
| P0 | 7 |
| P1 | 12 |
| P2 | 11 |
| Leads Semrush del CSV priorizado (39) que sobreviven como P1/P2 | 4 (Crunchbase, SoftwareWorld, TodosNegocios, ZoftwareHub) |
| Leads Semrush nombrados en el brief que sobreviven | 1 de 5 (SoftwareWorld, y solo P2) |

Los 78 incluyen: 36 del gap Semrush + directorios Gartner/ComparaSoftware/G2/AlternativeTo/Product Hunt/Clutch + gremios Chile + medios + partners + sitios de clientes + purocode.com + homónimos verificados para no duplicar.

---

## 10. Riesgos

1. **Homónimos.** Un alta descuidada en LinkedIn/Clutch/Crunchbase puede atribuir Puragenda a PureCode AI o a Puro Código RD.
2. **Granjas del gap Semrush.** Pagar eBool, DirBear o SoftwareWorld “recommended” compra ruido y puede asociar la marca a directorios basura.
3. **Partnerships inventadas.** Poner logos de Google/MercadoPago/Vercel como “partners” es falso y es peor para AEO que no decir nada.
4. **Pedir anchors exactos a clientes.** Enlaces de “software de agendamiento Chile” desde una barbería se ven manipulados. El CTA natural es “Reserva tu hora”.
5. **Listar negocios en Fresha/Booksy/Bookia.** Cede inventario al competidor.
6. **PPC Capterra demasiado pronto.** El listing gratis ya crea la entidad. El PPC es adquisición paga, no autoridad.
7. **Wikipedia/Wikidata ahora.** Sin fuentes independientes, el borrado o la ficha vacía no ayudan.
8. **Duplicar perfiles Gartner.** Un producto en Capterra + otro en GetApp + otro en G2 genera entidad fragmentada.
9. **Medios nacionales sin gancho.** Emol/DF cubren Series B, no landings. Forzar un “press release SEO” no produce cita útil.
10. **Confundir widget indexable con autoridad de marca.** Soccerbarber trae clics de “barbería Osorno”, no menciones de Puragenda.

---

## 11. Qué ejecutar primero (cuando se autorice SEO-012)

Orden operativo, no de esta fase:

1. Entidad propia: página Puragenda en `purocode.com` + NAP alineado (LinkedIn, GBP, Crunchbase).
2. Entidad de software comprable: **un** listing Gartner (Capterra.cl) + ComparaSoftware.cl.
3. Prueba verificable: 3–5 reseñas Capterra de clientes reales que ya testimonian en el sitio.
4. Un enlace de cliente de verdad: Terapias SEC, “Reserva tu hora”.
5. Recién entonces: Chiletec, Reserve with Google, MercadoPago Partners, nota en Diario Concepción.

No empezar por SoftwareWorld, eBool, ni por “conseguir 50 backlinks”.

---

## 12. Fuera de alcance (explícito)

Esta fase **no**:

- creó perfiles ni cuentas;
- envió outreach ni formularios;
- pagó listings ni compró backlinks;
- modificó Puragenda, SEO técnico, marketplace ni casos;
- escribió guest posts;
- avanzó a ejecución.

El único entregable es este documento.

## Fuentes

- Semrush package interno: `semrush-puragenda/07-backlinks/`, `08-backlink-gap/`, `09-ai-visibility/`, `14-summary/priority-opportunities.md`
- Estudio propio: `docs/estudio-seo-geo-aeo-2026-09-01.md`
- Sitios vivos visitados el 2026-09-04: capterra.cl, getapp.cl, comparasoftware.cl, softwareworld.co, ebool.com, turnito.app, bookia.cl, medesk.net, purocode.com (sitemap + JSON-LD), puragenda.cl/widget/soccerbarber, terapiasec.cl, chiletec.org, asech.cl, mercadopago.cl/partners, google.com/maps/reserve/partners, emol.com (AgendaPro), y páginas de competidores citadas en las tablas
