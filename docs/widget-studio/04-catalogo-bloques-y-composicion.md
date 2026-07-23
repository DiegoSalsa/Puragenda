# 04 — Catálogo de bloques y reglas de composición

## Modelo de composición

El documento se organiza así:

```text
Widget
└─ Página o paso
   └─ Slot permitido
      └─ Sección
         └─ Bloque
```

Los bloques de contenido conviven con bloques del sistema. No todos los contenedores aceptan todos los bloques.

## Bloques del sistema

Son componentes funcionales generados a partir de datos reales.

| Bloque | Función | Reglas |
| --- | --- | --- |
| Header | Identidad y estado de pasos | No eliminable; estilo y contenido acotado |
| Progress | Progreso de reserva | No eliminable cuando existe más de un paso |
| ServiceSelector | Lista y selección de servicios | No eliminable; conserva eventos y datos |
| ServiceOptions | Alternativas por servicio | Condicional; no reordenable fuera de su paso |
| RecurringConfig | Configuración recurrente | Condicional |
| HealthForm | Preguntas de salud | Condicional y protegido |
| StaffSelector | Selección de profesional | Condicional |
| DateTimeSelector | Fecha, hora y disponibilidad | Protegido |
| ClientDetails | Datos del cliente | Protegido |
| Payment | Abono o pago | Condicional y protegido |
| Success | Confirmación | Protegido |
| Footer | Marca y enlaces del widget | Posición estable |

### Propiedades permitidas

Dependiendo del bloque:

- título y descripción desde un conjunto de etiquetas seguras;
- visibilidad de elementos opcionales;
- variante visual;
- densidad;
- estilo de tarjeta;
- columnas de tarjetas;
- alineación;
- separación;
- tokens.

No se permite alterar:

- ids;
- precios;
- duración;
- disponibilidad;
- requerimientos de formularios;
- eventos;
- endpoints;
- orden lógico obligatorio.

## Slots seguros

### Globales

- antes del header;
- después del header;
- antes del footer;
- después del footer, si el contenido sigue dentro del shell.

### Por paso

- antes de la introducción;
- después de la introducción;
- antes del bloque funcional principal;
- después del bloque funcional principal;
- antes de las acciones de navegación;
- después de las acciones de navegación, si no interrumpe el flujo.

### Alcance

Un bloque puede ser:

- global;
- visible en pasos seleccionados;
- visible solo en un paso;
- visible solo en el inicio;
- visible solo en confirmación.

La primera versión debe ofrecer presets legibles como “Antes de los servicios” y mapearlos internamente al slot correcto.

## Primitivas de estructura

### Sección

Contenedor principal:

- ancho;
- alto mínimo;
- fondo;
- imagen de fondo;
- overlay de color;
- padding;
- gap;
- borde;
- radio;
- sombra;
- alineación;
- visibilidad por breakpoint.

### Stack

Orden vertical u horizontal con:

- dirección;
- gap;
- alineación;
- distribución;
- wrap.

### Columnas

Disponible en una fase posterior:

- 2 a 4 columnas;
- proporciones predefinidas;
- colapso configurable en móvil;
- sin anidación infinita.

### Overlay acotado

Disponible después de estabilizar el layout en flujo:

- pertenece a una sección;
- coordenadas relativas;
- límites de desplazamiento;
- z-index de una escala cerrada;
- detección de desborde;
- fallback móvil.

## Catálogo de contenido

### Prioridad 1

| Bloque | Propósito |
| --- | --- |
| Imagen | Fotografía o gráfica independiente |
| Banner | Imagen, overlay, título, texto y CTA |
| Texto | Título, párrafo o etiqueta |
| Botón | CTA seguro con enlace o acción permitida |
| Divisor | Separación visual |
| Espaciador | Separación controlada por breakpoint |

### Prioridad 2

| Bloque | Propósito |
| --- | --- |
| Galería | Varias imágenes en grid o carrusel accesible |
| Información del negocio | Dirección, mapa, contacto y horarios |
| Testimonio | Cita, autor e imagen |
| FAQ | Preguntas desplegables |
| Redes sociales | Enlaces con iconos |
| Lista de beneficios | Icono, título y texto |

### Prioridad 3

| Bloque | Propósito |
| --- | --- |
| Contador de campaña | Fecha segura y fallback al expirar |
| Badge | Texto breve promocional |
| Video | Proveedor permitido, poster y reproducción controlada |
| Código promocional | Copiar código, sin lógica de descuento implícita |

## Especificación del bloque Imagen

### Contenido

- `assetId`;
- texto alternativo;
- marca decorativa;
- pie opcional;
- enlace opcional.

### Presentación

- modo: bloque, fondo u overlay;
- ancho: auto, completo, porcentaje o span;
- alto: auto, relación o máximo;
- relación: original, 1:1, 4:3, 3:2, 16:9, 21:9 o personalizada acotada;
- ajuste: cover o contain;
- punto focal X/Y;
- alineación;
- radio;
- borde;
- sombra;
- opacidad;
- filtro de overlay;
- comportamiento hover de una lista segura.

### Responsive

