# Auditoría 07 — Puri, Puri+, MCP y onboarding

Fecha: 2026-11-01, America/Santiago. Estado: **cierre local para revisión independiente; sin aprobación de lanzamiento**.

## 1. Resumen ejecutivo

Se auditó RC1 desde `8826181cc2d0a9b754554002aee8a7a2fc1209a8` en el worktree independiente `C:/Users/diego/.codex/worktrees/puragenda-next-audit07/agenda`, rama `fix/puragenda-next-audit-07-puri-onboarding`.

Resultado: **21 hallazgos, 19 corregidos y 2 pendientes de mantenimiento/política**. Se añadieron **58 casos Vitest**. La consolidación de ejecuciones contiene **2.713 casos Vitest únicos aprobados, 0 fallidos y 0 omitidos** después de ejecutar expresamente las suites condicionadas. Además pasaron **151 comprobaciones HTTP y 17 de navegador**; no se suman estas categorías como si fueran casos Vitest.

El código funcional y los runners quedan en `cb3593e5f613a1489511e0f9159ef3787bd514eb`. El commit documental que contiene este informe cierra la entrega: **8 commits lineales y 46 archivos distintos respecto de RC1**. Su SHA definitivo se obtiene con `git rev-parse HEAD` y se entrega en el mensaje de cierre; no se introduce una referencia circular al SHA del propio informe.

No se hizo push, merge, rebase, cherry-pick ni despliegue. No se alteraron `main`, RC1, onboarding V2, configuración remota, dominios ni datos productivos. Las pruebas usan PostgreSQL desechable en loopback, cuentas ficticias y transportes simulados. No se llamaron modelos facturables ni proveedores financieros reales.

## 2. Ramas, worktrees y funcionalidades existentes

| Referencia | Estado comprobado | Relación con RC1 |
| --- | --- | --- |
| `release/puragenda-next-rc1` | Local y remoto `8826181cc2d0a9b754554002aee8a7a2fc1209a8`; worktree limpio | Base aprobada; auditorías 01–06 integradas |
| `main` remoto | `e74c92237e47db43425a7d47209520967e51bfb0` | Sin modificaciones ni publicación desde esta tarea |
| `feature/puri-assistant` | `6f0ab2266bb3f76fc92e97c036dde9e40061d07e` | Antecesor integrado; Puri y su monitoreo ya existen en RC1 |
| `feature/puragenda-chatgpt-mcp` | `3a8f44ba31a204ba7ea05301f8f53158b7069548`; worktree `C:/Users/diego/Desktop/agenda-chatgpt-mcp`, limpio | Antecesor integrado; 114 commits de RC1 posteriores, ninguno exclusivo pendiente de esa rama |
| `feature/puri-onboarding-v2` | `803447bbe7afdb12d92fd3dbbd8512c189b772ac`; worktree `C:/Users/diego/.codex/worktrees/puri-onboarding-v2/agenda`, limpio | Base común `f19553368d8317f66ac9b11fd2306bbc1839fba1`; RC1 tiene 26 commits exclusivos y onboarding 2 |
| Auditoría 07 | Rama local exclusiva sobre el SHA aprobado | Sin remoto ni upstream; congelada localmente tras el commit documental |

El workspace original `C:/Users/diego/Desktop/agenda` contiene trabajo previo no integrado y se preservó. Solo se consultó allí la guía local de PostgreSQL; no se ejecutaron mutaciones, instalaciones ni pruebas en ese workspace ni en los worktrees de onboarding/MCP.

RC1 contiene Puri estándar, Growth/Puri+, Contact Flow, MCP y tutoriales driver.js. **No contiene** las rutas de Setup, el catálogo persistente de aprendizaje ni las tablas del onboarding V2. La auditoría no añadió otra implementación de onboarding.

## 3. Inventario revisado

Se revisaron `src/server/puri/` y `growth/`, `src/server/mcp/`, sus rutas HTTP/OAuth/aprobación, frontend Puri/Puri+, tutoriales, registro, layout, monitoreo Superadmin, modelos Prisma y pruebas. También se siguieron sus dependencias hacia permisos, sesiones, acceso comercial, política de consumo, motor de reservas, pagos registrados, Contact Flow, disponibilidad y cron de retención MCP.

Puntos relevantes: `context`, `authorization`, `tools`, `definitions`, `dates`, `prompt`, `orchestrator`, `commercial-usage`, `openai-client`, `rate-limit`, `telemetry`, `analytics`; en Growth: acceso, SQL scope/cohortes, evidencia, ocupación, contratos, análisis, recomendaciones, presupuestos, runtime, herramientas, política de entrada, proactividad, monitoreo y retención. En MCP: servidor, lecturas, escrituras, acceso, OAuth, scopes, metadatos, seguridad, discovery público, rollout y retención.

### Puri estándar: 14 herramientas de lectura

Todas pasan por `executePuriTool`: contexto actual antes y después, tenant de servidor, permisos y alcance. El historial y los argumentos no conceden derechos.

