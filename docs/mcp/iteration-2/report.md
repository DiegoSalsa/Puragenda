# Puragenda × ChatGPT — resultado de la iteración 2

17 de octubre de 2026 · conector 1.0.1 · baseline `76c9c44`.

**Estado de conexión con ChatGPT real: BLOQUEADO.** La pestaña autenticada se
intentó vincular con la herramienta de navegador; devolvió
`Local browser use is disabled in Work settings`, incluso después de que el
usuario avisó que estaba habilitada. No se pudo manejar ChatGPT/Platform ni
comprobar sus permisos. No hubo conversaciones, OAuth originado en ChatGPT,
alta de plugin, tool scan ni nuevas capturas de navegador en esta iteración.
No se atribuye el bloqueo al plan, login ni permisos de cuenta no observados.

Se completaron correcciones y una integración real por HTTPS con el **cliente
MCP oficial**, sobre datos ficticios en PostgreSQL desechable: OAuth DCR/PKCE,
descubrimiento y ejecución de las 30 herramientas y verificaciones guionadas
A–J. Esta evidencia no equivale a selección ni conversación de ChatGPT.

## 1. Conexión y método de acceso

| Clasificación | Resultado |
| --- | --- |
| **VALIDADO EN CHATGPT REAL** | Ninguna prueba completada. |
| **VALIDADO MEDIANTE CLIENTE MCP** | 30 herramientas por HTTPS; OAuth y llamadas reales con SDK 1.32.1. Inspector 2.11.0 descubrió 30. |
| **VALIDADO LOCALMENTE** | Seguridad, migración, 28 pruebas MCP/OAuth, regresión general/PostgreSQL, build, manifiestos/ZIP y schema vigente. |
| **PENDIENTE DE ACCESO EXTERNO** | Control de navegador, cliente ChatGPT, builder/importer, tool scan, demo, identidad/dominio y revisión pública. |

Se investigó primero Secure MCP Tunnel. Su acceso en la cuenta sigue desconocido:
no había credenciales API configuradas ni acceso de automatización al portal.
Requiere permisos de organización, runtime key y asociación al workspace; no
expone automáticamente el Authorization Server. No se creó un túnel oficial.

Se utilizó la tercera alternativa autorizada: Cloudflare Quick Tunnel del
servidor Next completo, con build de producción y `next start` en loopback.
Origen verificado: `https://acer-identifier-gray-nations.trycloudflare.com`;
MCP: `/mcp`, issuer y login/consent/token en ese mismo origen. Es temporal,
sin garantía de uptime; no constituye despliegue productivo ni hosting para
revisión pública permanente. El binario oficial 2026.10.1 se verificó contra
su digest publicado: `4d2490e74082c5d48dbfedaf92576fa5bd1702379ab88eb7faa0cfbe8dc891b6`.

El runner rechaza hosts SQL que no sean loopback y cualquier base distinta de
`puragenda_booking_api_test`. Crea un schema único y reproduce el SQL MCP real;
lo elimina al finalizar. No carga `.env`, genera secretos/contraseñas nuevos,
desactiva email y no conecta proveedores reales. Las credenciales quedan en
un archivo local ignorado, nunca en la evidencia o ZIP.

## 2. Autenticación

**OAuth real desde ChatGPT: no ejecutado.** **OAuth HTTPS mediante SDK: PASS**:
metadata pública exacta, login normal de cuenta ficticia, selección de negocio
en POST de consentimiento con cookie/CSRF, DCR, state/iss, Authorization Code
y PKCE S256, token de 600 segundos, perfil estable al reconectar y revocación
seguida de HTTP 401. El script no abre ventanas de navegador: obtiene el código
de la redirección del fixture e intercambia el token como cliente de pruebas.

Refresh rotatorio, replay, expiración de código/token/operación, audience,
scopes y aislamiento están cubiertos por las integraciones locales. La espera
de expiración, refresh y UX de reconexión de ChatGPT quedan pendientes. DCR se
probó; CIMD no se anuncia ni se pudo observar como requisito del cliente real.
No se relajaron PKCE, redirects, CSRF, issuer ni resource.

## 3. Herramientas

**30/30 descubiertas y probadas por SDK**, con entradas estrictas,
`structuredContent`, perfil estable y auth por herramienta. Inspector descubrió
el mismo conjunto por HTTPS. **0/30 verificadas dentro de ChatGPT**.
Las descripciones/argumentos seleccionados por el modelo no se evaluaron.

