# Widget Studio V2 — auditoría y project tracker

Fecha de corte: **29 de julio de 2026**

Rama auditada: **`testingWidget`**

Base integrada localmente: **`origin/TestingGeneral@56224bf`**

Delta de Widget Studio: **`24daf56` — `feat: aislar Widget Studio avanzado`**

Estado Git: **fusión validada localmente, todavía sin commit ni push**

Estado de salida: **no apto todavía para fusionar a producción**

## 1. Resumen ejecutivo

La rama ya contiene una base valiosa y coherente:

- borrador privado con guardado automático;
- publicación explícita e historial de versiones;
- renderer V2 detrás de `rendererEnabled`;
- modo Básico y modo Avanzado;
- selección visual y edición directa de textos;
- preview aislado por `iframe`;
- dispositivos móvil, tablet y escritorio;
- biblioteca de activos;
- bloques de texto, imagen, banner, botón, divisor y espaciador;
- secciones, capas, visibilidad responsive y overlay acotado;
- modo Diseñar que evita avanzar accidentalmente la reserva.

La auditoría encontró cuatro bloqueantes de producción. En el corte de implementación
del **29 de julio de 2026, 13:20 CLT**, los cuatro tienen resolución local verificable,
aunque el rollout a producción continúa bloqueado por la aceptación E2E y móvil:

1. **Resuelto:** las promociones legacy ya no se duplican cuando también se renderiza el documento V2.
2. **Resuelto:** las rutas internas relativas seguras ya no bloquean la creación del borrador.
3. **Aprobado en la copia local:** las cinco tablas V2 tienen RLS activo y cero grants para `PUBLIC`, `anon` o `authenticated`.
4. **Parcial avanzado:** pasan 20 archivos y 66 pruebas; 21 pruebas enfocadas cubren documento, renderer, servicios, permisos y activos. Falta E2E responsive y teclado.

La Fase B ya eliminó el cambio de altura por autoguardado, compactó el encabezado
móvil, retiró los tres scrolls horizontales, separó Diseñar/Probar mediante un
handshake explícito y dejó la ayuda del Studio dentro de su propia capa. Queda
validar el resultado en un Android real o emulador, no disponible en este equipo.

## 2. Leyenda

| Prioridad | Significado |
| --- | --- |
| **P0** | Puede afectar seguridad, datos, compatibilidad o el widget público. Bloquea producción. |
| **P1** | Rompe un flujo importante o degrada claramente la edición. Bloquea aprobación del Studio. |
| **P2** | Mejora de calidad, accesibilidad, rendimiento o mantenibilidad. |

| Estado | Significado |
| --- | --- |
| **Confirmado** | Reproducido o demostrado en código/datos. |
| **Parcial** | Existe una parte, pero no cumple la experiencia o garantía completa. |
| **Pendiente** | No implementado o no cubierto por pruebas. |
| **Aprobado** | Verificado en la auditoría actual. |

## 3. Bloqueantes P0

### WS-P0-01 — Eliminar la promoción duplicada al activar V2

- Estado: **Aprobado localmente**
- Evidencia visual: el mismo banner aparece una vez desde `WidgetDesignSlot` y otra desde `promoBlocks`.
- Evidencia técnica:
  - `src/app/widget/[slug]/page.tsx:256`
  - `src/app/widget/[slug]/preview/page.tsx:176`
  - `src/components/widget-studio/widget-design-renderer.tsx:394`
- Causa: las páginas pública y de preview entregan promociones legacy aun cuando también entregan un documento V2 que ya contiene su adaptación.
- Resolución:
  - definir una sola fuente de render por promoción;
  - cuando V2 esté habilitado, no renderizar de nuevo el bloque legacy ya adaptado;
  - mantener el renderer legacy intacto cuando `rendererEnabled=false`;
  - agregar pruebas de equivalencia y de “exactamente una promoción”.
- Aceptación:
  - cero cambios visuales para negocios legacy;
  - una sola promoción en preview y producción V2;
  - descuento y CTA siguen funcionando.
- Implementación:
  - cada banner migrado conserva su `promotionId`;
  - documentos creados antes de este campo se reconocen por su id legacy;
  - el renderer V2 reutiliza el runtime real de descuentos;
  - `promoBlocks` solo dibuja promociones que no estén incorporadas en el documento.
- Evidencia de cierre:
  - preview Diseñar: una promoción, editable y sin ejecutar el descuento;
  - preview Probar: una promoción interactiva;
  - widget público local: una promoción y transición a “Descuento aplicado”;
  - prueba automatizada de extracción explícita y retrocompatible del `promotionId`.

