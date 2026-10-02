# Ritual · entrega de última iteración

HEAD inicial: `0c3e82a42bef0c62c80d7b83e7400037aa7601db` en `webs`.

Esta iteración conserva Bella, Matchday, el booking canónico, el fallback de medios y las restricciones de `WebsiteMedia`. Cierra los bugs de accesibilidad de galería/equipo móvil, completa el editor Ritual, corrige el mapeo de sensorial, hace editables el sello de portada y el prompt de reserva, añade disclosure progresivo de servicios y conserva categorías del fallback de servicios.

## Validación local

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | PASS |
| Focal websites/Ritual tests | PASS (35 tests) |
| npm run lint | PASS (0 errors, 32 existing warnings) |
| npm run build | PASS (133 rutas) |
| Prisma / proveedores externos | Sin operaciones externas |

Suite completa actual: 1055 passed, 21 skipped, 178 archivos passed, 2 skipped. No se hizo merge, deploy, DNS, Vercel write ni Paddle LIVE.

## Archivos clave

- `src/websites/templates/ritual/Ritual.tsx`, `Rail.tsx`, `Lightbox.tsx`, `ritual.module.css`
- `src/websites/templates/ritual/config.ts`, `gallery.ts`, `palettes.ts`, `preview.ts`
- `src/app/dashboard/website/ritual-editor.tsx`, `ritual-gallery-panel.tsx`
- `src/websites/fixtures/ritual.ts` y `tests/server/ritual-template.test.ts`
