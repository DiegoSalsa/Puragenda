# Autenticación del paquete y schema vigente

Comprobación del 17 de octubre de 2026. **VALIDADO LOCALMENTE**:
[`schema-current.json`](evidence/schema-current.json). Reproducir con
`node scripts/check-mcp-schema-current.mjs`, que descarga las fuentes públicas
y valida con Ajv 2020 del SDK fijado, sin acceder a cuentas ni credenciales.

El [schema Agent Plugins MCP 1.0.0 vigente](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json)
coincide semánticamente con el snapshot del repositorio. Para Streamable HTTP
permite `type`, `url`, `headers` y declara `additionalProperties=false`.
El `plugins/puragenda/mcp.json` actual pasa la validación descargada.

La [guía actual de empaquetado de OpenAI](https://developers.openai.com/plugins/build/plugins)
describe autenticación por servidor bajo `extensions["com.openai"].auth`,
incluido el valor `mixed`. Añadir exactamente esa estructura al manifiesto
como caso negativo provoca el rechazo `additionalProperties: extensions`.
La evidencia registra los errores y SHA-256 de la descarga. No se trata sólo
de una validación contra una copia antigua: la contradicción pública persiste.

La vía operativa documentada para probar el servidor es
[Add custom MCP server](https://developers.openai.com/plugins/deploy/connect-chatgpt):
introducir URL HTTPS y configurar autenticación mixta en la interfaz. Discovery
provee issuer, registro DCR, authorize/token y PKCE; cada herramienta anuncia
`securitySchemes` tanto a nivel superior como en `_meta`. Las seis públicas
usan `noauth`, las 24 privadas OAuth con su scope. Los challenges HTTP y de
herramienta incluyen metadata, scope, error y error_description.

**VALIDADO MEDIANTE CLIENTE MCP**: SDK e Inspector descubrieron las 30
herramientas sobre HTTPS; el SDK completó DCR, OAuth y las llamadas. Esto
comprueba el protocolo, no la interpretación del importer de OpenAI.

**Actualización posterior: VALIDADO EN CHATGPT REAL** para la vía de conexión
directa por URL. El usuario completó OAuth y obtuvo agenda privada; el backend
confirma código canjeado, tokens y llamadas.
[Evidencia y límites](chatgpt-real-confirmation.md). Esto demuestra esa vía
operativa, sin probar la importación de `mcp.json` desde el ZIP.

**PENDIENTE DE ACCESO EXTERNO** para el importer del ZIP y tool scan: el control de navegador devolvió
`Local browser use is disabled in Work settings`; el agente no pudo manejar el
alta, el importer del ZIP ni el tool scan. Se conserva el manifiesto portátil
válido y se entrega la configuración explícita por URL para terminar esa prueba.
No se afirma que el ZIP por sí solo configure autenticación mixta en ChatGPT,
ni que la discrepancia del importer esté resuelta. No se inventaron IDs de
registro, archivos `.app.json` ni propiedades fuera del schema.

Antes de publicar: comprobar el alta por URL, inspeccionar herramientas/auth,
probar el ZIP en el builder y registrar su resultado. Si exige un formato
distinto, obtener el schema/contrato real y revalidar ambos manifiestos antes
de modificar el paquete. No quitar PKCE, validar tokens con menos restricciones
ni ampliar redirects para compensar errores de interfaz.
