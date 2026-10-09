# Y2K — template activo

Integración del diseño aprobado · 8 de octubre de 2026.

Y2K v1 está registrado con la clave `y2k` y aparece en **Mi sitio → Diseño → Cambiar diseño → Y2K → Usar diseño**. No requiere migraciones. El renderer conserva la composición, Love Pocket, álbum, ventanas y animaciones aprobados. La demo usa únicamente la identidad genérica Y2K y no enlaza a un negocio real.

## Personalización y publicación

- Editor nativo con guardado automático, control de revisión, recuperación de errores y vista previa en escritorio/móvil.
- Nombre/logo del negocio, titular en dos líneas, bajada, foto principal, favicon, textos, cuatro colores, visibilidad y mensajes del Pocket.
- Fotos propias, categorías, descripción accesible, encuadre, orden y retirada desde la biblioteca de medios existente.
- Guía de reserva, presentación del negocio, condiciones, contacto, redes, metadatos de Google e imagen al compartir.
- Dominio y suscripción reutilizan los paneles existentes. No se cambiaron cobros ni permisos.
- La selección conserva los datos compartidos del negocio. Los ajustes de cada diseño quedan en snapshots y se recuperan al volver. La identidad publicada cambia solamente al publicar.

La configuración inicial no contiene nombre comercial, redes de terceros ni fotos de muestra. Las imágenes de demostración están en un fixture separado. Los servicios, precios, opciones, profesionales, sucursales y horarios del sitio real vienen de los datos del tenant. Las reservas y su cotización utilizan el flujo canónico existente.

La publicación exige portada, titular, contraste suficiente y condiciones completas si se activa esa sección, además de los requisitos de acceso y propiedad de medios existentes. Los blobs del navegador se permiten únicamente para una vista previa del mismo origen; no se pueden guardar. El iframe comprueba origen, ventana emisora y secuencia.

## Verificación reproducible

```powershell
./scripts/start-websites-local.ps1 -PrepareOnly
node scripts/dev-websites-local.mjs
# En otra terminal:
node scripts/qa-y2k-template.mjs
```

El runner comprueba selección, persistencia al recargar, portada y galería subidas, categorías, contacto, SEO, vista móvil, publicación, imágenes públicas, apertura de reservas y restauración del diseño. Usa exclusivamente PostgreSQL local `127.0.0.1:55439/websiteqa` y medios mock. Restaura el sitio de prueba y retira sus imágenes al terminar. No crea reservas ni usa proveedores de pago, correo o dominios externos. Evidencia: `output/pink-y2k/native-template/report.json` y capturas en ese directorio.

Resultados de la revisión para publicar, sobre `main` actualizado: 1.206 pruebas aprobadas y 84 omitidas (189 archivos aprobados y 4 omitidos); TypeScript y build de producción correctos; lint sin errores y con 32 advertencias preexistentes. El recorrido nativo pasó sus 18 comprobaciones sin errores del navegador, incluida la ampliación de la portada correcta. La regresión de movimiento pasó en 320, 360, 390, 430, 768, 1280 y 1440 px, incluyendo pausa, teclado, touch, movimiento reducido y contenido sin JavaScript.

La comprobación visual y funcional del prototipo también pasó en esos siete anchos: sin desbordamientos ni imágenes rotas; cero incidencias de axe en móvil y escritorio; reserva demostrativa completa con opciones, total y duración canónicos, sin llamadas a APIs. Reportes: `output/pink-y2k/qa-report.json` y `output/pink-y2k/motion/qa-motion-report.json`.

El prototipo privado sigue disponible en [localhost:3007/website-preview/pink-y2k](http://localhost:3007/website-preview/pink-y2k), con su guardia de desarrollo y loopback. La demo que usa el renderer registrado está en [localhost:3005/website-demo/y2k](http://localhost:3005/website-demo/y2k), solo en el entorno de QA de desarrollo. Los negocios usan el renderer registrado en sus dominios públicos habituales.

La entrega se publica mediante [PR #1](https://github.com/DiegoSalsa/Puragenda/pull/1) a `main` y el despliegue de producción existente de Vercel. El diseño queda disponible en [Mi sitio](https://www.puragenda.cl/dashboard/website), dentro de Diseño → Cambiar diseño → Y2K. Seleccionarlo guarda un borrador; cada negocio conserva el control de publicar su sitio.

## Dependencias y comprobaciones de publicación

La revisión actualizó Next.js, `@next/third-parties` y `eslint-config-next` a 16.3.8, Sharp a 0.35.5 y dependencias transitivas con correcciones compatibles. El rango de Next.js permanece en 16.3.x. `npm audit --omit=dev --audit-level=high` no reporta vulnerabilidades.

La auditoría completa conserva nueve avisos altos en herramientas de desarrollo (ESLint/shadcn), derivados de [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), sin versión corregida disponible durante esta revisión. No se forzaron cambios de versión mayor ni se redujeron las comprobaciones de CI. GitHub Actions no inició los jobs por un bloqueo de facturación de la cuenta; lint, TypeScript, suite completa y build se ejecutaron localmente sobre los archivos de la entrega. La preparación local también incorpora la migración de `WebsitePurchaseIntent` que ya existía en `main`, para permitir repetir el recorrido con fixtures antiguos.