| Herramienta | Función y límite efectivo |
| --- | --- |
| `getTodayOverview` | Motor Hoy; citas, fases y disponibilidad; dinero solo con permiso |
| `getAppointments` | Período local, sucursal/agenda, estados explícitos, máximo 50 y cursor |
| `getAvailability` | Motor canónico, fecha validada, servicio/profesional autorizados |
| `searchClients` | CRM del negocio; permiso de clientes y propietario mientras el agregado sea global |
| `getClientSummary` | ID dentro del negocio; visitas; importes requieren finanzas; propietario |
| `getClientActivity` | Frecuencia/inactividad/ausencias agregadas; propietario y clientes |
| `getRevenueSummary` | Cobrado registrado, pendiente y nominal por fecha de cita; finanzas según agenda |
| `comparePeriods` | Dos períodos del mismo alcance; división por cero produce cambio desconocido |
| `getServicesSummary` | Cantidad y valor nominal; importe oculto sin permiso financiero |
| `getStaffSummary` | Desempeño en sucursal; agenda global y finanzas del negocio |
| `getLoyaltySummary` | Sellos y recompensas; propietario y permiso del módulo |
| `getGiftCardsSummary` | Cantidades/saldos por moneda; sin códigos; propietario y permiso del módulo |
| `getRecurringSummary` | Estados recurrentes; propietario y permiso del módulo |
| `getStoryInsights` | Totales de Stories; propietario, agenda global y finanzas |

La restricción de propietario para agregados globales es deliberada: esos servicios no admiten un filtro fiable de sucursal. Una asignación limitada no debe convertirse en acceso global a través del asistente. Es el mismo criterio que utilizaba MCP para CRM. No cambia los permisos de los módulos operativos; ampliar esta delegación requiere primero un agregado canónico con el alcance correspondiente.

### Puri+: 9 capacidades registrables

| Herramienta | Control |
| --- | --- |
| `get_growth_signals` | Entitlement Plus y alcance efectivo; evidencia SQL agregada |
| `get_service_performance` | Además, permiso financiero del alcance |
| `get_inactive_client_cohort` | Además, clientes; no entrega destinatarios ni presume consentimiento |
| `get_growth_recommendations` | Propuestas del negocio/scope; no ejecutables |
| `prepare_contact_flow` | Propietario/marketing y petición de preparación; no aprueba ni envía |
| `get_contact_campaigns` | Laboratorio Contact Flow, clientes y preparación autorizada |
| `get_contact_quotas` | Mismas restricciones; límites y bloqueos del servidor |
| `get_contact_results` | Atribución técnica verificada; no causalidad ni incrementalidad |
| `prepare_contact_campaign` | Laboratorio y propuesta aprobada; preparación sin ejecución externa |

Las herramientas de Growth sustituyen las operativas en ese turno. No pueden ampliar el catálogo de ejecutores mediante instrucciones del modelo.

### MCP: 30 herramientas reales

| Scope/canal | Herramientas |
| --- | --- |
| `account:read` | `get_connected_account`, `get_business_profile`, `list_accessible_locations` |
| `agenda:read` | `get_today_overview`, `list_appointments`, `get_appointment_details`, `get_available_slots`, `list_services`, `list_staff` |
| `clients:read` | `search_clients`, `get_client_summary`, `get_client_activity` |
| `analytics:read` | `get_revenue_summary`, `compare_periods`, `get_popular_services`, `get_staff_performance` |
| `loyalty:read` | `get_loyalty_summary`, `get_gift_cards_summary` |
| Público, lectura | `search_public_businesses`, `get_public_business_details`, `get_public_service_catalog`, `get_public_availability` |
| Público, preparación/ejecución controlada | `prepare_public_booking`, `confirm_public_booking` |
| `appointments:write`, preparación | `prepare_appointment_creation`, `prepare_appointment_reschedule`, `prepare_appointment_cancellation` |
| `appointments:write`, ejecución con comprobante aprobado | `create_appointment`, `reschedule_appointment`, `cancel_appointment` |

Los 30 nombres se ejercitaron mediante el cliente MCP oficial y transporte HTTP real, dentro de la suite PostgreSQL. Los scopes OAuth y los permisos actuales se intersectan; CRM global exige propietario; finanzas y fidelización se filtran por sus scopes adicionales. Ninguna herramienta entrega API keys del negocio ni notas privadas.

## 4. Hallazgos, causas y correcciones

Las reproducciones negativas conservan sus resultados locales anteriores a cada corrección en `scratch/audit07/`. Las fallas esperadas al reproducir un defecto no se suman a los fallos de la validación final.

