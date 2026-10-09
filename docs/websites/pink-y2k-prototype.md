# Y2K · Pink Digital Dream

> Documento de la fase de prototipo. Y2K ya está integrado como template seleccionable y persistente; ver [Activación de Y2K](./Y2K-DELIVERY.md).

Revisión privada local · 8 de octubre de 2026 · rama `codex/pink-y2k-prototype`.

La segunda iteración de movimiento, sus grabaciones reales y validaciones están documentadas en [Y2K Motion & Visual Polish](./pink-y2k-motion.md).

## Abrir y revisar

El prototipo está en [http://localhost:3007/website-preview/pink-y2k](http://localhost:3007/website-preview/pink-y2k).

Si el servidor está cerrado, ejecutar desde el repositorio:

```powershell
node scripts/dev-pink-y2k.mjs
```

El proceso escucha exclusivamente en `127.0.0.1`. La página exige simultáneamente `NODE_ENV=development`, `WEBSITE_PINK_Y2K_PREVIEW=1` y un Host de loopback. En producción devuelve 404 incluso con el flag. Los hosts de tenants tampoco pueden abrirla. No hay enlace remoto alojado, despliegue, publicación, migración ni escritura a negocios reales. La respuesta comprobada incluye `X-Robots-Tag: noindex, nofollow, noarchive`. La configuración solicita `private, no-store`, pero Next en desarrollo reemplaza Cache-Control por `no-cache, must-revalidate`; el acceso depende de la guardia local, no de estas cabeceras.

La barra superior abre **Personalizar prototipo**. Hay controles para marca, portada, logo, textos, botones, colores, redes, galería, categorías, secciones, modalidad, garantía y pantallas del dispositivo. Las ediciones permanecen en memoria; **Exportar actual** conserva un JSON del borrador aplicado. JSON permite importar una configuración validada. Este editor es una herramienta local de revisión, todavía no el editor persistente del dashboard.

## Auditoría de Puragenda

| Área | Contrato existente y decisión |
|---|---|
| Templates | `src/websites/registry.ts` registra Bella, Matchday y Ritual, con esquema, lectura/migración, editor, renderer y regla de publicación. Pink Y2K está encapsulado y aún fuera del registro comercial. |
| Datos | `WebsiteView<TConfig>` recibe configuración, negocio, catálogo y modo preview. El renderer nuevo usa este mismo contrato. No consulta ni guarda un catálogo propio. |
| Catálogo real | `websiteView()` carga `loadBookingContext(businessId)` y `websiteCatalog(toBookingCatalog(context), preview)`: servicios, opciones, profesionales, sucursales, moneda y reglas. |
| Reservas | Se reutilizan `BellaProvider`, `BookingFlow`, `createWebsiteApi`, validación, selección y cotización compartidas. `/api/website/book` ya delega al endpoint canónico `/api/business/[slug]/book`. No se implementó un segundo motor. |
| Disponibilidad | El flujo compartido maneja fechas, zona horaria, servicios compatibles, profesionales y ubicación. En esta revisión usa exclusivamente el proveedor demostrativo existente. |
| Preview actual | `/website-preview` requiere `requireWebsiteManager()`. Su transporte usa `puragenda.website.v2` y valida origen y ventana emisora. El prototipo local no habilita esta página para terceros ni escribe en borradores existentes. |
| Draft/published | Las acciones actuales separan `draftConfig` y `publishedConfig`, usan revisión optimista y snapshots por template. Pink no cambia ninguna configuración almacenada. |
| Permisos | `requireWebsiteManager()` comprueba sesión, negocio vigente y `WEBSITE_MANAGE`; las operaciones de dominio exigen propietario. |
| Publicación | Exige add-on/trial habilitado, suscripción operativa, revisión vigente, validación del template y propiedad de medios. No se modificaron estas reglas ni cobros. |
| Aislamiento | Proxy selecciona el tenant por Host, sustituye cabeceras internas inyectadas y bloquea rutas internas en dominios de negocio. La guardia local adicional rechaza hosts de tenant. |
| Medios | El álbum nuevo comparte `galleryImageSchema`; imágenes locales/Cloudinary y enlaces HTTPS se validan. Las categorías salen de las fotos y desaparecen al quitar su última referencia. |
| Capacidades ausentes | El contrato de reserva admite opciones y dirección cuando corresponde a domicilio. No ofrece adjuntar referencias visuales ni un campo arbitrario de instrucciones/largo. No se añadieron campos ficticios ni cálculo de traslados. |

Bella y su editor no se modificaron. También se conservaron los cambios que ya estaban en `package.json`, `package-lock.json`, `remotion/` y los scripts del reel.

## Dirección artística

Un álbum digital de nail art: rosa perlado, fucsia profundo y superficies de papel rosado. La portada combina título inflado, órbita fina, polaroid inclinada, pequeñas estrellas nacaradas y un juguete físico digital. El tarifario vive dentro de una ventana tipo Notepad. La galería alterna marcos y giros leves, con fotos grandes; en celular se convierte en un álbum horizontal con scroll nativo.

Paleta inicial: fondo `#FFF0F6`, ventana `#FFFAFD`, tinta `#541536`, acento `#B71863`, con material rosado y lila para el dispositivo y los adornos. Los cuatro colores principales son editables. Se exige contraste mínimo de 4,5:1 para cuerpo y botones antes de aplicar la configuración local.

DynaPuff aporta volumen a los títulos; Caveat se reserva para anotaciones; el texto funcional reutiliza Plus Jakarta Sans del proyecto. DynaPuff y Caveat usan SIL Open Font License; las licencias están en `public/websites/pink-y2k/licenses/`. Fuentes: [DynaPuff OFL](https://github.com/google/fonts/blob/main/ofl/dynapuff/OFL.txt), [Caveat OFL](https://github.com/google/fonts/blob/main/ofl/caveat/OFL.txt).

En celular, el título y CTA aparecen antes de los objetos; la foto y el dispositivo comparten una composición propia. Hay menú simple y reserva fija inferior. La reserva usa un resumen compacto, controles nativos y el flujo existente. No hay escritorio arrastrable, audio, cursor personalizado ni WebGL.

## Referencias consultadas

| Referencia | Acceso y observación |
|---|---|
| [Sugarwave](https://sugarwave-fullversion.framer.website/) y [ficha](https://www.framer.com/marketplace/templates/sugarwave-full-ver/) | El lector web falló en la demo, pero Chrome sí la abrió. Se capturó el escritorio con iconos pixelados, fondo cuadriculado y objetos glossy. Se reinterpretó la convivencia de objetos independientes. |
| [BabiWeb Y2K Blog](https://www.framer.com/marketplace/templates/y2k-blog/) | Ficha abierta en navegador: cámara, teléfono, CD y polaroids sobre fondo rosado. Se tomó la idea del álbum y el objeto digital con presencia física. |
| [Bubbbly](https://www.bubbbly.com/games/gameboy.html) | Página abierta y capturada: carcasa translúcida, pantalla interna y botones físicos. Love Pocket tiene una silueta e interfaz propias. |
| [Lazer-Bunny](https://lazer-bunny.neocities.org/) | Página abierta y capturada: marcos finos, ventanas, stickers y densidad visual organizada. Se reinterpretaron bordes y pequeños detalles. |
| [Etsy A](https://www.etsy.com/listing/1810247471/y2k-acuity-scheduling-template-nail-tech) y [Etsy B](https://www.etsy.com/listing/1859077002/y2k-acuity-scheduling-template-nail-tech) | Se leyeron las fichas y descripciones de sus imágenes: banners, políticas, servicios, galerías y estética rosada/lila. No se compraron, descargaron ni copiaron recursos. No se verificó una web de reservas funcional detrás de estas fichas. |

Las capturas de investigación están en `output/pink-y2k/reference-*.png` y son evidencia interna, no recursos de la implementación.

## Love Pocket

Carcasa SVG original, con gradientes, reflejo, bisel, tornillos, aro y sombra; pantalla y controles son HTML/React. La mascota es un corazón pixelado original. No usa modelos 3D ni marcas de juguetes.

- Botón izquierdo: mensaje anterior, con vuelta al final.
- Botón derecho: siguiente mensaje, con vuelta al principio.
- Corazón central: abre la reserva compartida.
- Pantallas configurables: nombre, título y texto; entre una y seis.
- Botones de al menos 44 × 44 píxeles; foco visible, nombres accesibles y pantalla con `aria-live`.
- La animación de saludo es breve; `prefers-reduced-motion` desactiva animaciones y transiciones.

No muestra una promoción ni afirma que la agenda esté abierta. Para sumar promociones hay que seleccionar una oferta real y vigente del negocio, usando el sistema existente.

## Real, reutilizado y simulado

| Funciona ahora | Sigue siendo demostrativo |
|---|---|
| UI React navegable, filtros, lightbox con botones/teclado/deslizamiento, políticas, menú, controles del juguete y editor local validado. | Nombre/preset de Y2K, imágenes de inspiración, precios de ejemplo, duraciones, opciones, profesional, ubicación y horarios. |
| Flujo, validación y cotización canónicos de Puragenda. Opciones de diseño y retiro se calculan con el contrato compartido. | La finalización termina localmente con “No se creó una cita ni se enviaron tus datos”. |
| Contrato `WebsiteView<PinkConfig>` y esquema de galería reutilizables con datos reales. | No hay lectura de un tenant real ni persistencia del editor en el dashboard. No se ofrece adjuntar imágenes ni calcular traslados. |

La prueba completa de Soft gel + diseño, diseño complejo y retiro calculó **$30.990 / 125 minutos**, usando únicamente datos ficticios/históricos identificados. La instrumentación registró **cero llamadas a `/api/`** en todo el recorrido.

## Código y recursos

- `src/websites/templates/pink-y2k/`: renderer, dispositivo, editor local, esquema, guardia de acceso y CSS encapsulado.
- `src/websites/fixtures/pink-y2k.ts`: preset comercial y catálogo exclusivamente de demostración, separados del renderer.
- `src/app/website-preview/pink-y2k/page.tsx`: entrada local protegida, metadatos privados y fuentes.
- `public/websites/pink-y2k/`: foto WebP original generada, favicon SVG y licencias de fuentes.
- `scripts/dev-pink-y2k.mjs`, `scripts/qa-pink-y2k.mjs`: servidor de loopback y QA reproducible.
- `tests/core/pink-y2k.test.ts`: once pruebas de límites, contratos, aislamiento, cotización, bloqueo de escrituras y estados vacíos.
- Cambios puntuales de infraestructura: `next.config.ts` usa un directorio de compilación aislado, quita el indicador de desarrollo solo en este modo y agrega cabeceras privadas; `.gitignore` y `eslint.config.mjs` excluyen los artefactos generados; Next añadió los tipos del directorio nuevo a `tsconfig.json`.

La foto `public/websites/pink-y2k/pink-dream.webp` se generó con la herramienta integrada **imagegen**, sin usar Instagram como imagen de entrada, y se optimizó a WebP de 1000 × 1500, 222.866 bytes. Las otras tres fotos son fixtures existentes de Bella, señaladas como muestras. Deben reemplazarse con fotos autorizadas de la clienta antes de presentar el álbum como su trabajo.

Prompt final usado en imagegen:

> Use case: photorealistic-natural. Asset type: portrait nail-art inspiration photograph for a private Y2K pink manicure booking prototype. A high-end editorial macro beauty photograph of one elegant adult woman's hand with anatomically correct fingers, long almond-shaped glossy translucent baby-pink gel nails, delicate hot pink French tips, tiny dimensional silver stars, one tasteful rhinestone heart and subtle chrome bow nail accents. Hand resting naturally over shimmering pink satin, soft direct flash early 2000s fashion magazine mood, believable skin pores and beautiful studio lighting, very detailed nail art perfectly in focus. Palette blush pink, fuchsia, silver and pale lilac. Composition a tight portrait crop of manicured hand filling most of frame, room around the hand. No face, no text, no brand, no watermark, no UI, no collage, no extra fingers. This is a fictional AI inspiration photograph, not work attributed to a real nail artist.

## Validación ejecutada

| Comprobación | Resultado |
|---|---|
| Suite completa `npm test` | 185 archivos aprobados, 3 omitidos; **1.101 pruebas aprobadas, 51 omitidas**. Las omitidas siguen las condiciones existentes; no se modificaron para aprobar. |
| Regresión final focalizada | **87/87** en diez archivos: Pink, Bella, configuración/editor, servicios/acciones/proxy y selección/disponibilidad. |
| TypeScript `npm run typecheck` | Aprobado. También verificado dentro del build. |
| Build `node scripts/dev-websites-local.mjs --build` | Producción compilada correctamente en el entorno QA existente, con correo/telemetría/pagos externos deshabilitados. Se generaron 135 páginas estáticas; el prototipo permanece dinámico y bloqueado en producción. |
| `npm run lint` | Salida 0: **0 errores, 33 advertencias preexistentes** en otros archivos. Lint de todos los archivos de este cambio: sin incidencias. El directorio nuevo de Next se excluyó como los demás artefactos compilados. |
| QA Chrome/Playwright | 320, 360, 390, 430, 768, 1280 y 1440 px: ancho del documento y del root igual al viewport; todas las fotos cargaron al entrar en vista. |
| Accesibilidad axe | **0 incidencias** en la página a 390 y 1440 px, 40 reglas aprobadas por revisión. No equivale a una auditoría manual completa de accesibilidad. |
| Interacciones | Pocket, menú móvil, filtros, lightbox, flechas, Escape, políticas, cinco pasos de reserva, cotización, editor, eliminación de fotos/categorías, rechazo de enlaces inseguros y movimiento reducido: aprobados. |
| Faltantes y estados vacíos | Álbum vacío sin fotos de relleno y portada ausente con fallback explícito: verificados en navegador. Carga de reserva diferida con mensaje de estado. |
| Privacidad HTTP | Host de otro tenant: 404. Servidor de producción local: 404, sin contenido del prototipo. La guardia también prueba producción con flag habilitado. |
| Rendimiento | Sin nuevas dependencias de runtime ni WebGL. Reserva diferida, fotos con `next/image`, espacio reservado y carga perezosa. No se ejecutó Lighthouse ni una comparación de CWV de producción; no se atribuyen puntuaciones de rendimiento. |

Capturas reales del navegador: `output/pink-y2k/viewport-{ancho}.png` y `page-{ancho}.png`. También `gallery-lightbox.png`, `booking-review-390.png`, `booking-complete-390.png` y `empty-and-missing-390.png`. El reporte automatizado está en `output/pink-y2k/qa-report.json`.

Para reproducir el QA sin modificar dependencias del repositorio:

```powershell
npm install --prefix "$env:TEMP/puragenda-pink-y2k-qa" playwright @axe-core/playwright --no-audit --no-fund
node scripts/qa-pink-y2k.mjs
```

Requiere Google Chrome local; `PINK_QA_TOOLING` permite indicar otro directorio de herramientas y `PINK_QA_URL` otra URL local.

## Autoevaluación de diseño

Estas notas son juicio interno, no evidencia de calidad ni aprobación de la clienta.

| Dimensión | Nota | Observación verificable |
|---|---|---|
| Identidad Y2K | 9/10 | Título inflado, objeto físico digital, pantalla pixelada, Notepad, cinta y polaroids presentes en las capturas. |
| Fidelidad a la clienta | 8/10 provisional | Coincide con el brief de rosa, maximalismo, uñas y juguete digital; faltan logo, fotos y comparación con sus publicaciones originales. La validación de la clienta no se puede sustituir por una puntuación propia. |
| Originalidad | 9/10 | Dispositivo y composición desarrollados en SVG/CSS/React sin copiar recursos externos. |
| Diseño móvil | 9/10 | Composición específica, CTA fijo, galería táctil, controles del dispositivo de 44 px y siete anchuras verificadas. |
| Claridad para reservar | 9/10 | CTA en primera pantalla, precios seleccionables y recorrido canónico completo probado. |
| Acabado visual | 9/10 para prototipo | Tipografía, marcos, sombras, estados interactivos y fotografías de inspiración consistentes; producción exige material comercial aprobado. |
| Compatibilidad | Sin regresiones detectadas | Bella sin cambios; suite general y pruebas de contratos/aislamiento aprobadas. |

## Camino corto hacia un template publicable

1. Confirmar catálogo/precios vigentes, tiempos, opciones de diseño/largo/retiro, profesionales, sede/modalidad, garantía y políticas. Obtener logo y fotografías autorizadas. No convertir datos históricos en catálogo activo.
2. Registrar `pink-y2k` en `registry.ts` y sumar `PinkConfig` a su unión tipada. Adaptar el editor local a `WebsiteEditorProps`, el autosave/revisión y el transporte de preview existentes; reutilizar los componentes de medios y ownership actuales. No extender el catálogo con copias estáticas.
3. Cargar `WebsiteView<PinkConfig>` con el catálogo real del negocio autorizado. Mantener preview sin escrituras; el provider y el flujo compartidos ya tienen el camino conectado. El adaptador a Bella evita duplicar lógica en esta fase; su contexto puede extraerse a un provider de booking neutral si se decide generalizarlo.
4. Agregar controles editoriales que aún sean necesarios, incluyendo selección de promociones reales. Una referencia de diseño o largo debe modelarse como opción de servicio cuando corresponda; adjuntos o instrucciones libres requieren una ampliación explícita del contrato canónico, con almacenamiento, permisos y validación propios.
5. Validar el contenido editado, repetir QA con fotos y textos definitivos, añadir prueba de borrador/publicado para el nuevo registro y aplicar las reglas existentes de suscripción, add-on, medios y revisión. Presentar para aprobación antes de publicar el negocio.

No se cambió navegación global, lógica de suscripciones, configuración comercial activa ni datos de la clienta. El trabajo queda listo para revisión privada del prototipo, no para una publicación comercial automática.
