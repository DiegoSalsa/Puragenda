# QA final de preproducción — 2 de octubre de 2026

**NO-GO para producción Chile.** [Informe A–X](PREPRODUCTION-REPORT.md), [evidencia actual](qa-preproduction/validation.json), [env](PRODUCTION-READINESS.md) y [runbook](RELEASE-RUNBOOK.md). Código final auditado: `b0044c764defd89393ffc3bd26b80f8dff8bb07e`; commit de evidencia posterior solo docs. HEAD final se registra después del commit en la entrega y `scratch/PREPRODUCTION_HEAD_FINAL.json`.

| Comprobación de esta pasada | Resultado |
| --- | --- |
| Suite normal final | 181 files PASS /3 skipped /0 FAIL; 1076 tests PASS /51 skipped /0 FAIL |
| Suite PostgreSQL opt-in final | 184 files PASS; 1127 tests PASS /0 skipped /0 FAIL |
| HTTP real local | 52 comercial +29 público +18 acciones PASS; no sumados a Vitest |
| MP Website Chile | 30 integration +7 route webhook; proveedor PASS SIMULATED; oficial E2E/deferred debit NOT_RUN |
| Trial/founder/standard | Precio server 5990/9990, trial único exacto, early start_date, expiry, cancel/recovery y BASE separada validados localmente |
| Browser | 3 templates public/builder 1440/390/360, popup/changelog, Ritual stress/HEX/lightbox/reserva; 36 capturas |
| Booking navegador Ritual | Appointment count=1, PENDING; datos ficticios, email apagado |
| Quality | Lint 0 errores /32 warnings, typecheck/Prisma PASS, build aislado 135 páginas |
| Migraciones | Baseline MAIN +8 incrementales, sin drift; RLS 10 tablas PASS REAL local |
| Producción | Env/DB BEGIN READ ONLY +ROLLBACK y MP GET200/MLC; no escrituras |
| Bloqueadores | Secreto webhook y sesión faltantes, 2 migraciones pendientes, corte/snapshot sin preparar, MP oficial no probado |
| Externos | Cloudinary/Vercel/DNS/TLS/email/Paddle internacional NOT_RUN |

El kill switch de adquisición deja vigentes los sitios pagados. Capturas de trial/early conversion usan fechas del fixture y reloj avanzado local, no un débito aceptado por MP. [Extractos de ejecución](qa-preproduction/test-output.txt) y [diff clasificado](qa-preproduction/final-diff-inventory.json). Nada de merge/deploy ni pagos reales.

## Historia: pasada Ritual anterior

# QA de webs — 2 de octubre de 2026 (histórica)

Esta sección corresponde al HEAD de producto auditado de la pasada Ritual y se mantiene separada de la historia de auditorías anteriores.

| Comprobación actual | Resultado |
| --- | --- |
| HEAD de producto auditado | ce613981829a049b33a381b2b9fe8553dbc715d5 |
| Ritual browser realistic | PASS: 1440, 1280, 768, 390 y 360; evidencia en docs/websites/qa-ritual |
| Ritual overflow | PASS en renderer: 1440/1280/768/390/360; tolerancia 2 px |
| Ritual builder | PASS: 50/50, diez paneles en 1440/1280/768/390/360, sin overflow del documento |
| Gallery / staff rails | PASS: gallery 2/3/6/7/12/30, staff 1/2/3/5/10; touch físico NOT_RUN |
| Lightbox | PASS: open, next, previous, ArrowLeft, ESC, close y focus restore; click fuera PASS |
| Services density | PASS: 6 iniciales, +6, reset de categoría |
| Presets y custom palette | PASS: Tierra, Salvia, Piedra, Brasa y seis controles custom; accentContrast derivado |
| Copy preview/persistence | PASS: heroCaption, featuredTitle, staffNote, galleryNote, bookingTitle, footerStatement |
| Template switching | PASS: draft Ritual → Matchday → Ritual; published Ritual conservado |
| npm test | 178 archivos PASS / 2 skipped; 1.060 tests PASS / 21 skipped; 0 FAIL |
| PostgreSQL opt-in completo | 180 archivos PASS; 1.081 tests PASS; 0 skipped; 0 FAIL |
| HTTP público + acciones | 29 + 18 PASS; no se suman al total Vitest |
| Migraciones | PASS: baseline MAIN, incrementales, launch offers, sin drift y RLS |
| Lint / Typecheck | 0 errores, 32 warnings existentes / PASS |
| Prisma validate / generate | PASS / PASS |
| Build producción aislado | PASS; 133 páginas |
| External providers | NOT_RUN; no Cloudinary remoto, Vercel, DNS, Paddle LIVE ni producción |

