# Puri: asistente operativo de Puragenda

## Arquitectura

Puri V1 es una función de lectura y análisis. El panel cliente llama `POST /api/dashboard/puri`; la route obtiene la sesión desde la cookie, resuelve el negocio con `getBusinessForUser`, calcula permisos efectivos y valida la sucursal solicitada. El modelo nunca recibe `businessId`, `staffId` o `locationId` como autoridad.

La capa `src/server/puri/` está separada en:

- `context.ts`: identidad, negocio, sucursal y scope de agenda.
- `tools.ts`: consultas explícitas que reutilizan `loadTodayDashboard` y `getDashboardAvailability`, y agregan consultas Prisma acotadas.
- `definitions.ts`: schemas estrictos de function calling.
- `orchestrator.ts`: historial limitado, ejecución de tools, evidencia verificada y respuesta estructurada.
- `prompt.ts`: reglas de tono, permisos, timezone, moneda y modo read-only.
- `openai-client.ts`: cliente server-side y modelo configurable.
- `rate-limit.ts`: límite persistente por negocio y usuario con `ApiRateLimitBucket`.

## Configuración

Configura la clave sólo en el entorno del servidor:

```env
OPENAI_API_KEY=...
PURI_MODEL=gpt-6-luna
```

`PURI_MODEL` es opcional y por defecto queda en `gpt-6-luna`. La clave nunca se incluye en componentes cliente, JSON de respuesta, logs ni commits.

GPT-6 Luna se usa mediante la Responses API con function calling y structured output. La documentación oficial indica que el modelo soporta Responses, function calling y structured outputs.

