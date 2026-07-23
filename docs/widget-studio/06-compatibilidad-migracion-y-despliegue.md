# 06 — Compatibilidad, migración y despliegue

## Objetivo

Introducir el editor V2 sin cambiar el widget de ningún cliente existente hasta que ese negocio cree, revise y publique su primer diseño V2.

## Estrategia central: lectura dual

```text
¿Hay versión V2 publicada y habilitada?
├─ No → renderer actual y campos actuales
└─ Sí → renderer V2 con versión inmutable
```

No se hará un backfill masivo que active diseños V2.

## Migración de base de datos

La migración debe ser aditiva:

- nuevas tablas;
- nuevos enums;
- índices;
- relaciones opcionales;
- ningún campo actual eliminado;
- ningún default actual modificado;
- ningún registro de negocio reescrito.

Antes de aplicar:

- revisar el SQL generado;
- estimar locks;
- probar en una copia representativa;
- ejecutar `EXPLAIN` de queries críticas;
- verificar rollback lógico;
- crear backup.

La primera migración solo crea infraestructura. No cambia el renderer activo.

## Creación del primer borrador

Se inicia únicamente por acción del usuario:

**Crear borrador desde mi diseño actual**

El adaptador legacy produce:

- tokens desde `Business`;
- shell con `widgetCornerRadius`, `widgetShadowStyle` y `widgetHeaderAlign`;
- logo desde `logoUrl`;
- banners desde `WidgetPromoBlock`;
- estructura V2 equivalente al flujo actual;
- nombre y metadatos.

El borrador se compara visualmente con el widget actual. Si la diferencia supera el umbral, el usuario no puede publicarlo como migración automática hasta revisar las diferencias.

## Mapeo de datos actuales

| Actual | V2 |
| --- | --- |
| `primaryColor` | `tokens.colors.primary` |
| `secondaryColor` | `tokens.colors.secondary` |
| `backgroundColor` | `tokens.colors.background` |
| `textColor` | `tokens.colors.text` |
| `textMutedColor` | `tokens.colors.textMuted` |
| `widgetFontSize` | `tokens.typography.baseSize` |
| `widgetCornerRadius` | `tokens.shape.radius` |
| `widgetShadowStyle` | `tokens.shape.shadow` |
| `widgetHeaderAlign` | `shell.headerAlign` |
| `logoUrl` | activo legacy resuelto o referencia segura |
| Promo `HEADER` | banner en slot `afterHeader` |
| Promo `BETWEEN_SERVICES` | banner en `service.beforeMain` |
| Promo `FOOTER` | banner en `beforeFooter` |
| `position` | orden del array del slot |
| `isVisible` | visibilidad del bloque |
| `textAlign` | alineación del contenido |

Las URLs legacy no se re-suben de forma automática si siguen válidas. Se crea una referencia importada o se mantiene un resolver de transición hasta normalizarlas.

## Publicación inicial

La primera publicación V2 debe mostrar una pantalla especial:

- “Tu widget actual seguirá disponible como respaldo”;
- preview lado a lado;
- móvil, tablet y escritorio;
- lista de diferencias detectadas;
- advertencias;
- confirmación explícita.

Después de publicar:

- se conserva el estado legacy;
- se marca la versión V2 activa;
- los banners legacy no se eliminan;
- la edición posterior ocurre en el borrador V2;
- la restauración puede volver a la versión anterior.

## Escritura durante la transición

### Negocio sin V2 publicado

- los controles actuales siguen escribiendo campos legacy;
- los banners actuales siguen usando `WidgetPromoBlock`;
- no existe impacto V2.

### Negocio con V2 publicado

- el nuevo editor escribe solo el borrador V2;
- publicar actualiza el puntero V2;
- los tokens legacy pueden reflejarse en publicación como compatibilidad de respaldo, pero nunca antes;
- `WidgetPromoBlock` queda de solo lectura para ese negocio o se mantiene sincronizado únicamente mediante un adaptador explícito.

No debe existir doble escritura silenciosa bidireccional. Produce divergencias difíciles de recuperar.

## Flags

Se recomiendan:

- flag global `widgetStudioV2`;
- flag por negocio;
- flag de editor;
- flag de renderer;
- kill switch de renderer V2;
- flag de overlays avanzados;
- flag de bloques de fase posterior.

El flag de editor puede activarse antes que el renderer público. Así se prueba borrador y preview sin servirlo a clientes.

## Etapas de despliegue

### Etapa 0 — Baseline

