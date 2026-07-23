# 05 — Arquitectura de datos y render

## Objetivos técnicos

- separar edición de publicación;
- validar todo documento antes de persistir y publicar;
- servir producción desde una versión inmutable;
- compartir renderer entre preview y producción;
- preservar el renderer actual;
- evitar que el editor dependa de la forma interna de la reserva;
- permitir evolución de esquema;
- aislar datos por negocio;
- soportar rollback inmediato;
- mantener el bundle público pequeño.

## Componentes propuestos

```text
Dashboard / Editor
      │
      ├─ Comandos de borrador ──> Servicio de diseños ──> WidgetDesign
      ├─ Subida de activos ─────> Servicio de activos ──> WidgetAsset / Cloudinary
      └─ Preview autenticada ───> Renderer V2 ──────────> Borrador

Widget público
      │
      ├─ Sin versión V2 ────────> Renderer legacy
      └─ Con versión V2 ────────> Renderer V2 ──────────> WidgetDesignVersion

Datos de reserva
      └─ Booking engine existente ──> Bloques del sistema
```

## Persistencia propuesta

Los nombres son de diseño y pueden ajustarse antes de crear la migración.

### WidgetDesign

Un registro por negocio:

| Campo | Uso |
| --- | --- |
| `id` | Identificador |
| `businessId` | Propietario, único |
| `draftDocument` | JSON editable validado |
| `draftSchemaVersion` | Versión del esquema |
| `draftRevision` | Control de concurrencia |
| `publishedVersionId` | Versión activa |
| `fallbackVersionId` | Versión previa para rollback técnico |
| `createdAt` | Auditoría |
| `updatedAt` | Auditoría |

### WidgetDesignVersion

Snapshot inmutable:

| Campo | Uso |
| --- | --- |
| `id` | Identificador |
| `designId` | Diseño |
| `versionNumber` | Secuencia visible |
| `schemaVersion` | Versión del documento |
| `document` | Snapshot completo |
| `checksum` | Integridad y deduplicación |
| `publishedByUserId` | Autor |
| `changeSummary` | Resumen opcional |
| `createdAt` | Fecha |

Restricciones:

- único `(designId, versionNumber)`;
- una versión publicada nunca se actualiza;
- una restauración crea un nuevo borrador y después una nueva versión;
- el checksum se calcula en servidor sobre JSON canónico.

### WidgetAsset

Registro de activos:

| Campo | Uso |
| --- | --- |
| `id` | Referencia usada por los bloques |
| `businessId` | Propietario |
| `provider` | `cloudinary` inicialmente |
| `publicId` | Identificador del proveedor |
| `url` | URL segura |
| `mimeType` | Tipo verificado |
| `byteSize` | Tamaño |
| `width` / `height` | Dimensiones verificadas |
| `altDefault` | Alt sugerido |
| `blurDataUrl` | Placeholder opcional |
| `status` | `PROCESSING`, `READY`, `FAILED`, `ARCHIVED` |
| `createdByUserId` | Auditoría |
| `createdAt` / `updatedAt` | Auditoría |
| `deletedAt` | Eliminación diferida |

La referencia del documento es `assetId`, no una URL libre. El renderer resuelve solo activos del mismo negocio y estado `READY`.

### WidgetAssetReference

Índice relacional de los usos declarados dentro del JSON:

| Campo | Uso |
| --- | --- |
| `assetId` | Activo utilizado |
| `designId` | Borrador propietario, cuando corresponde |
| `versionId` | Versión inmutable, cuando corresponde |
| `blockId` | Bloque que lo utiliza |
| `usage` | Imagen, fondo, poster u otro uso permitido |

Una restricción exige que la referencia pertenezca al borrador o a una versión, no a ambos.

Al guardar un borrador:

1. se extraen todos los `assetId`;
2. se valida su pertenencia al negocio;
3. se reemplazan las referencias del borrador en la misma transacción.

Al publicar se crean referencias para la versión. Esto permite:

- resolver activos en lote;
- impedir la eliminación de un activo usado;
- conocer impacto antes de reemplazar;
- limpiar activos huérfanos sin buscar dentro de todos los JSON.

### WidgetDesignEvent

Registro mínimo para acciones importantes:

- borrador creado;
- diseño publicado;
- versión restaurada;
- activo subido o archivado;
- publicación fallida;
- migración iniciada o cancelada.

No se registran valores secretos ni contenido sensible innecesario.

## Forma conceptual en Prisma

