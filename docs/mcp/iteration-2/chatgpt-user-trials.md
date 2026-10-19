# Pruebas conversacionales aportadas por el usuario

17 de octubre de 2026. **VALIDADO EN CHATGPT REAL** mediante siete capturas iniciales y otra de creación del
usuario, contrastadas con lecturas de la base aislada y logs de herramientas.
El agente no manejó el navegador ni aprobó/ejecutó operaciones por el usuario.
[Evidencia inicial saneada](evidence/chatgpt-user-trials.json) y
[creación completada posteriormente](evidence/chatgpt-user-creation.json). Los adjuntos originales
permanecen en el chat; la captura de aprobación contiene un recibo temporal y
no se copia a Git. Se conservan huellas SHA-256 y observaciones sin recibos,
tokens, contraseñas o contactos completos.

## Resultados

| Caso | Resultado observado |
| --- | --- |
| C: disponibilidad | PASS. Viernes 23, servicio 60 minutos, 13 horarios de 09:30 a 17:00 en America/Santiago, precio 20.000 CLP. |
| D: ingresos | PASS. Octubre: 5.000 CLP cobrados, 65.000 pendientes y 70.000 de valor de citas. Distingue las tres cifras y fecha de cita frente a fecha contable. Muestra 5 citas, una completada y ticket promedio 14.000. |
| E: servicio popular | PASS. Servicio de prueba: 3 reservas en octubre frente a 1 en septiembre; incremento de 2 reservas, +200 %. |
| F: crear | PASS. Preparación, aprobación en Puragenda y ejecución desde ChatGPT. HTTP 201, cita PENDING el domingo 18 de 16:00 a 17:00, 20.000 CLP, pago NONE. Backend: operación DONE, una cita y un checkpoint canónico. ChatGPT consultó después su detalle. |
| G: reprogramar | PENDIENTE. No se observó aún una ejecución de reprogramación en esta secuencia. |
| Cancelar una cita aún no creada | PASS como caso negativo. ChatGPT consultó la agenda, detectó que sólo se había preparado la creación y no preparó/canceló otra cita. No equivale a una cancelación positiva completada. |
| H, I, J | PENDIENTES en ChatGPT real. La evidencia previa SDK/local permanece separada. |

Los 13 horarios, frente a los 14 del primer chequeo SDK, son coherentes con la
reserva pública gratuita que aquel script dejó el viernes a las 09:00–09:30.
Esa ocupación excluye el inicio de las 09:00 del servicio de una hora. También
explica la quinta cita de valor cero y las dos orientaciones gratuitas
de octubre; los 70.000 CLP de valor total no cambian. El registro de citas sin
contactos/IDs privados está en la evidencia inicial. Las cifras de C/D/E son
anteriores a la creación completada de 20.000 CLP; nuevas consultas financieras
pueden reflejar ese cambio. No se sustituyen resultados históricos por valores
de un momento posterior.

## Herramientas observadas

Desde el cierre del script SDK se registran llamadas correctas a once nombres
distintos: `get_connected_account`, `list_appointments`, `list_services`,
`list_staff`, `list_accessible_locations`, `get_available_slots`,
`get_revenue_summary`, `get_popular_services`, `prepare_appointment_creation`,
`create_appointment`, `get_appointment_details`.
Los logs conservan nombre/estado, sin argumentos; las capturas corroboran los
resultados. No se atribuyen a ChatGPT las otras 19 herramientas ni la ejecución
de las escrituras que todavía no aparecen.

## Cómo continuar la prueba

La creación ya se ejecutó con el comprobante original. ID ficticio persistido:
`cmvc20hsj000jkotcst1ybhvi`. No se observó duplicación: una cita en el horario
del profesional y un checkpoint. Esto no equivale a una prueba deliberada de
replay desde ChatGPT; esa propiedad continúa respaldada por pruebas SDK/locales.

1. Preparar la reprogramación del ID de esa
   cita, aprobarla en Puragenda y pedir ejecutar esa reprogramación.
2. Sólo después preparar la cancelación de ese mismo ID, aprobarla y ejecutarla.

La aprobación de herramientas que muestra ChatGPT y la aprobación de operación
en Puragenda cumplen funciones distintas. Ninguna respuesta conversacional del
tipo «ya aprobé» sustituye la comprobación del backend. Preparar no bloquea el
horario; aprobar permite ejecutar, y la ejecución debe devolver el estado real.

No se reinició el servidor, no se mutó la base desde esta verificación, no se
cambiaron credenciales y no se modificó código de runtime ni el ZIP. Las cifras
de regresión anteriores se conservan; este commit añade documentación/evidencia.
