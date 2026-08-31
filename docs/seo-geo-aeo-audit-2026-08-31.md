# Auditoría SEO, GEO y AEO de Puragenda

Fecha: 31 de agosto de 2026

Mercado prioritario: Chile, español

Fuente principal: Google Search Console de la propiedad de dominio `puragenda.cl`, código de la aplicación y auditoría Lighthouse móvil.

## Resumen ejecutivo

Puragenda ya tiene una base técnica sana: HTTPS, sitemap, canonicals, robots, datos estructurados y buen CTR cuando logra visibilidad. La limitación principal no es una penalización técnica; es la baja cobertura de búsquedas comerciales y la corta historia del dominio.

La oportunidad más clara consiste en:

1. responder búsquedas transaccionales de sistema de reservas en Chile;
2. crear páginas específicas por problema y rubro;
3. convertir el tráfico con demostración, WhatsApp y captura de correo medible;
4. reforzar entidad, autoría y respuestas breves para buscadores generativos;
5. conseguir autoridad externa y casos de clientes después del despliegue.

## Línea base de Search Console

Período disponible: 3 de mayo al 29 de agosto de 2026.

- 42 clics, 411 impresiones, CTR 10,2 % y posición media 6,4.
- Chile concentra 41 de los 42 clics y 367 impresiones.
- La home genera 31 clics y 143 impresiones.
- El widget de Soccer Barber genera 8 clics y 68 impresiones, señal de demanda local y de marca del cliente.
- La comparación con AgendaPro tenía 55 impresiones; FAQ, 51; precios, 15.
- Search Console registra 36 impresiones en resultados de IA generativa. La home aporta 20; FAQ, 5; la comparación AgendaPro y la guía de abonos, 4 cada una.
- Estado de indexación: 19 URLs indexadas y 28 excluidas. Las cuatro URLs «rastreadas, actualmente sin indexar» son recursos técnicos (manifest, fuente y favicon), no páginas comerciales.
- HTTPS: 10 URLs válidas y ninguna inválida.

Consultas visibles con oportunidad comercial:

- `sistema de reservas online chile`
- `sistema de agendamiento`
- `agenda pro precios`
- `¿cuánto cuesta agendapro?`
- `reserva online`
- búsquedas de barberías en Osorno

## Diagnóstico SEO

### Fortalezas

- CTR alto para un dominio joven.
- Canonical consistente hacia `https://www.puragenda.cl`.
- Sitemap con URLs públicas y sin paneles o widgets privados.
- Datos estructurados de organización, software, artículos, FAQ y breadcrumbs.
- Las páginas públicas probadas devuelven 200, un solo H1 y contenido renderizado en HTML.
- HTTPS correcto y sin páginas comerciales atrapadas en «rastreadas, no indexadas».

### Brechas corregidas en esta implementación

- Titles y descriptions genéricos o heredados por página.
- Imagen social pequeña y genérica.
- Ausencia de páginas por función y cobertura limitada por rubro.
- Comparación AgendaPro sin respuesta directa a la consulta de precio y casi sin enlaces internos.
- Página de precios con poco contexto semántico y sin FAQ específica.
- Formulario de contacto que abría WhatsApp, pero no conservaba el lead por correo.
- Falta de atribución de primera visita en eventos de conversión.
- Autoría y fecha de revisión poco visibles en las guías.
- Imágenes del logo y medios de pago sin dimensiones u optimización adecuada.
- Zoom móvil desactivado.

### Pendientes externos

- Publicar casos reales y testimonios verificables, con permiso del cliente.
- Obtener enlaces y menciones desde asociaciones, directorios sectoriales, partners y clientes.
- Completar y mantener Google Business Profile si el negocio atiende desde una ubicación o área de servicio elegible.
- Trabajar landings locales solo donde exista evidencia, cliente o capacidad comercial real; no crear páginas de ciudades en masa.

## Diagnóstico GEO y AEO

GEO se entiende aquí como optimización para motores generativos; AEO, como optimización para respuestas directas.

### Señales favorables

- Google ya muestra contenido de Puragenda en el informe de IA generativa.
- FAQ, guías y la comparación aportan impresiones, por lo que el formato de respuesta ya tiene tracción.
- La entidad Puragenda se relaciona mediante Organization y SoftwareApplication.
- Los agentes de búsqueda principales están permitidos en `robots.txt`.

### Mejoras implementadas

- Bloques de «respuesta rápida» antes del desarrollo extenso.
- FAQs visibles y equivalentes en JSON-LD.
- Autor, editor, fecha de revisión y política de afirmaciones verificables en guías.
- `llms.txt` como índice auxiliar legible por agentes, sin sustituir sitemap ni robots.
- Datos estructurados seguros, serializados evitando cierre de script inyectable.
- Relaciones internas entre precio, alternativa, funciones, rubros, guías y contacto.
- Mensajes concretos sobre mercado, moneda, prueba y ausencia de comisión.

### Criterios editoriales siguientes

- Añadir fuentes primarias cuando una guía incluya estadísticas, regulación o datos externos.
- Evitar cifras de competidores sin fecha y evidencia; enlazar siempre a la fuente oficial.
- Incorporar casos con problema, configuración, período y resultado medido.
- Mantener cada respuesta breve consistente con el contenido detallado y con el producto real.

## Rendimiento y experiencia

Lighthouse móvil de referencia antes de los cambios:

- Rendimiento: 88
- SEO: 100
- Accesibilidad: 89
- Buenas prácticas: 100
- LCP: 3,6 s
- FCP: 1,8 s
- TBT: 80 ms
- CLS: 0
- JavaScript transferido: aproximadamente 348 KiB

Se corrigieron el bloqueo de zoom y dimensiones/optimización de imágenes detectadas. La mayor mejora pendiente es arquitectónica: las páginas comerciales siguen renderizándose dinámicamente por la sesión y el idioma basado en cookie. Separar marketing estático del área autenticada permitiría caché pública, menor TTFB y menos JavaScript, pero requiere una refactorización aislada y medición posterior.

## Medición de captación

Eventos incorporados:

- `contact_lead_submitted`
- `whatsapp_clicked`
- CTAs de las nuevas páginas de funciones
- landing original, referente externo y UTM de primera visita en pasos comerciales

Los campos están sujetos a una lista permitida y no guardan nombre, correo, teléfono ni mensaje en analítica. El formulario envía una copia segura al correo administrativo, mantiene WhatsApp como canal inmediato, valida origen, aplica honeypot y limitación distribuida.

## Validación y despliegue

- Build de producción: correcto.
- TypeScript: correcto.
- ESLint de archivos afectados: sin errores.
- Suite: 333 pruebas superadas y 2 omitidas; además, 6 pruebas dirigidas de SEO/analítica superadas tras los últimos cambios.
- Sitemap local: 27 URLs públicas.
- Home, precios, alternativa AgendaPro, función de abonos, psicólogos y guía principal: 200, canonical y Open Graph correctos.
- Imagen Open Graph: PNG 1200 × 630 accesible.

No se solicitó indexación en Search Console todavía: Google debe recibir primero el despliegue. Después de publicar, enviar el sitemap actualizado, inspeccionar las nuevas URLs y solicitar indexación de un grupo prioritario pequeño.

Prioridad sugerida tras desplegar:

1. `/`
2. `/pricing`
3. `/alternativa-agendapro`
4. `/funciones/reservas-online-con-abono`
5. `/funciones/agenda-multiples-profesionales`
6. `/para/barberias`
7. `/para/psicologos`

Revisar resultados a 28 y 56 días usando impresiones no de marca, clics a WhatsApp/contacto, registros iniciados y registros completados por landing original.
