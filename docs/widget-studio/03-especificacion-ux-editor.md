# 03 — Especificación UX del editor

## Arquitectura de información

La sección Apariencia se propone con tres destinos principales:

- **Editor:** diseño y contenido del widget.
- **Temas:** presets visuales del catálogo y del negocio.
- **Historial:** publicaciones, autor, fecha, preview y restauración.

Dentro del Editor existen dos modos sobre el mismo borrador:

- **Básico**
- **Avanzado**

El usuario puede cambiar de modo sin perder información. Si un diseño avanzado contiene propiedades que el modo Básico no expone, estas se preservan.

## Encabezado del editor

El encabezado debe permanecer estable e incluir:

- nombre “Apariencia”;
- estado: `Publicado`, `Borrador con cambios`, `Guardando`, `Error al guardar`;
- selector Básico/Avanzado;
- undo;
- redo;
- preview en nueva pestaña;
- historial;
- botón Publicar;
- ayuda contextual.

El botón Publicar debe diferenciarse visualmente de Guardar. El guardado del borrador es automático y no necesita un botón principal permanente.

## Layout de escritorio

### Modo Básico

Dos columnas:

- preview a la izquierda;
- controles agrupados a la derecha.

La preview permanece visible con `sticky` solo cuando existe altura suficiente. En viewport bajo, vuelve al flujo normal y nunca oculta los controles de publicación.

### Modo Avanzado

Dos zonas permanentes:

| Zona | Ancho orientativo | Función |
| --- | ---: | --- |
| Biblioteca y capas | 248–288 px | Agregar bloques, navegar secciones y ordenar |
| Canvas | Flexible, mínimo 420 px | Ver y seleccionar el widget real |

Las propiedades frecuentes se muestran en una barra contextual horizontal, situada entre los controles de viewport y el canvas. Los ajustes poco frecuentes se abren en un drawer temporal sobre el borde derecho. El drawer no reserva ancho ni crea una tercera columna.

Reglas:

- los paneles laterales son colapsables;
- el canvas conserva el centro disponible;
- no hay scroll horizontal de página;
- la estructura puede desplazarse sin mostrar una barra visual permanente;
- el canvas exterior no tiene scroll vertical: el contenido se desplaza únicamente dentro del widget;
- el header de acciones permanece visible;
- entre 800 y 1199 px se conservan la estructura compacta y el canvas;
- a menos de 800 px se usa el flujo móvil descrito más abajo.

### Modelo operativo del Studio

El modo Avanzado no duplica controles entre paneles. La responsabilidad de cada zona es única:

- **Pasos:** cambia la pantalla simulada entre Servicios, Profesionales, Fecha y hora, y Datos del cliente;
- **Capas:** muestra la jerarquía completa, incluidos los componentes funcionales protegidos;
- **Añadir:** incorpora contenido visual en el slot activo;
- **Canvas:** selecciona el componente real y refleja el documento local de inmediato;
- **Barra contextual:** concentra las propiedades de uso diario sobre el widget, con el patrón de una cinta de edición;
- **Ajustes detallados:** abre un drawer solo cuando se solicita y nunca duplica la barra contextual.

Los textos editables se modifican directamente sobre el canvas mediante `contenteditable`. El cursor comunica la acción disponible: `text` al escribir y `pointer` al seleccionar componentes. El inspector detallado conserva una alternativa de formulario para accesibilidad y propiedades avanzadas, pero no es la vía principal para editar contenido.

El canvas tiene dos comportamientos explícitos:

- **Diseñar:** cualquier click selecciona el componente bajo el cursor y nunca avanza la reserva;
- **Probar:** permite recorrer el flujo con datos simulados, sin consultas destructivas ni creación de citas.

Los cambios visuales se envían directamente al renderer mediante mensajería same-origin. El debounce de autosave no controla la preview: solo confirma el borrador en segundo plano. Las escrituras se serializan para evitar carreras y, si otra sesión guardó antes, el cliente realiza una combinación de tres vías sobre el último borrador antes de reintentar. La interfaz no obliga al usuario a resolver un “conflicto de edición” técnico ni a recargar manualmente.

Los componentes funcionales del widget son capas protegidas. El usuario puede cambiar su presentación —títulos, descripciones, distribución, densidad, imágenes visibles y estilos de tarjetas o campos— pero los datos reales y las reglas de reserva permanecen administrados desde Servicios, Profesionales y Configuración.

## Editor en tablet y móvil

En pantallas pequeñas no se comprimen paneles laterales.

La experiencia se divide en:

