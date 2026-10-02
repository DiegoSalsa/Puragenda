# Constructor visual, segunda iteración

El constructor nunca debe exponer complejidad técnica cuando puede mostrar una representación visual.

## Auditoría de V1 antes de modificar

V1 separa el diseño Bella (`src/websites/templates/bella`), configuración validada y registry de los datos canónicos de servicios, profesionales y disponibilidad. `BusinessWebsite` guarda borrador y snapshot publicado con control de revisión. Las acciones verifican permiso y tenant; el proxy vincula el hostname de transporte. El booking reutiliza Puragenda. Billing y sus webhooks son independientes del editor. Se preservan estos contratos y los tests existentes.

El editor actual es un formulario extenso con URLs de imágenes, CSV de filtros, versiones, enums y SEO técnico. La vista previa exige guardar y abrir otra pestaña. La subida existente valida y normaliza con Sharp y usa el SDK Cloudinary desde el servidor, como otras acciones de Puragenda, pero solo devuelve una URL. Dominios solo prueban un TXT propio y no conectan con un proveedor de hosting.

## Diseño de V2

Seis paneles: Diseño, Portada, Galería, Mi negocio, Contacto y Dominio. Preview persistente en iframe privado del mismo origen, con el mismo renderer Bella; mensajes validan origen, ventana emisora, protocolo y configuración. El estado local se muestra inmediatamente; el guardado serializado y debounced conserva revisiones y evita sobrescribir ediciones nuevas. Publicar continúa siendo una acción explícita.

Media reutiliza la subida firmada del SDK en servidor para validar el contenido real antes de entregar a Cloudinary. Registros de assets pertenecen al sitio y conservan dimensiones, formato, bytes y public ID. Los strings V1 siguen renderizando; nuevas subidas añaden referencias verificadas en servidor. Retirar una foto del borrador nunca elimina una imagen aún publicada.

Dominios usan una interfaz de proveedor. Vercel obtiene requisitos DNS de sus respuestas; el adaptador local simula claramente el recorrido. Ninguna credencial ni escritura externa se habilita implícitamente. Metadata automática se comparte entre el snippet del editor y la web publicada.

## Referencias consultadas

