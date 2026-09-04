# SEO-019 — Baseline y protocolo de medición de verticales

**Fecha del baseline:** 2026-09-04

**Zona horaria:** America/Santiago

**Dominio:** `https://www.puragenda.cl`
**Decisión:** **TOO EARLY**

## 1. Resumen ejecutivo

Las cinco parejas hub/spoke están correctamente publicadas e indexables desde el punto de vista técnico. Las diez URLs responden HTTP 200, declaran canonical propio, permiten `index, follow`, tienen un solo H1 y aparecen exactamente una vez en el sitemap. `robots.txt` permite estas rutas a Googlebot y a los crawlers de búsqueda de IA revisados.

No existe acceso API configurado a Google Search Console ni GA4 en este entorno. El chequeo de credenciales de `seo-google` devolvió **Tier -1: No credentials configured**. Por ello, clics, impresiones, CTR, posición, consultas, países, dispositivos, sesiones y conversiones quedan en **N/D — REQUIRES USER**. No se infieren valores a partir de Semrush ni de una búsqueda pública.

Los hubs se publicaron entre el 3 y el 4 de septiembre de 2026. Manicure, estética y psicólogos tenían menos de un día de antigüedad al capturar este baseline. La falta de resultados públicos exactos para esas URLs no demuestra que Google las haya descartado: la comprobación definitiva requiere URL Inspection en GSC.

No hay evidencia medible de canibalización. Esto significa **NO EVIDENCE**, no “canibalización descartada”.

## 2. Fuentes y frescura

| Fuente | Fecha | Uso | Limitación |
|---|---:|---|---|
| Producción de Puragenda | 2026-09-04 15:12 CLST | HTTP, canonical, robots, H1, sitemap y enlaces internos | Demuestra indexabilidad técnica, no inclusión en el índice de Google |
| `robots.txt` y `sitemap.xml` públicos | 2026-09-04 | Directivas de rastreo y presencia de URLs | No demuestran que Google ya haya rastreado o indexado |
| Historial Git | 2026-09-04 | Fecha aproximada de publicación | La hora real de despliegue puede ser posterior al commit |
| `.seo-cache/site-meta.json` | 2026-09-02 | Contexto B2B SaaS y crawl anterior de 27 URLs | Caché anterior a los hubs nuevos; se volvió a comprobar producción |
| Paquete Semrush local | 2026-09-01 a 2026-09-03 | Baseline histórico de salud, keywords y posiciones | No contiene rendimiento GSC ni datos posteriores a las nuevas landings |
| Búsqueda pública `site:` | 2026-09-04 | Señal auxiliar para las tres URLs nuevas | No devolvió las URLs exactas; resultado no concluyente |
| Google Search Console | N/D | Rendimiento e indexación real | **REQUIRES USER:** no hay OAuth/service account |
| GA4 Data API | N/D | Tráfico y funnel | **REQUIRES USER:** no hay OAuth/service account ni property ID accesible |

## 3. Estado de producción

`Canonical: propio` significa que la URL canónica coincide exactamente con la URL probada. `Indexable técnica: sí` requiere HTTP 200, ausencia de `noindex`, canonical propio, inclusión en sitemap y permiso de rastreo.

| URL | Publicación aprox. | HTTP | Canonical | Robots | Sitemap | H1 | Indexable técnica |
|---|---:|---:|---|---|---:|---|---|
| `/software-agenda-barberias` | 2026-09-03 | 200 | propio | `index, follow` | 1 | Software de agenda para barberías | Sí |
| `/software-agenda-peluquerias` | 2026-09-03 | 200 | propio | `index, follow` | 1 | Software de agenda para peluquerías y salones | Sí |
| `/software-agenda-manicure` | 2026-09-04 | 200 | propio | `index, follow` | 1 | Software de agenda para manicure y nail studios | Sí |
| `/software-agenda-estetica` | 2026-09-04 | 200 | propio | `index, follow` | 1 | Sistema de reservas para centros de estética | Sí |
| `/software-agenda-psicologos` | 2026-09-04 | 200 | propio | `index, follow` | 1 | Agenda online para organizar tu consulta de psicología | Sí |
| `/para/barberias` | 2026-04-30 | 200 | propio | `index, follow` | 1 | Puragenda para barberías | Sí |
| `/para/peluquerias` | 2026-04-30 | 200 | propio | `index, follow` | 1 | Puragenda para peluquerías | Sí |
| `/para/manicure` | 2026-08-31 | 200 | propio | `index, follow` | 1 | Así organiza sus citas un nail studio con Puragenda | Sí |
| `/para/estetica` | 2026-04-30 | 200 | propio | `index, follow` | 1 | Cómo organizar las citas de tu centro con Puragenda | Sí |
| `/para/psicologos` | 2026-08-31 | 200 | propio | `index, follow` | 1 | Cómo organizar las citas de tu consulta con Puragenda | Sí |