Referencias: [modelo GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [function calling](https://developers.openai.com/api/docs/guides/function-calling), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Endpoint

`POST /api/dashboard/puri`

Body:

```json
{
  "message": "¿Qué tengo pendiente hoy?",
  "history": [],
  "context": {
    "pathname": "/dashboard",
    "locationSlug": "local-principal",
    "agenda": "all",
    "period": "week",
    "locale": "es"
  }
}
```

La locale efectiva se obtiene server-side. El frontend sólo aporta el pathname y filtros de navegación; la route vuelve a comprobarlos.

## Tools V1

| Tool | Permiso principal |
| --- | --- |
| `getTodayOverview` | `appointments.view_own` o `appointments.view_all` |
| `getAppointments` | Scope de agenda autorizado |
| `getAvailability` | Scope de agenda y sucursal autorizada |
| `searchClients` | `clients.manage` |
| `getClientSummary` | `clients.manage` |
| `getClientActivity` | `clients.manage` |
| `getRevenueSummary` | `analytics.view_own` o `analytics.view_business` según scope |
| `comparePeriods` | Igual que revenue |
| `getServicesSummary` | Scope de agenda; importes sólo con permiso financiero |
| `getStaffSummary` | `appointments.view_all` y `analytics.view_business` |
| `getLoyaltySummary` | `loyalty.manage` |
| `getGiftCardsSummary` | `gift_cards.manage` |
| `getRecurringSummary` | `recurring.manage` |
| `getStoryInsights` | `appointments.view_all` y `analytics.view_business` |

Las herramientas no aceptan SQL ni expresiones Prisma del modelo. Cada una limita filas, periodo y campos. Las notas privadas y respuestas de salud de clientes se excluyen.

En Hoy, `totalOpeningsAcrossStaff` suma el máximo de cupos por profesional, mientras `featuredOpportunityTimes` describe sólo la oportunidad destacada de la pantalla. `getAvailability.availableTimesCount` cuenta horas distintas para la consulta. Puri recibe estos campos separados para no presentar los tres recuentos como equivalentes.

## Respuesta estructurada

El modelo devuelve sólo `{ message }` mediante JSON Schema. El servidor genera `cards` y `actions` exclusivamente desde la evidencia de las tools:

```json
{
  "message": "Tienes dos pagos pendientes.",
  "cards": [
    { "type": "metric", "label": "Pendiente", "value": 20000, "unit": "money", "currencyCode": "CLP" }
  ],
  "actions": [
    { "id": "agenda", "href": "/dashboard/agenda" }
  ],
  "toolsUsed": ["getTodayOverview"]
}
```

Los enlaces se limitan a rutas internas conocidas.

## Contexto y conversación

El panel envía hasta 12 mensajes recientes y cada mensaje se limita a 2.000 caracteres. V1 mantiene el historial en memoria del cliente durante la sesión; no se añadió una tabla de conversaciones. El modelo recibe pathname, sucursal, agenda, periodo seleccionado, locale, timezone y moneda, pero los permisos y entidades se resuelven en el servidor. La vista de clientes actual no tiene una ruta de detalle que identifique un cliente, por lo que «este cliente» requiere que el usuario indique cuál; Puri vuelve a validar cualquier ID mediante la tool.

## Costes y límites

- `max_output_tokens` se limita a 1.200.
- Máximo de 4 rondas de tools y 4 llamadas ejecutadas por ronda. Las llamadas restantes reciben un error de límite.
- Consultas agregadas y listas acotadas; no se envían datasets completos. Las listas de citas informan si quedan más resultados. Los resúmenes de servicios y equipo rechazan periodos con más de 1.000 citas para evitar cifras parciales.
- Rate limit: 30 solicitudes por negocio/usuario cada 10 minutos, persistente en `ApiRateLimitBucket`.
- Se usa `store: false` en Responses para no persistir respuestas en OpenAI desde esta integración.

## UI

`PuriAssistant` vive en el layout interno del dashboard:

- Desktop: launcher `[P] Puri` abajo a la derecha.
- Mobile: panel de ancho completo desde abajo.
- El panel usa bordes negros, crema, lavanda, amarillo y sombras desplazadas de Puragenda.
- Las sugerencias cambian según pathname.
- `PuriTodayPrompt` añade una entrada contextual pequeña en “Hoy” sin competir con la agenda.

## Errores y privacidad

Una clave ausente, error de OpenAI o fallo de tool devuelve un código estable que el panel traduce al idioma activo y no rompe el dashboard. Los logs sólo registran una etiqueta genérica. No se registran mensajes ni PII en telemetría; los eventos sólo contienen sección, tool, acción o etapa.

La respuesta en lenguaje natural se genera con instrucciones que prohíben afirmaciones sin evidencia. El servidor exige al menos una tool verificada antes de aceptar esa respuesta, limita los datos enviados y construye las tarjetas desde los resultados, no desde el texto del modelo. Como cualquier salida generativa, el texto debe revisarse durante QA con datos conocidos antes del despliegue.

## Troubleshooting

1. Verifica `OPENAI_API_KEY` en el proceso server-side, nunca `NEXT_PUBLIC_OPENAI_API_KEY`.
2. Comprueba que el proyecto OpenAI tenga acceso a `gpt-6-luna`.
3. Si aparece `Puri aún no está configurado`, la variable no está disponible en el servidor.
4. Si una respuesta dice que no tiene acceso, revisa el access profile y las permissions del usuario.
5. Si disponibilidad no devuelve horas, revisa sucursal, horarios, bloqueos y `allowSameDayBookings`.

## QA manual

1. Configura una clave nueva en `OPENAI_API_KEY` en el servidor y reinicia Next.js. No la escribas en el navegador ni uses una variable `NEXT_PUBLIC_`.
2. Inicia sesión con una cuenta de prueba que tenga negocio y datos conocidos. Abre `/dashboard`, prueba el bloque contextual y el launcher; repite en Analytics, Clientes y Fidelización.
3. Pregunta: «¿Qué tengo pendiente hoy?», «¿Quién viene hoy?», «¿Cuánto he cobrado hoy?», «¿Cuánto me falta por cobrar?», «¿Qué horas tengo mañana?», «¿Cómo estuvo esta semana?», «Compara esta semana con la anterior», «¿Cuál es mi servicio más reservado?», «¿Qué clientes llevan más tiempo sin venir?», «¿Cómo va fidelización?» y «¿Tengo recurrentes pendientes?». Contrasta cada cifra con el módulo de origen.
4. Haz el seguimiento «¿Cómo estuvo esta semana?» → «¿Y la anterior?» → «¿Cuál fue la diferencia?» en el mismo panel.
5. Repite con un STAFF que sólo tenga agenda propia, con otra sucursal y con un usuario sin permiso financiero. Confirma que Puri no expone importes ni datos de otros profesionales.
6. Verifica móvil, cierre con Escape, cambio de idioma y respuesta controlada cuando OpenAI no está configurado.

## Extensión futura

La capa de ejecución recibe un contexto autenticado y un nombre de tool aislado, por lo que V2 puede añadir “acciones preparadas” con confirmación explícita. V1 no muta citas, pagos, campañas, clientes ni configuración.
