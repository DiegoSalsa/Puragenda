# Widget Studio V3 — visión del editor libre y roadmap

Fecha de revisión: **29 de julio de 2026**

Estado: **propuesta de producto y arquitectura; no implementada**

Rama de laboratorio: **`testingWidget` sobre el `TestingGeneral` más reciente**

## 1. Resultado de la revisión

El Studio actual ya resuelve una parte importante de la plataforma:

- separa borrador de publicación;
- mantiene un renderer legacy;
- incorpora un documento validado;
- permite bloques, secciones, imágenes, fondos y overlays acotados;
- tiene capas, deshacer/rehacer, edición directa de algunos textos y preview real;
- conserva protegidos los pasos funcionales de la reserva.

Pero todavía no cumple la visión de un editor tipo Word o diagrams.net.

La diferencia principal no es “agregar más inputs”. Falta un **motor de composición visual**. Hoy la libertad se basa en:

- mover secciones entre slots;
- elegir layouts predefinidos;
- editar propiedades desde formularios;
- posicionar únicamente imágenes overlay mediante números;
- reordenar capas en una lista.

El objetivo V3 debe ser un editor de **libertad estructurada**:

> El usuario puede mover, redimensionar, alinear, superponer y adaptar contenido con precisión visual, pero el sistema conserva la reserva funcional, la accesibilidad, el responsive y la posibilidad de recuperar cualquier diseño.

## 2. Por qué no conviene una posición absoluta global

Permitir coordenadas libres sobre todo el widget parece ofrecer control total, pero crea cuatro problemas serios:

1. Los servicios, profesionales y horarios tienen alturas variables.
2. El contenido cambia según el negocio, dispositivo, idioma y disponibilidad.
3. Una composición de escritorio puede quedar inutilizable en móvil.
4. Un elemento decorativo podría tapar un botón de reserva o un campo obligatorio.

La solución recomendada es un modelo híbrido:

- **Flujo responsive** para la estructura principal.
- **Lienzos libres acotados** dentro de secciones creadas por el usuario.
- **Anclajes y restricciones** para adaptar la composición a distintos tamaños.
- **Bloques del sistema protegidos** para el proceso Servicio → Profesional → Fecha y hora → Datos.

Así se obtiene una sensación cercana a Word o diagrams.net sin convertir el widget en un documento frágil.

## 3. Modelo mental para el usuario

El editor debe tener cuatro niveles comprensibles:

1. **Página o paso**
   - Global.
   - Servicios.
   - Profesionales.
   - Fecha y hora.
   - Datos del cliente.

2. **Sección**
   - Sección en flujo.
   - Sección libre o “lienzo”.
   - Fondo, altura, columnas, padding y comportamiento responsive.

3. **Elemento**
   - Texto.
   - Imagen.
   - Banner.
   - Botón.
   - Forma.
   - Divisor.
   - Espaciador.
   - Grupo.

4. **Componente del sistema**
   - Encabezado.
   - Progreso.
   - Selector de servicios.
   - Selector de profesionales.
   - Calendario y horarios.
   - Formulario.
   - Pie.

Los componentes del sistema se pueden personalizar y componer, pero no eliminar de una forma que rompa la reserva.

## 4. Dos modos de composición

### 4.1 Flujo responsive

Debe seguir siendo el modo recomendado:

- bloques uno debajo del otro o en columnas;
- reordenamiento por arrastre;
- ancho automático;
- columnas que se apilan en móvil;
- espaciado y alineación consistentes;
- ideal para contenido funcional y textos largos.

### 4.2 Lienzo libre dentro de una sección

Una sección puede cambiar a “Lienzo libre” y ofrecer:

- mover con el mouse o tacto;
- redimensionar con tiradores;
- bloquear relación de aspecto;
- rotar imágenes, formas y textos decorativos;
- superponer elementos;
- enviar adelante o atrás;
- seleccionar varios elementos;
- agrupar y desagrupar;
- alinear y distribuir;
- usar cuadrícula, guías y ajuste magnético;
- definir anclajes a izquierda, centro, derecha, arriba o abajo;
- editar posición y tamaño con números cuando se necesita precisión.

El posicionamiento se guarda relativo a la sección, no a toda la página.

## 5. Tratamiento de imágenes

Una imagen debe poder usarse de cinco formas:

1. **En flujo**
   - ocupa su lugar entre otros bloques;
   - ancho y proporción configurables.

2. **Flotante con ajuste**
   - texto a la izquierda, derecha o alrededor;
   - comportamiento cercano al ajuste de texto de Word.