### Enlaces internos principales comprobados

| URL | Enlaces principales presentes |
|---|---|
| `/software-agenda-barberias` | `/para/barberias`, `/sistema-de-agendamiento-online`, abonos, equipos y `/soluciones` |
| `/software-agenda-peluquerias` | `/para/peluquerias`, `/sistema-de-agendamiento-online`, Google Calendar, abonos, equipos y `/soluciones` |
| `/software-agenda-manicure` | `/para/manicure`, `/sistema-de-agendamiento-online`, Google Calendar, abonos, equipos y `/soluciones` |
| `/software-agenda-estetica` | `/para/estetica`, `/sistema-de-agendamiento-online`, Google Calendar, abonos, equipos y `/soluciones` |
| `/software-agenda-psicologos` | `/para/psicologos`, `/sistema-de-agendamiento-online`, Google Calendar, abonos, equipos y `/soluciones` |
| `/para/barberias` | `/software-agenda-barberias`, `/sistema-de-agendamiento-online`, abonos, equipos y `/soluciones` |
| `/para/peluquerias` | `/software-agenda-peluquerias`, `/sistema-de-agendamiento-online`, abonos, equipos y `/soluciones` |
| `/para/manicure` | `/software-agenda-manicure`, `/sistema-de-agendamiento-online`, abonos, equipos y `/soluciones` |
| `/para/estetica` | `/software-agenda-estetica`, `/sistema-de-agendamiento-online`, abonos, equipos y `/soluciones` |
| `/para/psicologos` | `/software-agenda-psicologos`, `/sistema-de-agendamiento-online`, Google Calendar, abonos, equipos y `/soluciones` |

El sitemap respondió 200 y contenía 33 URLs. Cada una de las diez URLs auditadas aparecía una sola vez. No se detectó `X-Robots-Tag: noindex`.

## 4. Estado de indexación

| URL nueva | Descubrible | Crawled por Google | Indexed por Google | Estado verificable |
|---|---|---|---|---|
| `/software-agenda-manicure` | Sí: sitemap + enlaces internos | N/D | N/D | **REQUIRES USER — GSC URL Inspection** |
| `/software-agenda-estetica` | Sí: sitemap + enlaces internos | N/D | N/D | **REQUIRES USER — GSC URL Inspection** |
| `/software-agenda-psicologos` | Sí: sitemap + enlaces internos | N/D | N/D | **REQUIRES USER — GSC URL Inspection** |

La consulta pública exacta `site:puragenda.cl/<ruta>` no devolvió estas páginas en la captura del 4 de septiembre. Esta señal es compatible con páginas recién publicadas, pero no permite distinguir entre discovered, crawled, indexed o not indexed. No se realizaron ni se programaron solicitudes repetidas de indexación.

## 5. Search Console por URL

Ventana solicitada: máxima razonable disponible. Ventana obtenida: ninguna, porque no hay acceso GSC configurado.

| URL | Clicks | Impressions | CTR | Avg. position | Queries | Countries | Devices |
|---|---:|---:|---:|---:|---|---|---|
| `/software-agenda-barberias` | N/D | N/D | N/D | N/D | N/D | N/D | N/D |
| `/software-agenda-peluquerias` | N/D | N/D | N/D | N/D | N/D | N/D | N/D |
| `/software-agenda-manicure` | N/D | N/D | N/D | N/D | N/D | N/D | N/D |
| `/software-agenda-estetica` | N/D | N/D | N/D | N/D | N/D | N/D | N/D |
| `/software-agenda-psicologos` | N/D | N/D | N/D | N/D | N/D | N/D | N/D |
| `/para/barberias` | N/D | N/D | N/D | N/D | N/D | N/D | N/D |
| `/para/peluquerias` | N/D | N/D | N/D | N/D | N/D | N/D | N/D |
| `/para/manicure` | N/D | N/D | N/D | N/D | N/D | N/D | N/D |
| `/para/estetica` | N/D | N/D | N/D | N/D | N/D | N/D | N/D |
| `/para/psicologos` | N/D | N/D | N/D | N/D | N/D | N/D | N/D |

