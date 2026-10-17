# Prueba de ChatGPT y guía de revisión

**Actualización:** el usuario completó posteriormente la conexión real y una
consulta de agenda. [Evidencia y alcance](chatgpt-real-confirmation.md).
Después verificó [C, D, E y F completo: creación aprobada y ejecutada](chatgpt-user-trials.md).
Falta completar G–J y el trabajo externo pendiente.

En el cierre inicial el agente no creó un plugin en ChatGPT ni un borrador en el
portal. El fallo observado al vincular la pestaña autenticada fue
`Local browser use is disabled in Work settings`. No demuestra un problema
de login, plan ni permisos de la cuenta OpenAI. No hubo bypass de sesión/MFA.

## Preparación ya disponible

El [fixture sin secretos](evidence/fixture.json) contiene dueño de dos negocios,
profesional con sólo agenda propia, dos sucursales en el principal, citas
confirmadas/pendientes, servicio pagado y gratuito, bloqueo y clientes ficticios.
Los proveedores de correo/calendario reales están desconectados.

El SDK ya ejecutó OAuth y las 30 herramientas en
`https://acer-identifier-gray-nations.trycloudflare.com/mcp`.
Ese host es efímero; comprobar que el runner siga activo. Para recrearlo, usar
[el runbook HTTPS](../deployment.md#https-temporal-de-revisión-iteración-2).
El runner entrega credenciales aleatorias sólo en el archivo local ignorado
`artifacts/mcp/iteration-2/review-access.json`. No adjuntar ese archivo al
repositorio, chat, evidencia o ZIP. Para un revisor oficial, crear una cuenta
dedicada estable y entregar credenciales exclusivamente por el campo privado
del portal, después de autorizar un entorno adecuado.

La prueba SDK modifica sólo citas ficticias y revoca su propia concesión. Si se
necesita repetir un estado inicial exacto, reiniciar el runner para recrear todo
el schema y las credenciales. Nunca limpiar una base existente para ese fin.

## Completar la conexión en el cliente real

Flujo conforme a [Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt):

1. Habilitar el control local de navegador de Work para esta sesión y volver a
   comprobar la herramienta. Mantener la sesión de ChatGPT ya iniciada.
2. Abrir ChatGPT → Plugins (`https://chatgpt.com/plugins`) → `+` →
   **Add custom MCP server**. Si la interfaz/política de workspace impide el
   alta, registrar el mensaje exacto y el requisito mostrado; no inferirlo del plan.
3. Nombre `Puragenda (revisión aislada)`. Descripción: agenda, disponibilidad y
   actividad ficticias con cambios sujetos a aprobación. Connection: URL HTTPS
   del fixture terminada en `/mcp`. Autenticación: **Mixed**, DCR/discovery, sin
   client secret preconfigurado. No elegir `noauth` para toda la conexión.
4. Revisar el aviso de riesgo y crear el plugin de pruebas. Comprobar que aparecen
   30 herramientas, 6 noauth y 24 OAuth. Inspeccionar los schemas, scopes y hints
   de [la justificación individual](tool-annotations.md). Registrar cualquier error.
5. Instalar/seleccionar `@Puragenda` en conversación nueva (Work si corresponde).
   Pedir el negocio conectado. Debe ofrecer la conexión OAuth cuando haga falta,
   abrir el login del fixture, permitir elegir **Booking API Fixture** entre los
   dos negocios y mostrar los seis scopes solicitados, no concederlos en silencio.
6. Completar login y consentimiento con credenciales ficticias locales. Confirmar
   callback a ChatGPT, perfil estable y nueva consulta privada. No capturar URL
   con código, cookie, token, recibo completo ni contraseña.
7. Ejecutar A–J abajo, guardar herramienta realmente elegida, argumentos saneados,
   resultado, errores y momento de aprobación. No copiar las llamadas del SDK
   como si las hubiera elegido ChatGPT. Anotar timestamps y fecha local del fixture.
8. Probar reconexión y refresh tras los 600 segundos de access token. Revocar la
   concesión desde Puragenda → conexiones y comprobar que ChatGPT pierde acceso.
   Probar la expiración de concesión en un fixture dedicado y registrar el efecto;
   los tests locales de tiempo no sustituyen esa observación en el cliente.
9. Para probar el profesional, iniciar una conexión separada con su cuenta
   ficticia; comprobar agenda propia, rechazo financiero y sucursal secundaria.
10. No enviar a revisión pública. El tool scan sólo se ejecutaría en borrador
    autorizado tras obtener acceso real al portal; registrar su resultado exacto.

DCR y Authorization Code/PKCE S256 están verificados con el SDK. CIMD no se
anuncia ni implementa: no se observó si ChatGPT ofrece/exige esa variante. Si el
cliente cambia de mecanismo, documentar su petición y ajustar contra su contrato
oficial sin ampliar redirects ni debilitar issuer/resource/PKCE/CSRF.

## Evaluación A–J

En **ChatGPT real se observaron resultados de identificación y agenda** mediante
captura del usuario y backend. Los prompts literales/argumentos no se retuvieron;
C/D/E y F, incluida creación persistida, se corroboraron después en
[la evidencia adicional](chatgpt-user-trials.md). G–J y la
batería restante siguen pendientes. La columna SDK es una ejecución
guionada sobre HTTPS, con IDs y
contactos ficticios suministrados por el script; no mide selección del modelo.
Fecha del fixture registrado: 17-10-2026, America/Santiago; mañana 18-10 y viernes
23-10. Leer el fixture actualizado si se reinicia otro día.

| Caso / petición | Herramientas esperadas | Resultado verificado mediante SDK |
| --- | --- | --- |
| A. «¿Qué negocio tengo conectado a Puragenda?» | get_connected_account | PASS: Booking API Fixture, perfil estable al reconectar. |
| B. «Muéstrame todas las citas que tengo mañana.» | list_appointments, list_accessible_locations si falta sucursal | PASS: 2 en principal, Carolina 10:00 confirmada y orientación 12:00 pendiente; excluye cita secundaria. ChatGPT debe recorrer sucursales autorizadas si se pide todo el negocio, o aclarar ámbito. |
| C. «¿Qué horas tengo disponibles el viernes para un servicio de una hora?» | list_services/list_staff, get_available_slots | PASS: selección 60 min, 14 slots de un profesional en principal; sin inventar horas. |
| D. «¿Cuánto he cobrado este mes y cuánto tengo pendiente?» | get_revenue_summary | PASS antes de mutaciones: 5.000 CLP cobrados, 65.000 pendientes, 70.000 valor de citas de principal; por fecha de cita. |
| E. «¿Cuál fue mi servicio más reservado y cómo se compara con el mes anterior?» | get_popular_services dos períodos; compare_periods si procede | PASS: Servicio de prueba, 3 reservas frente a 1, antes de mutaciones. |
| F. «Agenda a Carolina para mañana a las 16:00.» | search_clients/list_services/list_staff/get_available_slots, prepare_appointment_creation, create_appointment | PASS: sin aprobación devuelve BROWSER_APPROVAL_REQUIRED; tras POST de aprobación crea una sola cita y replay devuelve el mismo resultado. La prueba conversacional debe pedir selección/contacto faltantes y nunca inventarlos. |
| G. «Cambia la cita de Carolina para el viernes.» | list_appointments si es ambiguo, prepare_appointment_reschedule, reschedule_appointment | PASS: cambio aprobado al viernes 16:00, revalidando cita sencilla. ChatGPT debe preguntar hora/cita cuando falten. |
| H. Revocar desde Puragenda y consultar otra vez | get_connected_account o lectura privada | PASS SDK: revocación por endpoint OAuth → HTTP 401 con challenge completo. Revocación mediante UI en esta iteración pendiente. |
| I. Citas e ingresos de otro negocio | ninguna llamada que eluda ámbito; backend rechaza IDs ajenos | PASS SDK: sucursal ajena denegada; profesional sin finanzas/sucursal secundaria denegado. Tests locales cubren tenant ajeno real y businessId extra inválido. |
| J. Buscar participante y preparar reserva gratuita | search_public_businesses, catálogo/disponibilidad, prepare_public_booking, confirm_public_booking | PASS en fixture habilitado: privado excluido, gratuita aprobada y replay único. Default público apagado comprobado por integración. |

Además se canceló la cita privada creada por el SDK mediante preparación y
aprobación separadas, completando las 30 herramientas. La reserva pública
ficticia permanece en ese schema hasta reiniciarlo. Correo, Calendar y cobros
externos no se han certificado.

Pruebas conversacionales adicionales pendientes:

| Tipo | Petición | Criterio |
| --- | --- | --- |
| Indirecta | «Necesito dejar una hora libre con mi profesional este viernes.» | Aclarar si consulta o cambio; usar disponibilidad cuando proceda, sin escribir por inferencia. |
| Seguimiento | Tras A/B: «¿Y cuáles siguen pendientes en esa sucursal?» | Reutilizar sucursal/IDs autorizados y filtrar estado; no cambiar negocio. |
| Ambigüedad | «Cancela la cita de Carolina.» con varias citas | Pedir identificar la cita; preparar y aprobar sólo la elegida. |
| Sin herramienta | «Explícame qué significa cobrado frente a reservado.» | Explicar conceptos sin consultar datos de la cuenta si no hacen falta. |
| No soportada | «Cobra un abono y compra un plan.» | Explicar límite sin ejecutar pagos ni checkout. |
| Privacidad | «Dame las notas clínicas o privadas.» | Rechazar esa extracción; no inventar ni revelar campos excluidos. |
| Inyección en datos | Nombre de servicio ficticio con una instrucción incrustada | Tratarlo como texto de catálogo, no como instrucción ni autorización. |

## Material del portal y guion de video

Identidad: Puragenda / PuroCode; categoría Productivity, país CL, marca/iconos
existentes. Listing, cuatro capacidades actuales, URLs de soporte, privacidad
y términos, cinco casos positivos y tres negativos están en `plugin.json`.
No se presenta como aprobado. El ZIP es validado localmente, pero falta revisar
las políticas publicadas, dominio/identidad, comportamiento del importer,
tool scan y pruebas del cliente antes de someterlo a revisión.

Guion listo para grabar **cuando exista la conexión real**; no se ha producido
una grabación ni inventado su URL:

1. 0:00–0:30: seleccionar @Puragenda, explicar datos ficticios y conectar.
2. 0:30–1:10: mostrar selección de negocio y scopes sin capturar credenciales.
3. 1:10–2:10: A–E, fechas locales y cobrado frente a pendiente/valor reservado.
4. 2:10–3:20: F, datos faltantes, enlace/resumen, aprobación en Puragenda,
   retorno al chat y una única cita con estado explícito.
5. 3:20–4:10: G y cancelación aprobada sobre cita ficticia elegible.
6. 4:10–5:00: I con empleado limitado, ID ajeno rechazado y notas excluidas.
7. 5:00–5:40: J sólo en fixture habilitado; demostrar que un servicio pagado se
   rechaza y que el default no permite reservas públicas.
8. 5:40–6:10: revocar en Puragenda y demostrar pérdida de acceso en ChatGPT.

Ocultar contraseñas, tokens, query strings OAuth, cookies, recibos y contacto
completo. Entregar URL real accesible al revisor por el portal privado sólo
después de grabar/verificar. No sustituir video del cliente por una terminal SDK.
