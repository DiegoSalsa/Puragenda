# Puri Setup y aprendizaje V2

Implementación aislada en `feature/puri-onboarding-v2`, basada en `release/puragenda-next-rc1` (`f1955336`). Worktree: `C:/Users/diego/.codex/worktrees/puri-onboarding-v2/agenda`. No se integra a main ni se despliega. Los cambios sin confirmar del workspace original no se copian ni se modifican.

## Arquitectura e inventario previo

El registro real es `RegisterForm → /api/auth/register → registerUser`. Ya crea el negocio, el perfil del propietario, la sucursal principal, horarios iniciales y el contrato comercial de prueba. Se reutilizan esos datos: Setup no recrea el profesional ni el catálogo comercial. Las cuentas nuevas reciben una fila BusinessSetup en esa misma transacción. Al entrar en Hoy continúan Setup hasta terminar o elegir Guardar y salir. Ningún negocio anterior sin esa fila se redirige automáticamente.

Inventario de ayuda encontrado:

| Sistema existente | Cobertura | Activación y persistencia previa | Tratamiento V2 |
| --- | --- | --- | --- |
| DashboardTutorial, Driver.js | Bienvenida, navegación, área de trabajo, widget | localStorage `hasSeenTutorial_general`; componente sin montaje en el layout actual | No se reactiva ni superpone a Setup |
| PageTutorial | 11 declaraciones: agenda, analítica, clientes, apariencia personalizada, marketing, reservas recurrentes, servicios, recompensas, referidos, profesionales, configuración | Componente deliberadamente desactivado (`return null`), sin avance efectivo | Se conserva su compatibilidad; no se vuelven a lanzar recorridos automáticos duplicados |
| ContextualHelpButton, Driver.js | 19 definiciones: Hoy, Agenda, Google Calendar, Encargos, Analítica, roles, profesionales, servicios, clientes, recurrentes, fidelización, marketing, historias, editor visual, temas, referidos, recompensas, configuración, novedades | Botón manual; sin progreso de servidor ni versiones. Algunos pasos usaban `button`, `table`, textos de placeholder y clases como alternativas | Las rutas prioritarias abren Aprende con Puri; las guías secundarias manuales existentes se conservan |
| PuriAssistant | Panel contextual, ruta y sucursal actuales, tools autorizadas, cuotas, telemetría, feedback | Orquestador real de Responses y herramientas propias | Se conserva. Un adaptador determinista recomienda las mismas guías autorizadas antes de llamar al modelo |

Catálogo V2: Hoy, gestionar reservas, agregar profesionales, crear servicios, días/pausas, cerrar un día, clientes, registrar un cliente desde su primera cita, pagos/abonos, configuración, sitio web y Puri. Son 12 guías de dos o tres pasos; las 11 originales mantienen versión 2 y la nueva `client-booking` empieza en versión 1. Sitio web exige `website.editor`; el resto filtra permisos concretos. Las guías de cobros y cancelación nunca ejecutan esas acciones como demostración.

Se añaden anclas semánticas a los controles reales y eventos de apertura de formularios y guardado de horarios. Las guías esperan al montaje del control (máximo cinco segundos) y descartan arranques pendientes al cambiar de ruta. Si un control no está disponible, el paso conserva su explicación sin destacar un botón arbitrario. El tutorial de cerrar un día utiliza el editor de excepciones por fecha que ya existía. El resaltado se actualiza también al desplazar contenedores internos del dashboard. Se protege el icono de cierre frente a eventos de hover posteriores al desmontaje de un panel.

## Persistencia y autorización

La migración aditiva `20261031200000_puri_setup_learning_v2` añade tres tablas:

- `BusinessSetup`: estado general del negocio, modo independiente/equipo, rubro reutilizado del registro, paso, borradores, revisión, pausa, comprobación, finalización, enlace copiado y ayuda ocultada. No almacena porcentajes.
- `SetupOperation`: clave de operación, hash del contenido y resultado mínimo por negocio. Permite reintentar una respuesta perdida sin duplicar servicios o profesionales.
- `TutorialProgress`: negocio + usuario + guía + versión. Conserva paso, revisión y estado activo/pausado/completado. Cerrar una guía no la completa; repetirla es explícito.

