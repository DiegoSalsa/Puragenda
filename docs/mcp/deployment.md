# Conexión, despliegue y revisión

No se ejecutó despliegue, merge ni migración productiva. Estos pasos se ejecutan
en el entorno autorizado por su responsable. El ZIP configura un cliente remoto;
no publica el backend ni concede acceso a datos.

## Entorno aislado reproducible

Requisitos: dependencias del lockfile, Python para empaquetado y PostgreSQL local.
El runner no carga `.env`, rechaza hosts que no sean loopback y sólo acepta la
base `puragenda_booking_api_test`. Crea un schema temporal, valida la migración
MCP real y lo elimina al terminar normalmente. No apuntarlo a Supabase productivo.

```powershell
npm ci
npx prisma generate
npx prisma validate
npm run typecheck
npm run lint
npm test
npm run test:mcp:local
node scripts/test-booking-api-local.mjs --all
node scripts/test-booking-api-local.mjs --build
npm run plugin:package
npm run dev:mcp:review
```

Si PostgreSQL local requiere contraseña, proporcionar exclusivamente
`PURAGENDA_BOOKING_TEST_DATABASE_URL` con esa base y host loopback. No reutilizar
credenciales de clientes. Ejecutar las suites PostgreSQL MCP y `--all` separadas:
otras pruebas de integración limpian fixtures y no deben compartir su schema.

La revisión local abre `http://localhost:3108` y `/mcp`. Cuenta ficticia creada
por el runner: `review@example.invalid` / `Mcp-Local-Review-Only-2026!`.
Es una contraseña pública de fixture local, nunca una cuenta de producción ni
credencial válida para enviar al portal. Incluye dos negocios del mismo dueño,
uno privado y otro participante, servicios pagados y uno gratuito. Los IDs
estables están en `scripts/test-booking-api-local.mjs` (`preview-*`). Las fechas
de disponibilidad se eligen respecto al día de la revisión, en America/Santiago.

Para un cliente compatible añadir un servidor remoto Streamable HTTP con la URL
local, autenticación mixta y DCR. Recorrer registro → authorize con resource y
PKCE → login → selección de negocio → consentimiento → callback → token →
initialize/tools/list. Usar `account:read agenda:read` al principio; conectar de
nuevo para probar los otros scopes. Los tests contienen el cliente oficial SDK
y el flujo completo reproducible, sin tener que copiar access tokens a una UI.
Un cliente en la nube no puede acceder al localhost de esta máquina.

## Configuración por entorno

No hay un client secret OAuth: se registran clientes públicos con PKCE. Todas
las variables nuevas son de servidor, sin prefijo `NEXT_PUBLIC_`.

| Variable | Configuración |
| --- | --- |
| `MCP_ORIGIN` | Origen HTTPS canónico sin path; producción propuesta `https://www.puragenda.cl`. Debe coincidir exactamente en issuer, resource, cookies y callbacks de autorización |
| `MCP_OAUTH_REDIRECT_URIS` | URLs HTTPS exactas separadas por comas. Default estable ChatGPT: `https://chatgpt.com/connector_platform_oauth_redirect` |
| `MCP_OAUTH_ALLOW_LOOPBACK` | `true` sólo si se habilita Codex desktop/CLI por callback local. Admite loopback `/callback` o `/callback/ID` con puerto variable al registrar; luego exige coincidencia exacta con ese registro |
| `MCP_ALLOWED_ORIGINS` | Orígenes de navegador adicionales exactos separados por comas, sin comodines. Puragenda y `https://chatgpt.com` ya están permitidos |
| `MCP_OPERATION_ENCRYPTION_KEY` | 32 bytes criptográficamente aleatorios en base64, persistentes y exclusivos del entorno; guardar en secret manager |
| `OPENAI_APPS_CHALLENGE` | Texto exacto del desafío de dominio proporcionado por el portal; si falta, la ruta devuelve 404 |
| `CRON_SECRET` | Secreto largo del cron Vercel; se exige Bearer con comparación de tiempo constante |
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL servidor y conexión directa de migración del entorno aislado/autorizado |
| `AUTH_SECRET` (o `NEXTAUTH_SECRET`) | Secreto de sesión existente robusto, al menos 32 caracteres |
| `NEXT_PUBLIC_APP_URL` | URL de Puragenda correspondiente al entorno; variable existente, no contiene secretos |

