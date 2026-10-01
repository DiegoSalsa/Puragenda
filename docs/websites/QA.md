# QA de Sitio Web Puragenda

Validación realizada entre el 30 de septiembre y el 1 de octubre de 2026, exclusivamente con datos demostrativos/locales. Referencia congelada: `purocode-demos /studio`. Puragenda: demo, preview autenticado y runtime por hostname.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| Suite completa Vitest | 168 archivos aprobados, 2 omitidos; 949 tests aprobados, 21 omitidos |
| Website unitarios | 5 archivos, 30 tests aprobados |
| Lint | 0 errores, 32 advertencias existentes |
| Typecheck | Aprobado |
| Prisma validate / generate | Aprobados; SQL exacto aplicado sobre baseline local, sin drift ([evidencia](qa/prisma-migration.txt)) |
| Build Next.js local aislado | Aprobado, rutas nuevas incluidas |
| HTTP/DB multi-tenant local | 19 comprobaciones aprobadas; [evidencia](qa/http-tests.json) |
| Integridad referencia | 58 hashes y estado/commit iguales al congelado |
| Assets | 10 WebP portados con SHA-256 idéntico |

Las últimas modificaciones posteriores a la suite completa tuvieron validación focalizada y typecheck/lint adicionales. No se ocultaron tests fallidos ni se cambiaron expectativas de tests existentes para acomodar el feature.

## QA visual

Se utilizó navegador real, con la referencia ejecutada desde una copia para no escribir en el original. Tamaños: **1440×900, 1280×900, 390×844 y 360×800**. A y B comparten el mismo renderer. Las capturas están en [qa/](qa/); las mediciones verificables en [viewport-metrics.json](qa/viewport-metrics.json).

| Elemento | Verificación |
| --- | --- |
| Hero, marca, fotografía | Comparación de original/A en los cuatro tamaños; B con nombre largo e imagen distinta |
| Tipografía | Bricolage Grotesque y DM Sans observadas en estilos computados |
| Proporciones | Alto de fotografía original/A: 374.39 px a 1440, 332.80 a 1280, 300 a 390/360 |
| Responsive | En los 12 casos medidos, scrollWidth igual a clientWidth; sin overflow horizontal del documento |
| Portfolio | Composición, filtros, rail; Chrome deja una imagen; lightbox abre/cierra |
| Motion | Entrance y reveal visibles; pausa comprobada con animationPlayState=paused; reanuda |
| Servicios | Detalle/imagen/precio, selección y vista móvil; precios reales también comprobados por HTTP |
| Estudio | Fotografía/proporciones y selector de proceso en ambas versiones |
| Navegación | Menú móvil abre/cierra, enlaces ancla y CTA inician booking |
| Booking | Calendario original/Bella en desktop y móvil, navegación de pasos, profesionales y opciones |
| Booking real | Flujo de cinco pasos completado en host público A; Appointment guardado por el escritor canónico |
| Footer | Composición original/Bella en desktop; crédito y contenido dinámicos intencionales |
| Preview | Autenticado sin dashboard/marketing; iframe móvil cargado y noindex verificado |
| Editor | Guardar → preview → publicar; borrador no cambia público; URL insegura muestra error de campo; restauración guardada/publicada |

El ejemplo de reserva real terminó en **cita recibida (PENDING)** según la configuración canónica, y Bella lo mostró correctamente. [Captura](qa/bella-booking-received.jpg). No se confundió con confirmación automática.

No se detectó degradación visual evidente en las vistas inspeccionadas. Las diferencias intencionales están en [BELLA.md](BELLA.md). No se realizó comparación automatizada pixel-perfect, emulación de reduced-motion del sistema, medición CWV ni auditoría de accesibilidad exhaustiva. El soporte reduced-motion/foco/Escape se conserva en código; no se afirma una certificación adicional.

## Dos negocios

| | A | B |
| --- | --- | --- |
| Nombre | Estética Bella | Aura Beauty Atelier |
| Paleta | Coral | Ciruela |
| Portada | Manicure rojo | Pestañas |
| Servicios | 7 tratamientos del catálogo de referencia | Diseño de cejas / Lifting premium |
| Precios iniciales | Desde $8.000; permanente $18.000 | $19.500 / $32.500 |
| Profesionales | Antonia / Camila | Valentina |
| Galería | 6 trabajos | 2 trabajos diferentes |
| Runtime | bella-a.localhost:3005 | bella-b.localhost:3005 |

Los registros canónicos en PostgreSQL tienen IDs distintos y asignaciones propias. La suite HTTP prueba que IDs de A no pueden reservarse desde B; también modifica un precio canónico y verifica que la web lo refleja sin publicar de nuevo. Las fotos de prueba provienen del conjunto autorizado de referencia, con selección distinta; no se hicieron pasar por fotografías de un negocio real.

## Ejecutar localmente

Requiere Node/dependencias y PostgreSQL 17. Desde la raíz de Puragenda:

```powershell
./scripts/start-websites-local.ps1
```

Solo inicializa `scratch/website-pg`, escucha en `127.0.0.1:55439` y usa la base `websiteqa`. Nunca utiliza DATABASE_URL remota. El seed es repetible sobre los IDs `website-qa-*`, conserva las reservas de prueba y restaura contenido de fixtures. No ejecutar ese seed como una migración de un entorno existente.

- [Negocio A](http://bella-a.localhost:3005/)
- [Negocio B](http://bella-b.localhost:3005/)
- [Editor](http://localhost:3005/dashboard/website)
- [Preview real](http://localhost:3005/dashboard/website/preview)
- [Preview móvil](http://localhost:3005/dashboard/website/preview?viewport=mobile)

Usuarios locales: `website-qa-a@example.test` y `website-qa-b@example.test`. Contraseña de fixtures: `Bella-local-qa-2026!` (solo base local de QA). El launcher elimina credenciales de correo, pagos y analytics de su proceso. El entitlement mock expira el 31 de diciembre de 2026; ajustar únicamente fixtures locales para QA posterior.

```powershell
node scripts/test-websites-local.mjs
node scripts/audit-bella-source.mjs --verify
npm test
npm run lint
npm run typecheck
npx prisma validate
node scripts/dev-websites-local.mjs --build
```

Build usa `.next-websites-build`; dev usa `.next-websites-qa`. Son ignorados por Git y no equivalen a deploy. Para detener PostgreSQL:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe' -D './scratch/website-pg' -m fast -w stop
```

Detener primero el proceso dev de esta sesión. Si Windows deja el hijo Next escuchando al interrumpir el launcher, identificar el PID de **3005**, comprobar que corresponde a este checkout y detener únicamente ese proceso. No detener el PostgreSQL global ni otros servidores del usuario.

## Pendientes de infraestructura autorizables después

Aplicar migración en un entorno de staging aprobado; configurar Cloudinary y comprobar upload real; configurar catálogo/checkout/webhooks Paddle sandbox y probar pagos reales de sandbox; implementar adapter del proveedor con routing/TLS; después configurar DNS y producción solo con autorización. No se ejecutó ninguno de esos cambios externos en esta fase.
