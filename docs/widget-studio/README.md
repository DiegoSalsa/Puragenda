# Puragenda Widget Studio — plan maestro

Estado: **implementación experimental en `testingWidget`, bajo auditoría**

Última revisión: **29 de julio de 2026**

Alcance: editor visual de Apariencia y render público del widget de reservas.

## Propósito

Este paquete define cómo evolucionar la pantalla actual de Apariencia hacia un editor visual flexible, profesional y seguro, sin alterar por sorpresa el widget publicado de ningún negocio.

La meta no es copiar Canva o Word completos. La meta es ofrecer la libertad que un negocio necesita para construir una experiencia de reserva propia —incluyendo imágenes, banners, textos y composiciones— dentro de límites que mantengan intactos el flujo de reserva, la adaptación móvil, la accesibilidad y el rendimiento.

## Estado de las decisiones

| Tema | Decisión de trabajo |
| --- | --- |
| Modelo de edición | Híbrido: bloques estructurados más posicionamiento libre acotado dentro de secciones |
| Experiencia inicial | Modo Básico para tareas frecuentes y modo Avanzado para composición |
| Vista previa | Render real del widget en un `iframe` aislado, con acceso privado al borrador |
| Guardado | Borrador automático; publicar es una acción separada y explícita |
| Producción | El widget público solo consume una versión publicada e inmutable |
| Compatibilidad | Sin diseño V2 publicado, el negocio continúa usando el render actual |
| Temas | Los temas controlan tokens visuales; el diseño controla estructura y contenido |
| Flujo de reservas | Los bloques funcionales son protegidos y conservan su orden lógico |
| Imágenes | Bloque en flujo, fondo de sección u overlay acotado; no posición absoluta global |
| Contenido inseguro | No se permite JavaScript, HTML arbitrario ni CSS arbitrario |
| Responsive | Cada diseño debe funcionar en móvil, tablet, escritorio e `iframe` |

Estas son recomendaciones técnicas para preparar un plan coherente. Las decisiones que aún requieren validación están registradas en [10-decisiones-abiertas.md](./10-decisiones-abiertas.md).

## Documentos

1. [Auditoría del estado actual](./01-auditoria-estado-actual.md)
2. [Visión, alcance y principios](./02-vision-alcance-y-principios.md)
3. [Especificación UX del editor](./03-especificacion-ux-editor.md)
4. [Catálogo de bloques y reglas de composición](./04-catalogo-bloques-y-composicion.md)
5. [Arquitectura de datos y render](./05-arquitectura-datos-y-render.md)
6. [Compatibilidad, migración y despliegue](./06-compatibilidad-migracion-y-despliegue.md)
7. [Seguridad, rendimiento y accesibilidad](./07-seguridad-rendimiento-y-accesibilidad.md)
8. [Estrategia de pruebas y aceptación](./08-pruebas-y-criterios-de-aceptacion.md)
9. [Roadmap de implementación](./09-roadmap-implementacion.md)
10. [Registro de decisiones y preguntas abiertas](./10-decisiones-abiertas.md)
11. [Matriz de trazabilidad](./11-matriz-trazabilidad.md)
12. [Wireframes y flujos](./12-wireframes-y-flujos.md)
13. [Auditoría y project tracker de la implementación](./13-project-tracker-auditoria-2026-07-29.md)
14. [Visión del editor libre V3 y roadmap](./14-vision-editor-libre-v3-y-roadmap.md)

## Reglas no negociables

- Una edición nunca modifica el widget público hasta presionar **Publicar**.
- Una migración no cambia el aspecto actual de un cliente sin una acción explícita.
- Todo acceso a diseños, versiones y archivos se valida por negocio y permiso.
- El flujo Servicio → Profesional → Fecha y hora → Datos conserva sus reglas actuales.
- Siempre existe una versión publicada recuperable.
- Toda imagen tiene comportamiento definido para móvil y escritorio.
- Cualquier bloque interactivo puede usarse con teclado.
- El widget debe seguir siendo embebible y rápido.
- El modo avanzado no puede generar diseños imposibles de editar o recuperar.

## Separación conceptual

### Tema

Define la identidad global:

- colores;
- tipografía;
- radios;
- sombras;
- espaciado base;
- estilo de botones y tarjetas.

Aplicar un tema copia valores al borrador. El diseño publicado no depende de que el preset siga existiendo.

### Diseño

Define la composición:

- secciones;
- bloques;
- orden;
- contenido;
- imágenes;
- visibilidad;
- comportamiento responsive.

### Datos operativos

Siguen viniendo del sistema real:

- servicios;
- profesionales;
- horarios;
- disponibilidad;
- precios;
- opciones;
- formularios;
- pagos.

El editor decide cómo se presentan dentro de límites seguros, pero no duplica ni sustituye esos datos.

## Puerta de implementación

No se inicia programación del nuevo editor hasta completar:

- aprobación del alcance de la primera versión;
- cierre de las decisiones marcadas como bloqueantes;
- aprobación del modelo de compatibilidad;
- aprobación del modelo de imágenes y posicionamiento;
- definición de los criterios de aceptación;
- definición del plan de pruebas y rollback.

La lista exacta está en [10-decisiones-abiertas.md](./10-decisiones-abiertas.md#puerta-para-empezar-a-programar).

## Glosario

- **Documento de diseño:** JSON validado que describe tokens, secciones y bloques.
- **Borrador:** versión editable, no visible para clientes.
- **Publicación:** creación de una versión inmutable que pasa a producción.
- **Bloque del sistema:** parte funcional del proceso de reserva.
- **Bloque de contenido:** imagen, texto, botón u otro elemento creado por el negocio.
- **Sección:** contenedor responsive que organiza uno o más bloques.
- **Overlay acotado:** bloque posicionado sobre una sección concreta, nunca sobre todo el widget.
- **Slot:** punto permitido para insertar contenido sin romper el paso de reserva.
- **Renderer legacy:** implementación actual utilizada cuando no existe un diseño V2 publicado.
- **Renderer V2:** renderer futuro basado en el documento de diseño validado.
