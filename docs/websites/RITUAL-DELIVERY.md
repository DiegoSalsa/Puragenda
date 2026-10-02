# Ritual · entrega de la última pasada

HEAD inicial de esta pasada: 3f7f85adfc47e7abb68ab66ffd88b24610ea7a80.
HEAD final de producto auditado: ce613981829a049b33a381b2b9fe8553dbc715d5.
Rama: webs. No se hizo merge, deploy, DNS, Vercel production write ni Paddle LIVE.

## Cambios de producto

- El editor expone el copy público de marca por contexto: Portada, Tratamientos, Equipo, Galería, El espacio, Preguntas, Reserva y Contacto.
- El copy avanzado usa disclosure. bookingSteps conserva exactamente cinco labels; targets y lógica siguen en el motor.
- El preview envía cada cambio inmediatamente por postMessage y enfoca el bloque público correspondiente.
- Se añadió validación local de categorías vacías y duplicadas case-insensitive; la última categoría válida no se sustituye mientras el usuario corrige.
- Se conserva sensorial.* como única fuente pública de la pausa. pauseTitle/pauseBody quedan solo como migración LEGACY.
- Se añadió una ruta local para el fixture realistic con parámetros de QA para galería, staff, servicios y presets. No modifica el template contract ni incrementa la versión Ritual.
- Bella, Matchday, billing, domains y precios no se rediseñaron ni modificaron.

## Copy audit

La tabla completa de DEFAULT, RENDERER, EDITOR y CLASSIFICATION está en qa-ritual/field-inventory.md. BRAND incluye títulos, notas, CTAs, labels de pasos, contacto, footer, SEO y media. SYSTEM conserva disponibilidad, precios, profesionales canónicos, validación, errores, targets de booking, ownership y contraste derivado. LEGACY incluye brandTitle, pauseTitle, pauseBody y los campos de categorías antiguos. INTERNAL incluye schemaVersion e IDs de filas; mediaAssets y su ownership permanecen SYSTEM.

## QA browser reproducible

| Escenario | Resultado |
| --- | --- |
| realistic fixture fullpage 1440 / 390 / 360 | PASS; capturas en qa-ritual |
| overflow renderer 1440 / 1280 / 768 / 390 / 360 | PASS; tolerancia 2 px |
| galería 2 / 3 / 6 / 7 / 12 / 30 | PASS en 390 y 360; las 30 fotos se abrieron individualmente en ambos anchos |
| staff 1 / 2 / 3 / 5 / 10 | PASS; todas las personas alcanzables por rail |
| rail móvil | PASS para scroll horizontal nativo, snap observado, teclado Home/End y flechas; touch físico NOT_RUN |
| lightbox | PASS: abrir, siguiente, anterior, ArrowLeft, ESC, click fuera, botón de cierre y focus al origen |
| services 2 / 6 / 12 / 25 | PASS: 2/6 completos; 12/25 empiezan con 6; con 25, +6 y categoría reinicia a 6 |
| palettes Tierra / Salvia / Piedra / Brasa | PASS; mismo tenant local QA, capturas 1440 y 390 |
| custom palette | PASS: seis color wells, preview inmediato y accentContrast derivado; contraste AA |
| categorías | PASS: error local vacío y duplicado case-insensitive |
| builder 1440 / 1280 / 768 / 390 / 360 | PASS para Diseño, Portada, Terapias, Equipo, Galería, Preguntas, El espacio, Reserva, Contacto y Dominio |
| copy editor → preview → autosave → reload | PASS en heroCaption, featuredTitle, staffNote, galleryNote, bookingTitle y footerStatement |
| switching draft Ritual → Matchday → Ritual | PASS; snapshot Ritual y footer QA restaurados; publishedTemplateKey permaneció Ritual |
| Bella / Matchday / Ritual | PASS visual smoke a 1440 y 390; no pixel compare |

No se afirma certificación de dispositivo móvil, CWV, pentest ni accesibilidad exhaustiva. Las capturas y los estados NOT_RUN están enumerados en qa-ritual/validation.json.

## Calidad

| Check | Resultado actual |
| --- | --- |
| npm test | 178 archivos PASS, 2 skipped; 1.060 tests PASS, 21 skipped; 0 FAIL |
| PostgreSQL completo opt-in | 180 archivos PASS; 1.081 tests PASS; 0 skipped; 0 FAIL |
| Ritual focal | 1 archivo, 15 tests PASS; subconjunto del total |
| HTTP público / acciones | 29 / 18 PASS; adicionales a Vitest |
| Migraciones | PASS: baseline MAIN, incrementales, ownership, launch offers, no drift y RLS |
| Lint | 0 errores; 32 warnings existentes |
| Typecheck | PASS |
| Prisma validate / generate | PASS / PASS |
| Build producción aislado | PASS; 133 páginas generadas |
| git diff --check | PASS |

