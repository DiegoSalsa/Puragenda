# 12 — Wireframes y flujos

Estos wireframes son funcionales, no una propuesta visual final. Sirven para acordar jerarquía, acciones y comportamiento antes de diseñar componentes.

## Entrada para negocio legacy

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Apariencia                                      [? Ayuda]            │
│ Tu widget público usa el diseño actual                                │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Vista previa actual       │  │ Nuevo Editor del widget          │  │
│  │                           │  │                                  │  │
│  │ [widget real]             │  │ • Edita sin afectar producción  │  │
│  │                           │  │ • Agrega imágenes y contenido    │  │
│  │                           │  │ • Revisa móvil y escritorio      │  │
│  │                           │  │ • Publica cuando esté listo      │  │
│  └───────────────────────────┘  │                                  │  │
│                                 │ [Crear borrador desde mi diseño] │  │
│                                 └──────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

Reglas:

- no se crea el borrador automáticamente;
- el CTA explica que producción no cambiará;
- existe enlace a “Seguir usando el editor actual” durante transición;
- después de crear, se ejecuta comparación visual.

## Editor Básico — escritorio

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Apariencia / Editor    [Básico | Avanzado]  ✓ Guardado  [Preview] [Publicar]│
├───────────────────────────────────┬──────────────────────────────────────────┤
│ Vista previa                      │ Personalización                          │
│ [Móvil] [Tablet] [Escritorio]     │                                          │
│ [Ajustar] [75%] [100%]            │ ▼ Identidad                             │
│                                   │   Colores · Logo · Tipografía           │
│ ┌───────────────────────────────┐ │                                          │
│ │                               │ │ ▼ Contenido principal                    │
│ │       WIDGET REAL             │ │   Imagen principal                       │
│ │                               │ │   [Subir o elegir]                        │
│ │                               │ │   Posición [Después del header ▾]        │
│ │                               │ │                                          │
│ │                               │ │ ▼ Bloques promocionales                  │
│ │                               │ │   [ + Agregar bloque ]                   │
│ │                               │ │   1. Banner julio        [⋮]             │
│ │                               │ │   2. Texto bienvenida    [⋮]             │
│ └───────────────────────────────┘ │                                          │
│ El borrador no afecta producción  │ ▼ Forma y espaciado                     │
├───────────────────────────────────┴──────────────────────────────────────────┤
│ Última publicación: v4 · hace 2 días                 [Ver historial]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

Decisiones UX:

- preview a la izquierda, como se solicitó;
- controles frecuentes agrupados;
- contenido muestra una lista, no capas técnicas;
- Publicar siempre visible;
- no existe botón Guardar principal;
- `✓ Guardado` es confirmación del borrador.

## Editor Avanzado — escritorio

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Apariencia / Editor [Básico | Avanzado] [↶] [↷] Guardado [Preview] [Publicar]       │
├──────────────────────┬──────────────────────────────────────┬────────────────────────┤
│ BLOQUES / CAPAS      │ CANVAS                               │ INSPECTOR               │
│                      │ [360] [768] [1200] [Ajustar] [100%] │ Imagen promocional      │
│ Buscar bloque...     │                                      │                        │
│                      │  ┌────────────────────────────────┐  │ Contenido              │
│ + Imagen             │  │ Header 🔒                     │  │ [Cambiar imagen]       │
│ + Banner             │  │                                │  │ Alt [______________]   │
│ + Texto              │  │ ┌─ Sección Hero ────────────┐ │  │                        │
│ + Botón              │  │ │ [imagen seleccionada]     │ │  │ Diseño                 │
│ + Divisor            │  │ │                  [CTA]     │ │  │ Ancho [100% ▾]        │
│                      │  │ └────────────────────────────┘ │  │ Ajuste [Cover ▾]       │
│ CAPAS                │  │                                │  │ Focal [ editor ]       │
│ ▾ Widget             │  │ Selector de servicios 🔒      │  │ Radio [16]             │
│   Header 🔒          │  │                                │  │                        │
│ ▾ Hero               │  └────────────────────────────────┘  │ Posición               │
│   Imagen ●           │                                      │ En flujo [●] Overlay ○ │
│   Título             │  Móvil: sin errores                  │                        │
│   Botón              │  Tablet: 1 advertencia               │ Responsive             │
│   Servicios 🔒       │                                      │ [Móvil] [Tablet] [Base]│
├──────────────────────┴──────────────────────────────────────┴────────────────────────┤
│ v4 publicada · Borrador con 6 cambios                         [Revisar cambios]       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