Esto no es una migración lista para ejecutar; expresa relaciones y restricciones:

```prisma
model WidgetDesign {
  id                   String   @id @default(cuid())
  businessId           String   @unique
  draftDocument        Json
  draftSchemaVersion   Int      @default(1)
  draftRevision        Int      @default(1)
  publishedVersionId   String?  @unique
  fallbackVersionId    String?  @unique
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  business             Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  versions             WidgetDesignVersion[] @relation("DesignVersions")
}

model WidgetDesignVersion {
  id                   String   @id @default(cuid())
  designId             String
  versionNumber        Int
  schemaVersion        Int
  document             Json
  checksum             String
  publishedByUserId    String
  changeSummary        String?
  createdAt            DateTime @default(now())

  design               WidgetDesign @relation("DesignVersions", fields: [designId], references: [id], onDelete: Cascade)

  @@unique([designId, versionNumber])
  @@index([designId, createdAt])
}
```

Las relaciones de puntero publicado y fallback requerirán nombres de relación explícitos en el esquema definitivo.

## Documento de diseño

### Reglas

- JSON puro;
- sin funciones;
- sin HTML;
- sin CSS;
- ids internos únicos;
- tipos discriminados;
- valores acotados;
- referencias a activos por id;
- versión explícita;
- tamaño máximo;
- orden representado con arrays;
- propiedades responsive normalizadas.

### Estructura propuesta

```json
{
  "schemaVersion": 1,
  "meta": {
    "name": "Diseño principal"
  },
  "tokens": {
    "colors": {
      "primary": "#7C3AED",
      "secondary": "#5B21B6",
      "background": "#0A0A0A",
      "text": "#FFFFFF",
      "textMuted": "#FFFFFF66"
    },
    "typography": {
      "family": "system",
      "baseSize": 14,
      "scale": "default"
    },
    "shape": {
      "radius": 16,
      "shadow": "soft"
    },
    "spacing": {
      "density": "comfortable"
    }
  },
  "shell": {
    "maxWidth": 672,
    "headerAlign": "left"
  },
  "globalSlots": {
    "afterHeader": [],
    "beforeFooter": []
  },
  "stepSlots": {
    "service": {
      "beforeMain": [],
      "afterMain": []
    }
  }
}
```

### Validación

Dos niveles:

1. **Estructural:** esquema Zod por `schemaVersion`.
2. **Semántico:** ids, límites, slots, referencias, accesibilidad, compatibilidad y reglas del negocio.

El editor usa los mismos schemas compartidos para feedback inmediato. El servidor vuelve a validar siempre.

## Evolución de esquema

Cada versión tiene:

- schema de lectura;
- migrador puro a la versión siguiente;
- fixtures;
- pruebas de idempotencia;
- prueba de render antes/después.

Flujo:

```text
Documento v1 → validate v1 → migrate 1→2 → validate v2 → usar en editor
```

Las versiones publicadas antiguas no se reescriben. Se migran en memoria para render o se crea un nuevo snapshot al restaurarlas.

## Operaciones de borrador

### Lectura

`getWidgetEditorState()` devuelve:

- documento;
- revisión;
- versión publicada;
- activos;
- capacidades;
- permisos;
- advertencias.

### Guardado

`saveWidgetDraft({ document, expectedRevision })`:

1. autentica;
2. resuelve negocio;
3. verifica `appearance.manage`;
4. valida tamaño;
5. parsea schema;
6. valida semántica y activos;
7. actualiza solo si `draftRevision === expectedRevision`;
8. incrementa revisión;
9. devuelve documento normalizado y nueva revisión.

Si la revisión cambió, devuelve conflicto. No pisa silenciosamente cambios de otra sesión.

### Comandos estructurales

La primera versión puede enviar el documento completo si su tamaño está acotado. Las operaciones se modelan como comandos en cliente para undo/redo:

- insert block;
- update props;
- move block;
- duplicate block;
- remove block;
- update responsive override.

En una fase colaborativa podrían persistirse patches, pero no es necesario para el MVP.

## Publicación

`publishWidgetDesign({ expectedDraftRevision, summary })`:

1. autentica y autoriza;
2. lee borrador dentro de transacción;
3. exige la revisión esperada;
4. valida estructura y semántica;
5. comprueba activos;
6. ejecuta un render de humo;
7. calcula checksum;
8. crea `WidgetDesignVersion`;
9. mueve `fallbackVersionId` al publicado actual;
10. mueve `publishedVersionId` a la nueva versión;
11. registra evento;
12. confirma transacción;
13. invalida caché;
14. prueba la URL pública;
15. si el smoke posterior falla, restaura el puntero automáticamente y registra el fallo.