| ID | Prioridad | Defecto reproducido / causa | Corrección y evidencia |
| --- | --- | --- | --- |
| 07-01 | Crítica | Un profesional con `view_all` podía elegir una sucursal no asignada; sin asignaciones se obtenía alcance sin sucursal | Filtrado de asignaciones activas y rechazo sin sucursal. El conteo de sucursales utiliza todo el negocio para no incluir filas legacy nulas en una secundaria. PostgreSQL de acceso |
| 07-02 | Crítica | El CRM agregado podía consultar clientes fuera de la sucursal limitada | Agregados globales restringidos a propietario, conservando permisos por módulo. PostgreSQL de acceso |
| 07-03 | Crítica | El contexto anterior seguía sirviendo después de revocar permisos, sesión o propiedad | Usuario/tokenVersion, membresía, permisos y alcance se revalidan en cada herramienta y después de su lectura; el contexto anterior es un máximo, no una autorización durable. PostgreSQL de acceso |
| 07-04 | Alta | Puri legacy vencido no se bloqueaba al crear contexto, pues la comprobación solo se aplicaba a V2 | Entitlement estándar efectivo para ambas familias, sin migrar contratos. PostgreSQL de acceso |
| 07-05 | Crítica | MCP privado/público confiaba en la proyección legacy: podía admitir V2 sin pago o negar un trial válido | `getCommercialPlanAccess` como fuente efectiva, incluyendo gracia y negocio eliminado. PostgreSQL de acceso y MCP |
| 07-06 | Crítica | Crear, cancelar o reprogramar podía continuar tras revocar la conexión mientras esperaba el lock de capacidad | Autorización actual dentro de la transacción canónica, después del lock. Creación usa un callback exclusivo del servidor, no parámetros HTTP. Tres carreras PostgreSQL, sin notificaciones/sync al rechazar |
| 07-07 | Crítica | Una lectura MCP podía terminar tras revocar la conexión; un access token podía vencer después de autenticar el transporte | Relectura del token por herramienta y autorización antes/después de lecturas; scopes y alcance siguen siendo máximos. PostgreSQL MCP |
| 07-08 | Crítica | Llamadas legacy omitían el ledger y usaban reintentos/timeouts predeterminados del SDK | Todas las llamadas estándar reservan presupuesto; transporte con `maxRetries: 0`, timeout 20 s y máximo de cuatro rondas. Reproducción unitaria de orquestación |
| 07-09 | Crítica | Estándar y Plus podían contactar al proveedor con un grant anterior a una espera del lock presupuestario | Revalidación posterior a reservar y anterior al transporte. La reserva se liquida en cero únicamente si está probado que no hubo intento de proveedor. Dos carreras PostgreSQL con observación de `pg_blocking_pids` |
| 07-10 | Crítica | Scope Growth sin versión de sesión; una propuesta y la respuesta HTTP final podían reutilizar autorización revocada | Captura/comparación de tokenVersion, validación después del lock de scope y antes de devolver datos en API/SSR. PostgreSQL de runtime, incluida revocación al terminar la última lectura HTTP |
| 07-11 | Alta | Una respuesta final del modelo podía reutilizar evidencia obtenida antes de revocar el acceso | Autorización entre rondas y antes de entregar la respuesta. Reproducción unitaria con revocación durante la segunda respuesta |
| 07-12 | Alta | Tras una herramienta legítima el modelo podía inventar cifras o afirmar una cancelación inexistente | El texto operacional estándar se construye con hechos permitidos del backend. Growth utiliza explicación determinista de evidencia. Las peticiones claras de escritura estándar reciben orientación sin proveedor ni comprobante ficticio. Correos/teléfonos/notas no necesarios se eliminan del resultado enviado al modelo. Reproducciones unitarias de cifras/acciones y regresión de minimización |
| 07-13 | Alta | Una respuesta declarada incompleta podía aceptarse como respuesta final | Validación de estado y estructura; error útil `UNAVAILABLE`/503 en la ruta estándar, sin convertir un fallo del proveedor en denegación de permisos. Pruebas de orquestación y ruta |
| 07-14 | Alta | Se leía JSON sin límite de stream antes de validar el esquema de Puri | Lectura acotada a 64.000 bytes, incluso sin Content-Length y con campos descartados por Zod. Reproducción unitaria HTTP y HTTP real |
| 07-15 | Media | Una escritura fallida de telemetría Growth derribaba una respuesta determinista válida | Monitoreo opcional no fatal; errores genéricos y autorización final obligatoria. PostgreSQL con fallo de `puriRequest.create` |
| 07-16 | Media | Superadmin omitía Plus pagado durante la gracia legítima si el worker aún no había materializado el estado | Conteo con evaluación comercial central. Reproducción PostgreSQL mantiene el mismo número de elegibles antes/después de entrar en gracia |
| 07-17 | Media | driver.js destacaba elementos existentes pero ocultos en móvil | Resolución por visibilidad, `hidden`/`inert`/`aria-hidden`, estado habilitado y geometría; se filtran pasos automáticos. Navegador real de componentes |
| 07-18 | Media | Un recorrido podía abrirse sobre un modal o permanecer junto a Puri | Coordinación única del driver existente, bloqueo con modal/menú visible, cierre al abrir Puri y en navegación/resize; scroll suave desactivado con movimiento reducido. Navegador |
| 07-19 | Media | Storage bloqueado podía hacer fallar tutoriales/asistente y su telemetría | Lecturas/escrituras opcionales tolerantes a SecurityError; sesión efímera en memoria cuando no se puede persistir. Navegador |
| 07-20 | Media, pendiente | No hay política aprobada de retención automática completa para metadata Puri y ledger económico | No se inventó un plazo ni se purgó contabilidad. Debe aprobarse retención, excepciones y tombstones antes de activar una tarea de mantenimiento |
| 07-21 | Mantenimiento, pendiente | Persisten 23 paquetes avisados exclusivamente de desarrollo | Documentados abajo; sin actualización masiva ni `audit fix --force`; audit productivo en cero |