Reglas:

- biblioteca y capas comparten panel mediante tabs si falta ancho;
- bloques protegidos tienen candado;
- el canvas muestra errores por dispositivo;
- el inspector edita el bloque seleccionado;
- el footer de estado no cubre contenido.

## Editor en viewport intermedio

```text
┌────────────────────────────────────────────────────────────┐
│ Editor [Básico|Avanzado] Guardado         [Publicar]       │
├───────────────┬────────────────────────────────────────────┤
│ Panel activo  │ Canvas                                     │
│               │                                            │
│ [Bloques]     │                                            │
│ [Capas]       │                                            │
│ [Propiedades] │                                            │
│               │                                            │
├───────────────┴────────────────────────────────────────────┤
│ [Biblioteca] [Capas] [Inspector] [Preview]                 │
└────────────────────────────────────────────────────────────┘
```

Solo hay un panel lateral abierto. El usuario elige cuál.

## Editor móvil

```text
┌──────────────────────────────┐
│ Editor        Guardado [Pub.]│
│ [360] [Ajustar] [⋮]         │
├──────────────────────────────┤
│                              │
│        WIDGET REAL           │
│                              │
│  [bloque seleccionado]       │
│                              │
├──────────────────────────────┤
│ [+]  [Capas]  [Editar] [Ver] │
└──────────────────────────────┘

Al tocar Editar:

┌──────────────────────────────┐
│ Imagen promocional      [×]  │
├──────────────────────────────┤
│ Contenido                    │
│ Imagen [Cambiar]             │
│ Alt [____________________]   │
│                              │
│ Diseño                       │
│ Ancho [Completo ▾]           │
│ Ajuste [Cover ▾]             │
│                              │
│ [Mover arriba] [Mover abajo] │
│ [Duplicar]      [Eliminar]   │
└──────────────────────────────┘
```

El inspector es un bottom sheet. El canvas no queda comprimido detrás.

## Biblioteca de activos

```text
┌─────────────────────────────────────────────────────────────────┐
│ Elegir imagen                                             [×]   │
├─────────────────────────────────────────────────────────────────┤
│ [Subir nueva] [Buscar________________] [Usadas ▾] [Recientes ▾]│
│                                                                 │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │          │ │          │ │          │ │          │            │
│ │  IMG 1   │ │  IMG 2   │ │  IMG 3   │ │  IMG 4   │            │
│ │          │ │          │ │          │ │          │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│ Hero.jpg    Promo.webp  Local.png    Equipo.jpg                 │
│ 1200×800    1400×700    900×900      1600×1067                  │
│                                                                 │
│ Cuota usada: 42 MB de 250 MB                                   │
└─────────────────────────────────────────────────────────────────┘
```

La cuota es ilustrativa y depende de D-17.

## Edición de imagen

```text
┌───────────────────────────────────────────────────────────────┐
│ Editar imagen                                            [×]  │
├────────────────────────────────┬──────────────────────────────┤
│                                │ Uso                          │
│   ┌────────────────────────┐   │ (●) Bloque                   │
│   │                        │   │ ( ) Fondo de sección         │
│   │       RECORTE          │   │ ( ) Overlay                 │
│   │          ⊕ foco        │   │                              │
│   │                        │   │ Proporción [16:9 ▾]          │
│   └────────────────────────┘   │ Ajuste [Cover ▾]             │
│                                │ Alineación [Centro ▾]        │
│ [Móvil] [Tablet] [Escritorio]  │ Alt [____________________]   │
│                                │ [ ] Es decorativa            │
├────────────────────────────────┴──────────────────────────────┤
│                                    [Cancelar] [Aplicar]       │
└───────────────────────────────────────────────────────────────┘
```

