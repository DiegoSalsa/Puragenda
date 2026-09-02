# Estudio SEO, GEO y AEO de Puragenda

Fecha: 1 de septiembre de 2026

Sitio: `https://www.puragenda.cl`

Mercado prioritario: Chile, español

Ventana de Search Console: 31 de mayo al 30 de agosto de 2026

## Resumen ejecutivo

Puragenda no tiene una crisis técnica de SEO. La base desplegada es buena: HTTPS, sitemap válido, canonicals, títulos y descripciones específicos, contenido renderizado en HTML, datos estructurados y acceso permitido a los principales agentes de búsqueda. El sitemap fue leído correctamente por Google el 31 de agosto y contiene 27 URLs.

El cuello de botella es la cobertura de demanda. En tres meses el sitio obtuvo 338 impresiones y 36 clics. El CTR global de 10,7 % y la posición media de 7,4 son positivos, pero se apoyan en un volumen pequeño y en búsquedas de marca o de negocios clientes. Solo dos clics visibles corresponden a páginas editoriales/comerciales distintas de la home; nueve clics entraron por widgets de clientes.

La señal GEO es prometedora: Google registró 37 impresiones en funciones generativas, equivalentes al 10,9 % de las impresiones web del período. La home, FAQ, la comparación con AgendaPro y las guías ya funcionan como fuentes. El trabajo siguiente no es añadir más marcado por añadirlo, sino publicar más evidencia, respuestas citables y páginas de intención comercial que merezcan ser recuperadas.

Las dos prioridades técnicas son:

1. redirigir permanentemente `puragenda.vercel.app` hacia `www.puragenda.cl`, porque el dominio de Vercel todavía responde 200, permite indexación y aparece en resultados;
2. separar o cachear el marketing público, que hoy responde con `Cache-Control: no-store, private`, aunque el contenido sea público.

## 1. Línea base de Search Console

### Rendimiento web

| Indicador | Resultado |
|---|---:|
| Clics | 36 |
| Impresiones | 338 |
| CTR | 10,7 % |
| Posición media | 7,4 |
| Clics desde Chile | 35 de 36 |
| Impresiones desde Chile | 297 de 338 |
| Clics móviles | 28 de 36 |
| Impresiones móviles | 210 de 338 |

Chile aporta el 87,9 % de las impresiones y el 97,2 % de los clics. Móvil aporta el 62,1 % de las impresiones y el 77,8 % de los clics. La estrategia debe seguir siendo Chile-first y mobile-first.

### Páginas con mayor rendimiento

| Página | Clics | Impresiones | Lectura |
|---|---:|---:|---|
| `/` | 25 | 96 | Principal activo comercial |
| `/widget/soccerbarber` | 8 | 69 | Tráfico local/de marca de un cliente |
| `/faq` | 1 | 36 | Buen formato AEO |
| `/alternativa-agendapro` | 1 | 27 | Intención comparativa de alto valor |
| `/widget/terapias-sanando-el-corazon` | 1 | 19 | Tráfico de cliente |
| `/sobre-nosotros` | 0 | 75 | Visibilidad de entidad, sin clics |
| `/guias/cobrar-abonos-reservas-online` | 0 | 47 | Oportunidad informativa cercana al producto |
| `/caracteristicas` | 0 | 28 | Necesita consultas más específicas |
| `/guias/como-elegir-sistema-reservas-chile` | 0 | 22 | Relevante, todavía sin tracción |
| `/pricing` | 0 | 9 | Demanda de marca aún baja |

La home concentra el 69,4 % de los clics. Los widgets de clientes concentran otro 25 %. Por tanto, el sitio todavía depende de una sola página comercial y de demanda ajena al producto.

### Consultas visibles

Las consultas comerciales más claras todavía no generan clics:

- `sistema de reservas online chile`: 7 impresiones;
- `sistema de agendamiento`: 5;
- `agenda pro precios`: 4;
- `reserva online`: 2;
- `¿cuánto cuesta agendapro?`: 1.

La consulta con más clics visibles es `soccer barber` (5 clics, 22 impresiones). También aparecen variantes de `barbería osorno`, relacionadas con el negocio cliente. Search Console oculta parte de las consultas por privacidad, por lo que la suma de la tabla no coincide con el total del período.

## 2. Indexación y rastreo

Google registra 18 páginas indexadas y 29 no indexadas. La cifra de exclusión parece alta, pero casi toda es intencional o técnica:

