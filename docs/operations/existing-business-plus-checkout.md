# Cambio voluntario de un negocio existente a Puragenda+

El propietario entra en Configuración → Pasar a Puragenda+. El servidor conserva
el contrato base, profesionales, ciclo, prueba y beneficios; no utiliza un importe
ni un negocio recibido del navegador.

- Con un período vigente se cobra únicamente la diferencia de Plus por el tiempo
  restante. Después de confirmar el pago canónico, la misma suscripción automática
  incorpora Plus en la renovación. No se crea una segunda suscripción base.
- Las cuentas de transferencia conservan el precio base y el método. El pago inicial
  de la diferencia es único; los siguientes períodos se registran con el comando
  `record-manual-subscription-payment.ts`, incluyendo base y Plus aceptado.
- En prueba se conserva la fecha original. Si hay un acuerdo pendiente se reutiliza;
  el primer cobro se programa al terminar la prueba y conserva los beneficios base.
- Las confirmaciones firmadas verifican cuenta, aplicación, entorno, moneda, importe,
  referencia y factura/pago canónicos. La vuelta del navegador no acredita un pago.
- Cancelar Plus restaura el cobro base y conserva el acceso Plus pagado hasta su fin.
  Una devolución retira el acceso correspondiente sin borrar ni reemplazar el contrato base.
- Un resultado incierto conserva su operación: no repite el POST del proveedor. La
  conciliación recupera pagos/contratos existentes y requiere revisión si no puede
  demostrar el resultado. Un sitio con cobro independiente recurrente requiere
  conciliar ese acuerdo antes de ofrecer Plus para evitar duplicarlo.
- La demo es de lectura; nunca genera un cobro real. IA y envíos opcionales conservan
  sus interruptores propios y no se activan por este cambio.
