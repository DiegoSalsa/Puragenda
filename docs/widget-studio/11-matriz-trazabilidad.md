# 11 — Matriz de trazabilidad

## Propósito

Conectar la necesidad original con una decisión de diseño, una fase y una prueba. Si una idea no aparece aquí, no debe asumirse incluida.

## Requisitos del Widget Studio

| ID | Necesidad | Solución planificada | Documentos | Fase | Aceptación |
| --- | --- | --- | --- | --- | --- |
| R-01 | Subir fotos | Biblioteca de activos y bloque Imagen | 04, 05, 07 | 2 y 4 | AC-07, AC-19 |
| R-02 | Poner una foto en distintos lugares | Slots, fondo y overlay acotado | 02, 03, 04 | 4 y 5 | AC-07, AC-08, AC-09 |
| R-03 | Sentirlo como Word/Canva | Biblioteca, canvas, capas e inspector | 03 | 4 y 5 | Recorridos básico y avanzado |
| R-04 | Que siga siendo fácil | Modo Básico y disclosure progresivo | 02, 03 | 4 | AC-03, AC-23 |
| R-05 | Vista previa a la izquierda | Dos columnas en Básico y canvas central en Avanzado | 03 | 4 | AC-05, AC-15 |
| R-06 | Vista previa real | Mismo renderer en `iframe` autenticado | 03, 05 | 3 | AC-05 |
| R-07 | Poder mover contenido | Drag and drop más controles equivalentes | 03, 04 | 4 y 5 | AC-07, AC-17 |
| R-08 | Personalización visual amplia | Tokens, secciones y propiedades por bloque | 02, 03, 04 | 4 y 5 | AC-08, AC-15 |
| R-09 | Guardar cambios con seguridad | Autosave de borrador | 03, 05 | 2 y 4 | AC-02, AC-03, AC-04 |
| R-10 | Publicar solo cuando esté listo | Versiones inmutables y Publicar explícito | 03, 05 | 2 y 4 | AC-05 |
| R-11 | Recuperar errores | Undo/redo, historial, fallback y restauración | 03, 05, 06 | 2, 4 y 6 | AC-06, AC-20 |
| R-12 | Reutilizar estilos | Temas separados de layout | 01, 02, 05 | 4 | AC-22 |
| R-13 | No cambiar clientes actuales | Dual-read y migración opt-in | 01, 06 | Todas | AC-01 |
| R-14 | Permitir encargado del widget | `appearance.manage` por perfil | 01, 06, 07 | 2 y 4 | AC-13, AC-14 |
| R-15 | Adaptarse a pantallas | Breakpoints, herencia y overrides | 03, 04, 07 | 4 y 5 | AC-15 |
| R-16 | Funcionar con zoom natural | Reflow 80–200 % y canvas zoom independiente | 03, 07, 08 | 4 y 5 | AC-16 |
| R-17 | Ayuda contextual que no tape | Tour específico, responsive y anclado | 03 | 4 | AC-23 |
| R-18 | Cargas claras | Estados de subida, autosave, publicación y errores | 03 | 4 | AC-03, AC-19, AC-24 |
| R-19 | App seria y segura | Aislamiento, validación, CSP, logs y rollback | 05, 06, 07 | Todas | AC-12, AC-19, AC-20 |
| R-20 | Mantener reserva intacta | Bloques del sistema protegidos | 01, 04, 05 | 3 | AC-10, AC-11 |

## Trazabilidad del estado actual

| Elemento actual | Tratamiento |
| --- | --- |
| Tokens en `Business` | Fuente del primer borrador y renderer legacy |
| `WidgetTheme` | Se conserva como preset de tokens |
| `WidgetPromoBlock` | Se importa a banners V2; no se borra durante transición |
| `appearance.manage` | Se conserva como permiso MVP |
| Preview por query params | Se reemplaza gradualmente por preview autenticada |
| `widget-client.tsx` | Se descompone con baseline previo |
| Cloudinary | Se conserva como proveedor inicial con modelo de activos |
| Renderer legacy | Se conserva hasta retiro explícito futuro |

## Elementos fuera de este paquete

Los siguientes temas pertenecen a otras líneas del producto y no deben introducirse dentro de la misma migración del editor:

- sidebar redimensionable;
- horarios del negocio;
- horarios de profesionales;
- intervalos;
- pantalla de profesionales;
- perfiles y roles en general;
- API key enmascarada;
- loaders globales del dashboard;
- tours de páginas que no sean Apariencia.

Su existencia se reconoce, pero mezclarlos con el renderer V2 aumentaría el radio de fallo y dificultaría rollback.

## Cobertura documental

| Área | Documento canónico |
| --- | --- |
| Estado real | 01 |
| Producto | 02 |
| Interacción | 03 |
| Bloques | 04 |
| Datos y render | 05 |
| Migración | 06 |
| Calidad transversal | 07 |
| Verificación | 08 |
| Secuencia | 09 |
| Decisiones | 10 |

## Control de cambios

Cuando se agregue un requisito:

1. asignar id;
2. describir solución;
3. identificar documento canónico;
4. asignar fase;
5. agregar criterio de aceptación;
6. revisar riesgos;
7. revisar modelo de datos;
8. actualizar la puerta de implementación si es bloqueante.
