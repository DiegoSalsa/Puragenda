# 02 — Visión, alcance y principios

## Visión

Puragenda Widget Studio debe permitir que un negocio construya una experiencia de reserva reconocible como propia sin necesitar conocimientos de diseño o programación.

El resultado debe sentirse más cerca de un editor visual profesional que de un formulario de configuración, pero siempre producir un widget:

- funcional;
- responsive;
- accesible;
- rápido;
- embebible;
- recuperable;
- seguro.

## Problemas a resolver

### Para el dueño del negocio

- Quiere subir una imagen y decidir dónde se ve.
- Quiere comunicar promociones sin pedir cambios de código.
- Quiere mover elementos y ver el resultado inmediatamente.
- Quiere que móvil y escritorio se vean bien.
- Quiere probar sin arriesgar el widget activo.
- Quiere guardar estilos y reutilizarlos.

### Para un encargado del widget

- Necesita editar solo Apariencia, no administrar todo el negocio.
- Necesita entender qué está publicado y qué está en borrador.
- Necesita revertir errores.
- Necesita ayuda contextual y controles fáciles de descubrir.

### Para Puragenda

- Debe mantener estable el flujo de reserva.
- Debe evitar layouts imposibles de soportar.
- Debe controlar costos de almacenamiento y transformación de imágenes.
- Debe poder evolucionar el esquema sin romper documentos anteriores.
- Debe observar fallos y volver rápidamente a una versión segura.

## Principios de producto

### Libertad con límites útiles

El usuario puede componer, alinear, dimensionar y superponer dentro de una sección. No puede colocar un elemento sobre todo el widget con coordenadas globales que se rompan al cambiar de paso o pantalla.

### Publicar es diferente de editar

El borrador puede cambiar muchas veces. El cliente final solo ve una versión explícitamente publicada.

### El widget real es la vista previa

No se mantiene un segundo mockup. El editor y producción renderizan el mismo documento con el mismo registro de bloques.

### Lo simple primero

El modo Básico resuelve colores, logo, imagen principal, banners y orden. El modo Avanzado revela secciones, capas, columnas y overrides responsive.

### Responsive por diseño

Todo bloque nace con reglas responsive. El usuario puede crear overrides, pero nunca dejar un breakpoint sin comportamiento.

### Recuperación permanente

Siempre se puede deshacer en la sesión, volver al último borrador guardado y restaurar una versión publicada.

### Compatibilidad por omisión

Un negocio existente sigue idéntico hasta decidir usar y publicar el editor V2.

### Datos operativos protegidos

El editor presenta servicios, profesionales y horarios, pero no los transforma en texto manual ni duplica su lógica.

## Modos del editor

### Modo Básico

Pensado para la mayoría de los negocios:

- identidad visual;
- tipografía;
- logo;
- imagen principal;
- banners;
- textos promocionales;
- orden vertical;
- mostrar u ocultar;
- preview móvil y escritorio;
- guardar borrador;
- publicar.

No muestra capas, coordenadas ni configuración avanzada.

### Modo Avanzado

Añade:

- secciones;
- columnas;
- overlays acotados;
- capas;
- alineación precisa;
- posición por anclaje;
- overrides por breakpoint;
- fondos;
- opacidad;
- gradientes;
- bordes y sombras por bloque;
- bloqueo de elementos;
- historial.

El mismo documento soporta ambos modos. Cambiar de modo no migra ni duplica el diseño.

## Alcance de la primera versión utilizable

### Incluido

- diseño V2 versionado;
- borrador y publicación;
- preview real;
- tema y tokens;
- secciones verticales;
- bloques de imagen, texto, botón, banner, divisor y espaciador;
- inserción en slots seguros del flujo;
- orden por drag and drop y botones;
- duplicar, ocultar, bloquear y eliminar;
- imagen como bloque o fondo;
- recorte, punto focal y `object-fit`;
- responsive móvil, tablet y escritorio;
- undo/redo de la sesión;
- historial de publicaciones;
- restauración;
- acceso con `appearance.manage`;
- migración opcional desde tokens y banners actuales;
- fallback al renderer legacy.

### Aplazado

- overlay libre dentro de una sección;
- columnas anidadas;
- galería/carrusel;
- testimonios;
- FAQ;
- redes sociales;
- animaciones configurables;
- condiciones por fecha o campaña;
- analítica de bloques;
- plantillas completas de layout;
- edición colaborativa simultánea.

Lo aplazado aparece en el roadmap, pero no debe inflar la primera entrega.

## Fuera de alcance

- editor de HTML;
- editor de CSS;
- scripts personalizados;
- plugins de terceros dentro del widget;
- posición absoluta global;
- cambiar el orden lógico de los pasos de reserva;
- editar servicios, profesionales, disponibilidad o pagos desde Apariencia;
- sustituir el dashboard por un constructor general de sitios web;
- garantizar pixel-perfect entre tamaños incompatibles a costa del responsive;
- importar archivos Word, PSD o Canva.

## Resultado de experiencia esperado

Un usuario nuevo debería poder:

1. abrir Apariencia;
2. elegir modo Básico;
3. agregar una imagen;
4. escoger “antes de los servicios”;
5. ajustar recorte y texto;
6. revisar móvil y escritorio;
7. guardar borrador automáticamente;
8. publicar;
9. ver exactamente el mismo resultado en el enlace público.

Un usuario avanzado debería poder tomar esa misma imagen, convertirla en fondo de una sección, agregar texto y botón encima, definir el punto focal móvil y mantener la reserva funcional.

## Indicadores de éxito

### Producto

- al menos 90 % de tareas básicas completadas sin documentación externa;
- tiempo medio inferior a cinco minutos para subir y publicar un banner;
- menos de 5 % de publicaciones revertidas por error visual;
- abandono inferior a 10 % entre agregar el primer bloque y publicar;
- uso mayoritario del modo Básico sin impedir casos avanzados.

### Calidad

- cero cambios visuales en negocios no migrados;
- cero documentos inválidos servidos en producción;
- 100 % de publicaciones con una versión anterior recuperable;
- 100 % de acciones mutables aisladas por negocio;
- sin regresiones críticas en el flujo de reserva;
- cumplimiento WCAG 2.2 AA en los componentes propios del editor y widget;
- presupuestos de rendimiento definidos en el documento de calidad.

## Criterio rector para “poner una foto en cualquier parte”

La necesidad se resuelve con tres comportamientos:

1. **En flujo:** la imagen ocupa una posición real entre bloques.
2. **Fondo:** la imagen pertenece al fondo de una sección.
3. **Overlay acotado:** la imagen se mueve dentro de una sección con anclajes y límites.

No se interpreta como coordenadas absolutas sobre toda la reserva. Esa opción produciría solapamientos entre pasos, tamaños de `iframe`, traducciones y contenido dinámico.

## Principio de entrega

Cada fase debe dejar una mejora publicable, medible y reversible. No se construirá un editor gigante en una sola rama ni se reemplazará el renderer actual con un “big bang”.