### WS-P0-02 — Aceptar y normalizar imágenes legacy relativas

- Estado: **Aprobado localmente**
- Reproducción: crear el primer borrador para un negocio con una promoción que usa una ruta relativa.
- Error observado: `La imagen del banner ... tiene un enlace inválido`.
- Evidencia:
  - `src/core/widget-studio/legacy-adapter.ts:57`
  - `src/core/widget-studio/schema.ts:378`
  - `src/core/widget-studio/schema.ts:396`
- Causa: el adaptador conserva `block.imageUrl`, pero el validador V2 solo admite HTTPS absoluto o localhost.
- Resolución:
  - distinguir URL externa de ruta interna controlada;
  - normalizar rutas relativas a una URL pública segura antes de validar;
  - no debilitar el bloqueo de `javascript:`, `data:` arbitrario u orígenes inseguros;
  - probar rutas antiguas, Cloudinary, localhost y URLs maliciosas.
- Implementación:
  - se aceptan rutas same-origin que empiezan por `/`, HTTPS y HTTP local;
  - se rechazan URLs protocol-relative, credenciales embebidas, barras invertidas,
    caracteres de control y protocolos ejecutables;
  - una imagen o CTA legacy insegura se omite sin perder el resto del borrador.
- Evidencia de cierre:
  - rutas `/uploads/...`, Cloudinary y localhost cubiertas;
  - casos `javascript:`, `//host`, HTTP externo y credenciales cubiertos;
  - el documento adaptado vuelve a pasar la validación semántica completa.

### WS-P0-03 — Proteger todas las tablas V2 en Supabase

- Estado: **Aprobado en la copia local autorizada**
- Evidencia:
  - `supabase/migrations/20260726202429_secure_widget_studio_tables.sql:3`
  - `prisma/schema.prisma:330`
- Problema: el endurecimiento actual cubre `WidgetTheme`, `WidgetPromoBlock` y `AccessProfile`, pero no:
  - `WidgetDesign`;
  - `WidgetDesignVersion`;
  - `WidgetAsset`;
  - `WidgetAssetReference`;
  - `WidgetDesignEvent`.
- Resolución:
  - habilitar RLS explícitamente;
  - revocar acceso directo a `anon` y `authenticated` si toda escritura pasa por servidor;
  - comprobar grants reales del esquema desplegado;
  - añadir verificación automatizada que falle si una tabla pública nueva queda expuesta.
- Aceptación: las tablas solo son accesibles por la vía de servidor autorizada y nunca por el Data API del cliente.
- Implementación:
  - `20260729120000_secure_widget_studio_v2_tables.sql`;
  - RLS habilitado para las cinco tablas V2;
  - privilegios revocados a `PUBLIC`, `anon` y `authenticated`;
  - no se usa `FORCE ROW LEVEL SECURITY`, para no bloquear la conexión Prisma
    server-side propietaria.
- Evidencia de cierre local:
  - migración aplicada únicamente a `localhost:5432/puragenda`;
  - `relrowsecurity=true` en las cinco tablas;
  - consulta de grants devuelve cero filas para `PUBLIC`, `anon` y `authenticated`;
  - backup previo conservado en el directorio temporal local.

### WS-P0-04 — Crear pruebas reales de Widget Studio V2

- Estado: **Parcial avanzado — suite crítica incorporada**
- Evidencia actual:
  - 20 archivos y 68 pruebas pasan;
  - 23 pruebas enfocadas cubren adaptación legacy, validación, URLs seguras,
    promociones, conflicto de revisión, guardado, publicación, fallback, rollback,
    permisos, aislamiento por negocio, limpieza de activos y fidelidad del renderer;
  - validación funcional local del renderer en Diseñar, Probar y widget público.
- Cobertura mínima:
  - adaptación legacy → V2;
  - validación de documentos;
  - autorización por negocio y permiso;
  - conflicto de revisiones;
  - guardado de borrador;
  - publicación inmutable;
  - rollback y fallback;
  - limpieza de activos fallidos;
  - renderer legacy vs V2;
  - interacción Diseñar vs Probar;
  - responsive móvil/tablet/escritorio;
  - accesibilidad básica por teclado.
- Cobertura todavía pendiente:
  - E2E automatizado Diseñar/Probar;
  - matriz automatizada 360/390/768/1200/1440;
  - navegación por teclado y retorno de foco.

### WS-P0-05 — Mantener integrado el `TestingGeneral` actual

