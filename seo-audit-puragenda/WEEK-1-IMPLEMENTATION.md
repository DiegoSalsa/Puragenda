# Implementación SEO — Semana 1

**Fecha:** 2 de septiembre de 2026  
**Alcance:** código local, build de producción y pruebas contra `next start`. No se realizó despliegue.

## Resultado por acción

| Acción | Estado | Evidencia |
|---|---|---|
| Marketing, industrias, funciones y guías en estático/ISR | Completada | Build: inicio, landings y listados `○`; industrias, funciones y guías dinámicas `●`; revalidación de 1 h. Header local: `s-maxage=3600`. |
| Reducir RSC/traducciones y diferir JS | Parcial | Catálogo público reducido; dashboard aislado; PostHog bajo carga dinámica; HTML inicial ~142 KB frente a ~199 KB; Performance móvil 92 y escritorio 100. El LCP móvil simulado aún marca 3,36 s. |
| Redirect de host en un salto | Completada en código | `Host: puragenda.cl` devuelve 308 directo a `https://www.puragenda.cl/...` localmente. Requiere despliegue para validar la capa de dominio/Vercel. |
| H1 visible y CTA arriba | Completada | Un H1 visible, no `sr-only`; CTA visible a 1280×720. |
| Banner de cookies no tapa CTA móvil | Completada | Banner compacto; CTA principal visible y accionable en la captura móvil de Lighthouse. |
| CTA de pricing sin ambigüedad | Completada | Cada plan mantiene dos opciones diferenciadas: suscripción inmediata y prueba gratis de 30 días, respetando ambos recorridos comerciales. |
| URLs schema bajo `www` | Completada | Offers y entidades usan `absoluteUrl`; cero coincidencias de `https://puragenda.cl` en el HTML de inicio/precios. |

## Validación

- `npm run typecheck`: aprobado.
- `npm test`: 76 archivos aprobados, 1 omitido; 343 pruebas aprobadas, 2 omitidas.
- ESLint sobre todos los archivos modificados de esta implementación: 0 errores.
- `npm run build`: aprobado; 102 páginas estáticas generadas.
- Lighthouse móvil, tres corridas secuenciales: Performance 92/94/92; SEO 100; Accesibilidad 96; CLS 0.
- Lighthouse final móvil: Performance 92, FCP 1,22 s, LCP simulado 3,36 s, TBT 41 ms, CLS 0.
- Lighthouse final escritorio: Performance 100, FCP 0,33 s, LCP 0,69 s, TBT 0 ms, CLS 0.

El LCP observado por Chrome local fue cercano a 0,26 s, pero Lighthouse Lantern lo simula en 3,36 s bajo red/CPU móvil. Se mantiene como criterio pendiente hasta medir el build desplegado desde CDN y, si persiste, separar el CSS crítico del bundle global.

## Capturas

- [Portada móvil](screenshots/week1-home-mobile-final.png)
- [Portada escritorio](screenshots/week1-home-desktop-final.png)

## Pendiente de despliegue

1. Publicar el build.
2. Confirmar `X-Vercel-Cache: HIT` y `Age > 0` en todas las rutas públicas.
3. Confirmar 308 directo desde `puragenda.cl` y `puragenda.vercel.app` al host canónico.
4. Repetir tres corridas Lighthouse móvil desde producción y validar LCP/CrUX.
