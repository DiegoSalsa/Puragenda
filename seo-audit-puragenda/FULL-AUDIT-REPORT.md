# Auditoría SEO integral — Puragenda

**Sitio:** https://www.puragenda.cl/  
**Fecha:** 2 de septiembre de 2026  
**Tipo de negocio:** SaaS B2B de reservas online para negocios de servicios en Chile  
**Cobertura:** 27 URLs del sitemap, homepage móvil/escritorio, robots, sitemap, llms.txt, headers, enlazado interno, schema, contenido, imágenes y muestra SERP pública.

## Resumen ejecutivo

### SEO Health Score: 76/100

| Categoría | Peso | Score | Aporte |
|---|---:|---:|---:|
| SEO técnico | 22% | 87 | 19.1 |
| Calidad de contenido | 23% | 68 | 15.6 |
| On-page SEO | 20% | 86 | 17.2 |
| Schema / datos estructurados | 10% | 70 | 7.0 |
| Rendimiento / CWV | 10% | 76 | 7.6 |
| Preparación para búsqueda IA | 10% | 62 | 6.2 |
| Imágenes | 5% | 73 | 3.7 |
| **Total ponderado** | **100%** |  | **76.4** |

La base técnica es buena: las 27 URLs del sitemap responden 200, son indexables, tienen canonical, title, description y un único H1; no se encontraron enlaces públicos rotos ni páginas huérfanas. El sitio entrega contenido y JSON-LD en el HTML inicial, permite crawlers de búsqueda e IA y cuenta con un `llms.txt` útil.

No hay problemas **Critical** que bloqueen indexación. El crecimiento orgánico está limitado principalmente por tres factores: contenido sectorial demasiado parecido, señales de autoridad verificable todavía débiles y rendimiento móvil mejorable. La muestra pública de búsquedas genéricas chilenas mostró varios competidores, pero no a Puragenda; es una señal direccional de brecha de visibilidad, no una medición exacta de ranking.

### Cinco prioridades

1. Reducir LCP móvil de 3.3–3.6 s a menos de 2.5 s y servir las landings públicas desde caché CDN/ISR.
2. Diferenciar las páginas `/para/*` con flujos, casos, capturas, objeciones y evidencia propios de cada rubro.
3. Reforzar E-E-A-T: identidad legal, equipo con nombres y experiencia, fuentes primarias y casos de estudio cuantificados.
4. Completar schema de artículos y normalizar la entidad/URLs; no inventar ratings para perseguir rich results.
5. Mejorar el primer viewport: H1 visible, CTA más alto en escritorio y banner de cookies menos obstructivo en móvil.

### Quick wins

- Cambiar el redirect `https://puragenda.cl` de 307 a 301/308 y consolidar todas las variantes en un solo salto.
- Enlazar cada guía con su página de función, pricing, demo o comparación relevante.
- Cambiar “Suscribirse” por “Probar gratis 30 días” y aclarar que no se solicita tarjeta.
- Añadir `Article.image`, publisher y breadcrumbs donde faltan; normalizar `www` en Offers.
- Corregir seis titles largos, el salto H1→H3 de contacto y el H1 genérico de características.

## Evidencia de rastreo e indexabilidad

| Comprobación | Resultado |
|---|---:|
| URLs en sitemap | 27 |
| URLs 200 | 27/27 |
| URLs indexables | 27/27 |
| Canonical autorreferente | 27/27 |
| Un H1 | 27/27 |
| Title y description presentes | 27/27 |
| URLs huérfanas del sitemap | 0 |
| Destinos internos rotos | 0 |
| Apariciones de enlaces internos | 916 |
| Destinos internos únicos | 33 |

Las rutas funcionales descubiertas fuera del sitemap (`/login`, `/register`, `/mi-agenda`, `/privacidad/solicitud`) usan `noindex, nofollow`, por lo que no se detectó fuga de indexación.

### Robots, sitemap y crawlers IA