[Justificación individual](tool-annotations.md) de R/D/O, auth, scope,
descripción, entradas y salidas; [descriptores exactos](evidence/tools.json).
Las 18 lecturas privadas, 6 escrituras privadas y 6 públicas conservaron sus
nombres y contratos. No se modificó la arquitectura ni se eliminaron funciones
de Puri.

## 4. Escenarios y evidencias

[A–J y pruebas indirectas/seguimiento/negativas](reviewer-guide.md#evaluación-aj)
distinguen cada resultado guionado de la conversación pendiente. No hay
escenarios de ChatGPT aprobados o fallidos: no pudieron ejecutarse.

El SDK verificó negocio conectado, 2 citas de mañana en principal, 14 slots del
viernes para un servicio de 60 minutos, 70.000 CLP de valor de citas frente a
5.000 cobrados y 65.000 pendientes, servicio principal con 3 reservas frente a
1 previa, creación sólo tras aprobación, replay sin duplicar, reprogramación,
cancelación, rechazo de acceso ajeno/profesional limitado, reserva pública
gratuita controlada y revocación. Fechas/cifras son del fixture antes de sus
mutaciones, no de clientes reales ni de todas las sucursales combinadas.

[Registro SDK](evidence/https-client.json) marca `realChatGPT=false` y
`selectionSource=scripted`. Conserva herramientas/argumentos saneados y claves
de respuesta, sin tokens, cookies, contacto completo, recibos ni contraseñas.
[Fixture](evidence/fixture.json), [bloqueo externo](evidence/browser-access.json)
y [controles finales](evidence/checks.json) completan la evidencia.
No se reutilizan capturas de la iteración 1 como prueba de esta ejecución.

## 5. Correcciones y seguridad

- Challenges incompletos: se añadieron `error` y `error_description` junto a
  metadata/scope en HTTP `WWW-Authenticate` y `_meta["mcp/www_authenticate"]`.
  Era un requisito actual para que el cliente ofrezca el flujo OAuth. Se prueban
  `invalid_token` e `insufficient_scope`; la activación efectiva en ChatGPT aún
  no se observó.
- Anotaciones: creación privada marca openWorld=true por destinatarios de email;
  confirmación pública marca destructive=true por efectos irreversibles. Las
  preparaciones siguen siendo escrituras de estado sin efectos de cita. Los
  calendarios privados conectados conservan ámbito cerrado.
- Reserva pública: flag servidor apagado por defecto, también en capacidades
  del catálogo y revalidado al ejecutar. Opt-in no basta para habilitarla. La
  aprobación no demuestra identidad; no habilitarla para público general todavía.
- Abuso: límites compartidos de 30 preparaciones/negocio/hora, 5/email y
  5/teléfono normalizado por negocio/hora; 60 consultas de disponibilidad pública
  por negocio/minuto, además de cuotas IP existentes. Replay de preparación no
  consume otra vez los cupos nuevos. Claves almacenadas como hashes.
- Fixture externo: contraseñas/secretos aleatorios, servidor de producción,
  proveedores desconectados y evidencia saneada; se eliminó de las instrucciones
  el antiguo password fijo de revisión local.

Riesgos pendientes: identidad pública insuficiente, agotamiento de cupo por
contactos falsos, configuración confiable de IP en proxy, efectos reales de
proveedores no certificados y revisión legal/retención. El audit de producción
tiene cero vulnerabilidades; el completo conserva nueve high heredadas de
herramientas de desarrollo. No se aplicaron downgrades incompatibles para
ocultarlas. [Detalles de seguridad](../security.md).

## 6. Publicación y compatibilidad

**Paquete validado localmente; aún no listo para envío público.** ZIP
`dist/puragenda-plugin-1.0.1.zip`; SHA-256
`c3444aaca3f18e3aa81f8c64640aba23ce431c095f450bb0402172cabf3c9d5e`.
La versión 1.0.0 se conserva como distribución histórica.

Listing actualizado, marca/iconos existentes, categoría Productivity, soporte,
privacidad/términos, cinco positivos/tres negativos, justificaciones, fixture,
instrucciones y guion de demo preparados. No hay video grabado, URL de demo,
identificador de registro, dominio verificado ni resultado de scan inventados.
No se envió a revisión ni se anuncia aprobación OpenAI.

Se volvió a descargar el schema MCP oficial: el manifiesto portátil pasa; la
extensión de auth documentada por OpenAI sigue fallando `additionalProperties`.
[Prueba positiva/negativa y procedimiento](schema-compatibility.md). La vía de
prueba por URL configura Mixed/DCR aparte. La importación real del ZIP sigue
pendiente: el schema válido no prueba su interpretación de autenticación.

## 7. Regresiones finales

| Control | Resultado |
| --- | --- |
| `npm ci --no-audit` | PASS, 831 paquetes; lockfile sin cambios. Primer intento EPERM por DLL abierta; se detuvo sólo el preview propio y se completó la instalación limpia. |
| `prisma generate` / `prisma validate` | PASS, Prisma 7.10.0. |
| `npm run typecheck` | PASS, cero errores. |
| `npm run lint` | PASS, cero errores y 32 advertencias heredadas. |
| Integridad de traducciones tras ajustar es/en | PASS, 4 pruebas, cero fallos. |
| `npm test` | 1.269 aprobadas, cero fallos, 105 omitidas; 196 archivos aprobados/5 omitidos. |
| `npm run test:mcp:local` | 28 aprobadas, cero fallos: 7 contratos/seguridad y 21 integraciones. |
| `node scripts/test-booking-api-local.mjs --all` | 1.290 aprobadas, cero fallos, 84 omitidas; 198 archivos aprobados/3 omitidos. |
| Build de producción aislado | PASS, Next 16.3.8; fixture PostgreSQL y proveedores de prueba. |
| Cliente oficial SDK HTTPS | PASS, OAuth y 30/30 herramientas; escenarios guionados A–J. |
| MCP Inspector 2.11.0 CLI | PASS, tools/list HTTPS con 30 descriptores. |
| Plugin y ZIP 1.0.1 | PASS, schemas/listing/assets/skill/casos 5+3 y ZIP íntegro. |
| Schema remoto recién descargado | PASS manifiesto portátil; rechazo comprobado de extensión documentada. |
| `npm audit --omit=dev` / completo | 0 producción / 9 high de desarrollo heredadas. |
| Navegador y ChatGPT real de esta iteración | BLOQUEADOS por la herramienta; no se cuentan como PASS. |

El baseline tenía 25 MCP/OAuth; se añadieron tres integraciones: todas las 30
herramientas por SDK HTTP, flag público/revalidación y cuotas por contacto/replay.
También se reforzaron asserts existentes de challenges/anotaciones y límite de
disponibilidad. Ahora son 28. Las tres integraciones nuevas son opt-in y por eso
aumentan las omitidas de 102→105 (general) y 81→84 (`--all`). Las aprobadas con
PostgreSQL permanecen en 1.290; no se quitó cobertura ni se redujeron tests.
El caso nuevo de 30 RPC tiene timeout propio de 30 s; los límites anteriores
permanecieron. Las suites con schemas desechables se ejecutaron en secuencia.

Inspector se ejecutó con config explícita del fixture y `--stored-auth-only`:
discovery anónimo, no exportación de tokens. El primer intento CLI combinaba
opciones incompatibles y se corrigió; la ejecución final pasa. Una advertencia
de lock del caché OAuth local no impidió discovery ni creó credenciales.

## 8. Git y alcance

Rama `feature/puragenda-chatgpt-mcp`, worktree
`C:/Users/diego/Desktop/agenda-chatgpt-mcp`, base inicial `76c9c44`.
Commits agrupados en correcciones del servidor, fixture/pruebas y material de
revisión/paquete. El HEAD final y confirmación de push se entregan en el cierre
del chat; se obtienen con `git rev-parse HEAD` y `git ls-remote`.

Main local conservado en `a3d90a652268e7770dd0c53cac2786d6e5bf63e7`;
`origin/main` inspeccionado en `685de216bf4cc65be6eef71069217ad8903cbe93`.
No se hizo merge, migración/despliegue productivo ni modificación de reservas
reales. El worktree original y sus cambios de otros trabajos no se tocaron.
No cambió el schema/migraciones ni se modificó la integración Paddle.

## 9. Acciones externas estrictamente pendientes

1. Restablecer el control de navegador de Work y ejecutar el alta oficial custom
   MCP con URL HTTPS, Mixed/DCR; probar OAuth y A–J en la sesión real ya iniciada.
   [Procedimiento y criterios exactos](reviewer-guide.md).
2. Confirmar en el cliente real refresh/expiración/revocación, selección de tools,
   peticiones indirectas, seguimiento y casos sin herramientas; registrar sólo
   evidencia saneada. Verificar importer del ZIP contra su contrato real.
3. Con acceso al portal, validar identidad/dominio, endpoint estable aislado,
   cuenta dedicada privada, políticas y tool scan en borrador. Grabar demo real.
   La publicación pública requiere autorización expresa posterior.

**BLOQUEADO POR REQUISITOS EXTERNOS.**