| Motivo | URLs | Evaluación |
|---|---:|---|
| Bloqueadas por `robots.txt` | 16 | Rutas privadas; correcto |
| Excluidas por `noindex` | 5 | Login/registro/áreas privadas; correcto |
| Página con redirección | 3 | Normal, revisar que sean permanentes |
| Rastreada, no indexada | 4 | Manifest, fuente y favicon; sin impacto comercial |
| Descubierta, no indexada | 1 | `/para/barberias`; prioridad real |

El sitemap enviado el 31 de agosto fue leído el mismo día con estado correcto y 27 páginas descubiertas. La diferencia entre 27 URLs enviadas y 18 indexadas es coherente con páginas nuevas o recientemente mejoradas; no justifica crear más URLs hasta confirmar la adopción de las actuales.

### Riesgo de duplicación de dominio

`https://puragenda.vercel.app/` y sus rutas responden 200 con `index, follow`. Incluyen canonical hacia `www.puragenda.cl`, pero Google todavía muestra URLs del dominio Vercel para páginas como `/soluciones` y `/terminos-y-condiciones`.

Acción recomendada: configurar un 308 por host desde `puragenda.vercel.app/:path*` hacia `https://www.puragenda.cl/:path*`. El canonical debe mantenerse como señal complementaria. Después, comprobar varias rutas, inspeccionar una URL del dominio antiguo y vigilar su desaparición del índice.

## 3. SEO técnico y on-page

### Lo que está bien

- Home, precios, FAQ, comparación, guías, funciones y páginas por rubro responden 200.
- Las páginas auditadas tienen un solo H1, canonical correcto y metadatos específicos.
- La home declara `Organization`, `SoftwareApplication` y `WebSite`.
- Precios y landings funcionales declaran ofertas y software; guías declaran `Article` y breadcrumbs.
- `robots.txt` permite Googlebot, Bing, OAI-SearchBot, ChatGPT-User, Perplexity y Claude Search/User, manteniendo bloqueadas las áreas privadas.
- Existe `llms.txt` como índice auxiliar; no sustituye al sitemap, pero facilita el descubrimiento semántico.

### Lo que limita el crecimiento

#### 1. Marketing sin caché pública

La home, FAQ y otras páginas comerciales responden `Cache-Control: no-store, must-revalidate, no-cache, max-age=0, private`. Esto impide aprovechar caché CDN y hace que cada rastreo/visita dependa del render dinámico. No es una penalización directa, pero sí una desventaja de velocidad, estabilidad y coste de rastreo.

Recomendación: aislar el idioma/sesión del marketing o generar las páginas públicas de forma estática/revalidada. Medir TTFB y Lighthouse móvil antes y después.

#### 2. Arquitectura todavía concentrada

Las nuevas páginas de funciones y rubros existen, pero aún no acumulan impresiones. Deben recibir enlaces contextuales desde la home, `/caracteristicas`, `/soluciones`, guías y footer mediante anchors descriptivos, no solo tarjetas genéricas.

#### 3. Estrategia de widgets sin decisión explícita

Los widgets de clientes ya posicionan y generan clics. Eso puede convertirse en un canal de distribución, pero mezcla dos intenciones: buscar Puragenda y buscar una barbería/terapeuta.

Recomendación:

- mantener indexables únicamente widgets con consentimiento del negocio, contenido único, datos de ubicación/servicios verificables y canonical propio;
- usar `noindex` en widgets de prueba, incompletos o duplicados;
- si se mantienen indexables, crear un sitemap separado y medirlos como segmento distinto en Search Console y analítica.

## 4. GEO: optimización para motores generativos

### Evidencia actual

Search Console registra 37 impresiones en funciones generativas de Google:

| Página | Impresiones IA |
|---|---:|
| Home | 20 |
| FAQ | 5 |
| Alternativa a AgendaPro | 4 |
| Guía de abonos | 4 |
| Guía de encargos | 3 |
| Sobre nosotros | 3 |

Hay además impresiones aisladas en una guía de elección, login y páginas legales. El patrón confirma que Google recupera tres tipos de contenido: definición de producto, respuestas concretas y comparaciones/guías.

### Qué falta para escalar

- Casos de estudio con negocio, problema, configuración, período y resultado medido.
- Fuentes primarias enlazadas cuando se mencionen estadísticas, regulación, pagos o tendencias.
- Autor/editor y fecha de revisión visibles y consistentes en todas las guías.
- Una página de entidad fuerte para Puragenda/PuroCode con nombre legal/comercial, ubicación, contacto, equipo y relaciones externas verificables.
- Menciones externas en sitios de clientes, partners, asociaciones y medios sectoriales.

La optimización GEO debe enfocarse en afirmaciones demostrables. `llms.txt` y JSON-LD ayudan a interpretar, pero no sustituyen autoridad ni evidencia.

## 5. AEO: optimización para respuestas directas