El caso positivo de consentimiento MCP para un segundo negocio del mismo propietario se añadió durante el refuerzo para evitar una regresión: la revalidación no debe sustituir el negocio consentido por el primero del dashboard. El tenant explícito solo lo proporciona el servidor y vuelve a comprobar membresía. El esquema HTTP del navegador no acepta `businessId`. Su prueba positiva y las negativas de propiedad/tenant pasan juntas.

## 5. Reproducciones y pruebas nuevas

| Archivo | Casos nuevos | Alcance |
| --- | ---: | --- |
| `tests/integration/audit07-access-postgres.integration.test.ts` | 31 | Dos negocios/sucursales, CRM, IDs ajenos, profesional limitado/inactivo, revocación, matriz comercial, legacy y MCP multi-negocio |
| `tests/integration/audit07-runtime-postgres.integration.test.ts` | 8 | Dos locks presupuestarios, diez reservas concurrentes, liquidación idempotente, sesión Growth, propuesta tras downgrade, telemetría, gracia de Superadmin y respuesta HTTP revocada |
| `tests/server/audit07-orchestration.test.ts` | 8 | Ledger legacy, transporte acotado, revocación durante respuesta, incompletas, escritura no ejecutada, cifras ficticias, lectura de canceladas y minimización/inyección |
| `tests/server/mcp.postgres.integration.test.ts` | 5 | Tres escrituras bloqueadas tras revocación, lectura revocada y token vencido tras autenticar |
| `tests/server/puri.route.test.ts` | 3 | Stream sobredimensionado y dos errores estructurados del proveedor |
| `tests/server/rc1-deployment-safety.test.ts` | 3 | Push, dispatch y PR de Auditoría 07 |
| **Total** | **58** | No se cuentan ajustes de fixtures como pruebas nuevas |

La primera reproducción de acceso registró 8 fallos; se añadieron después los casos de sucursal sin asignación y MCP público. La primera reproducción del orquestador registró 6 fallos. Los locks presupuestarios se observaron en PostgreSQL antes de liberar la transacción que retiraba el acceso. Las reproducciones MCP registraron 5 fallos con 53 casos anteriores pasando. El navegador reprodujo elementos ocultos, dos conflictos de overlays y el crash con storage bloqueado.

Evidencia local: `reproduction-access.json`, `reproduction-access-additional.json`, `reproduction-orchestration.json`, `reproduction-runtime.json`, `reproduction-growth-lock.json`, `reproduction-monitoring.json`, `reproduction-plus-http.json`, `reproduction-body.json`, `reproduction-mcp-final.log` y `browser/reproduction.json`, todos bajo `scratch/audit07/`. Algunos ensayos iniciales de fixtures fallaron por timezone/isActive, enum o selectores de QA: se corrigió el harness y no se clasificaron esos errores como defectos del producto.

La suite de acceso sustituye únicamente el gate de rollout MCP para aislar la frontera comercial; no habilita el producto. La suite MCP completa prueba el rollout, OAuth y el transporte reales sobre sus fixtures locales.

## 6. Regresión ejecutada y recuento sin duplicados

| Ejecución | Aprobadas | Fallidas | Omitidas en esa ejecución |
| --- | ---: | ---: | ---: |
| General Vitest, colección completa | 1.927 | 0 | 786 condicionadas |
| Comercial PostgreSQL, 21 archivos | 608 | 0 | 0 |
| Focalizada final de contexto/runtime y contexto unitario | 43 | 0 | 0 |
| Reservas/agenda PostgreSQL | 97 | 0 | 0 |
| MCP/OAuth/PostgreSQL/HTTP | 58 | 0 | 0 |
| Legacy, depósitos y sitios | 85 | 0 | 0 |

**No se suman esas filas.** La ejecución focalizada aporta un caso comercial nuevo y vuelve a verificar los anteriores afectados: hay **609 casos comerciales distintos**. De las 97 pruebas de reservas, 37 ya estaban aprobadas en la general; de MCP, 26 ya estaban en la general. Las 85 legacy y los 609 comerciales cubren las restantes condicionadas. Se consolidó por archivo, nombre completo y ocurrencia, conservando la última ejecución de cada caso: **2.713 aprobadas, 0 fallidas, 0 omitidas**. El ledger reproducible queda en `scratch/audit07/verification-ledger.json`.

La regresión incluye registro, catálogo/precios y trial, integridad de profesionales/servicios/clientes, CRM/portal/privacidad, reservas y agenda canónica, depósitos, pagos registrados, conciliación Mercado Pago V2 con dobles, expansiones/downgrades, gracia de 48 horas, legacy, editor/autosave/medios, dominios/TXT vencidos, publicación/SEO, recuperación comercial, MCP y Contact Flow simulado. Las migraciones históricas se aplicaron únicamente a las bases aisladas necesarias para estas suites.

### HTTP y navegador

| Harness HTTP real sobre staging desechable | Comprobaciones aprobadas |
| --- | ---: |
| Flujo integrado y Contact Flow simulado | 19 |
| Agenda/reservas | 14 |
| Servicios/profesionales | 13 |
| Clientes/privacidad/portal | 49 |
| Facturación/gracia, sin proveedor | 30 |
| Sitios/publicación/medios | 12 |
| Puri/Puri+ nuevo | 14 |
| **HTTP** | **151** |