- Estado: **Integrado y validado localmente; pendiente commit/push**
- Se fusionó `origin/TestingGeneral@56224bf` sin crear commit.
- Archivos compartidos revisados:
  - `package-lock.json`;
  - `prisma/schema.prisma`;
  - `src/components/dashboard/contextual-help.tsx`;
  - `src/components/dashboard/sidebar.tsx`.
- Resultado:
  - `package-lock.json` coincide con `TestingGeneral`;
  - Prisma conserva citas manuales, acciones de clientes y bloques prioritarios junto a las tablas V2;
  - la ayuda conserva los recorridos generales y añade el recorrido del Studio;
  - el sidebar solo añade Historial dentro de Apariencia;
  - se retiró del delta una modificación global del scrollbar del sidebar que no pertenecía al Studio;
  - la diferencia contra `origin/TestingGeneral` queda limitada a 28 archivos de Apariencia, widget y su infraestructura;
  - 48 tests, typecheck, Prisma, lint y build pasan.

## 4. Defectos funcionales y UX P1

### WS-P1-01 — Evitar la “tiritera” del autoguardado

- Estado: **Aprobado localmente**
- Resultado: el iframe cambia de `top=307 px` a `top=253 px`, un salto vertical de **54 px**.
- Causa: `saveMessage` añade y retira una fila dentro del encabezado sticky:
  - `src/components/widget-studio/widget-studio-editor.tsx:1120`
- Resolución recomendada:
  - reservar una altura estable para estado;
  - mostrar guardado/pendiente/error en un badge o toast que no cambie el layout;
  - mantener siempre la misma altura del encabezado;
  - probar escritura continua, sliders, cambios de dispositivo y red lenta.
- Implementación:
  - el mensaje de guardado/conflicto pasó a un toast absoluto con `aria-live`;
  - el badge de estado conserva un espacio estable en el encabezado;
  - guardar ya no inserta ni retira una fila dentro del layout del Studio.

### WS-P1-02 — Una sola navegación horizontal en móvil

- Estado: **Resuelto en CSS; pendiente aceptación en Android real**
- A 390 px se reprodujeron tres contenedores horizontales independientes:
  1. selector de dispositivo/zoom;
  2. barra contextual de propiedades;
  3. viewport del canvas al previsualizar escritorio.
- Evidencia principal:
  - `src/components/widget-studio/widget-studio-editor.tsx:1213`
  - `src/components/widget-studio/widget-studio-editor.tsx:1727`
- Resolución:
  - convertir controles secundarios en menú o bottom sheet;
  - fijar una única barra de herramientas móvil;
  - no permitir canvas de escritorio dentro de la vista móvil salvo modo “encajar” sin scroll adicional;
  - mostrar el dispositivo actual en un selector compacto;
  - mantener el documento de la página sin overflow horizontal.
- Implementación:
  - selector de dispositivo y zoom ocupan una grilla vertical sin overflow;
  - propiedades frecuentes se resumen y los ajustes completos pasan al drawer;
  - el canvas usa “encajar” desde 20% y oculta el overflow horizontal en móvil.

### WS-P1-03 — Hacer el encabezado móvil compacto y estable

- Estado: **Resuelto en CSS; pendiente aceptación en Android real**
- A 390 × 844 el encabezado usa cerca de 241 px y reparte acciones en tres filas.
- Resolución:
  - primera fila: volver, nombre, estado;
  - segunda fila: Diseñar/Probar y Básico/Avanzado;
  - acciones secundarias en menú;
  - Publicar fijo y visible, sin tapar Ayuda;
  - estructura cerrada por defecto cuando el usuario vuelve al lienzo.
- Implementación:
  - dos filas estables;
  - nombre truncado y estado compacto;
  - acciones secundarias en menú;
  - Publicar permanece como acción primaria.

### WS-P1-04 — Reparar el modo Probar

- Estado: **Implementado; pendiente E2E con clic físico**
- Diseñar funciona: seleccionar un profesional no avanza.
- Probar falla: al pulsar un profesional, el preview puede permanecer en “2. Elige un profesional”.
- Evidencia relacionada:
  - `src/app/widget/[slug]/widget-client.tsx:314`
  - `src/app/widget/[slug]/widget-client.tsx:702`
- Resolución:
  - prueba E2E del protocolo `postMessage`;
  - confirmar que el modo llega antes del clic;
  - evitar que la capa de selección intercepte eventos en Probar;
  - añadir botón visible “Reiniciar prueba” y estado actual de simulación.
- Implementación:
  - handshake `INTERACTION_MODE_CHANGED` antes de considerar listo el modo;
  - Diseñar y Probar separan por completo captura, selección y navegación;
  - al entrar a Probar se inicia una simulación limpia;
  - el paso real del iframe se sincroniza hacia el Studio, no al revés;
  - Reiniciar simulación está visible en escritorio y en el menú móvil.
