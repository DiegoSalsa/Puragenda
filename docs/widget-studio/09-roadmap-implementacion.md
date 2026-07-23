# 09 — Roadmap de implementación

## Principio de secuencia

Primero se construye la red de seguridad. Después el renderer. Después el editor. La libertad visual avanzada llega cuando borrador, publicación, responsive y rollback ya están probados.

Las tallas son relativas:

- S: cambio acotado;
- M: varias piezas relacionadas;
- L: área completa;
- XL: cambio arquitectónico con alto riesgo.

No representan fechas ni compromisos comerciales.

## Fase 0 — Planificación y decisiones

Talla: M

Estado: en curso.

### Entregables

- auditoría;
- visión;
- UX;
- catálogo;
- arquitectura;
- migración;
- calidad;
- aceptación;
- roadmap;
- decisiones;
- trazabilidad.

### Salida

- alcance MVP aprobado;
- decisiones bloqueantes cerradas;
- riesgos aceptados;
- criterios de aceptación aprobados.

No se programa el editor antes de esta salida.

## Fase 1 — Baseline y red de seguridad

Talla: L

### Objetivo

Proteger el comportamiento actual antes de extraer o reemplazar render.

### Trabajo

- fixtures representativos;
- pruebas E2E del renderer legacy;
- screenshots base;
- embed de prueba;
- baseline de rendimiento;
- test harness;
- pruebas de permisos;
- pruebas de reserva completa;
- registro de errores conocidos.

### No cambia

- base de datos;
- UI pública;
- Apariencia;
- clientes.

### Gate

- flujo legacy reproducible;
- snapshots aprobados;
- CI estable;
- datos de prueba sin PII.

## Fase 2 — Dominio de diseño y activos

Talla: L

### Objetivo

Crear borrador, versiones, activos y publicación en infraestructura oscura.

### Trabajo

- schemas versionados;
- `WidgetDesign`;
- `WidgetDesignVersion`;
- `WidgetAsset`;
- eventos;
- revisión optimista;
- servicio de borrador;
- publicación transaccional;
- restauración;
- permisos;
- validación de activos;
- integración Cloudinary;
- flags;
- kill switch.

### No cambia

- renderer público;
- página de Apariencia para usuarios comunes.

### Gate

- aislamiento por negocio;
- conflictos probados;
- versión inmutable;
- rollback de puntero;
- subida validada;
- migración aditiva revisada.

## Fase 3 — Núcleo de render V2

Talla: XL

### Objetivo

Separar reglas de reserva del layout y crear un renderer compartido.

### Trabajo

- extraer componentes del sistema;
- estabilizar interfaces de booking;
- registro de bloques;
- renderer de secciones;
- tokens;
- adaptador legacy;
- preview autenticada;
- fallback;
- error boundaries;
- observabilidad;
- cache.

### Alcance visual

Solo equivalencia con el widget actual. No se agrega todavía libertad avanzada.

### Gate

- reserva E2E equivalente;
- visual diff dentro de umbral;
- preview igual a público;
- fallback probado;
- bundle dentro del presupuesto.

## Fase 4 — Widget Studio Básico

Talla: L

### Objetivo

Entregar la primera experiencia usable con contenido.

### Trabajo

- editor Básico;
- preview izquierda/escritorio;
- preview móvil/tablet/escritorio;
- autosave;
- estado publicado/borrador;
- tokens;
- imagen;
- banner;
- texto;
- botón;
- divisor;
- espaciador;
- slots;
- orden;
- duplicar;
- ocultar;
- eliminar;
- undo/redo;
- publish modal;
- historial mínimo de publicaciones;
- restauración a un nuevo borrador;
- ayuda contextual;
- biblioteca de activos básica.

### Posicionamiento

- en flujo;
- fondo de sección;
- todavía sin overlay libre.

### Gate

- AC-01 a AC-08;
- responsive;
- teclado;
- permisos;
- publicación demo;
- rollback.

## Fase 5 — Composición avanzada

Talla: XL

### Objetivo

Agregar la libertad visual solicitada sin romper responsive.

### Trabajo

- modo Avanzado;
- panel de capas;
- inspector completo;
- secciones;
- stacks;
- columnas;
- overlays acotados;
- anclajes;
- offsets;
- z-index cerrado;
- bloqueo;
- overrides;
- detección de overflow;
- corrección móvil;
- copy/paste;
- atajos.

### Gate

- AC-09;
- cero controles del sistema cubiertos;
- reflow;
- zoom;
- editor móvil;
- prueba con contenido extremo.

## Fase 6 — Historial, plantillas y activos pro

Talla: L

### Objetivo

Mejorar reutilización y operación.

### Trabajo

- página Historial avanzada;
- comparación de versiones;
- preview y restauración enriquecida;
- resumen de cambios;
- biblioteca de activos completa;
- referencias;
- archivado;
- plantillas de diseño separadas de temas;
- duplicar diseño;
- presets de secciones;
- límites por plan si se aprueban.

### Gate

- restauración ensayada;
- activos no se borran en uso;
- plantillas no vinculan datos entre negocios.

## Fase 7 — Bloques de contenido ampliados

Talla: L

### Objetivo

Ampliar catálogo sin modificar arquitectura.

### Candidatos

- galería;
- testimonios;
- FAQ;
- información del negocio;
- redes sociales;
- beneficios;
- badges;
- contador;
- video seguro.

Cada bloque pasa el checklist completo de calidad.

## Fase 8 — Piloto y rollout

Talla: M

### Trabajo

- cuenta demo;
- QA;
- piloto;
- métricas;
- soporte;
- runbook;
- feedback;
- correcciones;
- opt-in general;
- seguimiento.

### Gate

Los criterios de salida de [06-compatibilidad-migracion-y-despliegue.md](./06-compatibilidad-migracion-y-despliegue.md#criterios-de-salida-del-piloto).

## Orden de pull requests futuro

Cuando se autorice implementación, conviene dividir:

1. test harness y fixtures;
2. schemas sin persistencia;
3. migración aditiva;
4. servicios de borrador;
5. activos;
6. publicación y rollback;
7. extracción de system blocks;
8. renderer V2 equivalente;
9. preview autenticada;
10. shell del editor;
11. bloque Imagen;
12. resto del catálogo básico;
13. publicación UI;
14. modo avanzado;
15. rollout.

Cada PR debe ser revisable y no mezclar migración, renderer, UI y rollout sin necesidad.

## Dependencias

```text
Baseline
  └─ Dominio y activos
      └─ Renderer V2
          ├─ Editor Básico
          │   └─ Composición avanzada
          └─ Publicación y rollback
              └─ Piloto
```

## Hitos de valor

### Hito A — Seguridad editorial

Existe borrador y publicación, aunque el editor aún sea interno.

### Hito B — Equivalencia

V2 puede renderizar el widget actual sin diferencias funcionales.

### Hito C — Primera personalización real

Un negocio puede subir una imagen, ubicarla, revisar y publicar.

### Hito D — Libertad avanzada

Puede crear secciones y overlays responsive.

### Hito E — Operación segura

Historial, restauración, piloto y soporte.

## Trabajo que no debe adelantarse

- animaciones antes de accesibilidad;
- analítica de bloques antes de publicación estable;
- colaboración en tiempo real antes de resolver conflictos básicos;
- marketplace de plantillas antes de separar datos y diseño;
- video antes de presupuestos y CSP;
- retiro legacy antes de adopción y downgrade.
