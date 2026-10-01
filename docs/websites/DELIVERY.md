# Entrega · Sitio Web Puragenda — rama `webs`

Bella se mantiene como template multi-tenant dentro de Puragenda, con editor controlado, preview privado, publicación por snapshots y booking canónico. La referencia original permanece intacta. Rama: `webs`. No se hizo merge, deploy, compra de dominio, DNS, configuración Vercel Production ni Paddle LIVE.

## Matriz de los 35 puntos solicitados

| # | Entrega | Resultado / evidencia |
| ---: | --- | --- |
| 1 | Auditoría exacta /studio | 58 archivos, arquitectura/imports y hashes en [auditoría](bella-source-audit.md) |
| 2 | Archivos reutilizados | CSS, componentes, reducer, iconos y 10 assets; [inventario](BELLA.md) |
| 3 | Archivos portados | `src/websites/templates/bella` y `public/websites/bella`; inventario Git del commit |
| 4 | Arquitectura | [ARCHITECTURE.md](ARCHITECTURE.md): infraestructura separada del diseño/datos |
| 5 | Registry | Tipado; únicamente Bella key bella/version 1 |
| 6 | Modelos Prisma | BusinessWebsite, WebsiteDomain, DomainRequest, WebsiteAddon, WebsiteBillingEvent |
| 7 | Migraciones | V1 (`20260930160000_websites_addon_v1`) + V2 (`20260930210000_website_visual_builder_v2`), aplicadas/prueba solo local; RLS/constraints incluidos |
| 8 | Editor | Mi sitio web: contenido, fotos, galería, about, contacto, redes, paleta y SEO |
| 9 | Preview | `/dashboard/website/preview`, demo/datos reales, móvil, privado/noindex |
| 10 | Draft/published | Guardar, previsualizar, publicar; revisión optimista; público solo snapshot publicado |
| 11 | Template Bella | Hero, fuentes, spacing, portfolio, servicios, estudio y booking conservados |
| 12 | Diferencias visuales | Dinamismo, footer Puragenda y estados reales; [detalle](BELLA.md) |
| 13 | Parametrización | Config Zod estricta y DTO canónico; contenido vacío no inventa valores comerciales |
| 14 | Servicios dinámicos | Service/opciones/precios/duración/ubicaciones actuales; test de actualización en runtime |
| 15 | Staff dinámico | Staff/fotos/compatibilidad y sucursales desde la agenda canónica |
| 16 | Booking | UI Bella → disponibilidad/quote/escritor Puragenda; reserva local comprobada |
| 17 | Runtime multi-tenant | Host → website → business → registry → renderer; no headers/client IDs como autoridad |
| 18 | Subdominios | Unicidad, validación/reservados, localhost A/B; DNS wildcard real pendiente |
| 19 | Dominios propios | Registro y challenge TXT tenant-specific; provider/TLS solo después de challenge y sujeto a infraestructura externa |
| 20 | Domain requests | Persistencia y solicitud de cotización, diagnóstico superadmin; sin compra |
| 21 | Entitlement | Vigencia + estados + acceso base; expiración/suspensión conserva snapshots |
| 22 | Billing preparado | SDK sandbox, checkout separado, webhook, cancelación/reactivación/recuperación; [límites](BILLING.md) |
| 23 | Seguridad | Autorización por negocio, propietario para billing/dominios, RLS, IDOR/Host/CSRF/idempotencia |
| 24 | Tests A/B | Estética Bella / Aura Beauty Atelier: misma Bella, marca/fotos/precios/staff distintos |
| 25 | QA desktop | 1440×900 / 1280×900 original/A/B y secciones; capturas en qa/ |
| 26 | QA móvil | 390×844 / 360×800; menú, servicios, booking e iframe privado; sin overflow del documento |
| 27 | Lint | Aprobado: 0 errores; 32 advertencias existentes |
| 28 | Typecheck | Aprobado |
| 29 | Prisma validate | Aprobado; generate también |
| 30 | Tests | Reejecutar en esta rama; los números históricos de V1 no son evidencia de la auditoría final |
| 31 | Build | Aprobado en entorno local aislado; no deploy |
| 32 | Documentación | Auditoría/manifest, ARCHITECTURE, BELLA, DOMAINS, BILLING, QA y esta entrega |
| 33 | Rama | `webs`; sin merge ni rebase peligroso |
| 34 | Commits | Implementación: `0915c42`; evidencia/documentación en commit posterior; consultar `git log -2 --oneline` |
| 35 | Pasos manuales | Staging/migración, Cloudinary real, Paddle sandbox E2E, adapter/TLS/DNS; autorizaciones externas posteriores |

## Estado práctico

El entorno local sirve dos sitios públicos y permite revisar el editor/preview con propietarios de prueba. [QA.md](QA.md) contiene URLs, credenciales exclusivamente de fixtures locales y comandos repetibles. Ninguna foto, servicio ni entitlement demostrativo se inyecta como default de un negocio real.

Los tests de billing son mock: no se afirma que el pago sandbox E2E esté realizado. El adapter de dominios incluido verifica propiedad por lectura TXT, pero no conecta ni activa Vercel/TLS. RLS está preparado en SQL y probado con un rol local no propietario; aún no se aplicó la migración a Supabase remoto. El upload valida/normaliza imágenes y está implementado, pero no se subió un archivo a Cloudinary remoto durante QA.

La comparación visual es inspección real y métricas DOM, no diff automatizado pixel-perfect. Se conserva la carga de providers compartidos del root; no se presenta como optimización CWV. La revisión no sustituye una prueba de carga ni un pentest.

Los cambios ajenos encontrados inicialmente (skills-lock, layout de dashboard y archivos de marketing/skills/artifacts) se conservaron fuera de los commits del feature.