Para completar esta sección se necesita agregar una cuenta de servicio u OAuth con acceso de lectura a la propiedad GSC de `puragenda.cl`. La extracción deberá conservar filas por `query + page` y obtener países y dispositivos en consultas separadas para no mezclar agregaciones.

## 6. Mapa query → URL

Las consultas de esta tabla son la **lista de seguimiento definida en SEO-019**, no consultas observadas en GSC. Todas las métricas quedan N/D hasta disponer de Search Console.

| Query de seguimiento | Hub URL | Spoke URL | Impr. hub | Impr. spoke | Clicks | Position | Interpretación actual |
|---|---|---|---:|---:|---:|---:|---|
| software agenda barberías | `/software-agenda-barberias` | `/para/barberias` | N/D | N/D | N/D | N/D | Propietario esperado: hub; no observado |
| agenda para barberías | `/software-agenda-barberias` | `/para/barberias` | N/D | N/D | N/D | N/D | Intención ambigua; medir reparto |
| sistema de reservas barbería | `/software-agenda-barberias` | `/para/barberias` | N/D | N/D | N/D | N/D | Propietario esperado: hub; no observado |
| Puragenda barberías | `/software-agenda-barberias` | `/para/barberias` | N/D | N/D | N/D | N/D | Marca/contexto: spoke esperado |
| software agenda peluquerías | `/software-agenda-peluquerias` | `/para/peluquerias` | N/D | N/D | N/D | N/D | Propietario esperado: hub; no observado |
| agenda para peluquerías | `/software-agenda-peluquerias` | `/para/peluquerias` | N/D | N/D | N/D | N/D | Intención ambigua; medir reparto |
| sistema reservas peluquería | `/software-agenda-peluquerias` | `/para/peluquerias` | N/D | N/D | N/D | N/D | Propietario esperado: hub; no observado |
| software agenda manicure | `/software-agenda-manicure` | `/para/manicure` | N/D | N/D | N/D | N/D | Propietario esperado: hub; no observado |
| agenda para manicuristas | `/software-agenda-manicure` | `/para/manicure` | N/D | N/D | N/D | N/D | Intención ambigua; medir reparto |
| agenda online uñas | `/software-agenda-manicure` | `/para/manicure` | N/D | N/D | N/D | N/D | Ambigua B2B/B2C; no observada |
| sistema reservas manicure | `/software-agenda-manicure` | `/para/manicure` | N/D | N/D | N/D | N/D | Propietario esperado: hub; no observado |
| nail studio agenda | `/software-agenda-manicure` | `/para/manicure` | N/D | N/D | N/D | N/D | Ambigua; medir lenguaje real |
| software agenda estética | `/software-agenda-estetica` | `/para/estetica` | N/D | N/D | N/D | N/D | Propietario esperado: hub; no observado |
| agenda centro estética | `/software-agenda-estetica` | `/para/estetica` | N/D | N/D | N/D | N/D | Intención ambigua; medir reparto |
| sistema reservas centro estética | `/software-agenda-estetica` | `/para/estetica` | N/D | N/D | N/D | N/D | Propietario esperado: hub; no observado |
| software agenda psicólogos | `/software-agenda-psicologos` | `/para/psicologos` | N/D | N/D | N/D | N/D | Propietario esperado: hub; no observado |
| agenda para psicólogos | `/software-agenda-psicologos` | `/para/psicologos` | N/D | N/D | N/D | N/D | Intención ambigua; medir reparto |
| agenda online psicólogos | `/software-agenda-psicologos` | `/para/psicologos` | N/D | N/D | N/D | N/D | Intención ambigua; medir reparto |
| sistema reservas psicólogos | `/software-agenda-psicologos` | `/para/psicologos` | N/D | N/D | N/D | N/D | Propietario esperado: hub; no observado |

No se añaden otras consultas a la tabla porque GSC no aportó consultas reales.

## 7. Hub vs spoke y canibalización