- Límite de QA actual:
  - el navegador automatizado conectado no calcula bien los clics dentro de un
    `iframe` escalado y selecciona un elemento desplazado; el flujo público sin
    escala sí avanza. Se mantiene pendiente la prueba E2E en navegador físico.

### WS-P1-05 — Separar la ayuda general de la ayuda del Studio

- Estado: **Aprobado en escritorio; pendiente móvil real**
- La guía propia del Studio recorre correctamente cuatro pasos.
- Defecto reproducido: tras cerrar/activar ayudas, el clic puede abrir el modal de Publicar.
- Riesgo adicional: el tour contextual general aún busca `[data-tour='studio-inspector']`, que solo existe en el modo Básico.
- Evidencia:
  - `src/components/dashboard/contextual-help.tsx:314`
  - `src/components/dashboard/contextual-help.tsx:348`
  - `src/components/dashboard/contextual-help.tsx:597`
  - `src/components/widget-studio/widget-studio-editor.tsx:1096`
- Resolución:
  - una sola fuente de tour por pantalla;
  - botón con capa y zona propia, sin solaparse con Publicar;
  - pasos distintos para Básico y Avanzado;
  - prueba de clic real en 390, 768, 1200 y 1440 px.
- Evidencia:
  - el Studio avanzado cubre la ayuda global con su shell de pantalla completa;
  - el botón interno abre cuatro pasos existentes y omite selectores ausentes;
  - en móvil la ayuda secundaria vive dentro del menú de acciones;
  - Publicar conserva una zona de clic independiente.

### WS-P1-06 — Completar las propiedades que hoy se guardan pero no se renderizan

- Estado: **Parcial avanzado**
- Casos:
  - `shell.logoAssetId` se referencia, pero el widget sigue usando `business.logoUrl`;
  - `button.action="next"` se configura, pero el renderer no ejecuta “Continuar”;
  - `overlay.mobileFallback` se guarda, pero móvil siempre convierte el overlay a flujo;
  - tipografía/escala y densidad global no están aplicadas de forma completa;
  - usar una imagen como fondo puede dejarla también en el flujo.
- Evidencia:
  - `src/core/widget-studio/schema.ts:262`
  - `src/app/widget/[slug]/widget-client.tsx:1307`
  - `src/components/widget-studio/widget-design-renderer.tsx:324`
  - `src/components/widget-studio/widget-design-renderer.tsx:394`
  - `src/components/widget-studio/widget-design-renderer.tsx:453`
  - `src/components/widget-studio/widget-studio-editor.tsx:2215`
- Resolución: implementar cada opción o retirarla temporalmente de la UI; ninguna propiedad visible debe ser decorativa.
- Implementado en este corte:
  - `shell.logoAssetId` usa la biblioteca real y reemplaza el logo del negocio;
  - cambiar la imagen de un banner actualiza ese banner en vez de crear otro;
  - una imagen configurada como fondo deja de renderizarse también en el flujo;
  - `mobileFallback` diferencia flujo, oculto y escalado;
  - `button.action="next"` ejecuta la acción primaria disponible del paso;
  - la familia tipográfica seleccionada se aplica al widget.
- Pendiente:
  - escala tipográfica global y densidad global completa;
  - prueba E2E de cada acción en todos los pasos.

### WS-P1-07 — Garantizar el commit de edición directa

- Estado: **Parcial**
- Verificado: el título editado directamente persistió tras recargar.
- Falta:
  - Enter, Escape, Tab, clic fuera, cambio de paso y cierre de panel;
  - estados guardando/error/offline;
  - conflicto de revisión sin perder el texto local;
  - edición de todos los textos permitidos.

### WS-P1-08 — Publicación resistente a fallos

- Estado: **Parcial**
- Implementado:
  - la transacción mantiene creación de versión, referencias, activación y evento
    como una unidad atómica;
  - reintentar exactamente el mismo documento devuelve la versión ya publicada
    y no crea una copia inmutable adicional;
  - el renderer resuelve automáticamente el fallback si el documento publicado
    no supera la validación.
- Falta:
  - smoke render antes de activar una versión;
  - verificación posterior de la URL publicada;
  - rollback automático si falla la comprobación;
  - tratamiento legible de colisiones de versión concurrentes;
  - estrategia explícita de caché.
- Evidencia:
  - `src/server/services/widget-design.service.ts:281`
  - `src/server/services/widget-design.service.ts:294`
  - `src/server/services/widget-design.service.ts:321`