Las tablas tienen RLS habilitado y ningún permiso para PUBLIC, anon o authenticated. Se accede exclusivamente desde el servidor con las sesiones firmadas existentes. Cada petición vuelve a resolver el negocio y los permisos; el cliente nunca decide el businessId. Setup requiere configuración, profesionales y servicios. Las escrituras validan el origen, el tamaño y el contenido. Las referencias a sucursales, profesionales y servicios se comprueban dentro del negocio.

Las mutaciones bloquean la fila Business con el mismo bloqueo usado por la capacidad profesional y verifican una revisión optimista. Una edición desde otro dispositivo produce conflicto visible en lugar de sobrescribir. La creación, la asociación y el avance quedan en una sola transacción. Los borradores se sincronizan mientras se edita; Guardar y salir espera su guardado antes de abandonar.

## Reutilización funcional

- El editor real BusinessHoursEditor admite callbacks de guardado y borrador. Configuración y Setup comparten writeBusinessHours.
- Servicios y Setup comparten ServiceIdentityFields, serviceSchema y createService. El servidor no inventa duración ni precio. No se permiten nombres duplicados desde Setup.
- createStaff conserva su control de capacidad y asociación a sucursales; admite una transacción existente. Agregar una ficha desde Setup no crea credenciales ni envía invitaciones.
- Los horarios de los profesionales se copian solo tras confirmación explícita, dentro de una sucursal asignada. Los demás horarios no se alteran silenciosamente.
- El catálogo actual representa a los profesionales sin selección específica de servicios como disponibles para todos los servicios. La interfaz explica esa regla; las asociaciones usan esa semántica real.
- Límites y capacidades proceden de getStaffLimitInfo / getCommercialPlanAccess y contratos vigentes. No se duplican reglas de precios ni se cambia checkout, facturación o suscripciones.

## Comprobación, activación y Puri

Setup llama loadBookingContext / getBookingAvailability, el mismo motor del endpoint público: respeta servicios activos, modalidades, sucursales, profesionales, pausas, excepciones, bloqueos, citas existentes y calendarios externos autorizados. Busca hasta 14 días o una fecha específica dentro del horizonte público. Las opciones obligatorias de servicios existentes se seleccionan antes de comprobar.

Se guarda evidencia vinculada a una huella de catálogo/horarios; cambiar la configuración invalida la comprobación. Finalizar vuelve a consultar disponibilidad y contrasta la evidencia. Elegir un horario de prueba nunca crea una reserva ni una operación de pago. La vista previa abre el widget real en otra pestaña: no simula una publicación inexistente.

Hoy recibe una tarjeta complementaria discreta. Distingue configuración pendiente, enlace sin copiar, ausencia de reservas y una primera reserva observada. Cuenta reservas reales; no presume que se recibieron ni atribuye causas técnicas a su ausencia. La ayuda se puede ocultar y deja de aparecer con uso habitual. No se rediseña TodayScreen.

Puri recomienda tutoriales por ID desde el catálogo compartido y entrega enlaces controlados por el servidor. El usuario decide iniciarlos. Las preguntas de estado de configuración leen el negocio autorizado. Esta orientación y todo Setup funcionan sin OpenAI. Las consultas analíticas generales conservan el orquestador, cuotas y políticas existentes. Las propuestas conversacionales solo preparan datos; las escrituras continúan siendo comandos explícitos de Setup.

## Segunda iteración: auditoría y cambios

La auditoría confirmó registro, borradores, permisos, capacidad, creación real de fichas/servicios, motor de disponibilidad y finalización funcionales. Conservamos esos componentes y la dirección visual. Faltaban preparación conversacional, prioridad frente a promociones, búsqueda/categorías y coordinación de paneles. También se corrigió una carrera del autoguardado que podía restaurar el paso anterior.

La conversación integrada envía paso, sucursal y revisión al mismo `/api/dashboard/puri`. Reconoce de forma determinista las instrucciones acotadas del brief y muestra **Modo determinista · sin IA**. Si dispone de credenciales, las demás expresiones pasan al mismo orquestador Responses, modelo, cliente, límites y registro de consumo de Puri. Solo se habilita una herramienta estricta de preparación por paso; Zod valida su resultado y los nombres deben estar presentes en la petición. No hay nuevas herramientas de escritura del modelo. Timeout, cuota o proveedor fallido devuelven un modo determinista identificado; el editor manual sigue disponible.

