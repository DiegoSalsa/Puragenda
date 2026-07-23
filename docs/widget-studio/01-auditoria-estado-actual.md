# 01 — Auditoría del estado actual

Fecha de auditoría: 23 de julio de 2026.

## Alcance revisado

La auditoría se realizó sobre la implementación local actual, incluyendo cambios todavía no consolidados en Git. Se revisaron:

- `prisma/schema.prisma`;
- migración `20260722203000_widget_studio_access_profiles`;
- editor `appearance-form.tsx`;
- página `appearance/personalizado`;
- galería `temas-gallery.tsx`;
- acciones `appearance-studio.actions.ts` y `dashboard.actions.ts`;
- página pública `widget/[slug]/page.tsx`;
- renderer `widget-client.tsx`;
- catálogo de permisos;
- configuración de Cloudinary;
- configuración de cabeceras de Next.js;
- dependencias y scripts de `package.json`;
- presencia de pruebas automatizadas.

## Capacidades verificadas

| Área | Estado actual comprobado |
| --- | --- |
| Vista previa | El editor muestra el widget real en un `iframe` y envía overrides visuales por query string |
| Tokens visuales | Color primario, secundario, fondo, texto principal, texto secundario, tamaño base, radio, sombra y alineación del header |
| Guardado | `Guardar cambios` actualiza directamente campos de `Business` |
| Temas propios | `WidgetTheme` guarda presets por negocio con nombre y categoría |
| Galería | Búsqueda, categorías, origen, familia de color, orden, preview ampliada, duplicar y eliminar |
| Imágenes promocionales | `WidgetPromoBlock` admite título, subtítulo, imagen, enlace, posición, visibilidad y alineación |
| Ubicaciones actuales | `HEADER`, `BETWEEN_SERVICES` y `FOOTER` |
| Archivos | PNG, JPEG y WebP; límite declarado de 8 MB; Cloudinary limita a 1400 × 700 |
| Permisos | La edición requiere `appearance.manage` |
| Aislamiento | Temas y banners se consultan con `businessId` |
| Widget público | Sigue el flujo real de servicios, opciones, profesional, fecha, datos, recurrencia y pagos |
| Compatibilidad embebida | La ruta `/widget/:slug` está pensada para poder cargarse en un `iframe` |

## Fortalezas que deben reutilizarse

### La vista previa ya usa el widget real

No hace falta construir un mockup diferente al producto. La evolución correcta es mantener una única fuente de render para preview y producción.

### Los tokens visuales ya existen

Los campos actuales de `Business` y `WidgetTheme` son una base útil para un sistema de tokens versionado.

### Ya existe contenido promocional

Los banners actuales validan la necesidad de imágenes y posiciones. Deben convertirse en bloques migrables, no desecharse.

### Ya existe control de permisos

`appearance.manage` permite que un profesional con un perfil autorizado edite el widget sin darle acceso total al negocio.

### La galería de temas ya está separada

La distinción entre temas y personalización es correcta. El nuevo editor debe reforzarla, no mezclar presets con estructura.

## Limitaciones verificadas

### No existe separación entre borrador y producción

Los tokens se guardan directamente en `Business`. Crear, ocultar, mover o eliminar un banner también muta el estado que consume el widget público. No hay publicación explícita ni recuperación de la versión anterior.

### El modelo de contenido está limitado a banners

`WidgetPromoBlock` no representa:

- texto independiente;
- botones;
- galerías;
- espaciadores;
- columnas;
- fondos de sección;
- overlays;
- visibilidad por dispositivo;
- contenido por paso del flujo;
- configuración detallada de imagen.

### Las posiciones son demasiado generales

Solo existen tres ubicaciones. `BETWEEN_SERVICES` se renderiza antes de la lista de servicios y no permite ubicar una imagen entre tarjetas concretas ni en otros pasos.

### El renderer concentra demasiadas responsabilidades

`widget-client.tsx` contiene el estado completo de reserva y el render visual en un componente grande. Introducir edición avanzada directamente allí aumentaría el riesgo de regresiones.