- [Next, guías locales](../../../node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md).
- [Cloudinary SDK y subida firmada](https://cloudinary.com/documentation/node_image_and_video_upload).
- [Vercel agregar dominio](https://vercel.com/docs/rest-api/projects/add-a-domain-to-a-project).
- [Vercel consultar dominio](https://vercel.com/docs/rest-api/projects/get-a-project-domain).
- [Vercel verificar dominio](https://vercel.com/docs/rest-api/projects/verify-project-domain).
- [Vercel eliminar dominio del proyecto](https://vercel.com/docs/rest-api/projects/remove-a-domain-from-a-project).

No se modifica la fuente original, no se compra ningún dominio y no se modifica producción.

## Entrega de la iteración

### Producto y experiencia

La V1 presentaba configuración técnica; V2 presenta `Mi sitio` como un constructor visual con seis áreas: Diseño, Portada, Galería, Mi negocio, Contacto y Dominio. El preview ocupa la columna principal, el estado usa lenguaje humano (`Guardado`, `Cambios pendientes`, `Publicado`) y la publicación sigue siendo explícita. En móvil se alternan `Editar` y `Vista previa` para evitar un editor comprimido.

El preview vive en `/website-preview` dentro de un iframe privado, usa `BellaContent` —el mismo renderer que la web pública— y no se indexa. El editor envía `puragenda.website.v2` por `postMessage` después de cada cambio local. El receptor verifica `origin`, `source`, secuencia y esquema Zod; los campos editables declaran `data-website-field` para enfocar y resaltar el elemento correspondiente. El estado local llega al preview antes del autosave.

Autosave usa una cola serializada con debounce de 650 ms, conserva la revisión más reciente y no permite que una respuesta vieja reemplace una edición nueva. Guardar y publicar permanecen separados; la web pública solo lee el snapshot publicado.

Las paletas aprobadas de Bella se muestran como tarjetas con swatches: Coral, Lila y Bosque. El selector de diseño mantiene Bella como único template disponible; `bella@1` queda interno. Portada usa campos humanos y una miniatura; Galería usa miniaturas, selección, chips de categorías, orden visual, reemplazo, eliminación recuperable y descripción accesible secundaria. Mi negocio concentra texto e imagen del estudio. Contacto normaliza handles de Instagram/Facebook. `Cómo aparecerá tu negocio en Google` muestra snippet y permite personalizar título, descripción e imagen sin exponer OpenGraph, URL de asset ni filtros CSV.

### Media y seguridad

`WebsiteMedia` pertenece a un `BusinessWebsite` y guarda `publicId`, `secureUrl`, dimensiones, formato, bytes, proveedor, uso y borrado lógico. El endpoint autenticado valida el tenant antes de leer el cuerpo, limita multipart a 6 MiB y el archivo a 5 MiB, inspecciona MIME real y dimensiones con Sharp, elimina metadata, redimensiona por perfil y entrega WebP optimizado. Hero y galería admiten hasta 2400 px; logo 800, social 1600 y favicon 256. El servidor determina la carpeta `puragenda_websites/<businessId>/<uuid>`; nunca confía en un folder enviado por el navegador ni expone secretos.

La subida de desarrollo usa un adaptador local explícito (`WEBSITE_MEDIA_MOCK=1`); fuera de desarrollo se reutiliza la subida firmada existente del SDK Cloudinary. Las referencias nuevas deben coincidir con el registro del mismo tenant; las URLs legacy de V1 siguen renderizando como compatibilidad y no se borran automáticamente. Quitar un asset es soft-delete y se bloquea si el draft o el publicado todavía lo usan.

### Dominios y publicación

El subdominio Puragenda se valida con unicidad global y se muestra como una dirección lista para compartir. `DomainProvider` define `addDomain`, `getDomainStatus`, `verifyDomain` y `removeDomain`; `VercelDomainProvider` usa las respuestas actuales de Domains API para devolver TXT, A o CNAME recomendados, sin valores DNS hardcodeados. El proveedor mock reproduce estados de espera y conexión local sin DNS real. Los errores de Vercel se convierten a mensajes humanos, se exige propiedad del sitio y se bloquean dominios reservados, `vercel.app`, hosts internos, IPs y dominios de otro tenant. SSL queda administrado por Vercel después de la verificación; el proyecto no crea certificados.

La solicitud de compra conserva un flujo separado y no compra dominios. Billing mantiene el add-on preparado para sandbox/mock; no hay producto Paddle LIVE ni credenciales en el repositorio. Los webhooks y cancelación existentes siguen siendo la fuente de entitlement.

### Modelo, migración y variables

La migración `20260930210000_website_visual_builder_v2` añade `WebsiteMedia` con FK y RLS, índices y checks positivos, y añade `provider`, `dnsRecords`, `checkedAt` a `WebsiteDomain`. El modelo no duplica Business, Service, Staff, Location ni disponibilidad: Bella consulta esos datos canónicos. El registry tipado solo expone `bella` y conserva capacidad de añadir templates posteriores.

Variables opcionales documentadas en `.env.example`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, `WEBSITE_DOMAIN_PROVIDER`, `WEBSITE_VERCEL_WRITES_ENABLED` y los flags locales `WEBSITE_QA`/`WEBSITE_MEDIA_MOCK`. Los secretos son server-only y el script local los deja vacíos.

### QA reproducible

Capturas finales en [`docs/websites/qa-v2`](./qa-v2/): editor de portada, paletas, galería, snippet de Google, dominio esperando/conectado, edición móvil 390 y preview móvil 390/360. La comprobación de viewport midió 1440×900, 1280×900, 390×844 y 360×844; 360 y 1280 reportaron `scrollWidth === innerWidth`.

La suite conserva las 949 pruebas V1 y añade cobertura de preview protocol, paletas, metadata, autosave concurrente, subida y pausa, tenant isolation de assets, MIME/tamaño/Sharp, RLS, URLs legacy, publicación, dominio Vercel mock, DNS dinámico, unicidad, ownership, eliminación, subdominios y dos tenants A/B. El script local ejecuta además reserva canónica, disponibilidad, aislamiento de borrador/publicado, media RLS y actualización de servicios.

### Pendientes externos y commits

Queda pendiente únicamente configurar credenciales reales de Cloudinary/Vercel/Paddle sandbox en el entorno que vaya a operar dominios o billing, ejecutar la migración en el entorno elegido, verificar un dominio que el negocio controle y definir DNS/SSL del proveedor. No se tocó DNS, Vercel Production, Paddle LIVE, compra de dominios, deploy ni merge.

La implementación queda en la rama `feature/websites-visual-builder-v2`. El detalle de archivos, migración, comandos y resultados de lint, typecheck, Prisma, tests y build se mantiene junto a los commits de esta rama.
