# SEO-015 — Priorización de verticales B2B de Puragenda

Fecha: **4 de septiembre de 2026**. Mercado principal: **Chile**, español. Base del repositorio al iniciar: `b196bf5`. Estado: **priorización documentada; implementación no iniciada**.

## 1. Decisión y alcance

La próxima tanda recomendada es de **tres landings**, implementadas secuencialmente:

1. **P0 — Manicure / uñas / nail studios:** `/software-agenda-manicure`.
2. **P1 — Centros de estética no clínica:** `/software-agenda-estetica`.
3. **P1 — Psicólogos, exclusivamente agenda administrativa:** `/software-agenda-psicologos`.

Manicure reúne el mejor encaje, una señal interna de uso real y un catálogo suficientemente específico. Estética ofrece una segunda aplicación cercana, limitada a reservas por profesional. Psicología tiene intención de compra identificable, pero requiere explicar con precisión el alcance administrativo y carece de cliente confirmado en la evidencia recibida.

**P2:** bienestar/terapias, masajes, tatuadores y kinesiólogos. **NO HACER por ahora:** una landing dedicada a gestión integral de spa, software veterinario o software clínico general. No se agrega un cuarto vertical solo para completar cupos.

SEO-001 a SEO-014 permanecen cerradas. Se acepta el estado comunicado de Capterra LIVE y ComparaSoftware pendiente, sin repetir gestiones. Este trabajo solo genera la decisión SEO-015: no crea rutas, cambia contenido público, implementa features ni avanza de fase.

El marketplace queda separado: `MARKETPLACE_QUALITY_GATE.indexingEnabled` sigue en `false`. No se proponen ni habilitan páginas como `/manicure/[city]`, `/psicologos/[city]` o `/tatuadores/[city]`.

## 2. Evidencia, método y límites

### Fuentes internas utilizadas

- Inventario completo en [`industries.ts`](../../src/lib/data/industries.ts), plantilla [`/para/[industry]`](../../src/app/para/[industry]/page.tsx), [`sitemap.ts`](../../src/app/sitemap.ts) y [`seo.ts`](../../src/lib/seo.ts).
- Landings comerciales y sus datos: [`barbershop-software-landing.ts`](../../src/lib/data/barbershop-software-landing.ts) y [`salon-software-landing.ts`](../../src/lib/data/salon-software-landing.ts).
- Rutas de apoyo verificadas en [`feature-solutions.ts`](../../src/lib/data/feature-solutions.ts) y [`guides.ts`](../../src/lib/data/guides.ts).
- Publicación condicionada de casos en [`case-studies.ts`](../../src/lib/data/case-studies.ts). El registro actual de caso está en `published: false`; no se deriva de su existencia una autorización nueva para publicarlo.
- Estado del marketplace en [`quality-gate.ts`](../../src/lib/marketplace/quality-gate.ts).
- Se reutilizó la caché local `site-meta.json` del **2 de septiembre** únicamente para dominio, idioma, país y naturaleza B2B SaaS. Su conteo de páginas es histórico; el inventario de esta fase procede del código actual y de HTTP.
- Paquete local Semrush capturado el **3 de septiembre de 2026**, base Chile: `semrush-puragenda/03-keywords/keyword-magic-agenda-online-chile-measurable.csv`, `04-keyword-gap/keyword-gap-puragenda-vs-competitors-chile-selected.csv`, `02-position-tracking/position-tracking-keywords-chile.csv` y `14-summary/limitations.csv`. Son transcripciones previas de interfaz, no un nuevo acceso autenticado. El paquete no está versionado; los únicos datos numéricos empleados quedan reproducidos abajo.
- Lista de funciones verificadas y existencia de clientes aportadas por el propietario en el encargo SEO-015. Son evidencia interna de encaje; no testimonios, métricas de uso ni prueba pública de resultados.

### Qué se midió y qué se infirió

Se comprobaron por HTTP las ocho páginas `/para` el 4 de septiembre: todas respondieron **200**, con title, H1 y canonical propio coherentes con el inventario del código. También se investigaron variantes comerciales en búsquedas web actuales y páginas de proveedores. La clasificación de intención, diferenciación y dificultad relativa es **juicio editorial apoyado por esas fuentes**.

No hay aquí volúmenes mensuales, CPC ni KD medidos por vertical B2B. No hubo herramientas DataForSEO disponibles ni una consulta nueva a Semrush, Google Ads o Search Console. Los resultados web no son un top 10 de Google localizado y reproducible: añadir «Chile» a una consulta no fija la ubicación del buscador. Por ello no se asignan posiciones, cuotas de mercado, autoridad de dominio ni pronósticos de tráfico.

**Demanda 0–5 significa intensidad de señales comerciales observadas, no cantidad de búsquedas.** La presencia de varios proveedores acredita una categoría de oferta y una hipótesis de intención; no cuantifica compradores. La confianza en intención es media, y en el tamaño relativo de la demanda es baja. Una ausencia de datos se registra como **N/D**, nunca como volumen cero.

| Dato Semrush previo, Chile | Volumen reportado | Uso correcto en SEO-015 |
|---|---:|---|
| `sistema de agendamiento online` | 30/mes; KD 25; CPC USD 1,95 | Contexto de la categoría SaaS general, ya cubierta por el pillar. No se reparte entre verticales. |
| `agenda online para clientes` | 20/mes | Contexto general; no prueba demanda de manicure o psicología. |
| `masajes` | 22.200/mes | Excluido del score B2B: búsqueda de un servicio, aunque Semrush la etiquete comercial. |
| `spa` | 18.100/mes | Excluido del score B2B. |
| `veterinaria cerca de mi` | 49.500/mes | Excluido: intención local B2C. |
| Keywords específicas de los nueve candidatos B2B | N/D | El paquete previo no aporta medición utilizable por rubro. |

Las recomendaciones históricas del paquete Semrush sobre marketplace o fases técnicas no se adoptan: prevalecen el alcance y las decisiones cerradas indicadas por el propietario.

### Evidencia de clientes, anonimizada

| Rubro | Evidencia recibida | Consecuencia y límite |
|---|---|---|
| Barbería y peluquería | Un negocio conocido de cada rubro en la lista recibida | Referencia interna; verticales ya resueltos. |
| Manicure | Un negocio real comunicado | Valida encaje inicial. No acredita adopción de todas las funciones, resultados ni autorización de marca. |
| Bienestar | Un negocio real comunicado | Valida una operación concreta, todavía sin flujo detallado aportado. No representa a todo «terapias». |
| Estética | Un negocio real en Argentina | Encaje funcional parcial para esta decisión; no acredita demanda, pagos habilitados o validación comercial chilena. Fuera del marketplace Chile. |
| Psicólogos, kinesiólogos, tatuadores, spa, masajes, veterinarias y clínicas | Sin cliente específico confirmado en el material recibido | Evidencia de cliente = 0; no significa que la empresa no pueda tener otros clientes. No se infiere «masajes» a partir de «bienestar». |

