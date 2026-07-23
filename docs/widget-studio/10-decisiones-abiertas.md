# 10 — Registro de decisiones y preguntas abiertas

## Estados

- **Recomendación firme:** base coherente del plan; cambiarla requiere revisar varios documentos.
- **Recomendado:** opción preferida, todavía validable.
- **Por decidir:** no bloquea toda la arquitectura, pero sí una fase.
- **Bloqueante:** debe cerrarse antes de programar la parte afectada.

## Registro

| ID | Decisión | Recomendación | Estado |
| --- | --- | --- | --- |
| D-01 | Tipo de editor | Híbrido: bloques y libertad acotada por sección | Recomendación firme |
| D-02 | Guardado | Autosave de borrador más Publicar explícito | Recomendación firme |
| D-03 | Producción | Versiones publicadas inmutables | Recomendación firme |
| D-04 | Compatibilidad | V2 opt-in; sin publicación V2 se usa legacy | Recomendación firme |
| D-05 | Preview | `iframe` con el mismo renderer y borrador autenticado | Recomendado |
| D-06 | Temas | Tokens separados del layout | Recomendación firme |
| D-07 | Flujo | Bloques del sistema protegidos | Recomendación firme |
| D-08 | Imagen “en cualquier parte” | Flujo, fondo y overlay dentro de sección | Recomendación firme |
| D-09 | Modos | Básico y Avanzado sobre el mismo documento | Recomendado |
| D-10 | Persistencia | JSON versionado más activos relacionales | Recomendación firme |
| D-11 | Drag and drop | `dnd-kit` o equivalente accesible | Por decidir |
| D-12 | Permiso MVP | `appearance.manage` permite editar y publicar | Recomendado |
| D-13 | Permisos futuros | Separar edit/publish/assets cuando exista necesidad | Por decidir |
| D-14 | Fuentes | Catálogo curado; no subir fuentes en MVP | Recomendado |
| D-15 | Rich text | Texto plano semántico en MVP; AST cerrado después | Recomendado |
| D-16 | Límites | 20 secciones y 50 bloques iniciales | Por decidir |
| D-17 | Cuota de activos | Definir por plan tras medir uso | Bloqueante para rollout |
| D-18 | Historial | Versiones completas con retención definida | Bloqueante para rollout |
| D-19 | Plantillas | Entidad separada de Tema | Recomendado |
| D-20 | Analítica | Aplazar a fase posterior y definir privacidad | Recomendado |
| D-21 | Programación de campañas | Fuera del MVP | Recomendado |
| D-22 | Video | Fuera del MVP | Recomendado |
| D-23 | Embed | Preservar compatibilidad y evolucionar a allowlist | Recomendado |
| D-24 | Rollback | Puntero a versión anterior más kill switch | Recomendación firme |

## Decisiones que conviene validar en producto

### Nombre visible

Opciones:

- Editor;
- Diseñador;
- Widget Studio;
- Personalizar.

Recomendación: mantener **Apariencia** en navegación y usar **Editor del widget** dentro. “Widget Studio” puede ser nombre interno hasta comprobar que los clientes lo entienden.

### Primera pantalla

Opciones:

- abrir el editor directamente;
- abrir una home con estado, preview y acciones;
- mostrar primero temas.

Recomendación: si no existe V2, una pantalla de introducción y migración. Si existe, abrir el último borrador.

### Básico versus Avanzado

Recomendación:

- recordar modo por usuario;
- iniciar Básico para usuarios nuevos;
- no ocultar que existe Avanzado;
- no perder propiedades al volver a Básico.

### Publicar con el mismo permiso

Recomendación MVP: sí, porque el catálogo actual ya define `appearance.manage` como editar widget y temas.

Antes de empresas con procesos de aprobación:

- agregar `appearance.publish`;
- mostrar “Solicitar publicación”;
- conservar edit sin publish.

### Retención

Opciones:

- últimas 10;
- últimas 20;
- 90 días;
- ilimitada según plan;
- publicaciones marcadas no expiran.

Recomendación inicial: últimas 20 versiones por negocio, publicaciones marcadas conservadas, y nunca eliminar la activa o fallback. Validar costo antes del rollout.

### Cuotas de imágenes

Necesita medir:

