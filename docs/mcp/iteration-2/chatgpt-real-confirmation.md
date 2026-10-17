# Conexión real confirmada por el usuario

**Estado: SÍ. VALIDADO EN CHATGPT REAL**, con el alcance descrito aquí.
Actualización posterior al [cierre inicial](report.md), el 17 de octubre de 2026.

El usuario completó la conexión en su navegador de ChatGPT y aportó una captura
de una respuesta obtenida con **Puragenda (Revisión MCP)**. El agente no controló
esa pestaña: la herramienta sigue deshabilitada. La confirmación se corroboró
leyendo exclusivamente la base y los logs del fixture local, sin extraer tokens,
cookies, códigos, contraseñas ni identificadores de la conversación.

[Evidencia saneada](evidence/chatgpt-user-confirmation.json): procedencia,
SHA-256 del adjunto original, datos observados y comprobaciones del backend.
El original permanece en el chat; se evita copiar su URL privada de conversación
al repositorio. No se presenta esta captura como una sesión automatizada por el agente.

## Qué quedó demostrado

- El login, consentimiento y retorno OAuth llegaron a una concesión para
  **Booking API Fixture**, con cliente registrado **ChatGPT**, código canjeado
  y tokens emitidos. La evidencia combina captura/confirmación del usuario con
  backend; el nombre declarado por DCR, por sí solo, no prueba identidad del cliente.
- La conexión seguía activa. En la comprobación existían cinco filas de tokens y
  cuatro refresh tokens usados/rotados. Se observó refresh real, sin demostrar
  todavía el comportamiento del cliente al vencer definitivamente la concesión.
- Tras la ejecución SDK ya documentada, el backend registró llamadas correctas a
  `get_connected_account` y `list_appointments`. Esas dos herramientas privadas
  están corroboradas en el flujo real; el total de 30 descubiertas/probadas sigue
  perteneciendo a la evidencia SDK/Inspector. No hay captura del inventario de
  herramientas de la interfaz ChatGPT que permita afirmar 30/30 allí.
- La respuesta muestra el negocio/cuenta ficticios, ninguna cita para el sábado
  17 y las dos de la sucursal principal del domingo 18: servicio de prueba
  10:00–11:00, confirmado, $20.000; orientación gratuita 12:00–12:30, pendiente,
  $0. Coincide con el fixture y distingue pendiente de confirmada.

Esto demuestra los resultados básicos de identificación y agenda asociados a
A/B. No se guardaron el prompt literal, los argumentos enviados por ChatGPT ni
la conversación completa; no se certifica que la consulta cubriera todas las
sucursales. C–J, las peticiones indirectas/seguimiento/negativas, las aprobaciones
de escritura, la revocación en UI y la expiración final siguen pendientes en el
cliente real. Sus pruebas SDK/locales anteriores permanecen válidas y separadas.

## Error anterior y servidor

Una captura previa mostraba `INVALID_CSRF`. El backend tenía entonces una
autorización para **Negocio privado de revisión**, con código emitido y cero
tokens. El usuario después informó que había seleccionado incorrectamente y
completó el flujo para **Booking API Fixture** en el mismo servidor activo.

No se reprodujo la causa exacta del error inicial. La diferencia de CSP que se
estaba investigando fue una hipótesis: el cambio provisional y su test se
retiraron, sin aplicarse al servidor. No se atribuye el fallo de CSRF a seleccionar
un negocio distinto, ya que ambos negocios pueden autorizarse. Seleccionar el
fixture correcto determina los datos disponibles para la revisión.

No se reinició el runner ni se cambiaron las credenciales, el host, las cookies,
los controles CSRF/PKCE o la configuración de red para obtener esta confirmación.
La conexión actual conserva su entorno de prueba y sus datos ficticios.

## Publicación

El obstáculo de conseguir una primera conexión real quedó superado mediante la
operación del usuario. El alta directa por URL permite OAuth y consultas privadas
en este cliente. La importación del ZIP, tool scan, revisión de dominio/políticas,
demo pública y batería completa de conversaciones siguen pendientes. Esta prueba
no convierte el túnel temporal en un despliegue productivo ni implica aprobación
de OpenAI. No se hizo merge ni migración/despliegue a producción.