Revisar en el editor guarda únicamente el borrador. Guardar horarios, Continuar, Agregar profesional, Crear servicio o Confirmar corrección ejecutan la operación real, con revisión e idempotencia existentes. Las listas propuestas conservan los nombres pendientes y exigen precio/duración de cada servicio. Las correcciones de horario profesional o asociación leen el catálogo autorizado y necesitan otra confirmación. Los diagnósticos estructurados señalan el paso a corregir; archivar todos los servicios invalida la activación. No se añade una migración en esta iteración.

Aprende con Puri muestra hasta cuatro guías pertinentes a la pantalla, módulos y búsqueda global, con estados de continuar/completada/reiniciar. Se revisaron especialmente cerrar un día, servicios y cliente/primera cita: selectores dinámicos, eventos tras montaje del formulario, pausa/reanudación y progreso de servidor. Puri, centro de guías y recorridos heredados comparten exclusión de paneles. Setup usa la conversación integrada y las promociones esperan hasta completar la configuración, incluso después de una pausa voluntaria.

La instrumentación usa el registro existente de eventos y su consentimiento/filtrado de propiedades: inicio, reanudación, pausa, paso guardado, agenda comprobada, enlace copiado y tutorial iniciado/completado. Solo admite IDs de paso/guía y versión; no conversaciones, nombres, correos ni precios.

## Demo local y comandos

Servidor de revisión: `http://localhost:3116/login`, puerto 3116, escucha exclusivamente en loopback. Base PostgreSQL independiente: `puragenda_commercial_test_onboarding`. El runner rechaza otro nombre, hosts remotos y NODE_ENV=production. No lee archivos .env del workspace original. Suprime correos, claves de IA y proveedores de pago. Solo `--ai --serve` permite usar OPENAI_API_KEY proporcionada explícitamente por el entorno; no se utilizó para esta validación.

Desde este worktree:

```powershell
node scripts/onboarding-local.mjs --iteration2 --prepare
node scripts/onboarding-local.mjs --serve
```

Cuentas ficticias, todas con contraseña local `PuriDemo2026!`:

| Cuenta | Uso |
| --- | --- |
| solo2@puri-demo.invalid | Inicio limpio, independiente, un profesional concedido |
| equipo2@puri-demo.invalid | Inicio limpio, prueba Plus, tres profesionales concedidos |
| existente2@puri-demo.invalid | Negocio previo con servicio y horarios; entra directamente a Hoy |

Las cuatro cuentas originales (`solo`, `equipo`, `existente`, `profesional` en el mismo dominio) se mantienen para compatibilidad de QA. La última conserva permisos limitados y recibe 403 en Setup.

Para reiniciar solamente estas cuentas ficticias y sus negocios:

```powershell
node scripts/onboarding-local.mjs --iteration2 --reset --prepare
```

El runner usa el despliegue de migraciones local ya existente, incluida la nueva migración. Una instalación integrada debe aplicar la migración antes de servir el código y regenerar Prisma. No ejecutar estos comandos contra producción.

## Verificación reproducible

```powershell
node node_modules/next/dist/bin/next typegen
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run --exclude 'tests/integration/**' --reporter=dot
node scripts/onboarding-local.mjs --test
node --import tsx scripts/onboarding-browser-qa.mjs
```

Playwright es una herramienta de QA opcional fuera del producto, en `C:/Users/diego/.codex/tools/puri-onboarding-qa`. El script admite ONBOARDING_QA_MODULES y usa Edge. Los artefactos actuales quedan fuera de Git en `C:/Users/diego/.codex/artifacts/puri-onboarding-v2-iteration2`, incluyendo browser-results.json y capturas reales; los anteriores permanecen en `puri-onboarding-v2`. Las cuentas creadas por esa prueba son ficticias y están solo en la base local.

Regresión general de la segunda iteración: **259 archivos y 1.844 pruebas aprobadas; 6 archivos y 170 pruebas omitidas** por condiciones de entorno de la suite original. No se cuentan como aprobadas. Integración: **17 escenarios aprobados contra PostgreSQL real**, incluyendo propuestas sin escritura, confirmación, reparación de asociaciones y activación invalidada tras archivar servicios, además de revisiones, aislamiento y reintentos.