Después de inyectar los secretos en el proceso, `node scripts/check-mcp-config.mjs`
valida presencia y sintaxis sin imprimirlos. No prueba conectividad, aleatoriedad,
permisos de base ni verificación de dominio. No ejecutar con tracing de shell.
La key de operaciones debe ser estable entre instancias; cambiarla invalida
payloads pendientes. Para rotarla, drenar preparaciones, revocar las pendientes,
esperar su eliminación y desplegar la key nueva de forma coordinada.

## Migración y despliegue

1. Elegir primero un preview con base independiente, secretos propios, correos
   desactivados y proveedores sandbox o sin conexiones reales. No se encontró
   un preview externo aislado ya configurado; se usó PostgreSQL/Next local.
2. Verificar backup/restauración y estado de migraciones. No ejecutar `db push`
   ni seed global sobre una base existente. Comparar el diff con la base real.
3. Aplicar una sola fuente de migración. El proyecto Prisma usa
   `npm run db:migrate:deploy`; revisar previamente todo pendiente. La copia en
   `supabase/migrations/20261017021050_mcp_oauth_connector.sql` es el mismo SQL
   para operadores que gestionan migraciones por Supabase. No aplicar ambas.
4. Confirmar siete tablas MCP con RLS y sin grants cliente. El usuario SQL del
   backend debe poder operar las tablas, sin entregar sus credenciales al cliente.
   Revisar advisors reales de Supabase en el entorno elegido.
5. Desplegar esta rama/commit aprobado con sus variables. Conservar el cron
   diario `/api/cron/mcp-cleanup` a las 04:00 UTC y supervisar respuesta/errores.
6. Configurar logs HTTP/proxy para no guardar códigos OAuth, query strings de
   autorización, cabeceras Authorization ni rutas completas de recibos.
7. Completar el smoke test siguiente antes de conectar usuarios reales.

## Smoke test tras despliegue

- HTTPS válido, host canónico y sin redirección entre apex/www durante OAuth.
- `GET /.well-known/oauth-protected-resource/mcp` y el alias sin `/mcp`:
  `resource` exacto `ORIGIN/mcp`, `authorization_servers=[ORIGIN]`.
- `GET /.well-known/oauth-authorization-server`: issuer exacto, endpoints del
  entorno, S256, DCR, `none`, revocación e issuer identification.
- POST `/mcp`: SDK conecta, descubre 30 herramientas, perfil y seguridad mixta
  visibles en el wire. GET 405 es esperado, no una prueba de caída.
- Privada sin login → challenge; token inválido/vencido/revocado → 401.
- OAuth real con ChatGPT y Codex: registro, state+iss, PKCE, selección de negocio,
  consentimiento, perfil estable tras reconectar y refresh. Confirmar los
  callbacks que realmente usa cada cliente; no permitir dominios amplios.
- Dueño A/B y profesional limitado: IDs ajenos, sucursal ajena y permisos
  financieros/CRM denegados. Retirar membresía y revocar conexión: acceso cesa.
- Preparar/aprobar/ejecutar/repetir cita ficticia; cambiar precio/horario antes
  de ejecutar y comprobar rechazo; revisar el estado real y auditoría.
- Opt-in público desactivado → negocio no visible ni reservable. Servicio
  gratuito → aprobación y una reserva; servicio pagado/abono → denegación.
- Revocar en ajustes y en la página de conexiones propias. Verificar limpieza
  y probar proveedores externos sólo con cuentas de prueba dedicadas.
