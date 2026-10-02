# Ritual · inventario completo de copy y configuración pública

La tabla separa el texto de marca editable del dato canónico de Puragenda, el copy técnico y los nombres heredados. Una intención pública tiene una sola fuente canónica: la pausa vive en sensorial.*; copy.pauseTitle y copy.pauseBody solo se leen durante la migración.

| FIELD | DEFAULT | RENDERER | EDITOR | CLASSIFICATION |
| --- | --- | --- | --- | --- |
| displayName | "" | Logo textual, footer | El espacio | BRAND |
| brandEyebrow | Un espacio para bajar el ritmo | Hero | Portada | BRAND |
| brandTitle | "" | Fallback histórico de marca | No expuesto; snapshot compatibility | LEGACY |
| headline | Una pausa hecha a tu medida. | Hero | Portada | BRAND |
| intro | "" | Hero | Portada | BRAND |
| heroCaption | "" | figcaption, alt del hero | Portada | BRAND |
| copy.heroStamp | CUERPO · CALMA · PRESENCIA | Sello hero | Portada > disclosure | BRAND |
| copy.reserve | Elegir un momento | CTA header, hero, booking, footer | Portada > disclosure | BRAND |
| copy.secondary | Ver detalles | CTA secundaria hero | Portada > disclosure | BRAND |
| copy.nav.services | Tratamientos | Navegación servicios | Portada > Navegación | BRAND |
| copy.nav.staff | Profesionales | Navegación equipo | Portada > Navegación | BRAND |
| copy.nav.gallery | Detalles | Navegación galería | Portada > Navegación | BRAND |
| copy.nav.about | El espacio | Navegación espacio | Portada > Navegación | BRAND |
| copy.nav.faq | Preguntas | Navegación FAQ | Portada > Navegación | BRAND |
| copy.nav.reserve | Reservar | CTA del header | Portada > Navegación | BRAND |
| copy.servicesTitle | Elige tu tratamiento | Heading servicios | Tratamientos | BRAND |
| copy.servicesNote | "" | Nota servicios | Tratamientos | BRAND |
| copy.featuredEyebrow | Tratamiento destacado | Bloque destacado | Tratamientos > disclosure | BRAND |
| copy.featuredTitle | Un momento para ti | Bloque destacado | Tratamientos > disclosure | BRAND |
| copy.serviceAction | Reservar este tratamiento | CTA servicio | Tratamientos > disclosure | BRAND |
| copy.servicesAll | Todos | Filtro de servicios | Tratamientos > disclosure | BRAND |
| copy.allServices | Mostrar {count} más | Batching de servicios | Tratamientos > disclosure | BRAND |
| copy.serviceDefaultLabel | Tratamiento | Fallback categoría servicio | Tratamientos > disclosure | BRAND |
| featuredServiceId | "" | Servicio destacado canónico | Tratamientos | SYSTEM |
| sensorial.eyebrow | Antes de tu cita | Pausa | El espacio > Pausa sensorial | BRAND |
| sensorial.title | Baja el ritmo antes de llegar | Pausa | El espacio > Pausa sensorial | BRAND |
| sensorial.body | "" | Pausa | El espacio > Pausa sensorial | BRAND |
| copy.pauseLabel | Tu siguiente paso | Etiqueta pausa | El espacio > Pausa sensorial | BRAND |
| copy.pauseAction | Elegir un momento | CTA pausa | El espacio > Pausa sensorial | BRAND |
| copy.staffTitle | Las manos que te acompañan | Heading equipo | Equipo | BRAND |
| copy.staffNote | "" | Nota equipo | Equipo | BRAND |
| copy.staffDefaultLabel | Profesional | Fallback profesional | Equipo > disclosure | BRAND |
| staffEditorial[id].label | "" | Etiqueta profesional | Equipo > profesional | BRAND |
| staffEditorial[id].note | "" | Nota profesional | Equipo > profesional | BRAND |
| staffEditorial[id].visible | true | Visibilidad profesional | Equipo > profesional | BRAND |
| copy.galleryTitle | Detalles del espacio | Heading galería/lightbox | Galería | BRAND |
| copy.galleryNote | "" | Nota galería | Galería | BRAND |
| copy.galleryAll | Todos | Filtro galería | Galería > disclosure | BRAND |
| gallery[].image | Requerido al añadir una foto | Foto, rail, lightbox | Galería > media | BRAND |
| gallery[].name | "" | Label y caption lightbox | Galería > Nombre visible | BRAND |
| gallery[].alt | "" | Texto alternativo; fallback de label | Galería > Descripción | BRAND |
| gallery[].focal | undefined (center visual) | object-position | Galería > Enfoque | BRAND |
| galleryCategories[].label | Requerido, trim 1–80 | Filtro público | Galería > Categorías | BRAND |
| galleryCategories[].id / order | ID estable / 0 | Asociación y orden | Generados por CRUD | INTERNAL |
| gallery[].categoryIds | undefined | Pertenencia multi-categoría | Galería > Categorías de foto | BRAND |
| gallery[].category / filters | "" / undefined | Compatibilidad de snapshots antiguos | No se escriben como fuente nueva | LEGACY |
| about | "" | Texto del espacio | El espacio | BRAND |
| aboutImage | "" | Imagen del espacio | El espacio | BRAND |
| copy.aboutTitle | El espacio | Heading espacio | El espacio | BRAND |
| copy.faqTitle | Preguntas frecuentes | Heading FAQ | Preguntas | BRAND |
| faq[].question / answer | "" | Preguntas y respuestas | Preguntas | BRAND |
| copy.bookingTitle | Elige tu momento | Heading reserva | Reserva | BRAND |
| copy.bookingNote | "" | Nota reserva | Reserva | BRAND |
| copy.bookingPrompt | Elige un tratamiento y consulta los horarios reales disponibles. | Prompt reserva | Reserva | BRAND |
| copy.bookingSteps[0] | Tratamiento | Stepper posición 1 | Reserva > Paso 1 | BRAND |
| copy.bookingSteps[1] | Profesional | Stepper posición 2 | Reserva > Paso 2 | BRAND |
| copy.bookingSteps[2] | Día y hora | Stepper posición 3 | Reserva > Paso 3 | BRAND |
| copy.bookingSteps[3] | Tus datos | Stepper posición 4 | Reserva > Paso 4 | BRAND |
| copy.bookingSteps[4] | Confirma | Stepper posición 5 | Reserva > Paso 5 | BRAND |
| copy.contactTitle | Encuéntranos | Heading contacto | Contacto | BRAND |
| copy.hoursTitle | Horarios | Heading horarios | Contacto | BRAND |
| copy.mapsLabel | Cómo llegar | Link mapas | Contacto | BRAND |
| copy.footerStatement | "" | Frase footer | Contacto | BRAND |
| phone / whatsapp / contactEmail | "" | Datos de contacto | Contacto | BRAND |
| instagram / facebook | "" | Links sociales | Contacto | BRAND |
| seoTitle / seoDescription | "" | Metadata pública | Contacto > SEO opcional | BRAND |
| accent / paletteMode / customPalette | earth / preset | Tokens visuales | Diseño | BRAND |
| customPalette.accentContrast | Derivado | Contraste CTA | No editable; se deriva | SYSTEM |
| customPalette.background / surface | undefined; UI Tierra #fffaf2 | Fondo y superficies | Diseño > Fondo / Superficie | BRAND |
| customPalette.text | undefined; UI Tierra #2f241e | Texto | Diseño > Texto | BRAND |
| customPalette.accent | undefined; UI Tierra #a85b3b | Destacado y CTAs | Diseño > Color principal | BRAND |
| customPalette.warm / line | undefined; UI Tierra #d9b79c / #d8cabe | Detalles y bordes | Diseño > Color secundario / Detalles | BRAND |
| customPalette.dark / muted | Derivados del control Texto en custom | Staff, footer, notas | No son una segunda fuente editable | SYSTEM |
| visibility.showFeatured / showGallery / showStaff / showAbout / showSensory / showFaq | true cada uno | Visibilidad editorial | Terapias > toggles | BRAND |
| heroImage / logo / favicon / socialImage | "" | Media pública | Portada/Contacto | BRAND |
| mediaAssets | undefined | Ownership y referencias | No expuesto | SYSTEM |
| schemaVersion | 2 | Contrato de config | No expuesto | INTERNAL |
| faq[].id / staffEditorial keys | ID estable | Identidad de filas y profesional | Generados por CRUD / catálogo | INTERNAL |
| catalog.business.name / address / hours / mapsUrl / currency | Catálogo del tenant | Fallback de marca, contacto, horarios, precios | Configuración canónica del negocio | SYSTEM |
| catalog.services / staff / branches | Catálogo del tenant | Servicios y reserva | Dashboard canónico; sin duplicar datos en Ritual | SYSTEM |
| copy.pauseTitle / copy.pauseBody | — | No se renderizan | No expuestos | LEGACY |
| errores de horario, email, conflictos, booking, seguridad, loading | Sistema | Feedback transaccional | No expuesto | SYSTEM |

## Reglas de edición

- bookingSteps siempre conserva exactamente cinco posiciones; editar solo cambia labels, targets y lógica no llegan al editor.
- El editor usa details para copy avanzado. Cada cambio publica un payload de preview inmediato y, después, entra al autosave.
- El focus del preview se dirige a featuredTitle, galleryTitle, staffTitle, bookingTitle, footerStatement y al resto de campos públicos mediante data-website-field y aliases de sección.
- Categorías vacías o duplicadas case-insensitive muestran error local antes del error de schema y no reemplazan la última categoría válida.