| Escenario Playwright | Resultado ejecutado |
| --- | --- |
| A · Independiente | Registro por UI, Setup automático sin promociones, tres servicios confirmados, disponibilidad real, widget público, copiar enlace, finalizar y recargar Hoy |
| B · Equipo | Dos profesionales con horarios y servicio compartido; no se supera la capacidad concedida |
| C · Lenguaje natural | Días/colación/sábado en el editor; solo borrador hasta confirmar el guardado real |
| D · Recuperación | Guardar y salir, logout, login por UI en otra sesión móvil, mismo borrador de servidor |
| E · Tutorial contextual | Puri inicia cerrar un día y cliente/primera cita; servicios permite completar, pausar, retomar y reiniciar; búsqueda, teclado y panel único |
| F · Cuenta existente | Entra en Hoy sin forzar Setup |
| G · Disponibilidad incompleta | Puri lee la ausencia real de servicio y enlaza al paso correcto |
| H · Fallo de ayuda | Corte del transporte Puri con error visible y guardado manual funcional; timeout/cuota del proveedor cubiertos aparte con dobles de prueba |

Los ocho escenarios, permisos limitados y revisión responsive suman **10 grupos aprobados en la misma ejecución**, con cero excepciones del navegador y cero citas ficticias creadas por las guías. El resultado exacto está en browser-results.json. La compilación optimizada, la generación de 164 páginas y TypeScript finalizaron correctamente; ESLint no presenta errores en los cambios.

## Límites de la demostración

No se ejercitan cobros, correo, Google Calendar remoto, publicación de sitio web ni el proveedor OpenAI real. La demo utiliza interpretación determinista explícita. El adaptador de IA, sus herramientas, validación de nombres, errores, timeout y cuotas se prueban con dobles de prueba; falta validarlo con credenciales reales. En navegador se interrumpe el transporte de Puri para comprobar el error visible y el guardado manual; eso no se presenta como una llamada externa real.

No se ejecutan compras, ampliaciones de plan, invitaciones ni contrataciones para enseñar una función. Los módulos avanzados siguen siendo opcionales. Las guías secundarias heredadas conservan su recorrido manual anterior; el catálogo V2 concentra la persistencia y la integración con Puri en los módulos prioritarios.

## Archivos de esta implementación

- `AGENTS.md`
- `docs/puragenda-next/onboarding-v2.md`
- `prisma/migrations/20261031200000_puri_setup_learning_v2/migration.sql`
- `prisma/schema.prisma`
- `scripts/onboarding-browser-qa.mjs`
- `scripts/onboarding-local.mjs`
- `scripts/onboarding-seed.ts`
- `src/app/api/dashboard/learning/route.ts`
- `src/app/api/dashboard/puri/route.ts`
- `src/app/api/dashboard/setup/route.ts`
- `src/app/dashboard/appointment-editor.tsx`
- `src/app/dashboard/clients/clients-table.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/services/services-client.tsx`
- `src/app/dashboard/settings/business-hours-editor.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/app/dashboard/setup/page.tsx`
- `src/app/dashboard/setup/setup-client.tsx`
- `src/app/dashboard/staff/staff-list.tsx`
- `src/app/dashboard/weekly-calendar.tsx`
- `src/app/register/register-form.tsx`
- `src/components/dashboard/changelog-popup.tsx`
- `src/components/dashboard/contextual-help.tsx`
- `src/components/dashboard/learning-provider.tsx`
- `src/components/dashboard/puri-assistant.tsx`
- `src/components/dashboard/puri-session.ts`
- `src/components/dashboard/setup-conversation.tsx`
- `src/components/dashboard/dashboard-overlay-context.tsx`
- `src/components/dashboard/service-identity-fields.tsx`
- `src/components/dashboard/setup-activation-card.tsx`
- `src/components/dashboard/sidebar.tsx`
- `src/components/icons/itshover/x-icon.tsx`
- `src/core/onboarding.ts`
- `src/core/setup-proposals.ts`
- `src/core/tutorials.ts`
- `src/lib/analytics/events.ts`
- `src/server/actions/dashboard.actions.ts`
- `src/server/actions/setup.actions.ts`
- `src/server/onboarding/service.ts`
- `src/server/onboarding/diagnostics.ts`
- `src/server/onboarding/tutorial-service.ts`
- `src/server/puri/learning.ts`
- `src/server/puri/setup.ts`
- `src/server/puri/orchestrator.ts`
- `src/server/puri/types.ts`
- `src/server/services/auth.service.ts`
- `src/server/services/business-hours.service.ts`
- `src/server/services/service.service.ts`
- `src/server/services/staff.service.ts`
- `tests/core/onboarding.test.ts`
- `tests/core/setup-proposals.test.ts`
- `tests/server/puri-setup.test.ts`
- `tests/seo-expansion-batch-01.test.ts`
- `tests/integration/onboarding-postgres.integration.test.ts`