Se omiten nombres, logos, citas y datos identificables de estos clientes del documento. No se contactó a ninguno. Una publicación posterior solo podrá usar evidencia con autorización comprobable y específica; un ejemplo de demo se rotulará como ficticio.

## 3. Auditoría de todos los verticales actuales

El registro contiene **ocho spokes `/para` y dos landings comerciales verticales**. Spa está incluido en estética y «terapeutas» en psicólogos: no son spokes independientes. No existen en ese registro `/para/spa`, `/para/masajes`, `/para/bienestar` ni `/para/veterinarias`.

Titles de la tabla sin el sufijo global `| Puragenda`. Las ocho comprobaciones HTTP tuvieron canonical `https://www.puragenda.cl` + la ruta indicada. Esto no demuestra que Google las haya indexado.

| Ruta / rubro actual | Title actual | H1 actual | Diagnóstico para la expansión |
|---|---|---|---|
| `/para/barberias` | Puragenda para barberías | Puragenda para barberías | Ya funciona como spoke contextual y enlaza al hub comercial. Mantener decisión cerrada. |
| `/para/peluquerias` | Puragenda para peluquerías | Puragenda para peluquerías | Ya separada del hub. «Salón de belleza» también está trabajado en su landing: vigilar frontera con estética. |
| `/para/estetica` | Software de Gestión para Centros de Estética y Spa | Gestión Premium para tu Centro de Estética | Intención comercial amplia y mezcla estética/spa/clínica. Riesgo alto frente a una nueva landing; menciona cabinas y planes de sesiones fuera del conjunto verificado para esta fase. |
| `/para/clinicas` | Software de Agendamiento Médico y Consultas | Agendamiento Médico Confiable e Inteligente | Contenedor de consultas que enlaza psicólogos y kinesiólogos. Riesgo de solapamiento general y expectativas de software médico. La FAQ delimita que no reemplaza una ficha clínica. |
| `/para/psicologos` | Agenda Online para Psicólogos y Terapeutas | Tu agenda de pacientes, clara y disponible 24/7 | Ya compite por agenda/software. «Terapeutas» invade bienestar y otras profesiones. Repartir intención al implementar su hub. |
| `/para/kinesiologos` | Agenda Online para Kinesiólogos en Chile | Más sesiones atendidas, menos tiempo coordinando | Ya cubre reservas, tipos de sesión y equipo. Un hub que repita esto sería redundante; falta prueba diferencial. |
| `/para/manicure` | Agenda Online para Manicure y Nail Studios | Una agenda tan cuidada como cada diseño | Base sectorial útil: retiro, esmaltado, diseños, duración y abonos. Requiere ceder las queries comerciales al nuevo hub. |
| `/para/tatuadores` | Agenda Online para Tatuadores y Estudios | Del primer contacto a una sesión bien coordinada | Mezcla agenda con encargos, adjuntos y revisión de solicitudes. Esa mezcla requiere validación funcional específica antes de multiplicar contenido. |

| Hub actual | Title / H1 en sus datos de contenido | Propiedad de intención |
|---|---|---|
| `/software-agenda-barberias` | Software de agenda para barberías / Software de agenda para barberías | Software, sistema, programa y agenda comercial para barberías. Cerrado. |
| `/software-agenda-peluquerias` | Software de agenda para peluquerías / Software de agenda para peluquerías y salones | Peluquerías, estilistas, corte/color y salón de belleza de foco capilar. Cerrado. |

La plantilla `/para` comparte tres beneficios, FAQ, respuesta rápida, flujo de configuración y CTA; también emite `SoftwareApplication`. Cambiar solo title/H1 no garantizaría separación. Es necesario que el cuerpo responda preguntas diferentes, que el hub concentre evaluación de compra y que el spoke conserve una utilidad contextual propia.

**Hallazgos de alcance de producto:** el copy existente no valida automáticamente una feature. Las menciones a cabinas, planes de sesiones y encargos se documentan como dependencias de revisión, no como funciones demostradas ni como funciones necesariamente inexistentes. Se observó código relacionado con recurrencia, pero esta fase no verifica su disponibilidad completa ni autoriza prometer paquetes. No se corrige ni reabre ninguna fase aquí.

## 4. Intención de búsqueda por candidato

### Familias de variantes a agrupar

Para cada fila se analizaron las seis familias del encargo. Esta tabla es el mapa semántico de targeting; **no representa 54 keywords con volumen medido ni 54 SERP exportadas**. Las consultas ejecutadas que sustentan la decisión se registran en la sección siguiente.

| Vertical | Software para… | Agenda para… | Sistema de reservas para… | Programa para… | Agenda online para… | Software de gestión para… |
|---|---|---|---|---|---|---|
| Manicure | manicuristas / salones de uñas | manicuristas | nail studios / manicuristas | manicure / salón de uñas | manicure / uñas | salones de uñas |
| Psicólogos | psicólogos | psicólogos | consultas de psicología | psicólogos | psicólogos | centros de psicología |
| Kinesiólogos | kinesiólogos | kinesiólogos | centros kinesiológicos | kinesiología | kinesiólogos | centros de kinesiología |
| Tatuadores | tatuadores | tatuadores | estudios de tatuajes | tatuadores | estudios de tatuajes | estudios de tatuajes |
| Estética | centros de estética | centros de estética | centros estéticos | centros de estética | centros de estética | centros de estética |
| Spa | spa | spa | spa | spa | spa | spa |
| Masajes | masajistas | masajistas | centros de masajes | masajistas | masajistas | centros de masajes |
| Bienestar | centros de bienestar / terapeutas | terapeutas | terapias / centros de bienestar | terapeutas | terapeutas | centros de terapias |
| Veterinarias | veterinarias | veterinarias | veterinarias | veterinarias | veterinarias | clínicas veterinarias |

En todos los rubros, «software» y «sistema» suelen llevar a evaluación B2B; «gestión» amplía la expectativa hacia operaciones que pueden exceder agenda. «Programa» es más ambiguo: puede aludir a formación o programación de actividades. «Agenda online» necesita el comprador explícito: «reservar psicólogo online» describe a un paciente, no a quien compra SaaS. «Gratis» exige distinguir prueba de un plan gratuito permanente; no es la keyword principal propuesta.

Manicure, manicura, uñas, nail studio y manicurista pertenecen a **un solo cluster comercial**, sin URLs por sinónimo. En Chile se prioriza «agenda», «reservas» y «horas»; resultados de «turnos» en Argentina solo se usan como contexto regional.

### Búsquedas ejecutadas, resultados y lectura