### No existe un modelo de archivos

La URL de Cloudinary queda guardada en el bloque, pero no se registran de forma estructurada:

- `publicId`;
- ancho y alto reales;
- tamaño;
- tipo validado;
- propietario;
- texto alternativo;
- estado de uso;
- política de eliminación.

### Validación de archivos incompleta

La validación actual confía en el MIME informado por el navegador. Falta validar firma binaria, dimensiones reales, URL resultante y límites por negocio.

### Accesibilidad incompleta

Los banners públicos usan `alt=""` aunque el contenido puede ser significativo. El futuro editor necesitará texto alternativo, navegación por teclado y controles equivalentes al drag and drop.

### No existe historial o rollback editorial

No se puede ver quién publicó, comparar versiones, restaurar una versión anterior ni deshacer una eliminación ya persistida.

### No existe infraestructura formal de pruebas del editor

El repositorio no presenta una suite reconocible de pruebas unitarias, de integración, E2E o regresión visual para este flujo. Hay archivos de datos y scripts de prueba, pero no una red de seguridad automatizada suficiente para una migración de renderer.

### Riesgo de seguridad en contenido futuro

La ruta del widget necesita ser embebible, pero una personalización más poderosa ampliará la superficie de CSP, enlaces, imágenes y contenido. Permitir HTML, CSS o JavaScript arbitrario sería incompatible con el nivel de seguridad necesario.

## Invariantes funcionales del widget

El editor V2 debe preservar:

- selección simple o múltiple de servicios;
- opciones por servicio;
- asignación de profesional global o por servicio;
- horarios del negocio y del profesional;
- pausas;
- intervalos;
- bloqueos;
- reservas del mismo día;
- anticipación mínima;
- reservas recurrentes;
- formularios de salud;
- datos requeridos;
- abonos y pagos;
- confirmación final;
- lógica de disponibilidad;
- API de creación de reserva.

La estructura visual puede cambiar. La lógica operativa no se reimplementa dentro del editor.

## Deuda técnica relevante antes del editor avanzado

1. Separar la máquina de estados de reserva del árbol visual.
2. Extraer componentes funcionales estables por paso.
3. Definir un esquema versionado de documento.
4. Crear un renderer validado y registrable por bloques.
5. Incorporar borrador, publicación y rollback.
6. Formalizar pruebas del flujo legacy antes de modificar su render.
7. Crear un modelo de activos multimedia.
8. Instrumentar errores de render y publicación.

## Riesgos principales

| Riesgo | Impacto | Tratamiento recomendado |
| --- | --- | --- |
| Cambiar widgets existentes | Crítico | Dual-read, opt-in y snapshot visual previo |
| Romper el flujo de reserva | Crítico | Bloques del sistema protegidos y pruebas E2E |
| Diseño correcto en editor pero roto en `iframe` | Alto | Preview con el mismo renderer y matriz de tamaños |
| Imágenes pesadas | Alto | Transformaciones, `srcset`, lazy loading y presupuestos |
| Posicionamiento libre roto en móvil | Alto | Libertad acotada a sección y overrides por breakpoint |
| Pérdida de cambios | Alto | Autosave, revisión optimista e historial |
| IDOR entre negocios | Crítico | Filtro obligatorio por `businessId` en toda acción |
| Documento JSON inválido | Alto | Esquema Zod versionado y fallback publicado |
| Borrar activos usados | Medio | Referencias y eliminación diferida |
| Editor demasiado complejo | Medio | Modo Básico, defaults buenos y disclosure progresivo |

## Conclusión

La base actual permite avanzar, pero no es seguro agregar drag and drop y posicionamiento libre directamente sobre `WidgetPromoBlock` o guardar cada cambio en `Business`.

El primer trabajo de implementación futuro debe ser la capa de seguridad editorial —documento validado, borrador, publicación, renderer compartido y compatibilidad legacy— antes de ampliar el catálogo visual.