La publicación debe ser idempotente mediante clave de operación o checksum más revisión.

## Preview autenticada

Ruta propuesta:

```text
/widget/[slug]/preview
```

Reglas:

- requiere sesión válida;
- resuelve el negocio del usuario;
- exige `appearance.manage`;
- carga el borrador;
- usa el mismo `WidgetRendererV2`;
- no se indexa;
- no permite reserva real;
- usa datos de demostración o modo seguro para recorrer pasos;
- no expone el documento por URL.

El editor y el `iframe` pueden coordinar:

- altura;
- breakpoint;
- paso simulado;
- bloque seleccionado;
- scroll al bloque;
- estado de render.

La comunicación usa `postMessage` con validación estricta de `origin` y esquema.

## Renderer V2

### Separación de responsabilidades

```text
Booking state / reglas
        │
        ├─ datos y acciones
        ▼
System block registry
        │
        ├─ Header
        ├─ ServiceSelector
        ├─ StaffSelector
        └─ ...

Design document
        │
        ▼
Layout renderer
        │
        ├─ Section
        ├─ Image
        ├─ Banner
        └─ ...
```

El editor nunca replica las reglas de disponibilidad. Los bloques del sistema reciben una interfaz estable desde la máquina de reserva.

### Registro de bloques

Cada tipo declara:

- schema de props;
- renderer público;
- preview/editor metadata;
- propiedades editables;
- slots permitidos;
- versión mínima;
- fallback.

Un tipo desconocido se omite en contenido, registra telemetría y bloquea publicación si es requerido.

### Carga

El bundle público:

- incluye solo renderers usados o un núcleo pequeño con imports controlados;
- no incluye drag and drop;
- no incluye inspector;
- no incluye historial;
- no incluye código del dashboard.

### Caché

- versión publicada cacheable por id/checksum;
- datos de disponibilidad siguen su política actual;
- cambio de publicación invalida documento, no toda la plataforma;
- activos usan CDN y URLs transformadas.

## Renderer legacy

Permanece disponible durante la adopción.

Selección:

```text
kill switch activo → legacy o última versión estable
sin diseño V2 publicado → legacy
documento V2 válido → Renderer V2
error inesperado V2 → fallbackVersionId; si no existe, legacy
```

El fallback se registra con negocio, versión, error y request id, sin exponer datos sensibles.

## Temas

`WidgetTheme` puede mantenerse como entidad de presets.

Aplicar un tema:

1. copia tokens al borrador;
2. no altera estructura;
3. no modifica producción;
4. se puede deshacer;
5. se publica con el documento completo.

Una versión publicada contiene los tokens resultantes, no una referencia viva al tema. Renombrar o eliminar el tema no cambia versiones anteriores.

## Activos y Cloudinary

Flujo:

1. cliente solicita subida;
2. servidor verifica permiso y cuota;
3. archivo llega al backend o mediante subida firmada;
4. se valida firma, MIME, dimensiones y tamaño;
5. Cloudinary procesa formatos;
6. se crea `WidgetAsset`;
7. el bloque referencia `assetId`;
8. el renderer genera `srcset` por contexto.

Transformaciones mínimas:

- miniatura de editor;
- móvil;
- tablet;
- escritorio;
- formato automático;
- calidad automática;
- límites de dimensiones;
- stripping de metadatos.

## Dependencias posibles

No se instalarán hasta aprobar implementación.

- `@dnd-kit/core` y paquetes relacionados para drag and drop accesible;
- `zod` ya está disponible para schemas;
- una librería pequeña de historial solo si el command stack propio no basta;
- Playwright y herramienta de unit testing según el plan de calidad.

No se recomienda adoptar un page builder de terceros que controle el renderer completo. El flujo de reserva y la compatibilidad requieren un registro propio y acotado.

## Observabilidad técnica

Eventos:

- preview render failed;
- draft save conflict;
- draft save failed;
- asset processing failed;
- publish validation failed;
- publish smoke failed;
- public render fallback;
- unknown block;
- schema migration failed.

Dimensiones permitidas:

- renderer version;
- schema version;
- block type;
- business id interno;
- version id;
- request id.

Nunca:

- API keys;
- tokens;
- contenido de formularios;
- datos personales de clientes.