- capturar screenshots del widget actual;
- registrar payloads de negocios de prueba;
- asegurar pruebas E2E del flujo legacy;
- medir rendimiento actual;
- documentar errores conocidos.

### Etapa 1 — Infraestructura oscura

- tablas y schemas;
- servicios de borrador;
- activos;
- sin entrada visible en UI;
- sin cambio de renderer.

### Etapa 2 — Editor interno

- habilitado solo para cuentas de desarrollo;
- preview privada;
- no publicación pública;
- fixtures variados.

### Etapa 3 — Publicación en cuentas demo

- demo controlada;
- smoke automático;
- rollback ejercitado;
- comparación visual;
- pruebas embebidas.

### Etapa 4 — Piloto opt-in

- pocos negocios;
- consentimiento explícito;
- seguimiento de errores;
- soporte y restauración rápida.

### Etapa 5 — Disponibilidad general opt-in

- editor visible;
- migración voluntaria;
- renderer legacy sigue disponible.

### Etapa 6 — Evaluación de retiro legacy

Solo después de:

- adopción suficiente;
- meses sin regresiones críticas;
- todos los documentos migrables;
- herramienta de downgrade;
- aprobación específica.

No forma parte de la primera entrega.

## Rollback

### Publicación individual

- mover `publishedVersionId` a `fallbackVersionId`;
- invalidar caché;
- verificar URL;
- registrar evento.

### Renderer global

- activar kill switch;
- negocios V2 usan última versión estable compatible o adaptador legacy;
- mantener editor en lectura si la escritura pudiera crear documentos incompatibles.

### Migración de datos

Como las tablas nuevas son aditivas:

- desactivar flags;
- no eliminar inmediatamente las tablas;
- conservar borradores para análisis;
- revertir código;
- reparar offline.

No se recomienda un `DROP TABLE` como rollback operativo.

## Fallback de render

Orden:

1. versión publicada actual;
2. fallback publicado anterior;
3. renderer legacy;
4. pantalla de indisponibilidad solo si también falla el flujo legacy.

El fallback nunca selecciona un borrador.

## Integridad de clientes existentes

Antes y después de cada fase se debe verificar:

- colores;
- logo;
- orden;
- servicios;
- precios;
- opciones;
- profesionales;
- días y horas;
- pausas;
- intervalo;
- datos requeridos;
- recurrencia;
- pago;
- confirmación;
- embed;
- tema claro/oscuro del host;
- ancho variable del `iframe`.

## Compatibilidad con temas

- los temas existentes siguen aplicándose al renderer legacy;
- al crear un borrador V2, se pueden aplicar como tokens;
- el tema no contiene banners ni layout;
- eliminar un tema no toca diseños publicados;
- un tema creado desde un diseño guarda tokens, no una copia completa del layout;
- una función futura separada puede guardar “Plantilla de diseño”.

## Compatibilidad de permisos

- `appearance.manage` mantiene su significado;
- propietarios y roles legacy conservan sus permisos por el adaptador actual;
- perfiles personalizados pueden otorgarlo;
- crear un editor V2 no amplía el acceso de ningún usuario;
- publicar puede usar el mismo permiso inicialmente;
- si se necesita separación, se agregarán `appearance.edit` y `appearance.publish` de forma aditiva en una fase posterior.

## Datos demo

Las pruebas requieren al menos:

- negocio legacy sin banners;
- negocio legacy con banners en las tres posiciones;
- negocio con tema claro;
- negocio con tema oscuro;
- negocio con muchos servicios;
- negocio con opciones y fotos;
- negocio con varios profesionales;
- negocio con recurrencia;
- negocio con pago;
- negocio con campos opcionales;
- negocio V2 con versión y fallback;
- profesional con solo `appearance.manage`;
- profesional sin el permiso.

Los datos demo no deben contener información real de clientes.

## Criterios de salida del piloto

- cero diferencias en negocios no activados;
- cero reservas fallidas atribuibles al renderer V2;
- rollback individual probado;
- kill switch probado;
- tasa de fallback inferior al umbral acordado;
- sin accesos cruzados entre negocios;
- rendimiento dentro de presupuesto;
- todos los problemas críticos cerrados;
- soporte dispone de un runbook.

## Runbook mínimo

Ante un incidente:

1. identificar negocio, renderer y versión;
2. consultar evento y request id;
3. reproducir con snapshot seguro;
4. activar rollback individual;
5. si afecta varios negocios, activar kill switch;
6. verificar reserva pública;
7. conservar evidencia;
8. corregir en borrador;
9. republicar;
10. cerrar con causa raíz.