3. **Fondo de sección**
   - `cover` o `contain`;
   - punto focal;
   - overlay de color;
   - parallax no recomendado en la primera versión por accesibilidad y rendimiento.

4. **Overlay**
   - posición libre dentro de una sección;
   - z-index, opacidad y anclajes;
   - fallback responsive obligatorio.

5. **Imagen promocional interactiva**
   - CTA o descuento;
   - nunca debe duplicar la promoción legacy;
   - el clic debe conservar reglas de negocio y trazabilidad.

Controles mínimos:

- recorte no destructivo;
- punto focal;
- reemplazar imagen sin perder posición;
- texto alternativo o marca “decorativa”;
- compresión automática;
- aviso de resolución insuficiente;
- variantes por breakpoint únicamente cuando sea necesario.

## 6. Arquitectura de interfaz recomendada

### 6.1 Escritorio

La interfaz debe usar un shell estable de una sola pantalla:

- **Ribbon superior compacto**
  - Diseñar / Probar.
  - Básico / Avanzado.
  - Deshacer / Rehacer.
  - Dispositivo.
  - Zoom / Encajar.
  - Historial.
  - Publicar.
  - Estado de guardado en una zona fija que no cambie la altura.

- **Navegador izquierdo colapsable**
  - Pasos.
  - Capas.
  - Bloques.
  - Activos.

- **Lienzo central**
  - única superficie principal de desplazamiento;
  - pan con barra espaciadora;
  - zoom centrado en el puntero;
  - regla y guías opcionales;
  - selección directa.

- **Barra contextual flotante**
  - aparece sobre el lienzo junto a la selección;
  - contiene acciones frecuentes;
  - texto: tipografía, tamaño, peso, color y alineación;
  - imagen: reemplazar, recortar, ajuste y opacidad;
  - grupo: alinear, distribuir y ordenar.

- **Inspector derecho bajo demanda**
  - solo para propiedades avanzadas;
  - un único scroll;
  - no duplica controles de la barra contextual.

### 6.2 Tablet

El breakpoint de 768 px no debe comportarse como un teléfono.

Propuesta:

- ribbon de una línea con acciones secundarias en menú;
- navegador izquierdo como drawer temporal de 280 px;
- inspector derecho como drawer temporal;
- canvas siempre visible;
- barra contextual compacta;
- sin panel inferior que cubra más de la mitad del lienzo.

### 6.3 Móvil

Intentar comprimir diagrams.net completo en 360 px produciría una mala experiencia. El móvil debe ser un **editor rápido y seguro**, no una réplica exacta del escritorio.

Debe permitir:

- cambiar textos;
- sustituir, recortar y enfocar imágenes;
- cambiar colores y tipografía;
- reordenar secciones;
- elegir presets de composición;
- ajustar visibilidad móvil;
- mover elementos sobre una cuadrícula simplificada;
- previsualizar y probar;
- publicar o restaurar.

Las operaciones complejas se simplifican:

- selección múltiple mediante modo explícito;
- paneles en drawers que no oculten todo el lienzo;
- acciones principales en una barra inferior;
- propiedades avanzadas en una hoja deslizable;
- zoom y pan mediante gestos;
- targets táctiles de al menos 44 × 44 px;
- respeto de safe areas y teclado virtual.

## 7. Problemas concretos del Studio actual

### 7.1 Encabezado y guardado

El estado de autoguardado añade o retira una fila, cambia la altura y desplaza el canvas. Debe reservar una zona fija o utilizar un badge que no altere el layout.

### 7.2 Scrolls anidados

En 390 × 844 se midieron:

- scroll vertical de la página;
- scroll horizontal de la barra de dispositivos;
- scroll horizontal de la barra contextual;
- scroll del panel inferior cuando está abierto.

El objetivo es:

- una superficie de pan/zoom del canvas;
- un scroll por panel abierto;
- cero barras horizontales independientes en el chrome móvil.

### 7.3 Tablet tratada como móvil

El breakpoint actual cambia a hoja inferior por debajo de 800 px. En 768 × 1024 el panel puede cubrir gran parte del canvas. Tablet necesita un patrón propio.

### 7.4 Lienzo libre incompleto

Solo la imagen overlay posee `x`, `y`, ancho y z-index. No existen:

- tiradores visuales;
- rotación;
- restricciones;
- selección múltiple;
- grupos;
- alineación/distribución;
- snapping;
- guías;
- transforms por breakpoint.

### 7.5 Propiedades duplicadas