1. canvas a ancho completo;
2. barra inferior con `Pasos`, `Agregar`, `Capas`, `Editar` y `Lienzo`;
3. panel inferior deslizable para estructura, biblioteca o ajustes detallados;
4. encabezado compacto con estado y Publicar.

El usuario puede seleccionar un bloque tocándolo. Los handles deben tener al menos 44 × 44 px. Reordenar por drag and drop siempre tiene alternativa “Mover arriba/abajo”.

## Canvas

### Preview real

El canvas carga el mismo renderer que producción mediante un `iframe` aislado. La diferencia es la fuente del documento:

- producción: versión publicada;
- editor: borrador privado autorizado.

El `iframe` no recibe el documento completo en query strings. Usa una sesión de preview temporal y vinculada al negocio.

### Presets de tamaño

- Móvil: 360 px
- Tablet: 768 px
- Escritorio: 1200 px
- Embed personalizado: ancho ingresado entre 320 y 1600 px

Cada preset adapta su altura al espacio vertical disponible y el contenido se desplaza dentro del `iframe`. El canvas exterior recorta el excedente vertical y nunca añade un segundo desplazamiento. El editor no calcula la altura exterior a partir del contenido del documento porque ese acoplamiento crea bucles de `resize`, saltos de scrollbar y “tiriteo” al cambiar de paso o estilo.

El editor debe permitir probar todos los pasos con datos simulados seguros, sin crear reservas. Cambiar entre Móvil, Tablet y Escritorio solo modifica el viewport simulado y el zoom de ajuste; no remonta el renderer ni altera el borrador.

### Zoom del canvas

El zoom interno del canvas es independiente del zoom del navegador:

- ajustar;
- 50 %;
- 75 %;
- 100 %;
- 125 %;
- 150 %.

El zoom solo transforma la visualización. No modifica tamaños del documento ni usa `zoom` CSS sobre la página completa.

La aplicación debe seguir operable con zoom del navegador entre 80 % y 200 %. Esto forma parte de la matriz de aceptación.

### Selección

Al seleccionar un bloque:

- aparece un borde de selección que no forma parte del diseño;
- se muestra su nombre;
- aparecen acciones contextuales: mover, duplicar, ocultar, bloquear, eliminar;
- el inspector abre el grupo de propiedades correcto;
- la capa correspondiente se resalta.

Los bloques del sistema muestran un candado y explican qué propiedades sí pueden cambiar.

## Biblioteca de bloques

La biblioteca se divide en:

- Contenido;
- Medios;
- Estructura;
- Negocio;
- Avanzados.

Cada bloque muestra:

- icono;
- nombre;
- descripción corta;
- disponibilidad actual;
- etiqueta `Próximamente` si aún no está implementado.

Agregar funciona de tres maneras:

- click: inserta en el slot activo;
- drag: arrastra al slot permitido;
- menú contextual: “Agregar debajo”.

Un drop inválido muestra por qué no es posible, en lugar de fallar silenciosamente.

## Panel de capas

Representa la jerarquía real:

```text
Widget
├─ Encabezado del sistema
├─ Sección Hero
│  ├─ Imagen de fondo
│  ├─ Título
│  └─ Botón
├─ Paso de reserva
│  ├─ Introducción del sistema
│  ├─ Banner promoción
│  └─ Selector de servicios del sistema
└─ Pie del sistema
```

Permite:

- expandir y contraer;
- seleccionar;
- ordenar dentro de la misma zona;
- mover a un slot compatible;
- bloquear;
- ocultar por breakpoint;
- renombrar internamente;
- identificar bloques con error.

## Inspector

El inspector usa disclosure progresivo:

1. Contenido
2. Diseño
3. Posición
4. Responsive
5. Accesibilidad
6. Enlace y comportamiento

Los controles comunes deben reutilizar el mismo componente y nomenclatura.

### Controles base

- ancho: automático, completo, porcentaje o columnas;
- alto: automático, mínimo o fijo acotado;
- alineación;
- padding y gap;
- fondo;
- borde;
- radio;
- sombra;
- opacidad;
- visibilidad;
- nombre interno.

### Valores responsive

Cada propiedad soportada muestra:

- valor heredado;
- override para el breakpoint activo;
- acción “Restablecer al heredado”.

No se crean automáticamente overrides por mover un bloque. El editor debe avisar cuándo una acción afectará solo al breakpoint actual.

## Flujo: agregar una imagen

1. El usuario elige `Imagen`.
2. Selecciona un archivo o reutiliza uno de la biblioteca.
3. La subida muestra progreso real.
4. El sistema valida y genera una miniatura.
5. El usuario escoge el uso:
   - bloque;
   - fondo de sección;
   - overlay de sección, cuando esté disponible.
