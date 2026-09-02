# Plan de acción SEO — Puragenda

**Objetivo:** convertir una base técnica sólida en visibilidad no-brand y demanda orgánica verificable.  
**Horizonte:** 90 días.  
**Score inicial:** 76/100.

## Semana 1 — impacto alto

**Estado de implementación (2 de septiembre de 2026):** 6 acciones completadas en código y verificadas localmente; la optimización de LCP queda parcialmente cumplida y requiere medición post-despliegue. La activación de caché Vercel y del redirect canónico en producción depende del despliegue.

| Acción | Impacto | Esfuerzo | Responsable sugerido | Criterio de aceptación |
|---|---|---|---|---|
| Convertir marketing, industrias, funciones y guías a estático/ISR | Alto | M–L | Ingeniería | `X-Vercel-Cache: HIT`, `Age > 0`, sin `no-store` en páginas públicas |
| Reducir payload RSC/traducciones y diferir JS no crítico | Alto | M–L | Ingeniería | Lighthouse móvil LCP <2.5 s y Performance ≥92 en 3 corridas |
| Consolidar host con 301/308 directo | Medio | S | Infra | Todas las variantes redirigen en un salto a `https://www.puragenda.cl/` |
| Hacer visible el H1 y subir CTA en desktop | Alto | S–M | Frontend/UX | H1 visible coincide con titular; CTA visible a 1280×720 |
| Evitar que cookies tape CTA móvil | Alto SXO | S–M | Frontend/UX | CTA visible/accionable en 390×844 durante primera visita |
| Clarificar los CTA de pricing | Alto SXO | S | Growth | Cada plan ofrece por separado “Suscribirse” y “30 días gratis”, sin mezclar ambos recorridos |
| Normalizar URLs `www` dentro de schema | Medio | S | Ingeniería SEO | Cero URLs de entidad/Offer fuera del host canónico |

Detalle de evidencia y validación: [WEEK-1-IMPLEMENTATION.md](WEEK-1-IMPLEMENTATION.md).

## Semanas 2–4 — autoridad y relevancia

| Acción | Impacto | Esfuerzo | Responsable sugerido | Criterio de aceptación |
|---|---|---|---|---|
| Publicar identidad legal y equipo verificable | Alto | M | Legal/Marketing | Razón social, RUT, domicilio/contacto, nombres, cargos y perfiles visibles |
| Crear primer caso de estudio cuantificado | Alto | M | Customer Success/Contenido | Consentimiento, contexto, periodo, métrica antes/después y metodología |
| Reescribir 4 verticales prioritarias | Alto | L | Contenido/Product Marketing | Cada página incluye flujo, objeciones, prueba, capturas y FAQs propios |
| Enlazar guías con funciones, pricing y demo | Medio–alto | S | Contenido | Cada guía tiene 2–4 enlaces contextuales hacia el siguiente paso |
| Completar schema de artículos | Medio | M | Ingeniería SEO | `Article.image`, publisher, author, breadcrumb y URLs canónicas válidos |
| Corregir claims sensibles | Alto confianza | S–M | Producto/Legal | Sin absolutos no demostrados; fuentes o evidencia junto a cada dato |
| Corregir titles/headings | Medio | S | Contenido | Seis titles revisados; H1 descriptivo en características; jerarquía correcta en contacto |

## Mes 2 — sistema editorial

1. Publicar dos casos de estudio adicionales, idealmente uno de salud/servicios profesionales y otro de belleza.
2. Añadir autores personales, bios, experiencia y `Person` schema a todas las guías.
3. Incorporar 2–4 fuentes primarias por guía cuando se usen datos externos.
4. Crear capturas reales del producto en WebP/AVIF y OG específica por landing/artículo.
5. Ampliar las tres páginas de funciones con requisitos, límites, pasos, capturas y caso real.
6. Reforzar enlaces hacia psicólogos, kinesiología, manicure y tatuadores.
7. Reformatear `llms.txt` con enlaces Markdown, descripciones y fecha de actualización.

## Mes 3 — adquisición y activos enlazables

- Publicar una calculadora del costo de inasistencias con metodología visible.
- Crear un benchmark propio de reservas/no-shows basado en datos agregados y anonimizados.
- Publicar checklist de migración desde WhatsApp/AgendaPro/planillas.
- Crear páginas de integración con Google Calendar, Mercado Pago/abonos y futuras integraciones reales.
- Lanzar una demo en video con transcripción y schema `VideoObject`.
- Desarrollar menciones externas: asociaciones sectoriales, partners, clientes y medios pyme chilenos.

## Backlog técnico y de calidad

- Corregir metadata de 404 y usar `noindex, follow`.
- Simplificar `/api/auth/demo → /dashboard → /login` si no es intencional.
- Usar fechas reales en `lastmod`; retirar `changefreq` y `priority`.
- Añadir `AboutPage`, `ContactPage`, `CollectionPage`/`ItemList` y breadcrumbs faltantes.
- Aplicar caché larga/immutable a assets versionados.
- Migrar CSP desde `unsafe-inline` a nonce/hashes.
- Corregir los contrastes señalados por Lighthouse.
- Ajustar el botón móvil de menú de 40×40 a al menos 44×44 px.
- Definir política explícita para crawlers de entrenamiento separada de crawlers de búsqueda IA.
- Si se busca expansión internacional, diseñar URLs por idioma y `hreflang`; no depender de cookie sobre una URL única.

## KPIs para 90 días

| KPI | Línea base | Objetivo |
|---|---:|---:|
| SEO Health Score | 76 | ≥86 |
| LCP móvil laboratorio | 3.3–3.6 s | <2.5 s |
| Lighthouse móvil Performance | 88–89 | ≥92 |
| Páginas públicas con CDN/ISR | 0 verificadas | 100% de marketing |
| Casos de estudio verificables | 0 | 3 |
| Guías con autor personal y fuentes | 0/4 | 4/4 |
| Artículos con imagen/schema completo | 0/5 aprox. | 100% |
| Verticales con contenido diferenciado | Parcial | 4 prioritarias en fase 1 |
| Enlaces rotos internos | 0 | Mantener 0 |

## Validación posterior

1. Repetir crawl completo y Lighthouse móvil/escritorio después del despliegue.
2. Validar schema con Rich Results Test y Schema Markup Validator.
3. Conectar Google Search Console y GA4 para medir cobertura, consultas, CTR y conversiones orgánicas.
4. Obtener CrUX de campo para LCP/INP/CLS.
5. Configurar baseline de SEO drift para detectar regresiones en title, canonical, robots, schema y contenido.