Algunas opciones aparecen en barra contextual y en inspector. La regla debe ser:

- barra contextual: cambios frecuentes;
- inspector: ajustes detallados;
- edición directa: contenido textual;
- nunca el mismo formulario completo en dos lugares.

### 7.6 Render parcial

Hay opciones presentes en el documento o UI que todavía no tienen fidelidad completa en el renderer. Ningún control debe salir a producción si su resultado público no está cubierto.

### 7.7 Componente monolítico

El editor actual concentra aproximadamente 2.274 líneas en un componente. Para evolucionar sin regresiones necesita separar:

- estado del documento;
- historial;
- sincronización del preview;
- autosave;
- canvas;
- selección;
- transformaciones;
- paneles;
- activos;
- publicación.

## 8. Documento V3 recomendado

El documento actual puede evolucionar de forma versionada. No se recomienda reemplazarlo de golpe.

Estructura conceptual:

```text
document
├── meta
├── tokens
├── breakpoints
├── pages
│   └── sections
│       └── nodes
├── systemBindings
├── assets
└── accessibility
```

Cada nodo libre necesita:

```text
node
├── id, type, name
├── content o assetId
├── layoutMode: flow | float | absolute
├── transform: x, y, width, height, rotation, z
├── constraints: horizontal, vertical, min, max, aspect
├── responsiveOverrides
├── visibility
├── locked
└── accessibility
```

Reglas:

- coordenadas normalizadas o relativas, no píxeles de pantalla sin contexto;
- herencia desktop → tablet → mobile con overrides explícitos;
- orden DOM accesible separado de z-index visual;
- nodos del sistema identificados y protegidos;
- migrador V1 → V2/V3 determinista y reversible;
- renderer único para preview y publicación.

## 9. Interacciones obligatorias del canvas

### Selección

- clic selecciona;
- `Shift + clic` agrega a la selección;
- `Escape` deselecciona;
- breadcrumb muestra sección y elemento;
- el cursor comunica mover, redimensionar, texto o bloqueo.

### Movimiento

- arrastre libre;
- flechas mueven 1 unidad;
- `Shift + flechas` mueve 10;
- guías inteligentes;
- ajuste a cuadrícula, bordes, centros y otros elementos.

### Tamaño y rotación

- ocho tiradores;
- mantener proporción;
- valores mínimos/máximos;
- rotación solo donde sea segura;
- restablecer transformación.

### Capas y grupos

- arrastrar para reordenar;
- ocultar;
- bloquear;
- duplicar;
- renombrar;
- agrupar/desagrupar;
- enviar al frente/fondo.

### Teclado

- deshacer/rehacer;
- copiar/pegar dentro del documento;
- duplicar;
- eliminar;
- agrupar;
- navegación de selección;
- nunca interceptar atajos mientras se escribe en un campo.

## 10. Guardado y rendimiento

La sensación de respuesta debe ser inmediata:

1. el cambio se aplica primero al estado local;
2. el renderer del iframe recibe un parche o documento actualizado;
3. el autosave ocurre en segundo plano;
4. el badge cambia sin alterar el layout;
5. no se vuelve a consultar todo el diseño después de cada acción.

Objetivos iniciales:

- feedback visual local por debajo de 50 ms;
- actualización perceptible del preview por debajo de 100 ms;
- guardado debounced sin bloquear la edición;
- 60 FPS durante transformaciones razonables;
- documento grande de aceptación: 20 secciones y 50 bloques;
- historial de comandos agrupado: escribir una palabra no crea una entrada por tecla.

## 11. Seguridad y compatibilidad

No negociables:

- sin HTML, CSS o JavaScript arbitrarios;
- URLs y archivos validados;
- cuotas por negocio;
- RLS y grants explícitos para tablas V2/V3;
- permisos de editar y publicar separados;
- toda publicación crea una versión inmutable;
- rollback de un clic;
- el renderer legacy permanece hasta completar una migración opt-in;
- `rendererEnabled` permite desactivar V2 de inmediato;
- pruebas con copia local anonimizada antes de migrar clientes existentes.

## 12. Roadmap recomendado

### V3-0 — Cerrar riesgos actuales

- resolver P0 de promociones, imágenes legacy, RLS y pruebas;
- estabilizar autoguardado, Probar, ayuda y responsive;
- garantizar fidelidad de todos los controles actuales.

### V3-1 — Shell Office estable

- ribbon compacto;
- una sola arquitectura de paneles;
- tablet propia;
- barra contextual sin duplicación;
- estado de guardado fijo;
- shortcuts y cursores correctos.