- fuente optimizada por ancho;
- relación y punto focal por breakpoint;
- ancho por breakpoint;
- visibilidad por breakpoint;
- fallback heredado;
- nunca cargar dos versiones visibles del mismo activo para simular responsive.

### Accesibilidad

- alt obligatorio cuando la imagen comunica información;
- opción “Decorativa” que genera alt vacío;
- enlaces con nombre accesible;
- contraste de texto sobre imagen verificado con overlay.

## Especificación del bloque Banner

Componentes:

- imagen o color de fondo;
- título;
- descripción;
- CTA opcional;
- badge opcional.

Variantes:

- texto sobre imagen;
- imagen lateral;
- imagen superior;
- solo color;
- compacto.

Reglas:

- CTA único en la primera versión;
- enlace validado;
- altura mínima y máxima;
- texto limitado por diseño, no truncado silenciosamente;
- posición de texto ajustable;
- punto focal separado para móvil.

Los `WidgetPromoBlock` actuales se migran a esta variante.

## Especificación del bloque Texto

Tipos semánticos:

- título de sección;
- subtítulo;
- párrafo;
- etiqueta.

Propiedades:

- contenido plano;
- énfasis básico;
- enlace seguro;
- alineación;
- ancho;
- color token o color permitido;
- tamaño de una escala;
- altura de línea;
- máximo de caracteres recomendado.

No admite HTML arbitrario. Si se incorpora rich text, será un AST cerrado con marcas permitidas.

## Especificación del bloque Botón

Destinos permitidos:

- enlace externo HTTPS;
- enlace interno seguro;
- scroll a un bloque;
- avanzar al siguiente punto permitido;
- copiar un valor no secreto.

No puede:

- ejecutar JavaScript;
- enviar formularios externos;
- alterar el estado de reserva sin una acción del sistema.

Propiedades:

- etiqueta;
- icono de catálogo;
- variante;
- ancho;
- alineación;
- destino;
- abrir en nueva pestaña;
- nombre accesible.

## Divisor y espaciador

El espaciador no usa altura arbitraria ilimitada. Escala:

- XS;
- S;
- M;
- L;
- XL;
- personalizada entre 0 y 160 px.

El divisor admite:

- grosor 1–4 px;
- sólido, punteado o discontinuo;
- ancho;
- color;
- margen.

## Biblioteca de activos

Funciones:

- subir;
- reutilizar;
- buscar;
- filtrar por uso;
- ver dimensiones y tamaño;
- editar alt predeterminado;
- reemplazar en un bloque;
- archivar;
- eliminar cuando no tiene referencias.

No se debe obligar a subir la misma imagen para cada bloque.

## Reglas de anidación

- máximo 20 secciones por documento en la primera versión;
- máximo 50 bloques de contenido activos;
- máximo 4 niveles de jerarquía;
- una sección no puede contener otra sección en la primera versión;
- overlays solo como hijos directos de sección;
- bloques del sistema no pueden ser hijos de bloques de contenido;
- no se permite ciclo ni referencia recursiva;
- ids son únicos en el documento;
- el orden se expresa por arrays, no por posiciones duplicables.

Los límites deben configurarse en servidor y documentarse por plan si se convierten en una característica comercial.

## Reglas responsive

### Herencia

Escritorio define la base. Tablet y móvil heredan salvo override explícito.

### Columnas

Por defecto:

- escritorio conserva columnas;
- tablet reduce cuando no hay ancho mínimo;
- móvil apila.

### Overlay

Si no existe override móvil:

- conserva anclaje;
- reduce tamaño proporcionalmente;
- limita desplazamiento;
- impide overflow;
- si el resultado sigue siendo ilegible, se convierte en bloque en flujo y se genera una advertencia en editor.

### Texto

Usa escalas y `clamp`, no tamaños libres sin límites.

### Ocultar

Ocultar por dispositivo requiere confirmar cuando el bloque contiene información esencial o el único CTA.

## Diseño del documento

Ejemplo conceptual:

```json
{
  "schemaVersion": 1,
  "tokens": {
    "primary": "#7C3AED",
    "background": "#0A0A0A",
    "text": "#FFFFFF",
    "radius": 16
  },
  "pages": {
    "service": {
      "slots": {
        "beforeMain": [
          {
            "id": "section_promo",
            "type": "section",
            "children": [
              {
                "id": "banner_welcome",
                "type": "banner",
                "props": {
                  "assetId": "asset_123",
                  "title": "20% en tu primera cita",
                  "fit": "cover",
                  "focalPoint": { "x": 50, "y": 35 }
                }
              }
            ]
          }
        ]
      }
    }
  }
}
```

El esquema definitivo y su estrategia de persistencia se describen en [05-arquitectura-datos-y-render.md](./05-arquitectura-datos-y-render.md).

## Estados de render por bloque

Todo bloque registra:

- estado normal;
- estado de carga si corresponde;
- activo faltante;
- contenido inválido;
- oculto;
- no soportado por versión.

En editor se muestra el error y una reparación. En producción:

- un bloque de contenido inválido se omite y se registra;
- un bloque del sistema inválido activa fallback a la versión anterior;
- nunca se imprime JSON o stack trace.