Las capturas, viewports, scenarios PASS/NOT_RUN y métricas están en [qa-ritual/](qa-ritual/). baseline histórica no reproducible; no se afirma porcentaje de mejora.

## Historia de auditoría previa

## Auditoría histórica de webs — 1 de octubre de 2026

La evidencia de esta sección corresponde a la auditoría histórica del 1 de octubre. Los screenshots y números de entregas anteriores se conservan como historia, sin usarlos como resultados finales.

| Comprobación histórica | Resultado |
| --- | --- |
| npm test | 174 archivos PASS, 2 omitidos; 1.022 tests PASS, 21 omitidos por falta de opt-in de PostgreSQL |
| Suite completa con PostgreSQL aislado | **176 archivos PASS; 1.043 tests PASS; 0 FAIL; 0 skipped** |
| Foco websites/Bella/builder/booking | 23 archivos PASS, 178 tests PASS y 19 de integración omitidos en modo normal; los 19 también PASS en la ejecución completa con PostgreSQL |
| Lint | 0 errores, 32 advertencias de código existente |
| Typecheck | PASS |
| Prisma validate / generate | PASS / PASS |
| Build aislado de producción | PASS; 133 páginas generadas |
| MAIN baseline → migraciones incrementales | PASS; V1 → V2, ownership legacy y cinco migraciones aplicadas |
| Prisma diff | **No difference detected**, exit 0 |
| RLS | Habilitado en seis tablas; rol no propietario no lee drafts ni medios incluso con SELECT |
| HTTP público/DB | 29 PASS |
| HTTP autenticado/acciones | 18 PASS |
| Overflow builder | **48/48 PASS**: 6 paneles × 4 tamaños × escritorio/móvil; documento, contenedor e iframe |
| Nombres largos B/C | 8/8 PASS: header, hero, footer y documento en cuatro tamaños |
| Referencia y assets | 58 archivos originales intactos; 10 assets portados idénticos (verificador reejecutado) |

Los resultados focalizados son subconjuntos de la suite completa; no se suman al total de 1.043. Los 47 checks HTTP y los escenarios de navegador son evidencia adicional. La corrida con PostgreSQL incluye las carreras de booking, idempotencia y confirmación de abonos que están omitidas por defecto. No se conectó a una base remota.

El harness de booking tenía reloj real frente a slots de octubre fijos y activaba globalmente el simulador de pagos. Se corrigió la fecha de fixtures y el ámbito del simulador, conservando las expectativas y el motor canónico. Advertencias de Vite y pg son avisos de tooling, sin FAIL.

## Migraciones verificadas

El runner genera DDL desde el schema de **main**, en una base nueva del cluster local, y luego aplica:

1. 20260930120000_public_booking_operations.
2. 20260930160000_websites_addon_v1.
3. 20260930210000_website_visual_builder_v2.
4. 20261001120000_website_domain_tenant_ownership.
5. 20261001121000_booking_operation_fk_update.

Se verifica que V1 todavía no tiene WebsiteMedia y que V2 incorpora esa tabla y provider/dnsRecords/checkedAt. Un dominio legacy ACTIVE queda PENDING, sin principal y con un nuevo TXT; su hostname reservado se conserva. El diff final no tiene drift. RLS se comprueba aparte: Prisma diff no verifica políticas, triggers ni todos los CHECKs. No se modificó V1/V2.

El historial de main anterior a esta feature requiere una baseline: su migración 20260505 referencia Client antes de su creación. No se presenta una reproducción desde vacío de esa historia como exitosa ni se reescribe. La prueba solicitada desde baseline MAIN sí pasa.

## Navegador y builder actual

Mediciones: [final-layout-20261001.json](qa/final-layout-20261001.json). Builder a 1440×900, 1280×900, 390×844 y 360×844. La captura de Contacto móvil se hizo además a 360×800. Tolerancia: 2 px; los contenedores ocultos no se cuentan como preview verificado. Se muestra el preview antes de medir en móvil.

[Contacto escritorio](qa/final-contact-1440.jpg) y [Contacto móvil](qa/final-contact-360.jpg) conservan la distribución aprobada. No se editaron CSS, sidebar, layout ni iconos por esta auditoría.

Se recorrieron Diseño, Portada, Galería, Mi negocio, Contacto y Dominio. Se comprobó Coral/Lila/Bosque en el preview. Contraste válido/ crítico y publicación se verificaron también invocando la acción real con mocks. En Galería se probaron alta, Chrome → Efecto Chrome manteniendo cat-chrome, multi-category, reorder de fotos/categorías, borrado de categoría conservando las siete fotos y upload procesado con Sharp/provider local. El draft migrado conserva IDs y el published original no cambia hasta publicar. Los fixtures se restauraron al finalizar.