Las seis comprobaciones de bootstrap son preparación y no se añaden al total. La duración del worker tampoco se cuenta como una aserción. Navegador: 8 escenarios con componentes React/driver.js reales en una página loopback sintética y 9 comprobaciones del dashboard autenticado real; **17 aprobadas**. Chrome headless, móvil 390×844, desktop 1366×900, movimiento reducido, Escape/foco, rutas, visibilidad, overlays, storage y continuidad de módulos tras falla de IA. Las capturas quedan ignoradas bajo `scratch/audit07/browser/`.

El botón flotante está oculto deliberadamente en Hoy móvil: se probó la entrada Puri existente dentro de Hoy; no se cambió ese diseño. No se certificó WCAG completa ni hardware móvil físico.

### Herramientas de validación

- Prisma generate y validate: aprobados; esquema sin cambios.
- Next typegen y TypeScript `--noEmit`: aprobados.
- ESLint: sin errores; **32 advertencias previas**. Se corrigió un error del nuevo runner que utilizaba `module` como variable; no se ocultó mediante reglas.
- Build optimizado aislado con webpack: aprobado, **162 páginas**. Sin credenciales de proveedores, escritores comerciales desactivados; solo assets públicos de fuentes permitidos por el guard de build.
- Protección de publicación: **32 casos aprobados**, ya incluidos en la general.
- Scanner de líneas introducidas en todos los commits y cambios locales: sin coincidencias de credenciales. Es un scanner por patrones, no una prueba universal de ausencia de secretos.
- `npm audit --omit=dev`: **0**; audit completo: **21 moderados y 2 bajos**, sin altos/críticos.

No se ejecutaron pruebas facturables de OpenAI, transacciones financieras reales, correo/calendarios externos, despliegues ni pruebas funcionales en el worktree original del onboarding. Esas exclusiones no se presentan como aprobaciones.

## 7. Acceso comercial, privacidad y presupuesto

La matriz PostgreSQL prueba Puragenda/Plus en trial y pagados, autorización sin pago, pendiente, suspensión/bloqueo, expiración, gracia legítima y vencida, cancelación de renovación con período vigente, upgrade/downgrade, legacy, usuario/negocio eliminado y profesional inactivo. No se cambian precios, planes, términos históricos ni se crean migraciones comerciales automáticas.

Las herramientas estándar revalidan usuario/tokenVersion, membresía, sucursal, agenda y permisos antes/después. El consentimiento OAuth conserva su tenant explícito, incluso si el propietario tiene otro negocio como dashboard predeterminado. Las restricciones OAuth filtradas no se restauran al reconstruir el contexto. Los resultados no se entregan si se retiran derechos mientras se consultan o responde el modelo.

El proveedor no es autoridad sobre cifras, pagos ni acciones. La respuesta estándar usa una lista explícita de campos del backend, con nombres citados como datos; Growth utiliza explicación determinista. Las tarjetas y links siguen construyéndose en servidor. Los estados PENDING/AWAITING_PAYMENT no se convierten en CONFIRMED. Se explican valor reservado nominal, cobro registrado y período por fecha de cita, distinto de un libro contable por fecha bancaria. La salida de Puri se renderiza como texto escapado por React, sin HTML ni enlaces arbitrarios del modelo.

No se persisten prompts, conversaciones completas ni resultados de herramientas por defecto. Se guardan estado, latencia, tokens, modelo, nombres de herramientas y hashes. La telemetría estándar ya toleraba fallos; ahora Growth también. Superadmin requiere sesión administrativa en su ruta y autorización propia en sus métricas. Los importes se presentan como **estimados**, con cobertura de requests tarifadas y valores desconocidos explícitos, no como facturación real.

El ledger comparte controles globales, de negocio y categoría para estándar y Plus. Las reservas usan bloqueo PostgreSQL distribuido; las diez solicitudes simultáneas no superan el límite y la doble liquidación no duplica consumo. Upsert de política/cambio de plan no reinicia contadores. Idempotencia, lease, recuperación de reservas huérfanas, períodos, caché y costo desconocido permanecen cubiertos por la suite Growth existente y las nuevas carreras.

Después de un intento ambiguo, timeout, usage ausente, modelo/tarifa desconocidos o costo superior a la reserva, se mantiene el compromiso y el bloqueo de gasto hasta conciliación autorizada. Solo se liquida en cero una denegación comprobada **antes** de invocar el transporte o trabajo SQL sin costo externo. No hay reintento automático del SDK ni conciliación por decisión del modelo.

No se inventan cuotas: V2 depende de `COMMERCIAL_USAGE_POLICY_JSON` y sus snapshots; los contratos legacy requieren presupuesto explícito del ledger. **Sin precio y asignación verificables la IA falla cerrada**, incluido legacy. Este cambio debe contemplarse en la preparación de lanzamiento de cuentas históricas; no retira sus derechos comerciales ni modifica su contrato. Ayuda contextual y configuración determinista no requieren contratar Plus ni llamar al modelo.