Cambiar breakpoint permite definir punto focal y relación específicos.

## Elección de ubicación

```text
¿Dónde quieres mostrarla?

[ Después del encabezado ]
Ideal para imagen principal o presentación.

[ Antes de los servicios ]
Visible antes de que el cliente elija.

[ Después de los servicios ]
Refuerza información sin interrumpir la selección.

[ Antes del pie ]
Promociones o información complementaria.

[ Elegir visualmente en el canvas ]
Disponible en modo Avanzado.
```

El usuario no necesita conocer nombres de slots.

## Publicación

```text
┌───────────────────────────────────────────────────────────┐
│ Publicar cambios                                    [×]  │
├───────────────────────────────────────────────────────────┤
│ Borrador listo para publicar                             │
│                                                         │
│ 6 cambios                                               │
│ + 1 imagen                                              │
│ + 2 textos                                              │
│ ~ 3 ajustes visuales                                    │
│                                                         │
│ Dispositivos                                            │
│ ✓ Móvil   ✓ Tablet   ✓ Escritorio                       │
│                                                         │
│ Advertencias                                            │
│ ⚠ El contraste del texto secundario está cerca del límite│
│ [Revisar]                                               │
│                                                         │
│ La versión v4 seguirá disponible para restaurar.        │
├───────────────────────────────────────────────────────────┤
│                         [Cancelar] [Publicar versión v5] │
└───────────────────────────────────────────────────────────┘
```

Si hay errores bloqueantes, el botón final permanece deshabilitado y cada error lleva al bloque.

## Historial

```text
┌──────────────────────────────────────────────────────────────────┐
│ Historial de publicaciones                         [Volver]      │
├──────────────────────────────────────────────────────────────────┤
│ v5  Activa       Hoy 18:42    Daniela     [Preview] [⋮]         │
│     Nueva imagen principal y banner                              │
├──────────────────────────────────────────────────────────────────┤
│ v4  Respaldo     21 jul       Diego       [Preview] [Restaurar] │
├──────────────────────────────────────────────────────────────────┤
│ v3              18 jul       Diego       [Preview] [Restaurar] │
└──────────────────────────────────────────────────────────────────┘
```

Restaurar no cambia producción inmediatamente. Crea un nuevo borrador.

## Conflicto de edición

```text
Otro usuario guardó cambios mientras editabas.

[Ver sus cambios] [Conservar una copia de los míos] [Combinar manualmente]
```

En el MVP se puede simplificar a:

- recargar la versión del servidor;
- duplicar el documento local como copia;
- volver a aplicar cambios.

Nunca existe “Sobrescribir sin revisar” como acción primaria.

## Estados de carga

### Guardado

```text
Guardando… → Guardado hace unos segundos
```

### Subida

```text
Subiendo Hero.jpg
[██████████████░░░░] 72 %
Optimizando para móvil…
```

### Publicación

```text
Validando → Creando versión → Actualizando widget → Verificando
```

Cada etapa tiene timeout, error concreto y reintento seguro.

## Puntos a validar visualmente

- ancho real de la preview en Básico;
- paneles claros u oscuros;
- ubicación de la barra de estado;
- densidad del inspector;
- si Biblioteca y Capas comparten tab;
- si el modo Básico muestra lista de bloques o tarjetas;
- tamaño y posición de Publicar;
- terminología “Imagen principal”, “Banner” y “Sección”;
- comportamiento del canvas en 1024 px;
- bottom sheet móvil;
- resumen de publicación.
