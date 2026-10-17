# Puragenda

Paquete portátil Agent Plugins 1.0.0 para ChatGPT y Codex. Incluye el endpoint
remoto y una habilidad de uso. No contiene servidor local, credenciales ni hooks.

El endpoint del manifiesto es el destino de producción propuesto. El ZIP no
despliega el servidor. Antes de conectarlo deben publicarse el código, la migración
y la configuración, con autorización del responsable del entorno.

Conexión: añadir el servidor remoto, elegir autenticación mixta (acceso público y
OAuth), conectar una cuenta, seleccionar negocio y consentir. OAuth y DCR se
descubren mediante las URLs `/.well-known/`. No se necesita API key en el cliente.

Se mantiene `mcp.json` conforme al schema portátil publicado. Actualmente ese
schema no admite `extensions` en cada servidor, aunque la documentación de OpenAI
describe ese campo para opciones avanzadas. Este paquete utiliza descubrimiento
estándar y selección de autenticación mixta en el portal, sin declarar extensiones
que contradigan el schema. Confirmar la configuración detectada antes de enviar.

No está aprobado ni publicado en el directorio. El portal requiere identidad
verificada, dominio, scan del endpoint, cuenta ficticia de revisión, grabación de
demostración y revisión de políticas. No añadir contraseñas ni secretos al ZIP.