### WS-P1-09 — Ciclo de vida seguro de activos

- Estado: **Parcial**
- Resuelto:
  - si falla la transacción, se elimina el archivo local o el recurso Cloudinary
    recién creado y se conserva el error original;
  - pruebas cubren cleanup local, cleanup Cloudinary, MIME forjado y referencias.
  - cuota preventiva de 100 imágenes activas o 250 MB por negocio.
- Riesgos pendientes:
  - falta límite de frecuencia;
  - falta limpieza programada de activos no referenciados;
  - falta verificar decodificación segura y eliminación de metadatos en todos los proveedores.
- Archivo principal:
  - `src/server/services/widget-assets.service.ts`

## 5. Calidad y mantenibilidad P2

### WS-P2-01 — Dividir el editor monolítico

- Estado: **Pendiente**
- `widget-studio-editor.tsx` tiene aproximadamente 2.400 líneas y concentra documento, historial local, autosave, mensajería, responsive, modales, biblioteca e inspector.
- Separación recomendada:
  - `useWidgetDraft`;
  - `useWidgetAutosave`;
  - `usePreviewBridge`;
  - `StudioShell`;
  - `StudioToolbar`;
  - `StructurePanel`;
  - `ContextToolbar`;
  - `AssetLibrary`;
  - `PublishDialog`.

### WS-P2-02 — Accesibilidad de imágenes y controles

- Estado: **Parcial**
- Pendientes:
  - banner con `alt=""` aunque sea informativo;
  - enlace de imagen decorativa sin nombre accesible;
  - botones icon-only con nombre claro en móvil;
  - foco visible y retorno de foco al cerrar drawers/modales;
  - orden de tabulación en lienzo, toolbar y panel.

### WS-P2-03 — Rendimiento del editor

- Estado: **Pendiente**
- Medir:
  - frecuencia y tamaño del guardado JSON;
  - renderizaciones por cambio de slider;
  - tamaño de bundle del editor;
  - memoria del iframe y del historial local;
  - carga de imágenes y generación de variantes;
  - comportamiento con 30–50 bloques.

### WS-P2-04 — Índices y observabilidad

- Estado: **Pendiente**
- Añadir índice para `WidgetDesignVersion.publishedByUserId`.
- Registrar eventos de guardado/publicación/subida fallidos.
- Métricas mínimas:
  - tiempo hasta preview;
  - latencia de guardado;
  - conflictos;
  - publicaciones fallidas;
  - rollbacks;
  - activos huérfanos.

### WS-P2-05 — Consistencia visual

- Estado: **Parcial**
- Mantener la dirección Office/Word:
  - edición de contenido sobre el lienzo;
  - barra contextual sobre el widget;
  - drawer solo para ajustes avanzados;
  - una jerarquía de selección clara;
  - menos controles simultáneos;
  - nombres de producto consistentes: “Servicio”, no alternar sin contexto con “Tratamiento”.

## 6. Matriz de aceptación resumida

| Área | Estado | Evidencia |
| --- | --- | --- |
| Legacy no cambia sin publicar | **Aprobado** | El negocio auditado quedó con `rendererEnabled=false`, sin versión publicada ni fallback. |
| Borrador privado | **Aprobado** | Los cambios quedaron en revisión de borrador y no en el widget público. |
| Edición directa de texto | **Parcial** | Persistió tras recarga; faltan casos de teclado/conflicto. |
| Diseñar no avanza | **Aprobado** | Clic en profesional mantuvo el paso. |
| Probar recorre el flujo | **Parcial avanzado** | Protocolo y aislamiento corregidos; falta clic físico dentro del iframe escalado. |
| Preview responsive | **Parcial avanzado** | Tres scrolls eliminados en CSS; falta aceptación Android real. |
| Promoción V2 única | **Aprobado localmente** | Una tarjeta en Diseñar, Probar y widget público; el descuento sigue interactivo. |
| Migración de clientes actuales | **Aprobado localmente** | Rutas internas seguras se conservan; entradas inseguras se omiten sin perder el borrador. |
| Publicación y rollback | **Parcial** | Guardado, conflicto, publicación, fallback y rollback tienen pruebas; faltan smoke e idempotencia. |
| Seguridad por negocio | **Aprobado localmente** | Acciones probadas; RLS activo y cero grants directos en la copia local. |
| Activos seguros | **Parcial avanzado** | Cleanup y casos adversariales probados; faltan cuotas y limpieza programada. |
| Ayuda contextual | **Parcial avanzado** | Tour Studio aislado y aprobado en escritorio; falta móvil real. |
| Build/typecheck/lint/Prisma | **Aprobado con observaciones** | Build, typecheck, lint y Prisma validan; lint mantiene 37 advertencias de `<img>`. |
| Pruebas automatizadas | **Parcial avanzado** | 20 archivos y 68 pruebas pasan; 23 son enfocadas al Studio. Falta E2E responsive. |