| Fixture | Propósito |
| --- | --- |
| A: Estética Bella | Contenido demo explícito, galería propia, Coral, catálogo de siete servicios |
| B: Aura Beauty Atelier | Otra marca, fotos, profesionales y precios; Lila |
| C: Centro Integral de Belleza y Estética María Fernanda | Galería manual vacía, dos imágenes de servicios propias de QA, cero assets Bella |

En C, quitar las imágenes de servicios elimina Portfolio; HTTP y render real del componente lo comprueban. El nombre largo cabe en header/hero/footer a 1440, 1280, 390 y 360. No se realiza una certificación pixel-perfect, CWV, pentest ni accesibilidad exhaustiva. La comparación visual histórica con /studio está en la evidencia anterior; aquí se verifica conservación del código/CSS y las vistas actuales.

## Aislamiento y seguridad comprobados

HTTP valida hosts A/B/C, booking canónico, replay, conflictos de slot, rechazo de IDs/precios comerciales ajenos, CSRF, actualización de precio y staff, drafts privados, snapshots publicados, suspensión, preview A/B autenticado y noindex, y rechazo de embedding ajeno. Next dev devuelve no-cache/must-revalidate en preview; no se afirma no-store en ese entorno.

HTTP autenticado sube una foto de A en provider local, rechaza guardarla/borrarla desde B y evita borrarla si la usa draft o published. Valida hostname único y verify/disconnect/primary de A desde B. Los transport mocks cubren TXT exacto, error de challenge, dominio Vercel preexistente, DNS pendiente/activo y errores seguros del proveedor. No hay DNS ni Vercel writes en QA. No existe un endpoint HTTP mock que conceda ownership.

Medios: 5 MB, MIME real, decode, límite de píxeles, EXIF rotate, resize, metadata stripping, WebP, ownership registrado incluso en snapshots legacy y rollback cuando DB/provider falla. La búsqueda de referencias no depende de que un viejo config pase todo Zod. Upload/biblioteca guardan metadata; no se usa un formulario de URLs manuales.

Los límites de booking siguen en el motor compartido. Server Actions exigen sesión, scope y origen, y las revisiones optimistas impiden sobrescrituras. Upload tiene límite de body y biblioteca; domains tiene máximo cinco reservas por negocio. No se añadió otro motor de booking ni un rate limiter paralelo.

## Reproducir exclusivamente local

PostgreSQL 17 en 127.0.0.1:55439; fixtures en websiteqa. El runner de migraciones retiene una base desechable con nombre website_migration_<timestamp>; booking crea un schema temporal validado que elimina al terminar. No usar estos seeds en staging/producción.

~~~powershell
./scripts/start-websites-local.ps1
node scripts/test-website-migrations.mjs
node scripts/test-websites-local.mjs
node scripts/test-website-actions-local.mjs
npm test
$env:PURAGENDA_BOOKING_TEST_DATABASE_URL='postgresql://websiteqa@127.0.0.1:55439/puragenda_booking_api_test'
node scripts/test-booking-api-local.mjs --all
npm run lint
npm run typecheck
npx prisma validate
npx prisma generate
node scripts/dev-websites-local.mjs --build
node scripts/audit-bella-source.mjs --verify
~~~

Para el navegador, ejecutar auditWebsiteBuilderLayout(tab, viewport) de scripts/qa-website-layout.mjs con el tab autenticado activo y la capacidad viewport de Codex; restaurar viewport después. La evidencia de esta rama se generó con la misma secuencia de mediciones.

[Negocio A](http://bella-a.localhost:3005/), [B](http://bella-b.localhost:3005/), [C](http://bella-c.localhost:3005/), [editor](http://localhost:3005/dashboard/website), [preview](http://localhost:3005/website-preview).

Usuarios de fixtures: website-qa-a@example.test / website-qa-b@example.test / website-qa-c@example.test. Contraseña exclusiva de la base local: Bella-local-qa-2026! Entitlement mock hasta 31 de diciembre de 2026.

Incidencia de aislamiento de QA: el launcher inicial conservaba Resend y una corrida previa registró dos notificaciones enviadas. Se bloqueó RESEND_API_KEY/SMTP para las ejecuciones siguientes, junto con credenciales de pagos, Cloudinary y analytics. No se emitieron nuevas notificaciones externas en la QA final. Billing se probó con mocks; no se efectuó un checkout Paddle ni upload Cloudinary remoto.

Los logs y archivos de runtime permanecen ignorados en scratch/artifacts/.next-* y no forman parte de los commits. Esta página y sus capturas/mediciones son documentación deliberada de la auditoría.