- número medio;
- tamaño transformado;
- reutilización;
- costos Cloudinary;
- planes.

Recomendación técnica:

- límites de archivo iguales para todos al inicio;
- cuota total configurable;
- aviso al 80 %;
- no bloquear widgets publicados si el negocio supera una cuota nueva.

### Colores sin contraste

Opciones:

- advertir;
- bloquear;
- corregir automáticamente.

Recomendación:

- advertir y ofrecer corrección;
- bloquear solo si controles esenciales quedan inaccesibles;
- nunca corregir sin confirmación.

### Links externos

Recomendación MVP:

- HTTPS;
- mostrar dominio;
- `noopener noreferrer`;
- bloqueo de protocolos peligrosos;
- no exigir allowlist de dominios salvo evidencia de abuso.

### Imagen overlay en móvil

Opciones:

- heredar;
- convertir a flujo;
- exigir override.

Recomendación:

- heredar con límites;
- intentar auto-fit;
- convertir visualmente a flujo si no cabe;
- advertir y pedir revisión antes de publicar.

### Personalización de pasos

Recomendación:

- permitir slots y estilo;
- no permitir orden libre de pasos en el MVP;
- evaluar orden configurable solo cuando booking engine declare dependencias formalmente.

## Decisiones técnicas por validar con un spike

### Comunicación editor-preview

Probar:

- reload completo;
- `postMessage` con patches;
- endpoint de borrador más invalidación.

Objetivo:

- preview fluida;
- mismo renderer;
- no filtrar documento;
- no introducir estado divergente.

### Drag and drop

Evaluar:

- accesibilidad;
- nested sort;
- auto-scroll;
- touch;
- overlays;
- peso de bundle del editor;
- React 19.

### Visual regression

Evaluar:

- snapshots locales;
- servicio externo;
- tolerancia;
- fuentes;
- animaciones;
- costo de CI.

### Procesamiento de imagen

Evaluar:

- upload por backend;
- upload firmado directo;
- progreso;
- validación previa y posterior;
- eliminación;
- costos.

## Preguntas que no bloquean la arquitectura

- ¿Qué presets de secciones quieren los primeros negocios?
- ¿Qué bloques avanzados tienen mayor valor: galería, FAQ o testimonios?
- ¿Se venderá el modo avanzado por plan?
- ¿Los temas del catálogo deben incluir una plantilla visual además de tokens?
- ¿Se permite duplicar un diseño entre negocios del mismo owner?
- ¿Necesitamos publicación programada?
- ¿Necesitamos comentarios/aprobación?
- ¿Cuánto historial se muestra en UI?
- ¿El negocio puede ocultar “Powered by Puragenda” según plan?

## Preguntas bloqueantes antes de la fase avanzada

1. ¿El overlay acotado satisface “cualquier parte” o se exige canvas absoluto global?
2. ¿Qué comportamiento móvil se prefiere cuando el overlay no cabe?
3. ¿Qué límites de secciones y bloques son aceptables?
4. ¿Cuáles propiedades admiten override por breakpoint?
5. ¿Las columnas pueden anidarse?
6. ¿Qué bloques entran realmente al MVP?

La recomendación del plan es evitar canvas absoluto global y columnas anidadas en la primera versión.

## Puerta para empezar a programar

Debe estar marcado:

- [ ] alcance MVP aprobado;
- [ ] D-01 a D-10 aceptadas o sustituidas;
- [ ] comportamiento exacto de Imagen aprobado;
- [ ] slots iniciales aprobados;
- [ ] wireframe del modo Básico aprobado;
- [ ] wireframe del modo Avanzado aprobado;
- [ ] modelo de borrador/publicación aprobado;
- [ ] compatibilidad opt-in aprobada;
- [ ] política de permisos MVP aprobada;
- [ ] criterios AC-01 a AC-24 revisados;
- [ ] herramientas de pruebas seleccionadas;
- [ ] presupuesto de rendimiento baseline medido;
- [ ] retención y cuota definidas antes de rollout;
- [ ] orden de fases aprobado.

## Formato para cerrar una decisión

```text
ID:
Fecha:
Estado:
Decisión:
Alternativas descartadas:
Motivo:
Impacto:
Responsable:
Revisar cuando:
```

El registro se actualiza antes de implementar una decisión distinta al plan.