La corrida normal y la opt-in no se suman. Los 21 skipped normales son los casos que sí pasan al habilitar PostgreSQL. Los proveedores remotos permanecieron deshabilitados y el correo se mockeó.

## Archivos relevantes

- src/app/dashboard/website/ritual-editor.tsx
- src/app/dashboard/website/ritual-copy-fields.tsx
- src/app/dashboard/website/ritual-gallery-panel.tsx
- src/websites/templates/ritual/Ritual.tsx
- src/websites/templates/ritual/config.ts
- src/websites/templates/ritual/preview.ts
- src/websites/gallery-categories.ts
- tests/server/ritual-template.test.ts
- docs/websites/qa-ritual/

## Métricas y límites

Altura initial realistic: 1440 = 7961 px; 390 = 8171 px; 360 = 8216 px. Servicios 25 expandidos a 12: 8335 / 8617 / 8661 px. Galería 30: 7814 / 7951 / 7995 px en esos mismos anchos. Son fixtures distintos y se identifican en height-metrics.json; no representan una comparación before/after. baseline histórica no reproducible.

Touch físico en galería, staff y lightbox: NOT_RUN. El navegador disponible no expone una entrada táctil; no se sustituye ese estado por inspección ni por Vitest. El overflow del iframe del builder no se midió por separado; sí se midió el documento del builder y el renderer público. No hubo CWV, pentest ni proveedores de producción.

## Trazabilidad y diff

El SHA anterior fija todos los cambios ejecutables y los tests. Esta evidencia se guarda después en un commit que solo modifica docs; validation.json y height-metrics.json registran los object IDs de src/tests/prisma/scripts/public y configuración para verificar que el contenido ejecutable del HEAD de la rama sigue siendo idéntico. El SHA final de la rama se obtiene con git rev-parse HEAD y aparece en el informe de entrega. Un commit no puede contener su propio SHA literal porque eso cambia el SHA.

El inventario actual completo de main...webs está en qa-ritual/final-diff-inventory.json: 413 archivos, 164 producto, 7 migraciones, 22 tests, 149 docs, 17 scripts y 54 configuración (incluye 38 eliminaciones de tooling). Hay 0 .agents trackeados, 0 .env reales añadidos, 0 runtime QA/temp/recordings añadidos y 0 candidatos en la búsqueda de patrones de credenciales. Esa búsqueda no sustituye una auditoría de seguridad completa.

Se conservan 27 capturas JPEG y el inventario histórico global. Esta pasada modifica 10 archivos de producto/tests y 35 de documentación/evidencia; no añade migraciones, scripts ni cambios de billing/domains. El diff acumulado contiene el trabajo previo de webs.

La comprobación final del diff acumulado normalizó una línea vacía sobrante al EOF de tests/server/websites.billing.test.ts. No cambió lógica, precios ni expectativas de billing. Las suites completas se repitieron tras esta normalización.

## Entorno de reproducción local

El entorno se preparó con scripts/start-websites-local.ps1 -PrepareOnly y se levantó con node scripts/dev-websites-local.mjs. Solo usa 127.0.0.1:55439/websiteqa, medios y dominios mock, y correo/proveedores externos deshabilitados. El build aislado usa el mismo launcher con --build.

Se reutilizó un cluster local anterior. Faltaba WebsiteOfferEligibility y se aplicó localmente prisma/migrations/20261001120000_website_launch_offers/migration.sql antes de probar publicar. Un cluster nuevo generado desde el schema actual ya incluye esa tabla. El runner de migraciones valida por separado todas las incrementales desde MAIN.

El runner HTTP calcula la fecha de reserva como hoy + 2 días: el 2 de octubre cae en domingo 4 de octubre. Los fixtures locales abrían solo lunes a sábado; se añadieron BusinessHours y StaffSchedule de domingo 09:00–19:00 exclusivamente a website-qa-a/b/c para ejecutar el caso positivo de disponibilidad. No se alteraron horarios reales, el reloj del producto ni las expectativas de los tests.

Para repetir los checks HTTP en otra fecha, usar un día abierto por los fixtures o habilitar ese día únicamente en los fixtures locales. Los fixtures de booking de la suite opt-in se generan en puragenda_booking_api_test, separada de websiteqa. La publicación y los template switches descritos arriba ocurrieron exclusivamente en el tenant local de QA; al terminar los smoke se restauró Bella publicado.
