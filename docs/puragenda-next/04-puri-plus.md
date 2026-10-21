# 04 — Puri+

## Estado comprobado

Puri es un asistente único de lectura. El contexto resuelve negocio, permisos, profesional y sucursal. Las herramientas ejecutan consultas deterministas de agenda, disponibilidad, clientes, actividad, ingresos, servicios, staff, fidelización, Gift Cards, recurrentes y stories. El orquestador usa Responses API, limita historial y rondas, fuerza tool en la primera ronda y devuelve JSON estricto. La telemetría registra tokens, coste estimado, latencia, tools, errores y feedback sin guardar prompts completos. El rate limit actual es 30 solicitudes por usuario y negocio cada 10 minutos.

El prompt declara que V1 no crea, edita, cobra, envía ni cambia. La separación actual depende de permisos de dashboard, no de los planes comerciales. La rama feature/puragenda-chatgpt-mcp contiene un conector OAuth/PKCE y treinta tools, pero no está en el HEAD auditado.

## Objetivo de Puri+

Puri+ debe analizar reservas, inactividad, ocupación, demanda, servicios y resultados comerciales; explicar evidencia y periodo; recomendar recuperación y fidelización; simular alcance y coste; preparar una automatización; solicitar aprobación; y delegar la ejecución en Contact Flow. No puede enviar mensajes, aplicar descuentos, cambiar precios ni modificar la agenda de forma autónoma.

## Política

| Capacidad | Puragenda | Puragenda+ |
| --- | --- | --- |
| Agenda y disponibilidad autorizada | Sí | Sí |
| Clientes y actividad autorizada | Sí | Sí |
| Analítica básica | Sí | Sí |
| Señales de crecimiento | Consulta | Proactiva |
| Recomendación de recuperación | No | Sí |
| Simulación de Contact Flow | No | Sí |
| Crear automatización | No | Solo propuesta |
| Aprobar automatización | No | Usuario autorizado |
| Enviar mensajes | Motor aprobado | Motor aprobado |
| Descuentos o precios | No | Workflow administrativo separado |

El usuario necesita además los permisos de negocio. Tener Plus no da acceso financiero ni amplía alcance de sucursal.

## Flujo recomendado

1. SQL calcula señales y cohortes.
2. Código determinista excluye clientes sin consentimiento, suprimidos o con reserva futura.
3. Puri recibe agregados y ejemplos mínimos.
4. El modelo redacta explicación, alternativas y regla propuesta.
5. Se guarda una GrowthRecommendation con hash de evidencia, periodo, versión y expiración.
6. El negocio revisa y aprueba.
7. Contact Flow crea la automatización con el snapshot aprobado.
8. Las ejecuciones y reservas atribuidas alimentan el siguiente análisis.

La aprobación está vinculada a negocio, usuario, versión y token de un solo uso. Texto generado no es autorización.

## Tools propuestas

- get_growth_signals;
- get_occupancy_opportunities;
- get_inactive_client_cohort;
- get_service_performance;
- estimate_contact_flow;
- draft_recovery_strategy;
- prepare_contact_flow;
- get_automation_results.

No debe existir una tool send_messages. Puri nunca llama a Resend o Mercado Pago.

## SQL antes que IA

Conteos, medianas, ventanas, cohortes y umbrales son SQL/código. El modelo se usa para explicación, priorización y redacción. Las señales pueden cachearse por negocio y ventana. Los prompts no deben incluir listas de emails. Si falta precio del modelo en PURI_MODEL_PRICES_USD_PER_MILLION, el coste queda desconocido y no se presenta margen inventado.

## Límites

Los valores finales dependen de uso real. Se propone separar:

- mensajes interactivos por usuario;
- análisis proactivos por negocio;
- presupuesto mensual de tokens;
- presupuesto de recomendaciones;
- alertas al 50, 80 y 100%;
- fallback a datos deterministas cuando se agota el presupuesto.

La cuota de IA no es permiso para enviar. Debe medirse por plan, negocio, usuario, ubicación, modelo y versión de señal.

## Datos y telemetría

Guardar solo intent, modelo, tokens, coste, latencia, resultado, hash de dataset, versión de regla y feedback. Añadir eventos para señal detectada, recomendación generada, vista, aprobación, rechazo, automatización creada, envío, supresión y reserva atribuida. Mantener fuera notas clínicas y datos sensibles.

## MCP

Si se retoma la rama MCP, debe consultar el mismo servicio de entitlements y permisos. Las escrituras necesitan aprobación en Puragenda y el rollout debe permanecer cerrado hasta validación externa. Sus pruebas no certifican disponibilidad en producción.

## Aceptación

- Puragenda no ve herramientas Plus.
- Plus sin permiso financiero no ve importes.
- Cada recomendación muestra periodo, filtros y conteos reproducibles.
- Repetir una petición no crea duplicados.
- Una recomendación expirada no se aprueba.
- Aprobar dos veces no crea dos automatizaciones.
- Un fallo de modelo conserva datos deterministas.
- La cuota se registra aun con error.
- La separación entre negocios y sucursales pasa pruebas negativas.