## 7. Orden recomendado de trabajo

### Fase A — Seguridad y compatibilidad

1. WS-P0-01 promociones únicas.
2. WS-P0-02 normalización de imágenes legacy.
3. WS-P0-03 RLS y grants.
4. WS-P0-04 arnés de pruebas V2.
5. WS-P0-05 integración con el `TestingGeneral` actual.

Salida: se puede crear un borrador para cualquier cliente existente sin cambiar su widget público.

### Fase B — Estabilidad del editor

1. WS-P1-01 encabezado estable.
2. WS-P1-02 y WS-P1-03 shell responsive móvil.
3. WS-P1-04 modo Probar.
4. WS-P1-05 ayuda sin solapamientos.
5. WS-P1-07 edición directa completa.

Salida: el Studio deja de tiritar y se puede usar de forma clara en escritorio y móvil.

### Fase C — Fidelidad del renderer

1. WS-P1-06 opciones realmente renderizadas.
2. fondo vs flujo sin duplicación;
3. logo V2;
4. acciones de botones;
5. fallback móvil;
6. tipografía y espaciado.

Salida: todo control visible produce el resultado prometido.

### Fase D — Publicación y activos

1. WS-P1-08 publicación robusta;
2. WS-P1-09 ciclo de vida de archivos;
3. rollback probado;
4. métricas y eventos.

Salida: una publicación defectuosa no deja al cliente sin widget.

### Fase E — Pulido y escala

1. división del editor;
2. accesibilidad;
3. rendimiento con documentos grandes;
4. consistencia visual;
5. observabilidad.

## 8. Puertas para producción

No se propone fusionar a `main` hasta que:

- todos los P0 estén cerrados;
- todas las pruebas V2 críticas estén automatizadas;
- la migración se ejecute sobre una copia de datos reales anonimizada;
- no exista diferencia no explicada entre legacy y V2;
- móvil 360/390, tablet 768 y escritorio 1200/1440 pasen sin scrolls anidados impropios;
- publicación, fallo inducido y rollback estén probados;
- owner, recepcionista y profesional respeten sus permisos;
- descuentos y promociones funcionen una sola vez;
- el `TestingGeneral` actual esté integrado sin perder citas manuales ni cupos prioritarios;
- exista respaldo y procedimiento de desactivación inmediata de `rendererEnabled`.

## 9. Verificación ejecutada en esta auditoría

| Comprobación | Resultado |
| --- | --- |
| `npm ci` | Aprobado, 0 vulnerabilidades reportadas |
| Tests | 20 archivos, 68 tests aprobados |
| `npx prisma validate` | Aprobado |
| Typecheck | Aprobado |
| Lint | Aprobado con 37 advertencias de imágenes |
| `npm run build` | Aprobado |
| Auditoría escritorio 1440 × 900 | Ejecutada |
| Auditoría móvil 390 × 844 | Ejecutada |
| Cambio repetido de dispositivo | Estable en escritorio |
| Cambio de estilos | Toast fuera del flujo; el encabezado ya no añade una fila de 54 px |
| Edición directa | Persiste tras recarga |
| Diseñar | No avanza la reserva |
| Probar | Handshake y navegación aislada implementados; clic físico pendiente |
| Base de datos | Solo clon local; backup previo y migraciones aditivas aplicadas |
| Publicación | No ejecutada para evitar alterar el widget público |
| Promoción V2 | Una tarjeta en preview y widget público; descuento interactivo aprobado |
| Compatibilidad de imágenes | Ruta relativa aprobada; entradas inseguras neutralizadas |
| RLS V2 | Aplicado localmente: cinco tablas con RLS y cero grants expuestos |
| Reinicio local posterior al build | Aprobado en `http://localhost:3001` |

## 10. Definición de terminado

Una tarea del tracker solo se marca terminada si:

1. existe un caso de reproducción o criterio verificable;
2. el cambio está aislado y revisado;
3. incluye prueba automatizada proporcional al riesgo;
4. pasa typecheck, lint, Prisma, tests y build;
5. se verifica visualmente en los breakpoints afectados;
6. no modifica datos reales durante QA;
7. no cambia el renderer legacy sin una decisión explícita;
8. documenta rollback cuando toca publicación, esquema o archivos.

## 11. Revisión V3 del 29 de julio de 2026