6. Escoge el slot o sección.
7. Ajusta:
   - relación de aspecto;
   - recorte;
   - punto focal;
   - `cover` o `contain`;
   - ancho;
   - alineación;
   - radio;
   - enlace;
   - texto alternativo.
8. Revisa móvil, tablet y escritorio.
9. El borrador se guarda.
10. Publica cuando esté conforme.

Si cierra el editor después del paso 9, el widget público no cambia.

## Flujo: mover una imagen

### En flujo

Puede arrastrarse entre slots compatibles o usar:

- Mover arriba;
- Mover abajo;
- Mover a…;
- Cortar;
- Pegar.

### Como overlay

El movimiento queda limitado a su sección. Se representa con:

- anclaje horizontal: izquierda, centro, derecha;
- anclaje vertical: arriba, centro, abajo;
- desplazamiento X/Y en porcentaje acotado;
- ancho relativo;
- límite de desborde;
- orden de capa permitido.

El editor ofrece “Corregir en móvil” cuando detecta desborde o solapamiento.

## Flujo: publicación

1. El usuario presiona Publicar.
2. Se ejecuta validación completa.
3. Se muestran errores bloqueantes y advertencias.
4. Si no hay errores, se abre un resumen:
   - versión actual;
   - cantidad de cambios;
   - dispositivos revisados;
   - advertencias;
   - autor.
5. El usuario confirma.
6. Se crea una versión inmutable.
7. El puntero publicado cambia en una transacción.
8. Se invalida caché.
9. Se realiza un smoke render.
10. Se informa éxito o se revierte el puntero.

Advertencias pueden incluir una imagen sin alt decorativo explícito o un contraste cercano al límite. Errores incluyen documento inválido, activo inexistente o bloque del sistema faltante.

## Autosave

Estados visibles:

- Guardado;
- Guardando…;
- Sin conexión;
- Error al guardar;
- Conflicto de edición.

Comportamiento:

- debounce de 600–1000 ms para cambios de propiedades;
- guardado inmediato para operaciones estructurales críticas;
- revisión optimista mediante número de borrador;
- reintento con backoff;
- cola local temporal ante desconexión;
- aviso antes de abandonar si la cola no llegó al servidor.

No debe mostrarse “Guardado” hasta recibir confirmación del servidor.

## Undo y redo

### En sesión

- mínimo 50 comandos;
- propiedades, inserciones, movimiento, visibilidad y eliminación;
- atajos `Ctrl+Z`, `Ctrl+Shift+Z` y `Ctrl+Y`.

### Persistente

El historial de publicaciones no sustituye undo/redo. Restaurar crea un nuevo borrador basado en una versión anterior; no borra versiones.

## Eliminación

- eliminar un bloque lo quita del borrador y permite undo;
- publicar confirma su ausencia;
- un activo no se elimina físicamente mientras tenga referencias;
- la eliminación permanente de un activo es diferida;
- eliminar una sección que contiene bloques exige confirmación y muestra el contenido afectado.

## Estados vacíos y errores

### Sin diseño V2

Mostrar:

- preview del widget actual;
- explicación “Tu widget no cambiará hasta que publiques”;
- botón “Crear borrador desde mi diseño actual”.

### Error de render del borrador

Mostrar:

- último preview válido;
- detalle de los bloques con problema;
- acción “Reparar”;
- opción “Descartar cambios desde el último guardado”.

El widget público nunca debe mostrar este error si tiene una versión publicada válida.

### Error de subida

Debe indicar causa concreta:

- formato no permitido;
- archivo demasiado grande;
- dimensiones inválidas;
- conexión;
- cuota;
- procesamiento.

## Ayuda contextual

El botón de ayuda abre un tour específico del Editor:

- diferencia entre borrador y publicado;
- selector de dispositivo;
- biblioteca;
- canvas;
- inspector;
- publicación.

El tour se ancla a elementos visibles y cambia según modo y tamaño de pantalla. No puede tapar la acción explicada y debe reposicionarse si no existe espacio.

## Accesos rápidos propuestos

| Acción | Atajo |
| --- | --- |
| Deshacer | `Ctrl+Z` |
| Rehacer | `Ctrl+Shift+Z` o `Ctrl+Y` |
| Duplicar | `Ctrl+D` |
| Eliminar | `Delete` |
| Copiar | `Ctrl+C` |
| Pegar | `Ctrl+V` |
| Guardar borrador ahora | `Ctrl+S` |
| Preview | `Ctrl+P` solo si no entra en conflicto con el navegador; si no, sin atajo |
| Cerrar panel | `Esc` |
| Mover bloque | Flechas con modificador |

Los atajos se desactivan dentro de inputs cuando podrían editar texto.
