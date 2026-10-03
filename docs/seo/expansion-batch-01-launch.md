# SEO Expansion Batch 01 — lanzamiento D0

Batch ID: **`seo-expansion-2026-10-b01`**. Lanzamiento y Search Console revisados el **2026-10-03**. Este registro complementa el informe histórico [de implementación](expansion-batch-01.md), que describía la rama antes de publicarla.

## A. Pre-merge

- Rama aprobada y remota: `seo/expansion-batch-01`, SHA **`b4f95588183897c062321114dfe24ee1a619c49e`**. Worktree limpio, sin commits locales pendientes; comparación remoto/local 0/0 después de `git fetch --all --prune`.
- `origin/main` permanecía en la base **`582896455102b8bc79a02126ec1008e6f50cb81a`**, sin integración adicional necesaria.
- Suite SEO: **15 archivos / 151 tests PASS**, incluidos **41 tests del Batch 01**. Lint PASS (0 errores, 33 advertencias existentes), typecheck PASS, build de producción PASS y `git diff --check` PASS. Build local con fixture PostgreSQL aislado, sin datos reales.
- Preview del SHA aprobado: [Vercel](https://vercel.com/diegosalsas-projects/puragenda/8MygMbqrqFCLsXU3RHese3cCYtfW), deployment `dpl_8MygMbqrqFCLsXU3RHese3cCYtfW`, **READY**, GitHub Vercel **success**. [URL preview](https://puragenda-fp39u48uo-diegosalsas-projects.vercel.app).
- HTML del build: 10 canonicals exactas, robots index/follow, Googlebot completo, titles/H1 únicos, FAQ/schema consistente y una sola marca en title/OG/Twitter/alt. Sitemap esperado: 44 URLs. Protección: 206/206 hashes intactos.

## B. Merge y push

| Estado | SHA |
| --- | --- |
| Main antes | `582896455102b8bc79a02126ec1008e6f50cb81a` |
| Rama integrada | `b4f95588183897c062321114dfe24ee1a619c49e` |
| Merge explícito / main después del lanzamiento | `ae5ee8ba50871962980bbea178690a2fe8675b1e` |

Merge sin squash: `merge: SEO expansion batch 01`. Padres: main anterior + HEAD aprobado. Push normal a `origin/main`, confirmado con `git ls-remote`. Sin conflictos ni reescritura de commits. Se utilizó el checkout limpio `C:/Users/diego/Desktop/agenda-main-availability`; el checkout original en `webs` conservó sus cambios ajenos.

Este informe y su JSON se guardan después del merge mediante un commit exclusivamente documental. Ese commit no altera el contenido lanzado ni mueve D0; su SHA y estado del deploy posterior se entregan al cierre.

## C. Producción y D0

- Deployment: [Vercel producción](https://vercel.com/diegosalsas-projects/puragenda/2wNPnihi4JL92eKf8TLdhSJHLaik), `dpl_2wNPnihi4JL92eKf8TLdhSJHLaik`.
- URL: [dominio real](https://www.puragenda.cl); [URL de deployment](https://puragenda-8pc5sf9am-diegosalsas-projects.vercel.app).
- SHA desplegado: **`ae5ee8ba50871962980bbea178690a2fe8675b1e`**, ref `main`, target `production`, **READY** y GitHub Vercel **success**. Los aliases incluyen `www.puragenda.cl` y `puragenda.cl`.
- **D0 UTC: 2026-10-03 20:55:50.832 UTC**.
- **D0 Chile: 2026-10-03 17:55:50.832, America/Santiago (UTC−03:00)**.
- Fuente de D0: campo real `ready: 1791060950832` de Vercel; no se usó la hora del push, creación del deploy o consulta.

## D. QA de las diez páginas

Origen de todas las canonicals: `https://www.puragenda.cl`. “Exacta” significa la misma URL de la fila, sin redirección, fragmentos ni parámetros.

| URL | HTTP | Canonical | Indexable | Sitemap | Schema | Resultado |
| --- | --- | --- | --- | --- | --- | --- |
| [/funciones/recordatorios-citas-email](https://www.puragenda.cl/funciones/recordatorios-citas-email) | 200 | Exacta | Sí | 1 vez | Válido + FAQ visible | PASS |
| [/funciones/reservas-sin-cuenta](https://www.puragenda.cl/funciones/reservas-sin-cuenta) | 200 | Exacta | Sí | 1 vez | Válido + FAQ visible | PASS |
| [/funciones/widget-reservas-web](https://www.puragenda.cl/funciones/widget-reservas-web) | 200 | Exacta | Sí | 1 vez | Válido + FAQ visible | PASS |
| [/funciones/agenda-multiples-sucursales](https://www.puragenda.cl/funciones/agenda-multiples-sucursales) | 200 | Exacta | Sí | 1 vez | Válido + FAQ visible | PASS |
| [/funciones/gift-cards](https://www.puragenda.cl/funciones/gift-cards) | 200 | Exacta | Sí | 1 vez | Válido + FAQ visible | PASS |
| [/guias/dejar-de-agendar-por-whatsapp](https://www.puragenda.cl/guias/dejar-de-agendar-por-whatsapp) | 200 | Exacta | Sí | 1 vez | Válido + FAQ visible | PASS |
| [/guias/google-calendar-vs-sistema-reservas](https://www.puragenda.cl/guias/google-calendar-vs-sistema-reservas) | 200 | Exacta | Sí | 1 vez | Válido + FAQ visible | PASS |
| [/guias/organizar-agenda-varios-profesionales](https://www.puragenda.cl/guias/organizar-agenda-varios-profesionales) | 200 | Exacta | Sí | 1 vez | Válido + FAQ visible | PASS |
| [/alternativa-calendly](https://www.puragenda.cl/alternativa-calendly) | 200 | Exacta | Sí | 1 vez | Válido + FAQ visible | PASS |
| [/alternativa-fresha](https://www.puragenda.cl/alternativa-fresha) | 200 | Exacta | Sí | 1 vez | Válido + FAQ visible | PASS |

Se revisó HTML HTTP y DOM hidratado en el navegador autenticado disponible, a 390 px. Todas cargaron sin error, sin overflow horizontal y sin errores de consola. La metadata publicada coincide exactamente con el build aprobado: title, description, canonical, robots, Googlebot, OG title, Twitter title y OG image alt. Todas contienen un único H1, FAQ visible idéntica a su JSON-LD y los enlaces internos principales esperados.

Robots: `index, follow`. Googlebot: `index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1`. No hay duplicación de marca: una referencia a Puragenda en title, OG title, Twitter title y alt.

| Ruta | Title final (también OG/Twitter) | Preguntas FAQ |
| --- | --- | --- |
| `/funciones/recordatorios-citas-email` | Recordatorios de citas por email | Puragenda | 6 |
| `/funciones/reservas-sin-cuenta` | Reservas online sin crear cuenta | Puragenda | 6 |
| `/funciones/widget-reservas-web` | Widget de reservas para tu página web | Puragenda | 6 |
| `/funciones/agenda-multiples-sucursales` | Agenda para múltiples sucursales | Puragenda | 6 |
| `/funciones/gift-cards` | Gift Cards para negocios de servicios | Puragenda | 7 |
| `/guias/dejar-de-agendar-por-whatsapp` | Cómo dejar de agendar por WhatsApp, paso a paso | Puragenda | 5 |
| `/guias/google-calendar-vs-sistema-reservas` | Google Calendar vs sistema de reservas: qué elegir | Puragenda | 6 |
| `/guias/organizar-agenda-varios-profesionales` | Cómo organizar la agenda de varios profesionales | Puragenda | 6 |
| `/alternativa-calendly` | Alternativa a Calendly para negocios de servicios | Puragenda | 6 |
| `/alternativa-fresha` | Alternativa a Fresha en Chile para evaluar tu agenda | Puragenda | 6 |

## E. Search Console

Propiedad existente utilizada: **`sc-domain:puragenda.cl`**, con la sesión autenticada disponible. No se creó otra propiedad. Inspecciones, pruebas en vivo y solicitudes realizadas individualmente desde la UI oficial. No se usó Google Indexing API.

| URL | Conocida por Google | Indexada | Live test | Canonical | Solicitud indexación |
| --- | --- | --- | --- | --- | --- |
| [/funciones/recordatorios-citas-email](https://www.puragenda.cl/funciones/recordatorios-citas-email) | Sí: descubierta | No | PASS | Exacta en vivo; N/A en índice | Aceptada, una vez |
| [/funciones/reservas-sin-cuenta](https://www.puragenda.cl/funciones/reservas-sin-cuenta) | Sí: descubierta | No | PASS | Exacta en vivo; N/A en índice | Aceptada, una vez |
| [/funciones/widget-reservas-web](https://www.puragenda.cl/funciones/widget-reservas-web) | Sí: descubierta | No | PASS | Exacta en vivo; N/A en índice | Aceptada, una vez |
| [/funciones/agenda-multiples-sucursales](https://www.puragenda.cl/funciones/agenda-multiples-sucursales) | No: desconocida | No | PASS | Exacta en vivo; N/A en índice | Aceptada, una vez |
| [/funciones/gift-cards](https://www.puragenda.cl/funciones/gift-cards) | Sí: descubierta | No | PASS | Exacta en vivo; N/A en índice | Aceptada, una vez |
| [/guias/dejar-de-agendar-por-whatsapp](https://www.puragenda.cl/guias/dejar-de-agendar-por-whatsapp) | Sí: descubierta | No | PASS | Exacta en vivo; N/A en índice | Aceptada, una vez |
| [/guias/google-calendar-vs-sistema-reservas](https://www.puragenda.cl/guias/google-calendar-vs-sistema-reservas) | Sí: descubierta | No | PASS | Exacta en vivo; N/A en índice | Aceptada, una vez |
| [/guias/organizar-agenda-varios-profesionales](https://www.puragenda.cl/guias/organizar-agenda-varios-profesionales) | Sí: descubierta | No | PASS | Exacta en vivo; N/A en índice | Aceptada, una vez |
| [/alternativa-calendly](https://www.puragenda.cl/alternativa-calendly) | Sí: descubierta | No | PASS | Exacta en vivo; N/A en índice | Aceptada, una vez |
| [/alternativa-fresha](https://www.puragenda.cl/alternativa-fresha) | Sí: descubierta | No | PASS | Exacta en vivo; N/A en índice | Aceptada, una vez |

Estado del índice observado antes de cada solicitud: nueve `Discovered - currently not indexed`; sucursales `URL is unknown to Google`. En las diez, última fecha de rastreo, permisos de rastreo/indexación y canonical declarada/seleccionada por Google del índice eran **N/A**. Las nueve descubiertas mostraban el sitemap oficial; sucursales mostraba `No referring sitemaps detected`.

En vivo, las diez mostraron **URL is available to Google**, **Page can be indexed**, rastreo permitido **Yes**, descarga **Successful**, indexación permitida **Yes**, Google Inspection Tool **smartphone** y canonical declarada exacta. La canonical seleccionada por Google se muestra como **Only determined after indexing**; no se infiere a partir del live test. No se observaron problemas técnicos; se detectó un breadcrumb válido por página.

Solicitudes aceptadas **10/10**, exactamente una por URL, en este orden: recordatorios, sin cuenta, widget, guía WhatsApp, guía Google Calendar, guía profesionales, Calendly, Fresha, sucursales y Gift Cards. Cada solicitud mostró **Indexing requested** y admisión a la cola prioritaria. No apareció límite de cuota, no quedaron solicitudes omitidas y no hubo reintentos. Solicitud aceptada no equivale a página indexada ni garantiza que vaya a indexarse.

## F. Sitemap y robots

- [Sitemap oficial](https://www.puragenda.cl/sitemap.xml): HTTP 200, XML válido, **44 URLs** sin duplicados; las 10 nuevas aparecen una vez cada una. Se conservan las 34 previas, sin localhost, previews o ramas.
- Lastmod de las 10 nuevas: **`2026-10-03T03:00:00.000Z`**.
- SHA-256 de `JSON.stringify(URLs en orden del sitemap)`: **`e40ffbf3ec93fc18700d1e911aee76f2bb3336a1956a357963d6af8352b4f76c`**, idéntico al build aprobado.
- [Robots](https://www.puragenda.cl/robots.txt): HTTP 200, Googlebot permite `/`; las rutas nuevas y el sitemap no coinciden con las exclusiones existentes. El sitemap oficial está declarado. Robots y crawler-policy permanecen intactos.
- GSC inicialmente mostraba Success, envío 2026-08-31, lectura 2026-09-29 y 34 páginas. Se reenvió el mismo sitemap **una sola vez**; la UI confirmó **Sitemap submitted successfully**.
- Estado final observado a **2026-10-03T21:16:23.001Z**: **Success**, envío **2026-10-03**, última lectura **2026-10-03**, **44 páginas detectadas**, 0 vídeos. La interfaz proporciona fecha, no hora de lectura. No se eliminó el sitemap ni se añadió uno separado.

## G. Experimento protegido

**206/206 hashes sin cambios** antes y después del merge. Los cinco hubs `/software-agenda-{barberias,peluquerias,manicure,estetica,psicologos}`, cinco spokes `/para/{barberias,peluquerias,manicure,estetica,psicologos}` y `/soluciones` mantienen contenido, metadata, H1, JSON-LD, estructura, CTA y enlaces originales. El navegador de producción confirmó **11/11 renders iguales** al baseline inicial.

La comparación normaliza exclusivamente comentarios de React, IDs generados de Base UI y el único enlace final de privacidad del banner de consentimiento ya descartado, fuera de main/footer. Se esperó la hidratación del accordion antes de comparar; no se alteró código para obtener igualdad. La selección experimental y navegación global están intactas. No se incorporan resultados del checkpoint vertical a esta tanda.

## H. Baseline y checkpoints

- Batch ID: `seo-expansion-2026-10-b01`; D0 y SHA de contenido publicados en C.
- **Impressions: no medir todavía como resultado.**
- **Clicks: no medir todavía como resultado.** No se inventan ceros ante una ventana de datos todavía insuficiente.
- **Indexed: 0/10 observadas en la inspección individual.** Es el estado observado entonces, no una predicción tras enviar las solicitudes.

| Checkpoint | Fecha Chile | Revisión |
| --- | --- | --- |
| D+7 | 2026-10-10 | Descubrimiento, rastreo, indexación, primeras queries si existen y errores |
| D+14 | 2026-10-17 | Páginas indexadas, impressions, queries, overlap inicial; CTR solo con muestra útil |
| D+28 | 2026-10-31 | Análisis formal: primeras impresiones, top queries, posición, CTR, cero-impression, canibalización, CTA y signup/trial si la atribución lo permite |

La hora de referencia de los checkpoints es 17:55:50.832 de Chile, conservando el D0 de publicación. Quedan anotados como recomendaciones, sin crear automaciones. No modificar páginas por datos de 1–2 días salvo error técnico.

## I. Reproducción y pendientes

Evidencia estructurada y sin credenciales: [JSON de lanzamiento](expansion-batch-01-launch-proof.json). Baseline fuente: [206 hashes](expansion-batch-01-baseline.json). Capturas/HTML/logs locales en `artifacts/seo-expansion-b01/launch/` del worktree del batch (ignorados por Git).

```powershell
git fetch --all --prune
git show --no-patch --format=fuller ae5ee8ba50871962980bbea178690a2fe8675b1e
git ls-remote origin refs/heads/main refs/heads/seo/expansion-batch-01
node scripts/seo-expansion-baseline.mjs
git diff 582896455102b8bc79a02126ec1008e6f50cb81a...ae5ee8ba50871962980bbea178690a2fe8675b1e --check
npm run test -- tests/seo-expansion-batch-01.test.ts tests/seo.test.ts tests/seo-link-graph.test.ts tests/json-ld.test.ts tests/crawler-policy.test.ts tests/analytics-path.test.ts tests/analytics-events.test.ts tests/google-events.test.ts tests/google-analytics.test.ts tests/barbershop-software-landing.test.ts tests/salon-software-landing.test.ts tests/manicure-software-landing.test.ts tests/aesthetics-software-landing.test.ts tests/psychologists-software-landing.test.ts tests/scheduling-system-landing.test.ts
npm run lint
npm run typecheck
# Configurar DATABASE_URL y DIRECT_URL para un fixture local aislado antes del build.
npm run build
```

Para reconsultar GSC, abrir la propiedad existente → Sitemaps y comprobar el sitemap oficial; después Inspección de URLs con las URLs de D/E. **No volver a solicitar indexación para reproducir la verificación.** Reconsultar estados en los checkpoints. El [live test de Google](https://support.google.com/webmasters/answer/9012289?hl=es) no comprueba selección de canonical ni garantiza inclusión futura.

**Pendientes reales:** procesamiento de Google y revisiones D+7/D+14/D+28. No queda ninguna acción manual de lanzamiento, solicitud omitida ni error técnico observado. El contenido de la tanda y el experimento no se modificaron durante este lanzamiento.