### V3-2 — Motor de selección y transformación

- scene graph;
- selección visual;
- mover/redimensionar;
- snapping, guías y cuadrícula;
- z-index;
- deshacer/rehacer basado en comandos.

### V3-3 — Capas, grupos y composición

- selección múltiple;
- grupos;
- alineación/distribución;
- orden de capas;
- secciones libres;
- copiar/pegar y duplicar.

### V3-4 — Responsive profesional

- restricciones;
- anclajes;
- overrides por breakpoint;
- herencia y reset de override;
- modo móvil simplificado;
- detector de desbordes y solapamientos.

### V3-5 — Estudio de activos

- crop y punto focal;
- reemplazo sin perder layout;
- variantes;
- biblioteca, búsqueda y metadatos;
- cuotas, cleanup y referencias.

### V3-6 — Publicación y aceptación

- preview y público con el mismo renderer;
- pruebas de snapshot/contrato;
- publicación idempotente;
- rollback probado;
- telemetría de errores;
- rollout por negocio.

## 13. Criterios de aceptación del end goal

El editor V3 no se considera completo hasta que:

1. se puede construir una composición promocional con texto, imagen, forma y CTA sin editar JSON;
2. los elementos se pueden mover, redimensionar, alinear, agrupar y ordenar visualmente;
3. todos los cambios frecuentes ocurren sobre el canvas o barra contextual;
4. el inspector no duplica la edición principal;
5. una composición se adapta a 360, 390, 768, 1200 y 1440 px;
6. el usuario puede definir o restablecer overrides responsive;
7. ningún elemento tapa controles funcionales sin advertencia;
8. Diseñar nunca avanza la reserva y Probar recorre todo el flujo;
9. preview y producción renderizan el mismo documento;
10. publicar, fallar, restaurar y hacer rollback están probados;
11. los clientes legacy no cambian sin opt-in;
12. permisos de edición y publicación se respetan;
13. teclado, lector de pantalla y `prefers-reduced-motion` tienen cobertura;
14. existe QA Android real además de pruebas responsive de navegador;
15. el editor mantiene respuesta inmediata con el documento máximo admitido.

## 14. Estimación de avance

La estimación es una medida de madurez, no una promesa de calendario.

| Área | Peso | Avance estimado | Lectura |
| --- | ---: | ---: | --- |
| Compatibilidad y seguridad de clientes actuales | 14% | 50% | Existe fallback y publicación separada; quedan P0. |
| Documento y renderer | 14% | 55% | Base V1 útil; falta scene graph y fidelidad completa. |
| Editor básico | 8% | 70% | Resuelve identidad, bloques y propiedades frecuentes. |
| Manipulación avanzada de canvas | 18% | 22% | Overlay numérico, sin motor visual completo. |
| Responsive y edición móvil | 10% | 25% | Preview existe; shell móvil/tablet aún es deficiente. |
| Activos e imágenes | 8% | 45% | Biblioteca y upload existen; falta ciclo de vida y edición. |
| Borrador, versiones y publicación | 10% | 60% | Arquitectura presente; falta robustez demostrada. |
| Permisos y aislamiento | 8% | 40% | Servicios validan acceso; falta endurecimiento completo. |
| Pruebas y observabilidad | 7% | 20% | Base general verde; casi sin cobertura V2 de punta a punta. |
| Integración con TestingGeneral | 3% | 90% | Integrada y validada localmente; falta cierre Git/QA final. |
| **Total ponderado** | **100%** | **44%** | Buena plataforma inicial; editor libre todavía temprano. |

Indicadores separados:

- **Base de plataforma:** aproximadamente 55–60%.
- **Libertad visual tipo Word/diagrams.net:** aproximadamente 20–25%.
- **P0 cerrados:** 1 de 5; producción continúa bloqueada.
- **QA Android real:** pendiente por falta de emulador o dispositivo conectado.

## 15. Recomendación final

No conviene seguir añadiendo formularios al inspector actual. El siguiente salto de calidad debe ser:

1. cerrar los riesgos P0 y estabilizar el shell;
2. definir Documento V3 y motor de comandos;
3. construir el canvas libre por secciones;
4. añadir restricciones responsive;
5. recién después ampliar bloques y efectos.

Esto preserva el trabajo útil existente y evita reescribir a ciegas. El resultado puede sentirse tan directo como Word o diagrams.net, pero seguirá siendo un editor de reservas serio, responsive y recuperable.
