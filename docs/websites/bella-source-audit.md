# Bella: referencia congelada

Fuente de solo lectura: C:\Users\diego\Desktop\purocode-demos. Commit: 1bc127d3368d9a67b01335a0b08b5ff305f5eefe. El manifiesto SHA-256 conserva también los cambios locales de la referencia. No se ejecutó ni editó el proyecto original.

## Arquitectura y componentes

Next.js App Router. page.tsx carga catálogo en servidor; layout.tsx aplica fuentes y SEO noindex. Header (menú móvil/Escape), Action (CTA e icono animado), Portfolio (filtros, rail, diálogo nativo, marquee con pausa), Services (selección/detalle/opciones), Studio (selector de proceso), BookingSection (sesión y carga diferida), BookingFlow (5 pasos, errores, conflicto, idempotencia, resultado incierto), Motion (IntersectionObserver).

## Diseño vs datos

Template: composición editorial, escalas tipográficas, espaciados, fotografía, rail asimétrico, colores controlados, CSS, transiciones, UI de booking. Datos a parametrizar: wordmark ESTÉTICA/BELLA, headline, introducción, fotografías/alt/captions, portfolio/categorías, proceso/nosotros, contacto, redes, SEO. Servicios/precios/duraciones/opciones, profesionales/asignaciones, sucursales y horarios proceden del catálogo canónico; no se guardan en website config.

## Fuentes, CSS y motion

Bricolage Grotesque (--bella-display), DM Sans (--bella-body), next/font/google con display swap. Variables locales --red, --red-text, --ink, --paper, --gray, --line, --ease. CSS Modules, sin dependencia del dashboard. Animaciones CSS masthead, shutter, galleryChange, drift, enter; IntersectionObserver threshold .12; motion/react solo en iconos con useReducedMotion. Pausa explícita del marquee, prefers-reduced-motion, focus-visible y skip link.

## Responsive

- @media (max-width: 700px)
- @media (min-width: 1700px)
- @media (max-width: 1100px)
- @media (max-width: 700px)
- @media (max-width: 370px)
- @media (prefers-reduced-motion: reduce)

Validar 1440×900, 1280×900, 390×844, 360×800. Wordmark largo debe caber sin recortar, galerías variables y bloques vacíos deben ocultarse.

## Booking

UI local con reducer (service/options/location/staff/date/slot/customer), 5 pasos y carga diferida. Adapters demo, legacy HTTP y v1. El provider v1 convierte el contrato público existente; demoAvailability es fixture, no un motor real. La migración conserva la UI pero utiliza loadBookingContext/toBookingCatalog/getBookingAvailability y el POST canónico de Puragenda con Idempotency-Key. Las API keys quedan exclusivamente en servidor; previews no crean citas.

## Dependencias

next/image, next/font/google, next/dynamic, React hooks, motion/react, IntersectionObserver, matchMedia, HTMLDialogElement, AbortController, crypto.randomUUID, Intl y fetch. Dependencias compartidas de iconos incluidas en el manifiesto. Puragenda ya dispone de motion, Next y React; no se añade otro motor de motion.

## Archivos exactos

