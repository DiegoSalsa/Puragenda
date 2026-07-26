# 08 — Estrategia de pruebas y criterios de aceptación

## Objetivo

Demostrar que el editor es usable y que el renderer V2 no altera las reglas de reserva ni los widgets no migrados.

Una compilación verde no es aceptación suficiente. Se requieren pruebas automáticas, visuales, manuales y operativas.

## Baseline obligatorio

Antes de tocar el renderer:

- capturar screenshots del widget actual;
- registrar recorridos E2E;
- medir Core Web Vitals y peso;
- congelar fixtures de negocios representativos;
- documentar estados y errores conocidos;
- verificar el embed en una página host;
- comprobar permisos actuales.

## Herramientas propuestas

No están aprobadas ni instaladas todavía:

- Vitest para unidades;
- Testing Library para componentes;
- Playwright para E2E;
- snapshots visuales con Playwright;
- Axe o integración equivalente para accesibilidad;
- base PostgreSQL aislada para integración;
- mocks mínimos para Cloudinary y servicios externos;
- pruebas reales controladas de subida en un entorno no productivo.

La elección definitiva debe considerar Next.js 16, React 19 y el entorno de CI.

## Capas de prueba

### Unidad

- schemas;
- normalización;
- migradores;
- command stack;
- undo/redo;
- reglas de slots;
- responsive inheritance;
- contraste;
- URLs;
- límites;
- checksums;
- adaptador legacy;
- selección de renderer.

### Componentes

- inspector por bloque;
- biblioteca;
- capas;
- upload;
- modal de publicación;
- estados de autosave;
- conflicto;
- selector de dispositivo;
- controles accesibles;
- bloques de contenido;
- error boundaries.

### Integración

- aislamiento por negocio;
- permiso;
- save con revisión;
- conflicto;
- publicación transaccional;
- restauración;
- assets;
- referencias;
- versión inmutable;
- fallback;
- migración legacy;
- cache invalidation.

### E2E

- crear borrador;
- editar;
- subir imagen;
- mover;
- revisar dispositivos;
- cerrar y reabrir;
- publicar;
- reservar;
- restaurar;
- probar rol con permiso;
- probar rol sin permiso.

### Visual

- renderer legacy antes/después;
- equivalencia de migración;
- temas claros y oscuros;
- cada breakpoint;
- cada bloque;
- contenido extremo;
- estados de error;
- navegador y zoom.

### Rendimiento

- documento pequeño y máximo;
- 1, 10 y 50 bloques;
- imágenes optimizadas;
- preview durante drag;
- autosave repetido;
- historial grande;
- carga pública fría y cacheada.

### Seguridad

- ids de otro negocio;
- assets de otro negocio;
- protocolo malicioso;
- JSON profundo;
- payload grande;
- MIME falso;
- archivo truncado;
- image bomb;
- SVG disfrazado;
- conflicto de revisión;
- replay de publicación;
- `postMessage` de origen incorrecto;
- preview sin sesión;
- preview sin permiso.

## Matriz de entornos visuales

### Viewports

- 320 × 568;
- 360 × 800;
- 375 × 812;
- 390 × 844;
- 768 × 1024;
- 1024 × 768;
- 1280 × 720;
- 1366 × 768;
- 1440 × 900;
- 1920 × 1080.

### Anchos de embed

- 320 px;
- 360 px;
- 480 px;
- 672 px;
- 900 px.

### Zoom de navegador

- 80 %;
- 90 %;
- 100 %;
- 110 %;
- 125 %;
- 150 %;
- 200 %.

### Navegadores

- Chromium estable;
- Firefox estable;
- WebKit/Safari estable;
- Chrome Android;
- Safari iOS.

Las versiones exactas se congelan al empezar la implementación.

## Fixtures

### Negocios

- sin logo;
- con logo;
- sin banners;
- banners en las tres posiciones;
- tema oscuro;
- tema claro;
- texto largo;
- nombre largo;
- 1 servicio;
- 30 servicios;
- fotos de servicios;
- opciones;
- múltiples profesionales;
- profesional no asignado;
- pausas;
- intervalos de 5 y 60 minutos;
- mismo día;
- recurrencia;
- salud;
- RUT;
- abono;
- widget embed.

### Diseños

- documento mínimo;
- máximo de bloques;
- imagen hero;
- imagen contain;
- fondo con punto focal;
- overlay acotado;
- bloque oculto móvil;
- overrides;
- activo faltante;
- bloque desconocido;
- versión de schema antigua;
- contraste insuficiente.

### Usuarios

- owner;
- superadmin legacy;
- recepcionista;
- profesional con `appearance.manage`;
- profesional sin permiso;
- usuario de otro negocio.

## Criterios de aceptación

### AC-01 — Compatibilidad legacy

**Dado** un negocio sin versión V2 publicada

**Cuando** se despliega el nuevo código

**Entonces** su HTML funcional, apariencia, flujo y capacidad de reservar no cambian fuera de diferencias aceptadas y documentadas.

### AC-02 — Borrador aislado

**Dado** un widget publicado

**Cuando** un usuario cambia colores, mueve bloques o elimina una imagen en el borrador

**Entonces** la URL pública permanece igual hasta Publicar.

### AC-03 — Autosave confiable

**Dado** un cambio válido

**Cuando** finaliza el debounce

**Entonces** el servidor confirma una nueva revisión y la UI muestra Guardado.

Si falla, no muestra éxito y permite reintentar.

### AC-04 — Conflicto

**Dadas** dos sesiones sobre la misma revisión

**Cuando** ambas intentan guardar

**Entonces** la segunda no sobrescribe y recibe una resolución explícita.

### AC-05 — Publicación

**Dado** un borrador válido