- [robots.txt](https://www.puragenda.cl/robots.txt) permite el contenido público y bloquea dashboard, API, autenticación, citas y otras rutas privadas.
- [sitemap.xml](https://www.puragenda.cl/sitemap.xml) es válido y contiene únicamente URLs HTTPS canónicas.
- [llms.txt](https://www.puragenda.cl/llms.txt) responde 200 y cubre producto, precios, características, industrias, FAQ, guías, comparación, contacto e identidad.
- El contenido esencial, canonical, H1 y JSON-LD aparecen en el HTML inicial; la indexación no depende de renderizado CSR.
- `Host: https://www.puragenda.cl/` no aporta a Google y no usa el formato esperado por motores que sí interpretan la directiva. Puede retirarse o quedar como `Host: www.puragenda.cl`.

### Advertencia de sitemap

Veintitrés URLs comparten la misma fecha `lastmod` y las cuatro guías comparten otra. El código usa fechas editoriales comunes; deben reflejar cambios reales. Google ignora `changefreq` y `priority`, por lo que se pueden retirar.

## SEO técnico

### Redirecciones — prioridad media

Comportamiento observado:

```text
http://puragenda.cl
  308 → https://puragenda.cl/
  307 → https://www.puragenda.cl/

https://puragenda.cl
  307 → https://www.puragenda.cl/

http://www.puragenda.cl
  308 → https://www.puragenda.cl/
```

La variante canónica es consistente en sitemap y metadata, pero el 307 comunica temporalidad y la variante HTTP sin `www` hace dos saltos. Debe existir un 301/308 directo desde cada variante a `https://www.puragenda.cl/`.

### Caché pública — prioridad alta

Homepage, pricing, industrias y guías devuelven:

```text
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Age: 0
X-Vercel-Cache: MISS
```

Las landings comerciales cambian poco y deberían usar generación estática/ISR. Conviene revisar APIs dinámicas del layout raíz —por ejemplo lectura de cookies de idioma— que fuerzan SSR. Objetivo posterior al cambio: `X-Vercel-Cache: HIT`, `Age > 0` y una política `s-maxage`/`stale-while-revalidate` ajustada al contenido.

### Seguridad y headers

Fortalezas:

- HSTS, CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` y `Permissions-Policy` presentes.
- TLS 1.3 y sin contenido mixto detectado.

Mejoras:

- La CSP permite `'unsafe-inline'` en scripts y estilos. Migrar scripts a nonce/hashes y retirar primero `unsafe-inline` de `script-src`.
- Ocultar `X-Powered-By: Next.js` como endurecimiento menor.
- Confirmar la renovación automática del certificado observado con vencimiento el 29 de septiembre de 2026.

### Otros hallazgos técnicos

- Una 404 real responde correctamente 404, pero hereda description/Open Graph de la portada y `robots=index, follow`. Usar metadata específica y `noindex, follow`.
- El CTA de demo produjo una cadena `/api/auth/demo → /dashboard → /login`. Revisar si el flujo debe terminar en login o si se perdió estado de demo.
- Las variantes con trailing slash y parámetros UTM se consolidan correctamente.
- Si se desea adquisición orgánica internacional, el selector de idioma basado en cookie y una sola URL no crea páginas localizadas indexables ni `hreflang`. Es una oportunidad condicional, no un problema para el foco Chile/español actual.

## Rendimiento y Core Web Vitals

Medición de laboratorio con Lighthouse 13.4.1:

| Métrica | Móvil | Escritorio | Evaluación |
|---|---:|---:|---|
| Performance | 88–89 | 100 | Móvil mejorable |
| FCP | 1.45–1.5 s | 0.48–0.5 s | Bueno |
| LCP | **3.3–3.6 s** | 0.7–0.8 s | Móvil necesita mejora |
| TBT | 75–190 ms | 0 ms | Bueno/variable |
| CLS | 0 | 0 | Bueno |
| Lighthouse SEO | 100 | 100 | Pasa checks automatizados |
| Accesibilidad | 96 | 96 | Contraste pendiente |

El elemento LCP móvil fue el párrafo del hero. La portada usó 31 solicitudes y ~531 KiB transferidos; 17 scripts sumaron ~349 KiB. El HTML inicial ronda 199 KiB y aproximadamente 74% corresponde a scripts inline/RSC, señal de serialización/hidratación elevada para una landing.

Acciones:

- Mantener el texto LCP pintable sin animaciones/transiciones bloqueantes.
- Evitar cargar catálogos de traducción o namespaces del dashboard en rutas de marketing.
- Convertir bloques estáticos en Server Components y diferir analytics/widgets no críticos.
- Reducir CSS bloqueante; Lighthouse estimó ~280 ms de ahorro.
- Eliminar JavaScript no usado (~25 KiB) y polyfills legacy (~22 KiB) cuando sea viable.
- Corregir cuatro grupos de contraste insuficiente, incluido texto gris pequeño y azul sobre fondo claro.

No hubo datos CrUX/GSC y PageSpeed Insights devolvió 429. INP no pudo medirse; TBT es solo una señal de laboratorio.

Archivos de evidencia:

- [Lighthouse móvil](../scratch/seo-audit-puragenda/lighthouse-mobile.json)
- [Lighthouse escritorio](../scratch/seo-audit-puragenda/lighthouse-desktop.json)
- [Captura móvil](screenshots/homepage-mobile.png)
- [Captura escritorio](screenshots/homepage-desktop.png)

## On-page SEO

Fortalezas:

- Titles, descriptions y H1 únicos en las 27 URLs.
- Homepage bien alineada con “sistema de reservas online en Chile”.
- Arquitectura clara entre `/soluciones`, `/para/*`, `/funciones/*` y `/guias`.
- Mensaje comercial consistente: 30 días gratis, sin tarjeta, sin contrato, precios con IVA y demo.
- Sin keyword stuffing.

Mejoras:

- Seis titles superan 60 caracteres y pueden truncarse; no es un error de ranking, pero sí de presentación.
- `/caracteristicas` usa un H1 genérico: “Todo lo que necesitas para crecer”. Debe incluir el tema de la página.
- `/contacto` salta de H1 a H3 antes del primer H2.
- El H1 real de homepage está oculto con `sr-only`, mientras el titular visual usa otros elementos. Convertir el titular visible en H1 con spans internos.
- Las páginas con menor apoyo interno son kinesiología, psicología, manicure y tatuadores, con un enlace interno cada una.

## Calidad de contenido y E-E-A-T

### Páginas sectoriales demasiado parecidas — prioridad alta

Las ocho URLs `/para/*` tienen aproximadamente 352–452 palabras principales y similitud coseno entre 0.53 y 0.72; psicólogos/kinesiólogos alcanzó 0.716. No son duplicados, pero el patrón es claramente de plantilla.

Cada vertical necesita diferenciación real:

- Clínicas: roles, privacidad, límites frente a ficha clínica y controles de acceso.
- Psicología: sesiones recurrentes y comunicaciones discretas.
- Kinesiología: planes de sesiones, boxes/equipamiento y continuidad.
- Tatuajes: consulta previa, referencias, abonos y bloques largos.
- Peluquerías/estética/manicure: catálogo, recursos, profesionales, recurrencia y venta cruzada propios.

Si una vertical no puede sostener valor diferencial, es preferible consolidarla antes que ampliar texto genérico.

### Autoridad verificable insuficiente — prioridad alta

La homepage ya muestra testimonios y la página institucional explica origen y ubicación, pero faltan:

- razón social, RUT y domicilio/contacto legal claros;
- personas reales, roles, experiencia y perfiles verificables;
- casos con fecha, tamaño de negocio, tiempo de uso y resultados antes/después;
- fuentes primarias en guías y claims sensibles.

Claims como “máxima confiabilidad y seguridad”, referencias vagas a inasistencias médicas y “configura en 2 minutos” deben demostrarse o reformularse. En interfaces demostrativas, etiquetar métricas como “datos de ejemplo”.

### Profundidad y enlazado editorial — prioridad media

- Funciones: ~274–295 palabras.
- Guías: ~540–632 palabras principales, pese a anunciar 7–9 minutos de lectura.
- Hub de guías: ~193 palabras.

No existe un mínimo de palabras como factor de ranking; la brecha es de cobertura útil. Añadir capturas, requisitos, límites, errores frecuentes, ejemplos chilenos, checklist y fuentes.

Enlaces contextuales recomendados:

- Guía de abonos → `/funciones/reservas-online-con-abono`.
- Cómo elegir → `/pricing`, `/alternativa-agendapro` y demo.
- Inasistencias → páginas sectoriales y funciones relacionadas.
- FAQ → pricing, características y Google Calendar según cada respuesta.
- Contacto → planes y demo como alternativas.

### SXO y CTA

- Cambiar “Suscribirse” por “Probar gratis 30 días”.
- Añadir: “No ingresas tarjeta; eliges un plan al terminar”.
- Dar horario/plazo de respuesta en contacto y microcopy de privacidad junto a WhatsApp.
- En escritorio de 1280×720 el CTA queda demasiado bajo por el hero de gran tamaño.
- En la captura móvil de primera visita, el banner de cookies tapa el área donde aparece el CTA. Reducir su altura, usar un layout menos obstructivo o reservar espacio sin ocultar la acción principal.

## Schema y datos estructurados

Cobertura:

- 21/27 URLs contienen JSON-LD válido.
- Tipos detectados: `SoftwareApplication`, `Organization`, `WebSite`, `Offer`, `AggregateOffer`, `Review`, `FAQPage`, `Article`, `BreadcrumbList` y `CollectionPage`.
- Breadcrumbs en 15/27 URLs.
- Sin schema en soluciones, contacto, sobre nosotros y las tres páginas legales.

### Elegibilidad de SoftwareApplication — prioridad alta

El schema es semánticamente útil, pero ninguno de los `SoftwareApplication` revisados parece completar los requisitos actuales del resultado enriquecido de software: precio y un rating/review completo. Las reviews de homepage no contienen `reviewRating`; otras páginas usan `AggregateOffer` y no tienen rating/review.

No se deben fabricar estrellas. Solo añadir `AggregateRating` o `reviewRating` cuando existan puntuaciones visibles, verificables y obtenidas de forma legítima.

### Otras correcciones

- `/pricing`: los Offers usan URLs sin `www`, distintas de la canonical.
- Guías: falta `Article.image`; usar imágenes 1:1, 4:3 y 16:9.
- `/alternativa-agendapro`: falta publisher, logo, image y breadcrumb.
- Añadir `AboutPage`, `ContactPage` y `CollectionPage`/`ItemList` donde corresponda.
- Crear un `@graph` con IDs estables `#organization`, `#website` y `#software`.
- Conectar todas las páginas a la misma entidad y normalizar URLs `www`.
- `FAQPage` puede conservarse como señal semántica, pero ya no debe considerarse una oportunidad visible de FAQ rich result para este sitio comercial.

## Imágenes y experiencia visual

Fortalezas:

- Cero imágenes sin `alt` y cero sin dimensiones en la muestra.
- Logos SVG pequeños; OG 1200×630 de ~67 KiB con alt.
- CLS 0 y sin lazy load sobre el recurso above-the-fold.
- Diseño móvil sin scroll horizontal y CTA táctil grande cuando no lo tapa el banner.

Brechas:

- Casi todas las imágenes son logos; faltan capturas reales, diagramas y visuales editoriales indexables.
- La misma OG image se reutiliza en homepage, pricing y artículos.
- Los artículos no tienen imagen visible ni `Article.image`.
- Assets públicos usan `max-age=0`; aplicar caché larga a nombres versionados.
- Al añadir capturas, usar WebP/AVIF, `srcset`, `sizes`, width/height y lazy load below-the-fold.

## Preparación para búsqueda IA / GEO

Fortalezas:

- Crawlers de búsqueda IA permitidos.
- `llms.txt`, contenido SSR, FAQ, listas, tablas, precios y límites explícitos.
- Páginas de funciones con “Respuesta rápida”.
- Artículos con fecha de actualización.

Brechas:

- Autor corporativo genérico y pocas fuentes primarias.
- Escasa validación externa de la entidad.
- Sin datos originales, casos cuantificados o metodología publicada.
- Muy poca multimodalidad indexable.
- Afirmaciones comerciales y cifras de ejemplo no siempre diferenciadas de resultados reales.

Acciones:

- Autor real con bio, experiencia y perfil enlazado; usar schema `Person`.
- Dos a cuatro fuentes primarias por guía cuando haya datos o afirmaciones externas.
- Bloques de respuesta autocontenidos al inicio de temas importantes.
- Capturas reales, demo en video, transcripción y `VideoObject`.
- Reformatear `llms.txt` con enlaces Markdown, descripción y fecha de actualización.
- Crear perfiles oficiales consistentes y conectarlos con `sameAs`.

## Brecha competitiva y contenido futuro

En una muestra pública de consultas como “sistema de reservas online Chile”, “agenda online para negocios Chile” y búsquedas sectoriales, aparecieron competidores con landings y guías más profundas —por ejemplo [Salonware](https://salonware.app/chile/), [AgendaSync](https://agendasync.cl/) y [AgendaLibre](https://agendalibre.cl/agenda-online)—, mientras Puragenda no apareció en el conjunto devuelto. Esto no equivale a una posición oficial de Google; sí sugiere que el problema ya no es solo técnico.

Prioridades editoriales:

1. Casos de estudio verificables por vertical.
2. Guías de decisión y comparación actualizadas, con metodología y fuentes.
3. Páginas de integraciones y flujos reales: pagos, Google Calendar, recordatorios, migración y privacidad.
4. Contenido sectorial basado en operaciones distintas, no únicamente keywords distintas.
5. Activos enlazables: benchmarks de inasistencia, calculadora de costo de no-shows, checklist de migración y plantillas de políticas.

## Limitaciones

- Sin acceso a Google Search Console, GA4, Bing Webmaster Tools ni logs.
- Sin credenciales de PageSpeed/CrUX; PageSpeed público respondió 429.
- Sin Moz/Bing backlink API. Common Crawl no pudo usar su caché local por permisos, por lo que la autoridad off-page no se puntuó con datos de enlaces.
- Sin baseline previo de SEO drift.
- La visibilidad SERP se evaluó con una muestra pública y no reemplaza un rank tracker por ubicación/dispositivo.
- Las métricas CWV son de laboratorio; INP y aprobación real de Core Web Vitals requieren datos de campo.

## Fuentes de referencia

- [Google: datos estructurados de SoftwareApplication](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Google: datos estructurados de Article](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google: Organization](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Google: buenas prácticas de imágenes](https://developers.google.com/search/docs/appearance/google-images)
- [Homepage de Puragenda](https://www.puragenda.cl/)
- [Sitemap](https://www.puragenda.cl/sitemap.xml)
- [Robots](https://www.puragenda.cl/robots.txt)
- [LLMs.txt](https://www.puragenda.cl/llms.txt)