La FAQ, la comparación y las guías ya muestran tracción. Los bloques de “respuesta rápida” y las preguntas con respuestas autosuficientes deben mantenerse.

Prioridades editoriales:

1. responder primero en 40–70 palabras y desarrollar después;
2. incluir precio, moneda, comisión, prueba, límites y mercado cuando la pregunta lo requiera;
3. usar tablas para comparaciones y pasos numerados para procesos;
4. enlazar cada respuesta a una página comercial directamente relacionada;
5. evitar cifras de competidores sin fuente oficial y fecha.

El marcado `FAQPage` sigue siendo útil para expresar la estructura, pero no debe tratarse como una vía esperable a un rich result: Google reserva habitualmente los resultados enriquecidos FAQ para sitios gubernamentales y de salud con autoridad reconocida. El valor principal aquí es claridad semántica y reutilización de respuestas.

## 6. Competencia orgánica observada

Para búsquedas de agenda online de barberías en Chile aparecen competidores con landings muy específicas: AgendaLibre, NEVE Agenda, BARBEROZ, Zitoria, Turnify y AgendaBarber. Sus patrones comunes son:

- problema del rubro descrito con lenguaje cotidiano;
- demostración visual del flujo;
- precio o prueba visibles;
- casos de uso concretos (barbero, silla, duración, no-show, WhatsApp);
- FAQs y CTA repetida;
- títulos/H1 que incluyen barbería y Chile.

La página actual de Puragenda para barberías tiene buen esqueleto, pero su H1 (“Lleva tu Barbería al siguiente nivel”) es menos explícito que la competencia y la URL aún no está indexada. Debe priorizar `agenda online para barberías en Chile`, reservas 24/7, abonos, equipo y reducción de inasistencias en title, H1, primer párrafo y enlaces internos, sin forzar repetición.

## 7. Plan priorizado

### Próximos 7 días

1. Implementar el 308 del dominio Vercel al dominio canónico.
2. Verificar e inspeccionar `/para/barberias` y solicitar indexación; hacer lo mismo con un grupo pequeño: `/pricing`, `/funciones/reservas-online-con-abono`, `/funciones/agenda-multiples-profesionales`, `/para/psicologos` y la guía principal.
3. Añadir enlaces contextuales desde páginas ya indexadas hacia esas URLs.
4. Ajustar la landing de barberías para la intención “agenda online para barberías en Chile”.
5. Definir por escrito la política de indexación de widgets.

### Próximos 30 días

1. Publicar dos casos de estudio reales, empezando por Soccer Barber y un negocio de terapias/estética, con permiso verificable.
2. Profundizar tres clusters: barberías, estética/spa y profesionales de salud no urgente.
3. Crear contenido de decisión, no solo informativo: comparativas, checklist de migración, calculadora simple de coste/no-show y páginas de funciones.
4. Separar marketing estático del área autenticada o introducir revalidación/caché pública.
5. Conseguir enlaces desde las webs de clientes y desde PuroCode hacia casos/landings relevantes.

### 60–90 días

1. Evaluar crecimiento de impresiones no de marca y páginas que pasan de posiciones 8–20 a top 10.
2. Consolidar o mejorar URLs que sigan sin impresiones; no producir páginas locales masivas sin evidencia comercial.
3. Medir prompts fijos mensuales en Google AI, ChatGPT, Perplexity y Bing para observar presencia de marca y fuentes citadas.
4. Escalar solo los rubros que muestren impresiones, leads o registros.

## 8. KPIs de control

Medir cada 28 días:

- impresiones y clics no de marca;
- páginas comerciales indexadas / páginas enviadas;
- consultas en posiciones 1–10 y 11–20;
- impresiones en funciones generativas de Google;
- CTR por landing y dispositivo;
- clics a WhatsApp/contacto, registros iniciados y registros completados por landing original;
- menciones/enlaces externos nuevos;
- TTFB y Lighthouse móvil de las páginas públicas.

Objetivo operativo del siguiente ciclo: aumentar cobertura e indexación sin sacrificar el CTR. Con el volumen actual, fijar metas rígidas de tráfico sería poco fiable; conviene evaluar primero si las nuevas landings pasan a generar impresiones no de marca y conversiones asistidas.

## Fuentes consultadas

- Google Search Console, propiedad de dominio `puragenda.cl`.
- Sitio desplegado, `robots.txt`, `sitemap.xml` y `llms.txt` de Puragenda.
- Resultados públicos para consultas de sistema de reservas y agenda online para barberías en Chile.
- Google Search Central: redirecciones permanentes, canonicalización, datos estructurados de software y cambios en FAQ rich results.