La visión ampliada, el modelo de composición y los criterios del editor libre están documentados en [14-vision-editor-libre-v3-y-roadmap.md](./14-vision-editor-libre-v3-y-roadmap.md).

### 11.1 Mediciones responsive

| Vista | Evidencia | Resultado |
| --- | --- | --- |
| Móvil 390 × 844, Básico | Layout corregido en CSS; falta nueva captura física | **Pendiente de revalidación** |
| Móvil 390 × 844, Avanzado | Encabezado reducido a dos filas y acciones secundarias en menú | **Pendiente de revalidación** |
| Móvil 390 × 844, Avanzado | Barra contextual resume controles y elimina overflow horizontal | **Pendiente de revalidación** |
| Tablet 768 × 1024 | Shell móvil compacto conservado hasta 799 px | **Pendiente de revalidación** |
| Escritorio 1280 × 720 | Shell estable, una barra contextual y dos scrolls funcionales | **Aprobado localmente** |
| Android real | `adb` disponible, pero no hay dispositivo conectado ni paquete Emulator instalado | **Bloqueado por entorno** |

Las pruebas de navegador responsive no sustituyen la aceptación en Android real.

### 11.2 Avance ponderado

| Workstream | Peso | Avance estimado | Contribución |
| --- | ---: | ---: | ---: |
| Compatibilidad y seguridad legacy | 14% | 96% | 13,4% |
| Documento y renderer | 14% | 72% | 10,1% |
| Editor Básico | 8% | 72% | 5,8% |
| Canvas avanzado | 18% | 45% | 8,1% |
| Responsive y móvil | 10% | 45% | 4,5% |
| Activos e imágenes | 8% | 62% | 5,0% |
| Borrador, versiones y publicación | 10% | 60% | 6,0% |
| Permisos y aislamiento | 8% | 75% | 6,0% |
| Pruebas y observabilidad | 7% | 65% | 4,6% |
| Integración con TestingGeneral | 3% | 95% | 2,9% |
| **Total** | **100%** |  | **66,4% ≈ 66%** |

Esta cifra expresa madurez funcional ponderada. No reemplaza las puertas de
producción: queda WS-P0-04 parcialmente abierto, la aceptación móvil real,
publicación resistente a fallos y el E2E del modo Probar. La salida continúa
bloqueada.

### 11.3 Nuevos epics del end goal

| ID | Epic | Prioridad | Estado |
| --- | --- | --- | --- |
| WS-V3-01 | Documento V3 con scene graph, constraints y overrides por breakpoint | P1 | Pendiente |
| WS-V3-02 | Shell Office estable con una sola jerarquía de paneles | P1 | Pendiente |
| WS-V3-03 | Motor de selección, movimiento, resize, rotación segura y snapping | P1 | Pendiente |
| WS-V3-04 | Capas, selección múltiple, grupos, alineación y distribución | P1 | Pendiente |
| WS-V3-05 | Secciones de lienzo libre acotado | P1 | Pendiente |
| WS-V3-06 | Responsive con anclajes, constraints y herencia de overrides | P1 | Pendiente |
| WS-V3-07 | Edición móvil simplificada y tablet con patrón propio | P1 | Pendiente |
| WS-V3-08 | Crop, punto focal, reemplazo y ciclo de vida de activos | P1 | Parcial |
| WS-V3-09 | Renderer único, parches de preview y rendimiento de interacción | P1 | Parcial |
| WS-V3-10 | Suite E2E, accesibilidad, Android real y rollout por negocio | P0 | Pendiente |

### 11.4 Próximo corte recomendado

No comenzar por rotación, formas o más tipos de bloque. El orden recomendado es:

1. cerrar WS-P0-01 a WS-P0-04;
2. estabilizar WS-P1-01 a WS-P1-05;
3. diseñar y aprobar WS-V3-01;
4. implementar WS-V3-02 y WS-V3-03 como vertical slice;
5. comprobar una composición real en escritorio, tablet y móvil;
6. ampliar a grupos, constraints, activos y publicación.

## 12. Corte UI/UX y navegador del 29 de julio de 2026, 16:10 CLT

Este corte continúa exclusivamente en la copia local de `testingWidget`. No se
publicó, no se creó commit y no se modificó el widget público.

### 12.1 Cambios cerrados en este corte