Selección de consultas exactas realizadas el 4 de septiembre. Los enlaces llevan a fuentes del proveedor, no a páginas de resultados. «Observado» se refiere al contenido devuelto por la búsqueda o lectura, no a una posición de Google. Los mensajes comerciales de terceros no se consideran features verificadas de Puragenda ni prueba de que esos mensajes sean ciertos.

| Rubro | Consultas ejecutadas representativas | Evidencia observada e intención | Exclusión B2C / riesgo |
|---|---|---|---|
| Manicure | `software agenda manicure uñas Chile sistema reservas programa`; `"software" "manicuristas" Chile`; `"sistema de reservas" "manicuristas" Chile`; `programa para manicure agenda` | [AgendaPro Chile](https://agendapro.com/cl/manicure-y-pedicure/software-para-salon-de-manicure-y-pedicure) ofrece landing comercial específica; [Vev](https://vev.co/es/sistema-de-reservas/manicurista) trabaja reserva por enlace. Señal B2B clara. La variante amplia de «programa/manicure» también devuelve productos en portugués; no extrapolar ese mercado a Chile. | «Manicure Concepción», «uñas cerca de mí», diseños de uñas y cursos son otras intenciones. |
| Psicólogos | `software agenda psicólogos Chile sistema reservas programa`; `agenda para psicólogos Chile`; `"programa" "psicólogos" "agenda" Chile` | [Reservo](https://reservo.cl/salud/centro-sicologico/) presenta gestión de centro; [Quiero Agendar](https://www.quieroagendar.cl/agenda-psicologo) una agenda para independientes. Dos necesidades B2B distintas: administración de citas vs suite de gestión. «Programa» también devuelve contenidos académicos ajenos a SaaS. | «Psicólogo online», arancel, Fonasa y atención cercana apuntan al paciente. No captarlos con esta landing. |
| Kinesiólogos | `"software para kinesiólogos" Chile`; `"agenda online" "kinesiólogos" Chile` | [Kibo](https://kibo.cl/) y [Slotium](https://slotium.cl/kinesiologos/) combinan agenda con registro clínico o series de sesiones. Intención B2B, pero expectativa funcional amplia incluso en «agenda». | «Kinesiólogo cerca», rehabilitación y reserva de tratamiento son B2C. No se aprovecha demanda de tratamientos. |
| Tatuadores | `"agenda para tatuadores" Chile`; `"sistema de reservas" "tatuadores" Chile`; `"programa para tatuadores" agenda` | [Agendamelo Chile](https://agendamelo.cl/para/tatuadores) enfoca sitio, portafolio y reservas. [AgendaPro México](https://agendapro.com/mx/tatuajes/software-para-tatuadores) confirma vocabulario comercial regional, sin probar volumen chileno. | Diseños, artistas, programas de dibujo y cursos contaminan variantes amplias. No confundir consulta de diseño con sesión reservable. |
| Estética | `"software para centros de estética" Chile`; `"agenda online" "centros de estética" Chile` | [AgendaPro Chile](https://agendapro.com/cl/centros-de-estetica/software-para-centros-de-estetica), [Neox](https://neoxsistemas.com/cl/neox-esteticas) y [Turnify](https://turnify.cl/agenda-para-centro-estetica) cubren de gestión integral a reservas por servicio/profesional. Hay espacio de mensaje acotado, no evidencia de competencia baja. | Tratamientos, clínicas estéticas y centros cercanos son B2C. Excluir gestión clínica y promesas sobre aparatología. |
| Spa | `"software para spa" Chile`; `"sistema de reservas" "spa" Chile software`; `"programa para spa" reservas` | [SeGestiona](https://segestiona.com/software-para-spa) destaca agenda por terapeuta/cabina y caja; [WeiBook Chile](https://weibook.co/es-cl/software-para-spa) agrupa estética y spa. La oportunidad depende de recursos compartidos, no de cambiar «estética» por «spa». | Ofertas, day spa, hoteles y reservas de experiencias son B2C. «SpA» también puede designar una sociedad. |
| Masajes | `"software para masajistas" Chile`; `agenda online para masajistas`; `"software de gestión" "masajes"` | [TurnoBoost](https://www.turnoboost.com/agenda-online-masajistas), de Argentina, trata duraciones y señas; [Zenoti](https://www.zenoti.com/es/salon-management-software/massage) apunta a gestión de centros. Señal regional; la demanda B2B chilena queda menos sustentada. | Tipos de masaje, beneficios y masajes cerca son informacionales/B2C. La landing no debe ofrecer consejo terapéutico. |
| Bienestar / terapias | `"agenda online" "terapias" software`; `sistema de reservas para terapias holísticas`; `"software" "bienestar" "reservas" Chile`; `"agenda para terapeutas" Chile software` | [hori](https://hori.cl/salud-bienestar) agrupa salud/bienestar; [Lexa](https://lexaterapias.com/) se dirige a centros clínicos multidisciplinares. La SERP muestreada muestra una categoría heterogénea; un cliente real no resuelve esa ambigüedad. | No equiparar terapia complementaria, psicología, terapia ocupacional, clases grupales y wellness empresarial. |
| Veterinarias | `"software para veterinarias" Chile`; `"agenda para veterinarias" Chile` | [GVET](https://www.gvet.cl/) plantea gestión integral; [NEVE](https://agenda.nevebusiness.cl/agenda/veterinarias) incluye mascota, controles e insumos aun en una página de agenda. Señal B2B fuerte, encaje insuficiente con el alcance verificado. | Veterinaria cerca de mí, urgencias, vacunas y consulta de mascota son B2C. |

Como control de mezcla, los resultados de `"agenda online" "kinesiólogos" Chile` también devolvieron centros de atención y un directorio de profesionales, mientras la búsqueda amplia de «programa» para psicólogos devolvió formación. No todas las variantes son intercambiables aun dentro de un rubro.

## 5. Competencia y oportunidad de mensaje

Cinco comparadores útiles para la próxima tanda; se evalúa su posicionamiento declarado, no el funcionamiento de sus productos ni su autoridad de dominio:

| Proveedor / fuente | Qué eleva la expectativa del comprador | Oportunidad realista para Puragenda |
|---|---|---|
| [AgendaPro, uñas](https://agendapro.com/cl/manicure-y-pedicure/software-para-salon-de-manicure-y-pedicure) | Oferta amplia de gestión, cobros y comunicación | Explicar la reserva concreta de un servicio de uñas. No competir prometiendo todos sus módulos. |
| [Vev, manicuristas](https://vev.co/es/sistema-de-reservas/manicurista) | Agenda por enlace dirigida a una profesión | La agenda genérica ya está cubierta por competidores: el valor editorial debe estar en retiro, opción, duración y profesional. |
| [Turnify, estética](https://turnify.cl/agenda-para-centro-estetica) | Servicios y profesionales en una página de reservas | Diferenciar mediante una demo de configuración y sus límites, no con «menos mensajes» como único argumento. |
| [Reservo, psicología](https://reservo.cl/salud/centro-sicologico/) | Operación de centro y administración económica | Dirigirse al profesional que necesita organizar citas; delimitar qué conserva en otra herramienta. |
| [Quiero Agendar, psicólogos](https://www.quieroagendar.cl/agenda-psicologo) | Oferta para independientes que incluye funciones adicionales a la agenda | La sencillez por sí sola no es diferenciadora. Mostrar servicios, bloqueos y recordatorios reales, con respuesta explícita sobre ficha clínica y videollamada. |

No se recomiendan comparativas nominales nuevas ni afirmaciones de superioridad, precios de terceros, ahorros o resultados cuantificados. La diferenciación disponible es **calidad de la explicación y ajuste del caso de uso**, no exclusividad funcional demostrada.

## 6. Canibalización y propiedad de cada intención

Hay **solapamiento semántico observado** en el copy y **riesgo prospectivo** si se añaden hubs. No se ha demostrado canibalización de rankings: faltan pares query/página de Search Console. Las nuevas URLs aún no existen.

| Rubro con spoke actual | ¿Crear `/software-agenda-*`? | Reparto recomendado |
|---|---|---|
| Barberías | Ya existe; mantener | Hub = compra de software. Spoke = Puragenda aplicado al local. No reabrir. |
| Peluquerías | Ya existe; mantener | Hub = peluquería/corte/color. Reservar «salón de belleza» capilar aquí, sin nueva URL sinónima. |
| Manicure | **Sí, P0** | Hub posee software/agenda/sistema/programa para manicure, uñas y nail studios. Spoke explica cómo se configura y usa Puragenda en el estudio. |
| Estética | **Sí, P1** | Hub posee reservas para centros de estética no clínica. Spoke presenta el contexto del centro; retirar allí el intento de abarcar software integral de estética y spa cuando se implemente el hub. |
| Psicólogos | **Sí, P1 acotado** | Hub posee software de agenda/reservas para psicólogos. Spoke explica la organización de la consulta con Puragenda, sin perseguir «terapeutas» genérico. |
| Kinesiólogos | **No todavía, P2** | Mantener el spoke como destino existente. Solo proponer `/software-agenda-kinesiologos` después de validar una necesidad administrativa específica. |
| Tatuadores | **No todavía, P2** | Mantener el spoke. `/software-agenda-tatuadores` queda como candidato futuro, sujeto a separar presupuesto/encargo de cita confirmada. |
| Clínicas | **No, NO HACER en esta expansión** | No añadir `/software-agenda-clinicas`. El spoke es contexto general de organización de consultas, no propietario de software clínico ni de cada especialidad. |

### Contrato de contenido para las tres parejas seleccionadas

| Página | Title propuesto, antes del sufijo global | H1 propuesto | Pregunta que debe resolver |
|---|---|---|---|
| `/software-agenda-manicure` | Software de agenda para manicure y uñas | Software de agenda para manicure y nail studios | ¿Este sistema sirve para mi catálogo y mi equipo, y cómo se reserva? |
| `/para/manicure` | Puragenda para manicuristas y nail studios | Así organiza sus citas un nail studio con Puragenda | ¿Cómo adapto Puragenda al día de trabajo de mi estudio? |
| `/software-agenda-estetica` | Software de agenda para centros de estética | Sistema de reservas para centros de estética | ¿Puedo coordinar servicios y profesionales con esta agenda? |
| `/para/estetica` | Puragenda para centros de estética | Cómo organizar las citas de tu centro con Puragenda | ¿Cómo ordenar el catálogo y la disponibilidad de este centro? |
| `/software-agenda-psicologos` | Software de agenda para psicólogos | Agenda online para organizar tu consulta de psicología | ¿Qué resuelve este software sobre citas y qué queda fuera? |
| `/para/psicologos` | Puragenda para consultas de psicología | Cómo organizar las citas de tu consulta con Puragenda | ¿Cómo separar servicios, jornadas y bloqueos en mi consulta? |

El hub tendrá evaluación de producto, ejemplo operativo completo, funciones demostrables, objeciones, FAQ comerciales y enlaces a planes/demo. El spoke conservará una explicación contextual breve de configuración y navegación al hub. No duplicar el mismo bloque de respuesta, flujo completo o batería de FAQ en ambos. No llenar el spoke de referencias a que es una «landing aparte»: explicar su utilidad al lector.

Ambas páginas conservarían canonical propio **solo si el contenido queda sustancialmente diferenciado**. Un canonical cruzado no sustituye la separación de intención. No se proponen redirecciones o `noindex` automáticos de los spokes. Si no puede justificarse contenido independiente para dos URLs, no publicar el segundo documento hasta resolverlo.

Fronteras adicionales:

- Uñas/manicure/nail studio → un hub, sin `/software-agenda-unas` adicional.
- Corte y color → peluquerías. Catálogo de faciales, cejas y pestañas → estética. Un salón mixto puede tener enlaces contextuales a ambas necesidades, no dos páginas que prometan lo mismo.
- Psicología → psicólogos. Rehabilitación → kinesiología. «Bienestar» no debe apropiarse de todas las profesiones sanitarias.
- Spa y masajes tienen cobertura contextual actual en estética. Eso no justifica tres hubs con texto intercambiable.

## 7. Matriz de prioridad 0–5

Escala ordinal, **siete dimensiones con igual peso**; total máximo 35. El total ayuda a ordenar, no calcula ROI ni probabilidad de posicionamiento. No se puntúan barbería/peluquería de nuevo porque están cerradas; se incluye clínicas por ser un vertical actual auditado.

- **Demanda (D):** 0 sin señales encontradas; 1 señales aisladas; 2 señales regionales/ambiguas; 3 varias ofertas específicas; 4 convergencia de varias fuentes B2B chilenas; 5 exigiría además demanda local cuantificada suficiente. Ningún candidato recibe 5 sin esa medición.
- **Intención comercial (I):** 0 ajena a compra; 1–2 muy ambigua; 3 mixta; 4 compra reconocible; 5 categoría B2B clara en las variantes de software seleccionadas. No significa que todas las variantes sean B2B.
- **Product fit (F):** 0 incompatible; 1 requiere capacidades centrales no verificadas; 2 encaje parcial; 3 encaje con restricciones relevantes; 4 flujo de citas cubierto; 5 flujo especialmente alineado con el conjunto verificado.
- **Diferenciación (Di):** 0 sin contenido propio; 1–2 principalmente genérico; 3 flujo sectorial explicable; 4 varios puntos específicos demostrables; 5 evidencia única y difícil de replicar. No se atribuye exclusividad a una función común.
- **Competencia abordable (C):** 0 sin vía identificable; 1 suites especializadas con gran distancia de alcance; 2 oferta intensa y brecha funcional; 3 oportunidad acotada con competencia visible; 4–5 requerirían evidencia adicional de accesibilidad orgánica. No equivale a KD.
- **Evidencia real (E):** 0 sin cliente confirmado; 1 señal indirecta; 2 cliente confirmado fuera del mercado principal; 3 cliente comunicado en el contexto objetivo, sin auditoría de uso; 4 flujo documentado y contrastado; 5 además evidencia pública autorizada. No hay casos nuevos con 4–5.
- **GEO/AEO (G):** 0 sin respuesta propia; 1–2 respuesta genérica/ambigua; 3 preguntas sectoriales útiles; 4 respuestas de compra concretas y delimitables; 5 además prueba pública autorizada y sustento distintivo. Potencial editorial, no presencia medida en motores de respuesta.

| Vertical | D | I | F | Di | C | E | G | Total /35 | Prioridad |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Manicure / uñas / nail studio | 3 | 5 | 5 | 4 | 3 | 3 | 4 | **27** | **P0 — tanda próxima, 1.º** |
| Centros de estética no clínica | 4 | 5 | 4 | 4 | 2 | 2 | 4 | **25** | **P1 — tanda próxima, 2.º** |
| Psicólogos, agenda administrativa | 4 | 5 | 4 | 3 | 2 | 0 | 4 | **22** | **P1 — tanda próxima, 3.º** |
| Bienestar / terapias | 2 | 3 | 4 | 2 | 3 | 3 | 2 | **19** | **P2 — delimitar subsegmento** |
| Masajes | 2 | 4 | 4 | 3 | 3 | 0 | 3 | **19** | **P2 — validar Chile y uso** |
| Tatuadores | 2 | 4 | 3 | 3 | 3 | 0 | 3 | **18** | **P2 — validar flujo** |
| Kinesiólogos | 3 | 5 | 3 | 3 | 1 | 0 | 3 | **18** | **P2 — demanda administrativa acotada** |
| Spa como gestión dedicada | 3 | 5 | 2 | 2 | 1 | 0 | 3 | **16** | **NO HACER ahora** |
| Clínicas, software general | 4 | 5 | 2 | 1 | 1 | 0 | 2 | **15** | **NO HACER ahora** |
| Veterinarias | 4 | 5 | 1 | 1 | 1 | 0 | 2 | **14** | **NO HACER ahora** |

Reglas de clasificación: **P0 ≥27**, con F≥4, Di≥3 y E≥3; **P1 22–26**, con F≥4 y Di≥3; **P2 17–21** para investigación previa; **NO HACER ≤16** o dependencia central de funciones no verificadas. Los límites de salud, privacidad, contenido único y canibalización prevalecen sobre el total. P1 no implica publicación automática.

El score de clínicas reutiliza la evidencia de suites de salud/centros encontrada al investigar psicología y kinesiología; no presupone un estudio independiente de demanda médica general.

**Sensibilidad:** variando D en ±1, manicure queda 26–28, estética 24–26 y psicología 21–23; ninguno de los candidatos P2 supera a psicología. La selección de tres es más robusta que la etiqueta exacta P0/P1. En empate manicure/estética se prioriza manicure por F=5 y evidencia más próxima al mercado. Si la validación futura no sostiene el contenido de psicología, se reduce la tanda a dos; no se sustituye automáticamente por una página genérica de terapias.

## 8. Brief de las tres landings seleccionadas

Los flujos siguientes son **escenarios editoriales propuestos**, no entrevistas ya realizadas ni descripciones del uso de un cliente concreto. Se basan en funciones verificadas por el propietario y en necesidades sectoriales observadas en las fuentes. Las duraciones y precios reales los define cada negocio; ningún ejemplo prescribe tiempos de atención clínica.

### 8.1 Manicure — primera implementación

- **URL:** `/software-agenda-manicure`. **Spoke:** `/para/manicure`.
- **Keyword/intención principal:** `software de agenda para manicure`; evaluar reservas para manicuristas, salones de uñas y nail studios. Secundarias: sistema de reservas para manicuristas, agenda online uñas, programa para salón de uñas.
- **Comprador:** manicurista independiente o responsable de un estudio con varias profesionales.
- **Ángulo:** reservar el servicio correcto con su duración y precio antes de ocupar la agenda de una profesional. La distinción entre esmaltado, retiro, mantenimiento y diseños importa más que una promesa genérica de «tener agenda online».
- **Flujo:** definir catálogo → separar retiro/esmaltado/diseño según lo ofrecido → asignar duración, precio y opciones compatibles → asignar profesionales y horarios → publicar enlace → recibir reserva y abono cuando esté configurado → recordatorio email → gestionar cambios y consultar historial de citas.
- **Problemas específicos:** retiro omitido al reservar; diseño largo en un bloque corto; clienta que busca una técnica no ofrecida por todas; mensajes de disponibilidad durante la atención; cancelación de un bloque largo.
- **Funciones verificadas relevantes:** servicios, opciones, duración/precio, profesionales, horarios individuales, bloqueos, reservas online, depósitos Mercado Pago, email, cancelación/reagendamiento, clientes/historial, enlace/widget/iframe y marca.
- **Terminología:** manicurista, nail studio, esmaltado, retiro, mantenimiento, diseño, abono y seña. Son ejemplos de catálogo, no técnicas ejecutadas por Puragenda.
- **Objeciones:** «¿La clienta elegirá bien?» → mostrar un catálogo comprensible; «¿sirve si trabajo sola?» → enlazar planes vigentes; «¿el retiro se suma solo?» → demostrar la configuración de opciones antes de afirmarlo; no prometer combinaciones ilimitadas o inferencias automáticas.
- **Diferenciación frente a agenda genérica:** ejemplo visible de cómo una decisión del catálogo cambia la duración/precio y la disponibilidad del profesional adecuado. Preparar demo ficticia claramente rotulada; no reutilizar fotos o nombres de clientes.
- **FAQ potenciales:** ¿Cómo separo un esmaltado de un servicio con retiro? ¿Puedo configurar opciones con tiempo o precio diferente? ¿Cada manicurista tiene sus horarios? ¿Puedo pedir un abono antes de la cita? ¿Puedo compartir la reserva en Instagram? ¿La clienta puede reagendar y qué recordatorio recibe?
- **Enlaces salientes:** `/para/manicure`, `/sistema-de-agendamiento-online`, `/funciones/reservas-online-con-abono`, `/funciones/agenda-multiples-profesionales`, `/guias/cobrar-abonos-reservas-online`, `/pricing`, `/demo` y `/register`.
- **Enlaces entrantes futuros:** `/para/manicure`, `/soluciones` y el pillar; desde estética solo cuando exista una relación editorial útil. Ancla comercial hacia el hub; ancla de aplicación de Puragenda hacia el spoke.
- **Riesgos:** copiar peluquerías; competir con ella por «salón de belleza»; inventar inventario de insumos o comisiones; publicar al cliente conocido sin permiso; convertir la opción «retiro» en un automatismo no demostrado.
- **Puerta de calidad:** demostrar con datos ficticios dos servicios y una opción, con asignación/horarios de profesional; revisar el contenido de las dos URLs como pareja. Un cliente real aporta confianza interna, pero no sustituye esa demostración.

### 8.2 Estética — segunda implementación

- **URL:** `/software-agenda-estetica`. **Spoke:** `/para/estetica`.
- **Keyword/intención principal:** `software de agenda para centros de estética`; sistema de reservas para centro estético, limitado a organización de citas.
- **Comprador:** centro pequeño o equipo de estética no clínica cuyo recurso de disponibilidad sea el profesional. El nombre del sector no habilita promesas sobre medicina estética.
- **Ángulo:** coordinar un catálogo de faciales, cejas, pestañas u otros servicios ofrecidos por el negocio, con tiempos y profesionales distintos, y una reserva que respete su marca.
- **Flujo:** publicar catálogo por servicio → asignar quién puede realizar cada atención → definir jornadas/bloqueos → clienta selecciona servicio/profesional/hora → abono cuando corresponda → email y gestión posterior de la cita.
- **Problemas específicos:** servicios de distinta extensión en una misma jornada; profesionales con especialidades diferentes; confusión entre precio completo y abono; experiencia de reserva distinta de la identidad visual del centro.
- **Funciones relevantes:** duración/precio/opciones, equipo, horarios individuales, bloqueos, clientes e historial de citas, abonos Mercado Pago, recordatorios email, cambios/cancelación y marca/widget/iframe.
- **Terminología:** centro estético, profesional, facial, cejas, pestañas, servicio, duración, abono. «Cabina», «aparatología» y «paquete de sesiones» son preguntas de alcance, no capacidades prometidas.
- **Objeciones:** «¿evita que dos profesionales usen la misma cabina?» → no prometer control de recurso compartido sin verificación; «¿gestiona bonos o tratamientos completos?» → no atribuirlo al conjunto validado; «¿es una ficha clínica?» → no.
- **Diferenciación frente a agenda genérica:** catálogo con elegibilidad por profesional y experiencia de marca, explicado mediante dos tipos de servicio realmente distintos. No copiar el texto de uñas ni ampliar artificialmente el alcance a spa.
- **FAQ potenciales:** ¿Puedo tener servicios con distinta duración? ¿Cómo asigno servicios a cada profesional? ¿Qué ocurre con una jornada bloqueada? ¿La clienta ve precio y abono? ¿Puedo integrar la agenda con mi web? ¿La agenda controla cabinas o sustituye una ficha clínica?
- **Enlaces salientes:** `/para/estetica`, `/sistema-de-agendamiento-online`, `/funciones/agenda-multiples-profesionales`, `/funciones/reservas-online-con-abono`, `/caracteristicas`, `/pricing`, `/demo` y `/register`. Enlace a manicure solo para el subcaso de uñas.
- **Enlaces entrantes futuros:** spoke de estética, `/soluciones` y pillar. No modificar la propiedad de queries del hub cerrado de peluquerías.
- **Riesgos:** solapamiento con peluquería, uñas, spa y masajes; heredar promesas de cabinas del spoke; usar el cliente argentino como prueba del mercado chileno; afirmar seguridad/regulación o resultados estéticos sin base.
- **Puerta de calidad:** al implementar la pareja, revisar las menciones actuales a cabinas, planes y clínica, contrastarlas con evidencia de producto y acotar el mensaje. La demo debe funcionar sin requerir recursos compartidos. No se publica una solución «integral» por disponer de agenda.

### 8.3 Psicólogos — tercera implementación, alcance administrativo

- **URL:** `/software-agenda-psicologos`. **Spoke:** `/para/psicologos`.
- **Keyword/intención principal:** `software de agenda para psicólogos`; secundarias agenda online para psicólogos y sistema de reservas para consulta de psicología. Evitar «software clínico de psicología» como objetivo.
- **Comprador:** profesional independiente o equipo que busca gestionar citas y mantiene su documentación clínica en el sistema que corresponda.
- **Ángulo:** organizar horarios de consulta, distintos tipos de cita y comunicaciones de reserva, explicando de forma visible el límite entre agenda y ficha clínica.
- **Flujo:** profesional define servicios y duración → establece horario de consulta y bloques no disponibles → paciente elige servicio y hora → abono si el profesional lo configura → recordatorio por email → cancelación/reagendamiento e historial administrativo de visitas.
- **Problemas específicos:** diferenciar primera cita y seguimiento cuando la práctica lo requiera; separar horarios de consulta de otros compromisos; coordinar reprogramaciones; identificar a qué profesional corresponde una cita. El profesional decide tiempos y modalidad; no se recomiendan frecuencias de tratamiento.
- **Funciones relevantes:** reservas, servicios y duración/precio, horarios/bloqueos, equipo, Google Calendar, historial de citas y datos de contacto, email, abonos y enlaces de gestión. Consultar el alcance vigente de Google Calendar sin prometer sincronización bidireccional o videollamada automática no comprobadas.
- **Terminología:** consulta, profesional, paciente, cita, primera atención, seguimiento, disponibilidad y reprogramación. No convertir «historial» en registro clínico.
- **Objeciones:** «¿reemplaza mi ficha clínica?» → no; «¿crea una sala de videollamada?» → no afirmarlo; «¿reserva automáticamente todas las semanas?» → no prometer recurrencia por no estar verificada en esta fase; «¿qué datos necesito pedir?» → solo información administrativa necesaria para la cita en los ejemplos.
- **Diferenciación frente a agenda genérica:** ejemplo específico de primera cita/seguimiento y bloqueos, con una tabla de qué organiza la agenda y qué permanece en el sistema clínico. La transparencia de alcance permite evaluar el producto sin atribuirle prestaciones médicas.
- **FAQ potenciales:** ¿Puragenda reemplaza una ficha clínica? ¿Puedo definir duraciones distintas para tipos de cita? ¿Cada psicólogo tiene horario propio? ¿Cómo se cancelan o reagendan las citas? ¿Los recordatorios son por email? ¿Cómo se relaciona la agenda con Google Calendar? ¿Puedo solicitar abono por la cita?
- **Enlaces salientes:** `/para/psicologos`, `/sistema-de-agendamiento-online`, `/funciones/agenda-google-calendar`, `/funciones/reservas-online-con-abono`, `/funciones/agenda-multiples-profesionales`, `/politica-de-privacidad`, `/pricing`, `/demo` y `/register`.
- **Enlaces entrantes futuros:** spoke de psicólogos, `/soluciones`, pillar y contexto administrativo de `/para/clinicas`. No dirigir aquí consultas genéricas de bienestar ni consultas B2C de pacientes.
- **Riesgos:** cero evidencia de cliente específico; comparación con suites clínicas; promesas sobre cumplimiento, confidencialidad absoluta, videollamadas, boletas o resultados de salud. Una política de privacidad enlazada no constituye una certificación.
- **Puerta de calidad:** revisión de todos los claims de salud y demo con datos ficticios exclusivamente administrativos. Validar antes de publicar que el contenido tiene utilidad propia frente al spoke; si depende de prestaciones clínicas para vender, posponerlo.

## 9. Contenido posible y razones para posponer los demás rubros

### Bienestar / terapias — P2, primera investigación posterior

**Flujo posible:** seleccionar una sesión individual definida por el negocio → profesional → horario → abono → recordatorio email → cambio de cita. **Problemas:** actividades con nombres y duraciones distintas, pausas entre atenciones y mezcla de profesionales. **Funciones aplicables:** servicios, horarios, bloqueos, reservas, marca, abonos e historial de citas. **Terminología:** sesión individual, facilitador/profesional, modalidad y disponibilidad, ajustada al subsegmento finalmente validado.

**Objeciones:** gestión de talleres, cupos grupales, membresías, planes recurrentes y fichas terapéuticas no están verificadas por este encargo. **FAQ posibles:** ¿puedo separar servicios y duraciones?, ¿cada profesional gestiona su horario?, ¿puedo pedir abono?, ¿cómo se reserva una sesión individual?

**Por qué no entra:** la prueba de cliente valida encaje interno, pero no documenta todavía una necesidad que diferencie esta landing de estética, psicología o una agenda genérica. «Terapias» en las fuentes también significa centros clínicos. **Diferenciador pendiente:** un flujo operativo del subsegmento real, sin promesas sanitarias. URL futura orientativa `/software-agenda-bienestar`; no hay spoke propio actual y no se recomienda crear ambos por obligación. Primero documentar el flujo del cliente mediante material interno autorizado, sin publicarlo. No afirmar que se realizó una entrevista.

### Masajes — P2

**Flujo posible:** tipo y duración de masaje → profesional → horario → abono y recordatorio. **Problemas:** duraciones variables, preparación del espacio y atención sin interrupciones. **Funciones:** catálogo, duración/precio, horarios, bloqueos manuales, email y depósitos. **Terminología:** masajista, sesión, duración y pausa; sin explicar beneficios de salud. **Objeciones:** desplazamientos, reserva de camillas y atención simultánea requieren capacidades no demostradas. **FAQ:** ¿puedo separar duraciones?, ¿cómo bloqueo tiempo entre citas?, ¿puedo solicitar abono?, ¿permite administrar una camilla compartida?

**Diferenciación potencial:** organizar el tiempo entre atenciones mediante bloqueos explícitos, sin prometer buffers automáticos. **Por qué no entra:** no hay cliente específico confirmado ni volumen B2B chileno; buena parte de la señal es regional y el contenido se cruza con estética/bienestar. URL futura `/software-agenda-masajes`, sin spoke actual. Solo reconsiderar con un flujo local específico que no reproduzca otra landing.

### Tatuadores — P2

**Flujo posible:** conversación de diseño/cotización fuera del alcance validado → servicio y duración acordados → reserva con un artista → abono → recordatorio y gestión de cambios. **Problemas:** presupuestar antes de saber la duración, sesiones largas, capacidad por artista y referencias de diseño. **Funciones utilizables:** servicios, duración/precio, profesionales, bloqueos, abonos y email. **Terminología:** artista, estudio, sesión, diseño, cotización y seña.

**Objeciones:** portafolio, adjuntos, revisión de encargo, presupuesto variable y consentimientos no se deben trasladar desde el copy actual sin verificación del recorrido. **FAQ:** ¿puedo reservar una sesión ya presupuestada?, ¿cada artista tiene su agenda?, ¿cómo configuro un abono?, ¿es la solicitud de diseño lo mismo que una cita confirmada?

**Diferenciación potencial:** explicar la frontera entre evaluación de proyecto y sesión ya acordada. **Por qué no entra:** hoy no se dispone de cliente específico ni prueba de ese flujo completo; el spoke ya promete encargos. Hacer otro hub de horarios/abonos sería repetitivo o dependería de promesas fuera del alcance. Candidato futuro `/software-agenda-tatuadores`, relacionado con `/para/tatuadores`.

### Kinesiólogos — P2

**Flujo acotado:** reservar evaluación o sesión definida por el profesional → agenda del kinesiólogo → recordatorio y reprogramación. **Problemas:** visitas repetidas, duraciones distintas y coordinación de equipo. **Funciones verificadas útiles:** servicios, horarios, equipo, bloqueos, reservas y comunicación de citas. **Terminología:** evaluación, sesión, control y agenda del profesional, exclusivamente organizativa.

**Objeciones:** paquetes con saldo, ciclos completos, ficha kinésica, evolución, recursos compartidos y documentación de reembolso no forman parte de la promesa autorizada. [Kibo](https://kibo.cl/) y [Slotium](https://slotium.cl/kinesiologos/) ilustran expectativas superiores a agenda. **FAQ:** ¿puedo separar evaluación y otra sesión?, ¿cada kinesiólogo tiene horario?, ¿se pueden reagendar citas?, ¿sustituye ficha clínica o administra paquetes?

**Diferenciación potencial:** organizar tipos de cita para un centro que ya dispone de sistema clínico. **Por qué no entra:** sin caso real ni evidencia de compradores que busquen solo esa capa administrativa, el hub sería demasiado parecido al spoke y a psicólogos. Candidato futuro `/software-agenda-kinesiologos`; mantener `/para/kinesiologos` como destino existente.

### Spa — NO HACER una landing dedicada ahora

**Flujo habitual a validar:** servicio/ritual → terapeuta y recurso físico → horario → reserva → posible bono o paquete. **Problema específico:** puede haber disponibilidad del profesional pero no de cabina, equipo o espacio compartido. **Funciones de Puragenda aprovechables:** servicios, profesionales, duración, horarios y abonos; esto cubre citas simples, no demuestra el flujo de recursos. **Terminología:** spa, terapeuta, cabina, ritual, bono; las tres últimas no implican soporte funcional.

**Objeciones/FAQ:** ¿controla cabinas compartidas?, ¿permite reservas en pareja?, ¿administra bonos y paquetes?, ¿evita solapamientos entre recursos? No hay respuesta afirmativa verificada para esas necesidades. **Diferenciación necesaria:** precisamente recursos o un subcaso muy delimitado. **Razón para no crear `/software-agenda-spa`:** sin esa evidencia, sería una copia de estética con expectativas mayores. Cubrir solo citas simples en el contexto pertinente; reconsiderar si cambia la evidencia, no por demanda B2C de spa.

### Veterinarias — NO HACER con el alcance verificado

**Flujo sectorial:** tutor y mascota → atención → profesional → cita → registro/seguimiento específico de mascota. **Problemas:** varias mascotas por tutor, controles, vacunas e historial por animal. [GVET](https://www.gvet.cl/) y [NEVE](https://agenda.nevebusiness.cl/agenda/veterinarias) muestran esas expectativas. **Funciones genéricas aprovechables:** reservas, servicios, profesionales y email; no bastan para demostrar el flujo sectorial.

**Terminología:** tutor, mascota, consulta, control. **Objeciones/FAQ:** ¿puedo separar mascotas de un mismo tutor?, ¿existe ficha por animal?, ¿hay recordatorios de vacunas?, ¿se gestionan urgencias? No afirmar soporte no verificado. **Diferenciación ausente:** no se acredita modelo de mascota/tutor ni funciones veterinarias. **Razón para no crear `/software-agenda-veterinarias`:** intención comercial fuerte con encaje insuficiente. No usar tráfico de «veterinaria cerca» para cambiar la decisión.

### Clínicas y otras profesiones sanitarias — inventario auditado, sin expansión

**Flujo administrativo cubrible:** tipo de consulta → profesional → cita → aviso/reprogramación. **Necesidades que exceden agenda:** ficha clínica, documentación, consentimientos, interoperabilidad, facturación especializada y operación médica. **FAQ útiles en el contexto actual:** ¿qué organiza la agenda?, ¿qué debe mantenerse en otro sistema?, ¿cómo se asigna profesional?

No crear un hub general de software clínico ni nuevas especialidades por sustitución de sustantivos. La terminología se limitaría a consulta, cita, profesional y disponibilidad. El encaje parcial no justifica una promesa de gestión integral. Otros candidatos, como cejas/pestañas, pueden ilustrar el catálogo de estética; no se añaden como landings sin evidencia independiente de demanda y contenido.

## 10. GEO/AEO y prueba de calidad editorial

Potencial de respuestas por seleccionado:

| Hub | Pregunta de comprador que debe poder contestar por sí sola | Evidencia que hará útil la respuesta |
|---|---|---|
| Manicure | ¿Cómo organizo reservas cuando retiro y diseño necesitan tiempos diferentes? | Ejemplo rotulado de servicios/opciones, duración/precio y profesional elegible. |
| Estética | ¿Cómo coordino servicios de distintas profesionales en un centro? | Ejemplo del catálogo y horarios; límite explícito de recursos compartidos. |
| Psicólogos | ¿Puedo usar una agenda de citas conservando mi ficha clínica en otra herramienta? | Explicación verificable de servicios, bloqueos, avisos y separación de registro clínico. |

La siguiente implementación debería ofrecer respuestas breves y autosuficientes, seguidas de pasos verificables, enlaces a la función y FAQ visibles específicas. Mantener nombre Puragenda, alcance B2B y fecha de revisión coherentes con las páginas existentes. No inventar testimonios, estadísticas, credenciales o resultados para aumentar citabilidad.

No se ha medido que ChatGPT, Google AI Overviews, Perplexity o Bing citen estas páginas. El score GEO/AEO evalúa la posibilidad de producir respuestas útiles, no garantiza extracción, citas ni resultados enriquecidos. La fase no necesita reabrir structured data, robots o entidad corporativa.

Puerta editorial común para una futura publicación:

1. Un comprador y una intención propietarios de la URL, con frontera documentada frente al spoke y verticales vecinos.
2. Al menos un recorrido completo demostrable y problemas específicos del rubro; si solo cambia el sustantivo respecto de barberías, no publicar.
3. Cada afirmación del producto respaldada por función verificada o demo. Enlazar precios vigentes sin inventar planes ni copiar condiciones históricas.
4. Ningún claim sobre recordatorios WhatsApp, SMS, app nativa, comisiones, prestaciones clínicas o cumplimiento no verificado. Compartir un enlace por WhatsApp no equivale a enviar recordatorios automáticos por ese canal.
5. En salud: solo agenda, reservas, organización, administración y comunicación de citas. Sin consejos clínicos, resultados sanitarios ni uso de datos clínicos reales en ejemplos.
6. Title, H1, cuerpo y FAQ distintos entre hub/spoke; enlaces relevantes y destinos existentes. No enlazar futuros candidatos como si ya estuvieran publicados.

## 11. Orden de implementación y evaluación futura

| Orden | Trabajo propuesto para una fase posterior | Criterio de salida |
|---|---|---|
| 1 | Hub manicure y ajuste contextual de su spoke en la misma entrega | Catálogo específico demostrado; intención comercial concentrada en el hub; sin social proof no autorizado. |
| 2 | Hub estética y ajuste de su spoke | Mensaje no clínico, sin dependencia de cabinas/paquetes no verificados; diferencia clara respecto de peluquería y manicure. |
| 3 | Hub psicólogos y ajuste de su spoke | Recorrido administrativo útil; límites clínicos visibles; sin promesas sanitarias ni cumplimiento supuesto. |
| Después, fuera de esta tanda | Investigar primero el subsegmento real de bienestar, luego masajes/tatuadores/kinesiología según evidencia nueva | Flujo específico, señal B2B local y separación de intención suficientes antes de aprobar otra URL. |

Antes de redactar la implementación, si se dispone de acceso, recopilar volúmenes Chile y queries/páginas de Search Console de los tres clusters; pueden refinar el orden sin reabrir fases cerradas. La falta de esas métricas no se disfraza de demanda cero. Si hay pocas impresiones, no concluir ausencia de mercado con una ventana corta.

Después de una publicación futura, evaluar por cluster B2B: impresiones, clics, páginas que reciben cada query y conversiones reales mediante la instrumentación ya existente. Comparar hub y spoke para detectar alternancia recurrente en la misma intención. Considerar consolidación editorial si el hub no aporta contenido diferente. No crear nuevos eventos ni modificar analytics durante SEO-015.

**Resultado de esta fase:** inventario de ocho spokes y dos hubs; nueve candidatos mínimos más clínicas auditados; mapa de intención y solapamientos; matriz reproducible; tres briefs y orden propuesto. Solo documentación. Marketplace desactivado para indexación, SEO-001–014 cerradas y nueva implementación pendiente de otra fase.
