# Reanudación del entorno aislado

Se comprobó el error de conexión reportado por el usuario: no había procesos
Next ni cloudflared activos, el puerto loopback 3108 rechazaba conexiones y el
host temporal anterior ya no resolvía DNS. PostgreSQL seguía activo y el schema
del fixture conservaba la cita `cmvc20hsj000jkotcst1ybhvi`.

El entorno se reanudó sobre **el mismo schema** con
`scripts/resume-mcp-review.mjs`; no se ejecutó seed, migración ni eliminación
de datos. Conserva las dos cuentas ficticias y sus contraseñas. El script guarda
el runtime privado en artifacts ignorados para permitir reinicios posteriores.
No se recuperaron secretos del proceso antiguo; se generaron claves nuevas de
sesión/operación, por lo que se requiere login y conexión nuevos. Las citas
persistidas no dependen del cifrado de los recibos anteriores.

Nuevo host temporal:
`https://previews-ships-enable-phd.trycloudflare.com`.
MCP: `https://previews-ships-enable-phd.trycloudflare.com/mcp`.
Es un host efímero dependiente de los procesos locales, sin garantía de uptime.
No se modificó la conexión guardada en ChatGPT automáticamente. Actualizarla o
crear otra con ese endpoint, autenticación mixta/DCR, e iniciar sesión de nuevo
seleccionando **Booking API Fixture**. Las concesiones viejas permanecen como
histórico; no se reescriben sus issuer/resource ni se aceptan para otro origen.

**VALIDADO MEDIANTE CLIENTE MCP:** metadata HTTPS, issuer/resource nuevos exactos,
login con la contraseña conservada, DCR/PKCE, consentimiento, 30 herramientas
descubiertas y lectura de cuenta/cita con SDK oficial. Sólo se revocó la
concesión de este smoke test; no se creó, reprogramó ni canceló ninguna cita.
La cita sigue PENDING el domingo 18 de octubre de 2026, 16:00–17:00 en
America/Santiago. [Evidencia sin secretos](evidence/resumed-review.json).

**VALIDADO LOCALMENTE:** build de producción completado; lint del nuevo script;
preflight de sólo lectura con usuarios/negocios esperados, contraseñas coincidentes
y sin conexiones de calendario externas; pruebas negativas rechazan schema no
ficticio, origen productivo y base no loopback antes de conectar/iniciar Next.
No cambió el runtime del conector ni se reejecutó toda la suite de regresión por
este helper de reanudación. Se preservan los resultados de la versión 1.0.1.

**PENDIENTE EN CHATGPT REAL:** actualizar el endpoint, repetir OAuth y continuar
la reprogramación pendiente con el ID conservado. La evidencia real obtenida
antes del cierre de procesos sigue siendo histórica válida; este smoke no se
presenta como prueba de la nueva conexión desde ChatGPT.

Procedimiento para otros reinicios:
[reanudar sin sembrar otra base](../deployment.md#reanudar-después-de-cerrar-los-procesos).
Si cambia otra vez el host, pasar `--origin ... --build` y reconectar. Si el
túnel sigue activo, el runtime guardado permite `node scripts/resume-mcp-review.mjs`.
No se tocó producción, main ni las funcionalidades de Puri.
