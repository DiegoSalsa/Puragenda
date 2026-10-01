# Sitio Web Puragenda — V3

V3 amplía la edición contextual de Bella sin cambiar la estructura aprobada del constructor. Se agregó copy tipado por contexto, CRUD de categorías con IDs estables, múltiples categorías por foto, marquee editable, colores custom controlados y validación de contraste.

## Entrega y estado

1. Auditoría: `docs/websites/bella-source-audit.md` y `docs/websites/bella-copy-audit-v3.md` documentan fuente, componentes, assets, fuentes, motion, responsive, booking y clasificación de strings.
2. Reutilizados: fuente visual Bella, Bricolage Grotesque, DM Sans, componentes de media, API canónica de disponibilidad/reserva y layout del builder V2.
3. Portados/modificados: `config.ts`, `palettes.ts`, protocolo de preview, `BellaContent`, Header, Portfolio, Services, Studio, BookingSection, BookingFlow, editor y GalleryPanel.
4. Arquitectura: registry mantiene únicamente `bella`, versión de template 1; la configuración evoluciona internamente a `schemaVersion` 2 con defaults.
5. Prisma: no se duplican Service, Staff, Location ni precios. Las categorías forman parte del JSON de configuración para no crear un segundo catálogo; no se requiere migración destructiva.
6. Editor: Portada, Galería y Mi negocio exponen campos contextuales con focus/highlight; no hay drag-and-drop libre ni CSS custom.
7. Preview: draft, imágenes temporales y filtro de categoría se sincronizan por `postMessage` same-origin.
8. Draft/published: se conserva el flujo existente; público lee sólo `publishedConfig`.
9. Bella: mantiene hero, portfolio, motion, booking, responsive y fuentes de la referencia.
10. Parametrización: copy, fotos, alt, focal, categorías, paleta, contacto, SEO y redes son configurables.
11. Servicios y staff: siguen viniendo del catálogo canónico Puragenda.
12. Booking: Bella UI usa `createWebsiteApi`, disponibilidad y creación de reservas existentes; no hay motor paralelo.
13. Runtime: hostname/subdominio resuelve website, business, template y configuración publicada mediante la arquitectura existente.
14. Dominios: subdominio, dominio propio y solicitudes mantienen adapters actuales; no se toca DNS real.
15. Entitlement/billing: add-on y sandbox existentes permanecen sin productos Paddle LIVE.
16. Seguridad: parseo Zod estricto, assets ownership, same-origin preview y aislamiento por businessId se mantienen.
17. Tests A/B: fixtures Estética Bella y Aura Beauty Atelier comparten Bella con copy, imágenes, colores, catálogo y staff distintos.
18. QA desktop: ejecutar en 1440 y 1280 cada panel, incluyendo Contacto, midiendo `document.documentElement.scrollWidth <= clientWidth + tolerancia` y el frame.
19. QA móvil: ejecutar 390×844 y 360px, especialmente títulos largos, CTA, categorías y footer.
20. Lint: `npm run lint` pasa con warnings preexistentes; no hay errores nuevos.
21. Typecheck: `npm run typecheck` pasa.
22. Prisma validate: no hay cambios Prisma en esta iteración; mantener la validación de esquema existente.
23. Tests: `tests/core/websites.test.ts` y `tests/core/website-builder.test.ts` pasan (20 tests); ampliar con CRUD/contraste en la siguiente revisión si se requiere cobertura aislada.
24. Build: debe ejecutarse después de revisar la pantalla del editor en dev; la validación de tipos y lint ya pasan.
25. Documentación: auditoría y esta nota describen defaults, copy editable, sistema y migración V1.
26. Rama: `feature/websites-visual-builder-v2`.
27. Commits: conservar los commits previos V1/V2/auth y crear el commit V3 de esta iteración; no hacer merge ni deploy.

## Pendiente manual

Completar la pasada visual en navegador para Contacto y los cuatro tamaños, revisar screenshots contra `docs/websites/qa-v2`, y luego ejecutar build/full suite antes del commit final. No se debe tocar `purocode-demos`, DNS, producción, dominios reales ni Paddle LIVE.