## 8. Modelo y fronteras experimentales

`PURI_MODEL` sigue siendo configurable y conserva `gpt-6-luna` como valor predeterminado. Se contrastó su ficha oficial y el contrato Responses; ello verifica documentación pública, **no disponibilidad de la cuenta productiva ni facturación efectiva**. Fuentes: [modelo](https://developers.openai.com/api/docs/models/gpt-6-luna), [Responses](https://developers.openai.com/api/reference/typescript/resources/responses), [precios](https://developers.openai.com/api/docs/pricing). No se alteraron tarifas ni se hizo una llamada real para certificarlo. Los valores de precios usados por mocks son fixtures, no una validación de cargos reales.

Se preservó la frontera existente: `assertGrowthSandbox` admite Next explícitamente habilitado o sandbox comercial con opt-in interno. IA Plus necesita además `PURI_PLUS_AI_ENABLED`; proactividad necesita `PURI_PLUS_PROACTIVE_ENABLED`; Contact Flow conserva sus gates de laboratorio/entrega y autorización. El scheduler Growth no se conectó a cron productivo. No se activó ninguna de esas flags remotamente.

MCP mantiene `MCP_ENABLED`, rollout persistido con aprobación/allowlists y `MCP_PUBLIC_BOOKING_ENABLED`. Las herramientas públicas no convierten discovery/consentimiento en identidad verificada. La escritura pública sigue cerrada por defecto y las pruebas controladas solo permiten reservas gratuitas, sin abonos. No se lanzó MCP globalmente.

## 9. MCP: garantías conservadas

OAuth mantiene PKCE S256, redirects registrados/allowlist, resource/issuer, CSRF, código de un uso, rotación de refresh y revocación por replay. Access tokens duran diez minutos y se vuelven a comprobar por herramienta. La sesión y membresía actuales siguen siendo necesarias aunque el token sea válido.

Preparar, aprobar en navegador y ejecutar son pasos distintos. Los comprobantes no equivalen a aprobación; el modelo no puede producir el CSRF/cookie y sesión que autoriza una operación privada. El payload está cifrado con AES-GCM; hash, versión y vigencia fijan la acción aprobada. La escritura revalida después del lock, usa el motor canónico y mantiene idempotencia/resultado durable antes de efectos externos. Un resultado EXECUTING incierto se recupera con el mismo comprobante; no autoriza otra reserva al vencer.

Se mantienen rechazo de abonos/pagos en flujos gratuitos, pertenencia de IDs, alcance por profesional/sucursal, disponibilidad y catálogo actuales, límites distribuidos, RLS/revocación de grants Data API y FK entre tenants. Los logs del protocolo contienen herramienta/estado/duración, no argumentos o tokens. La retención MCP limpia credenciales vencidas y vacía payloads después de 24 horas, conservando tombstones; no se modificó su cron.

## 10. Onboarding V2: revisión de compatibilidad de solo lectura

Se leyeron su diseño, migración, `service.ts`, diagnósticos, tutorial-service, catálogo de guías, adaptador Puri Setup y coordinación de overlays. Los dos commits son `14a4b19a5a1bd331206a4b40f31cb8f64673ff78` y `803447bbe7afdb12d92fd3dbbd8512c189b772ac`. No se copiaron archivos ni commits, no se ejecutaron runners en su worktree y no se modificó su estado.

El diseño reutiliza `createService`, `createStaff`, capacidad contractual, horarios existentes y `loadBookingContext/getBookingAvailability`. Guarda avance/draft/revisión en servidor; clave de operación y hash evitan duplicación; bloquear Business y comparar revisión evita sobrescritura entre dispositivos. Reconoce configuración existente, permite pausa/reanudación y opciones; el paso final vuelve a consultar disponibilidad. Probar un horario no crea reserva ni cobro. La guía determinista y formularios pueden continuar sin OpenAI. Los permisos básicos no exigen Plus; website/Contact Flow son opcionales. Estas son **conclusiones de lectura**, no nuevas ejecuciones de sus pruebas de navegador/PostgreSQL.

Antes de integrar esa rama se requiere:

1. Revisar sobre RC1 actual las diferencias de auditorías 05/06; conservar las validaciones comerciales/capacidad/gracia y reglas de sitios.
2. Adaptar la extensión `PURI_SETUP` al contrato de autorización server-only de esta auditoría y al ledger común, también para legacy. Su adaptador actual conserva la bifurcación legacy sin ledger que aquí se corrigió.
3. Revalidar sesión, permisos y acceso comercial después de los locks de `runSetupCommand` y `saveLearning`; la lectura estática observa contextos previos al lock. Esto necesita reproducción y revisión en su propia rama antes de afirmarlo corregido.
4. Integrar un solo driver y resolver conscientemente sus `activeHelp/openHelp/closeHelp/setupPriority` con `guided-help-runtime`. Reutilizar visibilidad, exclusión de overlays y movimiento reducido; no mantener dos sistemas compitiendo.
5. Mantener propuestas sin escritura, confirmación explícita, claves de idempotencia/revisiones y selección real del motor; impedir que una respuesta del modelo se considere aprobación.
6. Revisar/aplicar únicamente cuando se autorice su migración `20261031200000_puri_setup_learning_v2` (BusinessSetup, SetupOperation, TutorialProgress), regenerar Prisma y ejecutar su matriz de registro, móvil, recuperación, duplicados, permisos y proveedor caído sobre una base independiente.

No se presenta el onboarding separado como integrado o aprobado. El historial de QA descrito en su documento no se cuenta como ejecución de Auditoría 07. La persistencia de tutoriales de RC1 sigue siendo por navegador; el progreso durable por usuario/negocio/versión corresponde a esa implementación existente, no se duplicó aquí.

## 11. Dependencias de desarrollo

El audit completo informa **23 paquetes** (21 moderados, 2 bajos), derivados de cuatro avisos raíz; no son 23 vulnerabilidades productivas distintas. Sus **30 ubicaciones instaladas** están marcadas `dev` en el lock. `npm audit --omit=dev` devuelve cero y no se encontraron imports de estas herramientas de desarrollo en los flujos productivos auditados. `package.json` y `package-lock.json` permanecen intactos.

| Familia / impacto en desarrollo | Paquetes afectados | Mantenimiento recomendado |
| --- | --- | --- |
| Vitest/mocker: registro de mocks inyectable y traversal Windows si se expone un servidor de desarrollo vulnerable | `vitest`, `@vitest/mocker` | Alinear el conjunto con 4.1.12 o una versión compatible corregida; [inyección](https://github.com/advisories/GHSA-qxg6-89mg-rqv8), [traversal](https://github.com/advisories/GHSA-xp26-3454-mjgp). Las pruebas de esta auditoría usan CLI y loopback |
| Glob amplification/consumo CPU-memoria en tooling | `minimatch`, `eslint`, `eslint-config-next`, `@next/eslint-plugin-next`, `@eslint-community/eslint-utils`, `@eslint/config-array`, `@eslint/eslintrc`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@typescript-eslint/type-utils`, `@typescript-eslint/typescript-estree`, `@typescript-eslint/utils`, `typescript-eslint`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react`, `@ts-morph/common`, `ts-morph`, `shadcn` | Actualizar padres compatibles que resuelvan `minimatch >=11.0.1`; [aviso](https://github.com/advisories/GHSA-g3hv-75wg-m249). No imponer overrides o downgrades incompatibles sugeridos automáticamente |
| Prototype poisoning en generación/registry | `deepmerge`, `@shadcn/registry` | El [aviso](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) no publica parche para el rango 4.2.0–4.3.1; actualizar/sustituir el padre cuando elimine esa transitiva y validar el generador |

No se ejecutó `npm audit fix`, ni `--force`, ni una actualización masiva. La eliminación de estos avisos queda fuera de esta auditoría funcional y requiere una tarea de mantenimiento separada.

## 12. Migraciones y despliegue

**Cero cambios de esquema y cero migraciones nuevas.** El árbol `prisma/` es idéntico a la base; no se aplicó nada remotamente. Las migraciones 03/04 conservan exactamente sus blobs:

| Migración | Blob Git en base y entrega |
| --- | --- |
| `20261029180000_preserve_service_staff_history/migration.sql` | `63cebb2732fd518ee7cb87c01f2c4a46c6ddc523` |
| `20261030120000_client_portal_privacy/migration.sql` | `c0e996f45cd040f64b98053428357d870a97fabf` |

La rama exacta aparece con `false` en `vercel.json → git.deploymentEnabled`, se rechaza antes de build/migraciones en `scripts/vercel-build.mjs` y está excluida por ref/head_ref en ambos jobs de `security.yml`. Se preservan las exclusiones anteriores. Las automatizaciones versionadas inspeccionadas no invocan una API de deploy ni un Deploy Hook al publicar esta rama. Los 32 casos de protección incluyen push, dispatch y PR.

No se publicó la rama, no hay nueva ejecución de Actions solicitada por esta tarea y no se consultó/modificó la configuración remota de Vercel. No se afirma una ausencia global de despliegues de terceros que no se inspeccionó. Ningún Deploy Hook se invocó. Los servidores/clusters QA propios se detienen al finalizar; los artefactos permanecen ignorados para diagnóstico.

## 13. Riesgos residuales y condiciones de lanzamiento

- Pendientes 07-20/21: política de retención y mantenimiento de dependencias de desarrollo.
- Certificar cuenta/modelo Responses, tarifas, snapshots y asignaciones comerciales antes de habilitar gasto real; las pruebas no certifican cuotas ni disponibilidad productivas.
- Legacy sin presupuesto explícito queda sin transporte IA. Preparar sus asignaciones aprobadas antes de lanzar el cambio; no deducirlas del precio de suscripción.
- Los resúmenes factuales son más estructurados que la prosa del modelo. Español e inglés tienen plantillas; otros locales usan el fallback inglés del resumen, mientras las tarjetas conservan sus etiquetas localizadas. Revisar copy/localización antes del lanzamiento multilingüe; no se certificó equivalencia lingüística completa.
- El CRM agregado por sucursal necesita soporte canónico antes de delegarlo mediante Puri a empleados. El bloqueo actual es conservador y explícito.
- Onboarding V2 requiere su propia adaptación/revisión e integración separadamente autorizada. Sus pruebas no se ejecutaron aquí.
- MCP público no verifica identidad del reservante solo por consentir discovery; mantener la escritura pública cerrada salvo un lanzamiento separado con sus controles.
- PostgreSQL usa validación efectiva después de los locks y antes de responder; esto no se presenta como una transacción serializable universal de todos los sistemas externos. No hay certificación de proveedores, dispositivos reales, WCAG completa o producción.

## 14. Archivos de la entrega

Inventario de **46 archivos distintos**, incluido este único informe:

```text
.github/workflows/security.yml
docs/puragenda-next/35-auditoria-07-puri-mcp-onboarding-2026-11-01.md
scripts/scan-audit07-secrets.mjs
scripts/test-audit-07-browser.mjs
scripts/test-audit-07.mjs
scripts/test-audit07-dashboard-browser.mjs
scripts/test-audit07-puri-http.mjs
scripts/test-commercial-postgres.mjs
scripts/vercel-build.mjs
src/app/api/dashboard/puri/route.ts
src/components/dashboard/contextual-help.tsx
src/components/dashboard/guided-help-runtime.ts
src/components/dashboard/puri-assistant.tsx
src/components/dashboard/puri-plus/workspace.tsx
src/components/dashboard/tutorial.tsx
src/server/booking/idempotency.ts
src/server/mcp/access.ts
src/server/mcp/operations.ts
src/server/mcp/public.ts
src/server/mcp/read-tools.ts
src/server/mcp/rollout.ts
src/server/puri/authorization.ts
src/server/puri/commercial-usage.ts
src/server/puri/context.ts
src/server/puri/growth/access.ts
src/server/puri/growth/analysis.ts
src/server/puri/growth/http.ts
src/server/puri/growth/monitoring.ts
src/server/puri/growth/runtime.ts
src/server/puri/orchestrator.ts
src/server/puri/tools.ts
src/server/puri/types.ts
src/server/puri/verified-answer.ts
src/server/services/appointment.service.ts
tests/integration/audit07-access-postgres.integration.test.ts
tests/integration/audit07-runtime-postgres.integration.test.ts
tests/integration/puri-growth-postgres.integration.test.ts
tests/server/audit07-orchestration.test.ts
tests/server/mcp.postgres.integration.test.ts
tests/server/puri-growth.orchestrator.test.ts
tests/server/puri-growth.route.test.ts
tests/server/puri.context.test.ts
tests/server/puri.orchestrator.test.ts
tests/server/puri.route.test.ts
tests/server/rc1-deployment-safety.test.ts
vercel.json
```

No se añadieron imágenes, credenciales, capturas temporales, manifests de sesiones, datos de prueba ni informes alternativos a Git.

## 15. Reproducción y cierre de Git

Los comandos siguientes se ejecutan desde el worktree aislado, nunca contra producción. `init` crea únicamente un cluster propio en `127.0.0.1:55447`; los runners rechazan env files ambientales y URLs remotas. `prepare/staging` generan otra copia/basedatos local con secretos ficticios y salida a proveedores bloqueada. Playwright es una dependencia opcional de QA externa al producto, configurable con `AUDIT07_BROWSER_MODULES`.

```powershell
node scripts/test-audit-07.mjs init
node scripts/test-audit-07.mjs general
node scripts/test-audit-07.mjs commercial
node scripts/test-audit-07.mjs booking
node scripts/test-audit-07.mjs mcp
node scripts/test-audit-07.mjs legacy
node scripts/test-audit-07.mjs verify
node scripts/test-audit-07.mjs build
node scripts/test-audit-07.mjs prepare
node scripts/test-audit-07.mjs staging
# En otra terminal del mismo worktree, con staging listo:
node scripts/test-audit-07.mjs http-bootstrap
node scripts/test-audit-07.mjs http-general
node scripts/test-audit-07.mjs http-agenda
node scripts/test-audit-07.mjs http-services
node scripts/test-audit-07.mjs http-clients
node scripts/test-audit-07.mjs http-billing
node scripts/test-audit-07.mjs http-websites
node scripts/test-audit07-puri-http.mjs
node scripts/test-audit-07-browser.mjs
node scripts/test-audit07-dashboard-browser.mjs
node scripts/scan-audit07-secrets.mjs
node scripts/test-audit-07.mjs stop
```

Reservas y MCP comparten la base auxiliar del harness: ejecutarlos secuencialmente. Las suites comerciales serializan archivos que comparten política global; la concurrencia adversarial ocurre dentro de cada caso. No se espera red productiva para repetir pruebas. Las lecturas de documentación, Git remoto, registro npm y fuentes públicas de build se distinguen de llamadas de proveedores del producto.

Los commits previos al cierre documental son `ee9c635` (protecciones), `8c2970a` (permisos/sucursal), `519e1bc` (escritura MCP tras lock), `1073c89` (consentimiento multi-negocio), `4964e64` (costos/evidencia/autorización), `59e608b` (ayuda) y `cb3593e` (QA). La rama queda limpia, local y congelada con este informe para revisión independiente. RC1 y onboarding permanecen en sus SHA anteriores; no se declara integración, publicación ni lanzamiento de Auditoría 07.