| Vertical | Antigüedad del hub al baseline | Evidencia compartida query/page | Clasificación |
|---|---:|---|---|
| Barberías | ~1 día | Sin dataset GSC | **NO EVIDENCE** |
| Peluquerías | <1 día | Sin dataset GSC | **NO EVIDENCE** |
| Manicure | Horas | Sin dataset GSC | **NO EVIDENCE** |
| Estética | Horas | Sin dataset GSC | **NO EVIDENCE** |
| Psicólogos | Horas | Sin dataset GSC | **NO EVIDENCE** |

### Protocolo reproducible

1. Exportar semanalmente GSC con dimensiones `query,page`, tipo `web` y país Chile, manteniendo también una extracción sin filtro de país.
2. Normalizar consultas solo por minúsculas, espacios y tildes para el análisis; conservar el texto original en el archivo fuente.
3. Agrupar únicamente las dos URLs de la misma vertical. No mezclar consultas de marca, B2C o informacionales con la intención comercial.
4. Aplicar las clasificaciones:
   - **NO EVIDENCE:** solo aparece una URL, no hay datos o la segunda aparición es una impresión aislada.
   - **WATCH:** ambas URLs aparecen para la misma consulta en una ventana, pero el patrón no se repite o acumula menos de 20 impresiones combinadas.
   - **LIKELY CANNIBALIZATION:** ambas URLs aparecen en dos cortes semanales consecutivos, superan 20 impresiones combinadas en 28 días y la secundaria recibe al menos 20% de las impresiones del par.
   - **CONFIRMED PATTERN:** el patrón anterior persiste durante tres cortes semanales y existe alternancia de URL, reparto material de clics o una URL de intención incorrecta desplaza a la propietaria esperada.
5. No cambiar contenido por una sola impresión, una sola semana ni una diferencia de posición con muestra mínima.

## 8. GA4 e instrumentación SEO-004

No fue posible consultar GA4. La revisión del código confirma:

- `sign_up_cta_clicked` incluye `source_page` y `cta_location` para las cinco landings comerciales.
- Las cinco rutas hub están incluidas en la taxonomía de páginas públicas; los spokes `/para/*` conservan su ruta real para GA4.
- `sign_up`, `business_created` y `trial_started` se emiten después del registro exitoso.
- Esos tres eventos de conversión **no llevan `source_page` directamente** en su payload actual. La atribución por landing solo puede reconstruirse dentro de GA4 mediante landing page/session/user association, si la retención y configuración lo permiten.
- No se crean eventos nuevos en SEO-019.

| Landing comercial | Users | Sessions | `sign_up_cta_clicked` | `sign_up` | `business_created` | `trial_started` |
|---|---:|---:|---:|---:|---:|---:|
| `/software-agenda-barberias` | N/D | N/D | N/D | N/D | N/D | N/D |
| `/software-agenda-peluquerias` | N/D | N/D | N/D | N/D | N/D | N/D |
| `/software-agenda-manicure` | N/D | N/D | N/D | N/D | N/D | N/D |
| `/software-agenda-estetica` | N/D | N/D | N/D | N/D | N/D | N/D |
| `/software-agenda-psicologos` | N/D | N/D | N/D | N/D | N/D | N/D |

## 9. Funnel por landing

| Landing | Visit | CTA click | Sign up | Business created | Trial started | Lectura |
|---|---:|---:|---:|---:|---:|---|
| Barberías | N/D | N/D | N/D | N/D | N/D | Sin datos atribuibles |
| Peluquerías | N/D | N/D | N/D | N/D | N/D | Sin datos atribuibles |
| Manicure | N/D | N/D | N/D | N/D | N/D | Sin datos atribuibles |
| Estética | N/D | N/D | N/D | N/D | N/D | Sin datos atribuibles |
| Psicólogos | N/D | N/D | N/D | N/D | N/D | Sin datos atribuibles |

No se calculan tasas con denominadores N/D ni se extraen conclusiones estadísticas con muestras inexistentes.

## 10. Baseline Semrush conservado

Captura principal: 2026-09-03, Chile, mobile, 40/100 páginas.

| Métrica | Baseline |
|---|---:|
| Site Health | 92% |
| AI Search Health | 94% |
| Organic keywords | 4 |
| Organic traffic estimado Chile | ~0 |
| Errores | 16 |
| Warnings | 85 |
| Crawlability | 93% |
| HTTPS | 100% |
| Performance | 100% |
| Internal linking | 91% |
| Markup | 78% |
| Visibilidad IA de Puragenda | 0 topics, 0 cited sources, 0 cited pages visibles |