**Cuando** un usuario autorizado confirma Publicar

**Entonces** se crea una versión inmutable, cambia el puntero en transacción y la URL pública refleja exactamente el preview aprobado.

### AC-06 — Restauración

**Dada** una versión anterior

**Cuando** se elige Restaurar

**Entonces** se crea un borrador nuevo basado en ella y solo cambia producción tras publicar.

### AC-07 — Imagen en flujo

**Dada** una imagen válida

**Cuando** se inserta en un slot y se mueve

**Entonces** conserva posición, alt, recorte y responsive al reabrir y publicar.

### AC-08 — Fondo

**Dada** una sección

**Cuando** una imagen se configura como fondo

**Entonces** cover/contain, overlay y punto focal funcionan en móvil, tablet y escritorio sin ocultar el contenido esencial.

### AC-09 — Posición avanzada

**Dado** un overlay acotado

**Cuando** se arrastra

**Entonces** no sale de su sección, no cubre controles protegidos y tiene un fallback móvil válido.

### AC-10 — Bloques del sistema

**Dado** cualquier edición

**Entonces** no se puede eliminar ni invalidar el bloque funcional requerido del paso activo.

### AC-11 — Reserva completa

**Dado** cada fixture funcional

**Cuando** el usuario completa el widget V2

**Entonces** la reserva creada es equivalente a la del renderer legacy.

### AC-12 — Aislamiento

**Dado** un id de diseño, versión o activo de otro negocio

**Cuando** se consulta o muta

**Entonces** la operación es rechazada sin revelar existencia.

### AC-13 — Profesional autorizado

**Dado** un profesional con `appearance.manage`

**Cuando** inicia sesión

**Entonces** ve Apariencia y puede editar/publicar según la política aprobada, sin obtener otros permisos.

### AC-14 — Profesional no autorizado

**Dado** un profesional sin `appearance.manage`

**Entonces** la navegación no muestra Apariencia y las rutas/acciones de servidor rechazan acceso directo.

### AC-15 — Responsive

**Dado** cualquier diseño publicable

**Cuando** se prueba la matriz de anchos

**Entonces** no hay overflow horizontal, acciones ocultas, texto ilegible ni solapamiento de bloques protegidos.

### AC-16 — Zoom

**Dado** editor y widget

**Cuando** el navegador usa 80–200 %

**Entonces** todas las acciones siguen accesibles y el tour no cubre controles críticos.

### AC-17 — Teclado

**Dado** un usuario sin ratón

**Entonces** puede agregar, seleccionar, reordenar, editar, eliminar, revisar y publicar.

### AC-18 — Accesibilidad

Los componentes propios no presentan violaciones críticas automáticas y superan la revisión manual definida.

### AC-19 — Activo inválido

Un archivo con MIME falso, firma inválida, tamaño o dimensiones fuera de límite se rechaza antes de convertirse en bloque utilizable.

### AC-20 — Fallback

**Dado** un fallo del renderer publicado

**Entonces** se sirve la versión fallback o legacy, se registra el evento y la reserva permanece operativa.

### AC-21 — Rendimiento

Los escenarios definidos cumplen los presupuestos aprobados o tienen una excepción explícita antes de liberar.

### AC-22 — Tema separado

Aplicar, renombrar o eliminar un tema no cambia el layout ni versiones publicadas hasta una nueva publicación.

### AC-23 — Ayuda contextual

El tour del editor explica controles presentes, se adapta al viewport y no cubre la acción destacada.

### AC-24 — Pérdida de conexión

Los cambios no confirmados quedan identificados; la UI no declara éxito y permite recuperarlos o exportar diagnóstico seguro.

## Pruebas manuales de aceptación

### Recorrido básico

1. entrar como owner;
2. crear borrador desde legacy;
3. confirmar preview equivalente;
4. cambiar color;
5. subir imagen;
6. mover antes de servicios;
7. añadir título y CTA;
8. revisar tres dispositivos;
9. cerrar y reabrir;
10. publicar;
11. abrir widget público;
12. completar una reserva;
13. revisar historial;
14. restaurar.

### Recorrido de permisos

1. entrar como profesional con permiso;
2. comprobar menú;
3. editar y publicar;
4. confirmar que no ve configuración sensible;
5. entrar sin permiso;
6. probar UI, URL y acción directa.

### Recorrido de fallo

1. simular fallo de asset;
2. simular documento inválido;
3. simular conflicto;
4. simular fallo posterior a publicación;
5. comprobar fallback;
6. ejecutar rollback;
7. completar una reserva.

## Aceptación visual

Cada snapshot debe tener:

- fixture;
- renderer;
- schema;
- viewport;
- navegador;
- tema;
- versión del test.

Las diferencias se revisan. No se actualizan snapshots en masa sin inspección.

## Definition of Done

Una historia no está terminada hasta:

- código revisado;
- schemas;
- permiso;
- aislamiento;
- error state;
- loading state;
- responsive;
- teclado;
- accesibilidad;
- pruebas;
- observabilidad;
- documentación;
- migración si corresponde;
- rollback;
- aceptación visual.

## Criterios GO/NO-GO

### GO

- todos los AC críticos pasan;
- cero P0/P1 abiertos;
- rollback y kill switch ejercitados;
- widgets legacy sin cambios;
- reserva E2E pasa;
- seguridad aprobada;
- rendimiento dentro de presupuesto;
- soporte tiene runbook.

### NO-GO

- cambio no explicado en legacy;
- pérdida de borrador;
- IDOR;
- publicación no reversible;
- bloque del sistema eliminable;
- reserva falla;
- layout no usable en móvil;
- preview diferente a producción;
- assets sin validación;
- fallback no probado.