- Comprobar widget, reserva v1 e interfaz Puri en navegador, es/en y vista móvil.
- Revisar visualmente privacidad/términos publicados: un HTTP 200 no garantiza
  que se hayan desplegado los textos nuevos ni que traducciones se rendericen.

## Portal OpenAI y paquete

1. Verificar la cuenta de desarrollador/organización y los derechos de marca.
2. Publicar el entorno HTTPS aprobado y las políticas revisadas legalmente.
3. Crear el plugin en el builder y subir el ZIP validado; revisar nombre,
   categoría Productivity, país CL, iconos oficiales, capacidades y ejemplos.
4. Registrar el servidor `ORIGIN/mcp`, autenticación mixta y DCR con PKCE. El
   `mcp.json` es válido contra Agent Plugins 1.0.0; el schema no permite la
   extensión por servidor que muestran ejemplos avanzados de OpenAI. Por eso
   la configuración de auth se descubre por metadata y se confirma en el portal.
   No añadir un campo rechazado por el schema para ocultar esa discrepancia.
5. Copiar el desafío real a `OPENAI_APPS_CHALLENGE`, redeploy autorizado y
   comprobar `GET /.well-known/openai-apps-challenge` antes de Verify domain.
6. Crear una cuenta dedicada en ese entorno aislado con datos exclusivamente
   ficticios: dos negocios, dueño y empleado limitado, sucursales, citas,
   cobros ficticios, servicio gratuito y servicio no elegible. Usar contraseña
   nueva secreta; entregar al revisor sólo por el canal privado del portal.
   No proporcionar la contraseña pública del fixture local ni datos productivos.
7. Grabar el flujo en el cliente real: conectar, elegir negocio, consultar
   agenda/ingresos, preparar/aprobar/ejecutar y demostrar rechazo de acceso ajeno
   y comercio. Ocultar tokens/datos sensibles. Subir una URL accesible al revisor
   y añadir el campo de demo exigido por el builder. No se ha inventado esa URL.
8. Ejecutar tool scan del portal, los cinco casos positivos y tres negativos
   incluidos en `plugin.json`, y pruebas manuales de refresh/revocación. Confirmar
   que el alcance de gestión privada y reservas gratuitas cumple su revisión.
9. Resolver los errores reales del builder; confirmar todas las declaraciones de
   privacidad, permisos y commerce. Si exige dominio de email empresarial/OIDC,
   este backend no lo anuncia: integrar y validar esa capacidad antes de enviarlo.
10. Enviar a revisión y esperar su resultado. La validación local de schemas no
    equivale a validación del portal, aprobación ni disponibilidad en directorio.

La cuenta pública normal de Puragenda no se altera para simular una aprobación.
No existe todavía enlace público del plugin. Las URL homepage/contacto/legal
devolvieron 200; `/mcp` devolvía 404 en la comprobación previa al despliegue.

## Actualización y rollback

Versionar servidor, manifiestos y migración; ejecutar la misma batería con datos
aislados, actualizar versión/release notes y regenerar ZIP. Confirmar compatibilidad
de grants existentes y scopes; un permiso nuevo requiere nuevo consentimiento.
Revisar de nuevo docs/políticas y tool scan del portal antes de actualizar allí.

Ante fallo operativo, deshabilitar temporalmente la ruta MCP en el gateway o
volver al despliegue anterior aprobado. Si se compromete una conexión, revocarla;
si el incidente es general, revocar todas las concesiones con una operación
administrativa autorizada. No borrar citas o tablas para revertir el transporte.
La migración es aditiva: conservar tablas, perfiles y tombstones evita duplicados
y permite volver a desplegar. Quitar cron sólo después de garantizar limpieza
alternativa. No eliminar columnas/tablas ni restaurar una base productiva sin
backup, evaluación de impacto y autorización explícita.