| Archivo | Bytes | SHA-256 |
| --- | ---: | --- |
| docs/demos/studio/ASSETS.md | 3127 | b8b0ab1aafb47f90c1d4b20f66981d8f9b4ded98f5b4eeaeb22ac005dbf1b45b |
| docs/demos/studio/DELIVERY.md | 7337 | 5eba1e9a4b42935e8765a2dfb04ad721750ff9c8006a247250e8390ae2b9c3f3 |
| docs/demos/studio/DESIGN.md | 7613 | 21f7430de9b0e3b86eab1213a6b72bd3db1b74e59ef7f2bb680223d457315a3e |
| docs/demos/studio/INTEGRATION.md | 6626 | d96627eac0d6ec08a665a4fa65eb9787f7c7f57442f73a98b2e20da1fca87dd1 |
| docs/demos/studio/PRODUCTION.md | 2850 | 2522f18f4a65c7441163742e1f27ae9cf63fb09fdc72fad6c9e58547a8c2d330 |
| docs/demos/studio/PROMPT_PURAGENDA_API.md | 11339 | dc864fdca1c5fe214dd9d48f2a003034a5e03df8502b33ee34597e3e5128e652 |
| docs/demos/studio/PURAGENDA.md | 10486 | 14902bb0dc2070193141c22d6423c8b2240c6ea34e38f51c8adedbb41fa82464 |
| docs/demos/studio/QA.md | 6330 | 7cbff67ac837cc30fd7da6e342f5a1b213682930f169da60c7273e0f8701d855 |
| docs/demos/studio/design/booking.webp | 71464 | 89bbc319dc8d9dd9fcb775e74c4b15ce19a625bf014f30fe6b0fefd3da58915a |
| docs/demos/studio/design/hero.webp | 70744 | ab9cc3a00a8671a57050a0eabbc5f915dad41c1ace85463edb93c4bb616de5ce |
| docs/demos/studio/design/portfolio.webp | 86738 | e4331bb952138b334631f23647f1cb32805671b9e1533cd073c5727933bebf51 |
| docs/demos/studio/design/services.webp | 85316 | ffa93d0e151a54d741098639784553d6bee00c50c275c53ff5bcbc808619edfb |
| docs/demos/studio/design/studio.webp | 88446 | fab5fdfd50f16ef9761e08c2fe7b1f71b907eb038f9f1752c06d6f682937a863 |
| next.config.ts | 313 | 690a751a8ad1c6f8fd47cc8d1e08209d835eec77030e2a59af78d80a4ab7519c |
| package.json | 702 | 9fe2c9805c6179bd455ed985768cea31fe383a93fbd1224732e11db4111c4838 |
| public/demos/studio/hero/red-chrome.webp | 97122 | 0197a576f584d6c9f4ecb3bdaf600c9042f1eabd1f5a7e4a2679ab5f02f44359 |
| public/demos/studio/portfolio/art.webp | 92536 | 3a1bf49d484c93ba10ba6a0f70c7f3659fadc7a36cf5b2a3a5e1925083041213 |
| public/demos/studio/portfolio/chrome.webp | 118496 | 5f8525515c2b417d8fda473dd0deeaaef654934170a92f90818bdca9f7b2926e |
| public/demos/studio/portfolio/french.webp | 93762 | f4ee6471cfe79d21e84ac14b4a9f86c3378ad21f99ce4ce00b3078567a64f9e2 |
| public/demos/studio/portfolio/red.webp | 61388 | 1ff87602fe88c2ac3e07b267aae31742a7b235d10e20f3b4ebbab4a7ebbbd652 |
| public/demos/studio/services/brows.webp | 189418 | 6eaa713da2bb56b1e6ede6c650e7ae20d7ca4049b06973f4df10b28f9975d97d |
| public/demos/studio/services/lashes.webp | 126686 | 22fbb8e58922b0edaa28c1e0b2cef6d13698ff331d2c395e1581046befcdf315 |
| public/demos/studio/services/permanente.webp | 61388 | 1ff87602fe88c2ac3e07b267aae31742a7b235d10e20f3b4ebbab4a7ebbbd652 |
| public/demos/studio/studio/process.webp | 111154 | 231520d5c46085aebc228c124d077644839ac5270a49f4243022fa6a24fe2ffd |
| public/demos/studio/studio/space.webp | 101216 | bb5adc232899416ea1d199d2f0a957f3ff6bd466538f6bf62cab24f985f1bcdf |
| src/app/globals.css | 250 | 84b2bcfe8a6f64333d4ac9d71e0346e801c1c810dfe5af855b35e45c54392f8f |
| src/app/layout.tsx | 548 | 8f728e69a9db465c2200420f9d715cd65dfe5f3b663b1f02cd397ea63e8b8619 |
| src/app/studio/_components/Action.tsx | 1005 | 1d5a5cd071f11559130d02de7cf88d46b371985e4398b6b54adf85bdcd7b2fcd |
| src/app/studio/_components/BookingFlow.tsx | 21575 | c59afb925dc7f0c948131bbfae1685f80948431614aacc33878d2e7691113ae2 |
| src/app/studio/_components/BookingSection.tsx | 3738 | 68f02c4888776a74866faf3ba23ace4f6d790ec218de2122f03556e1b5eb7bc7 |
| src/app/studio/_components/Header.tsx | 1267 | 72f6596eb96230a0863071331396a5ef0aa2b018c553564a5b9315bac52b208e |
| src/app/studio/_components/Motion.tsx | 888 | 3969c3e979278d6280ab6687b346e50c31d2eb9f4fef402eb25b1ea235f98853 |
| src/app/studio/_components/Portfolio.tsx | 3777 | 05b151f34ae235a2e88932b52a9cd847fb162544e001bebc22455c605cae0a10 |
| src/app/studio/_components/Services.tsx | 3864 | 1106eabd4d0ac069f1258fe6145bcd2fcefeb20a3dc3a5f334d214638b9eae36 |
| src/app/studio/_components/Studio.tsx | 2086 | 43fe1f435ca70509991b48b64208e7fbbb4a574ac852af95b0664e4b64957355 |
| src/app/studio/_components/booking-events.ts | 176 | 5948589d56da31828cc8028e8a6e730f91fac0d540bebbd73d8cb7881362505c |
| src/app/studio/_data/portfolio.ts | 1505 | 30e341986c4a161e9525557c03577240f8db83220a4c0cf1c9a87fe16d1706f2 |
| src/app/studio/_lib/booking-state.ts | 1839 | 12f8a4932b71372fdbb86cbb5d92b2d77cfe2a86b305f3c2757a08f7b0aed5ca |
| src/app/studio/_lib/puragenda/booking-handler.ts | 2697 | 211a5fe736d82670a8ff2874eb61e3e2b35f0948c35a901b5f3289ddbd7d94ea |
| src/app/studio/_lib/puragenda/client.ts | 2461 | 016bdc99d83077120f7b33b50472d6d378e91b97870126fd9e920f01ff4c7274 |
| src/app/studio/_lib/puragenda/config.ts | 1394 | dd92aa6d9b82112a18e0110987a52dab7837c806822475bbf127b805b2450c49 |
| src/app/studio/_lib/puragenda/demo.ts | 4184 | 589a510cc3ee49c370118f97927d3fe97b881a09e9a53c444c23315bc6a3cea8 |
| src/app/studio/_lib/puragenda/errors.ts | 636 | 8e8934bdeb18cdfdc0c9740a9407efe1a85000afdfe3f00e5c2e8180d6c15946 |
| src/app/studio/_lib/puragenda/guard.ts | 4344 | 62b136a2c3036ea5d17ded88646cf8e0774fcf0a4b02811e3f403fb5352c2c8c |
| src/app/studio/_lib/puragenda/http.ts | 11583 | 43f0d635f036ccd21a9b678cc5de6fcb88a63fb9833c8afa37c98b00ba7082f6 |
| src/app/studio/_lib/puragenda/provider.ts | 1451 | 8e50f3048486ae3086a3e80c2be2529c6934a24c448891e976bfb33c46a1f583 |
| src/app/studio/_lib/puragenda/types.ts | 2114 | f3e147555935eb93d529f6c3e455c42dfcda06fcab8ef87d6679d9cfa085506b |
| src/app/studio/_lib/puragenda/v1.ts | 9409 | 3f4fdc887e218059d59da32cc9d79ff3995c92c5232bd233b461f6ccb139692a |
| src/app/studio/_lib/puragenda/validation.ts | 5696 | a4d6802e1702ab86aee8a1732ff43ee0a4e3ce78dec617cffb44568d531ebdf8 |
| src/app/studio/api/availability/route.ts | 736 | 582e264f874fec8da9fc6c3ef4961e04cdc7f14dbe9491afd9bcfb1b1c78fdea |
| src/app/studio/api/book/route.ts | 266 | 16b12f4d0b9759cf7c3196eb831557e48de6d5a699ee4897f7834925d066a472 |
| src/app/studio/api/catalog/route.ts | 398 | 0b0c2b948aa7df8e1918f9187295ed88e9a9a0c7e41620c5d64919e9bb6cd13d |
| src/app/studio/layout.tsx | 1165 | abd0ab9d14e0af42f5b30de70b64283acb5da81c95b797568e699fb3e02d5559 |
| src/app/studio/page.tsx | 2895 | b3abc6122aa580c4ed972def8971ddeebe4e9775bef25a18b362938003c6129b |
| src/app/studio/studio.module.css | 32755 | a180f5f4d8c41b4de168715035b46fe74bb48db89f158eeff06a23f1d2517c35 |
| src/components/icons/arrow-narrow-right-icon.tsx | 1975 | 3d6bf065d1b6c8c4f6eeb631c26f8e95af72e50525d9f927ad28f2c220f1fb8a |
| src/components/icons/simple-checked-icon.tsx | 1848 | 23346bbd0f0c3edcd11dbc0b1180099f87641f23a23a613265e1406fc62b478c |
| src/components/icons/types.ts | 1191 | 6f0146d5ecf4de1b291fda34f14acc10c1d7dbfb7583ea11f49fd94be1f75809 |