| Área | Resultado verificado |
| --- | --- |
| Encabezado Básico móvil | El encabezado sticky respeta los 52 px de la navegación móvil y mantiene visibles nombre, estado, Publicar, menú y selector Básico/Avanzado durante el scroll. |
| Selector responsive | En móvil muestra etiquetas táctiles claras: Móvil, Tablet y PC. En tablet y escritorio conserva los nombres completos. |
| Ajuste del preview | El `ResizeObserver` ajusta el zoom también en Básico; el preview deja de quedar recortado al cambiar el ancho disponible. |
| Entrada a Avanzado móvil | Abre directamente en Lienzo, con estructura e inspector cerrados, en vez de tapar el canvas con un drawer. |
| Alto útil móvil | El canvas avanzado usa todo el espacio entre el encabezado y la barra inferior; pasó de 399 px a 664 px a 390 × 844. |
| Jerarquía de scroll | El documento no tiene overflow horizontal a 390, 768 ni 1280 px. El scroll interno restante pertenece al dispositivo simulado dentro del canvas. |
| Señal de selección | Los descendientes seleccionables muestran cursor `pointer`; los textos editables conservan cursor de texto. |
| Controles icon-only | “Añadir contenido aquí” y “Abrir ajustes detallados” tienen nombre accesible aunque su etiqueta visual se compacte. |
| Autoguardado | Encabezado estable en 72 px y posición documental del preview estable en 384 px durante guardar/restaurar. |
| Edición directa | Escape restaura el texto sin conservar el cambio; Enter confirma, autoguarda y vuelve a estado Guardado. El texto original se restauró al finalizar QA. |

### 12.2 Matriz de navegador ejecutada

| Viewport | Básico | Avanzado | Overflow horizontal | Resultado |
| --- | --- | --- | --- | --- |
| 390 × 844 | Encabezado y Publicar visibles; Móvil seleccionado y zoom 85% | Lienzo primero, zoom 90%, canvas de 461 px y barra inferior fija | No | **Aprobado en navegador local** |
| 768 × 1024 | Preview Móvil a 100%, panel y controles legibles | Canvas de 844 px, navegación móvil/tablet sin drawer inicial | No | **Aprobado en navegador local** |
| 1280 × 720 | Preview de escritorio ajustado a 40% sin recorte | Estructura de 260 px, canvas de 1020 px y preview a 75% | No | **Aprobado en navegador local** |

### 12.3 Modo Probar con interacción real

La prueba se ejecutó con localizadores dentro del `iframe`, ya sin depender de
coordenadas escaladas:

1. `Probar` confirmó `aria-pressed=true` y `aria-busy=false`;
2. clic en “Corte de pelo” avanzó a “2. Elige un profesional”;
3. clic en “Valentina López” avanzó a “3. Elige fecha y hora”;
4. se detuvo antes de crear una cita o transmitir datos.

Con esta evidencia, **WS-P1-04 queda aprobado en navegador local**. Continúa
pendiente convertir este recorrido en una prueba E2E automática y repetirlo en
Android físico.

### 12.4 Verificación técnica de este corte

| Comprobación | Resultado |
| --- | --- |
| Typecheck | Aprobado |
| Vitest | 20 archivos, 68 pruebas aprobadas |
| Prisma validate | Aprobado |
| Lint | 0 errores; 37 advertencias preexistentes de `<img>` |
| Build de producción | Aprobado |
| Consola del navegador | 0 errores y 0 warnings durante la matriz |
| `git diff --check` | Aprobado |

La primera invocación de Vitest incluyó por error la opción de Jest
`--runInBand`; Vitest la rechazó antes de ejecutar pruebas. Se repitió con el
comando nativo `npm test` y la suite completa quedó verde.

### 12.5 Avance ponderado revisado

| Workstream | Peso | Avance estimado | Contribución |
| --- | ---: | ---: | ---: |
| Compatibilidad y seguridad legacy | 14% | 96% | 13,4% |
| Documento y renderer | 14% | 72% | 10,1% |
| Editor Básico | 8% | 76% | 6,1% |
| Canvas avanzado | 18% | 48% | 8,6% |
| Responsive y móvil | 10% | 70% | 7,0% |
| Activos e imágenes | 8% | 62% | 5,0% |
| Borrador, versiones y publicación | 10% | 60% | 6,0% |
| Permisos y aislamiento | 8% | 75% | 6,0% |
| Pruebas y observabilidad | 7% | 72% | 5,0% |
| Integración con TestingGeneral | 3% | 95% | 2,9% |
| **Total** | **100%** |  | **70,1% ≈ 70%** |

El aumento frente al 66% anterior viene de evidencia de navegador real en tres
viewports, correcciones responsive y el recorrido funcional del modo Probar.
No significa aptitud para producción: siguen abiertos el editor libre V3,
publicación con smoke/rollback automático, E2E automatizado, Android físico,
rendimiento con documentos grandes y ciclo de vida programado de activos.