Las diez keywords del Position Tracking creado el 3 de septiembre estaban fuera del top 100 o sin ciclo diario completo. Este baseline se conserva; no se rehizo la auditoría ni se persiguió 100% de Site Health. Los avisos de `SoftwareApplication` relacionados con reviews/ratings siguen aceptados mientras no existan reviews reales aplicables.

## 11. Consultas reales conocidas y clasificación

No hubo consultas nuevas de GSC. Las únicas consultas reales disponibles son las cuatro registradas en el paquete Semrush anterior:

| Query | Posición Semrush | Clase | Lectura |
|---|---:|---|---|
| `zenteno 715` | 89 | E. Irrelevante | Ruido local/dirección |
| `cuatro esquinas 1540` | 47 | E. Irrelevante | Ruido local/dirección |
| `agendamiento origen` | 27 | D. Marca | Consulta ambigua asociada a “Origen”; no prueba demanda vertical |
| `las verbenas 8301` | 56 | E. Irrelevante | Ruido local/dirección |

No se observan consultas nuevas que justifiquen cambios, artículos o landings.

## 12. Evidencia sobre futuros verticales

| Candidato P2 | Evidencia nueva en SEO-019 | Decisión |
|---|---|---|
| Bienestar/terapias | Ninguna consulta GSC disponible | Mantener P2 |
| Masajes | Semrush previo: volumen amplio 22.200 y posiciones de competidores, dominado por intención de servicio/B2C; no es evidencia nueva | Mantener P2 |
| Tatuadores | Ninguna consulta GSC disponible | Mantener P2 |
| Kinesiólogos | Ninguna consulta GSC disponible | Mantener P2 |

No se promueve ningún candidato. Spa dedicado, veterinarias y software clínico general permanecen en **NO HACER**.

## 13. Limitaciones

- Sin GSC no se puede afirmar discovered, crawled, indexed o not indexed para una URL concreta.
- Sin GSC no existen impresiones por query/page para medir hub vs spoke.
- Sin GA4 Data API no se conocen usuarios, sesiones ni eventos.
- Los eventos de conversión posteriores al registro no incorporan `source_page` directamente; la atribución depende de análisis de sesión/usuario en GA4.
- La búsqueda pública `site:` es incompleta y no sustituye URL Inspection.
- Semrush fue capturado antes de la publicación de los cinco hubs y sirve solo como baseline histórico.
- Las fechas de publicación son aproximadas a partir de commits; no son timestamps de primera indexación.

## 14. Ventana de evaluación recomendada

| Hito | Fecha recomendada | Objetivo |
|---|---:|---|
| Inspección única inicial en GSC | 2026-09-11 | Revisar las tres URLs nuevas sin repetir solicitudes automáticas |
| Primer corte semanal | 2026-09-18 | Registrar primeras impresiones/query-page si existen |
| Revisión formal de 28 días | **2026-10-02** | Comparar hubs/spokes con una ventana mínima homogénea |
| Confirmación de patrones | 2026-10-16 o posterior | Solo si existen tres cortes semanales con volumen material |

La próxima revisión recomendada del Master Plan es el **2 de octubre de 2026**. Si antes de esa fecha GSC muestra un error técnico real de indexación, se corrige el error; la ausencia inicial de impresiones no reabre las landings.

## 15. Plantilla de extracción para la próxima revisión

Guardar una fila por fecha, query y URL:

```text
snapshot_date,window_start,window_end,query,page,country,device,clicks,impressions,ctr,position
```

Guardar GA4 por landing y misma ventana:

```text
window_start,window_end,landing_page,users,sessions,sign_up_cta_clicked,sign_up,business_created,trial_started
```

No unir países y dispositivos a una fila GSC si provienen de agregaciones distintas. Registrar `N/D` de forma explícita y conservar el export original sin sobrescribirlo.

## 16. Decisión SEO-019

### **A. TOO EARLY**

Evidencia:

1. Los hubs tienen entre horas y aproximadamente un día de antigüedad.
2. La producción y la indexabilidad técnica están correctas.
3. No hay acceso GSC/GA4 ni series de query/page para medir rendimiento o canibalización.
4. Semrush disponible es anterior a la publicación y no muestra señales verticales atribuibles a estas páginas.
5. No existe evidencia nueva que justifique optimizar o expandir.

**Acción:** esperar datos y repetir la medición el 2 de octubre de 2026. No avanzar automáticamente a SEO-020.
