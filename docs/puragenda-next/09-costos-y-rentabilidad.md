# 09 — Costos y rentabilidad

## Datos confirmados

Ingresos mensuales definidos:

- Puragenda base: 12.990 CLP.
- Puragenda+ base: 22.990 CLP.
- Cupos: tabla acumulativa del documento 03.
- No se modificaron precios ni se consultaron cuentas de producción.

Datos externos verificados:

- Resend publica Free 3.000 emails/mes y 100/día, Pro USD 20/mes por 50.000, Scale USD 90/mes por 100.000 y sobrecuota USD 0,90 por 1.000 en planes pagados.
- El precio real de Paddle, comisiones de Mercado Pago, tipo de cambio, impuestos, infraestructura, almacenamiento, OpenAI y soporte no está disponible en el repositorio.
- Puri solo estima coste cuando PURI_MODEL_PRICES_USD_PER_MILLION está configurado. Sin esa variable, el coste queda null.

No se presentan estimaciones como tarifas reales.

## Fórmula de margen

Para un negocio en CLP:

Margen de contribución = ingreso cobrado - comisión de provider - IA - correo - infraestructura incremental - almacenamiento/media - soporte variable - coste de reembolsos/chargebacks.

El coste fijo mensual de plataforma debe prorratearse aparte. Para proveedores en USD se requiere tipo de cambio y fecha de conversión definidos por Finanzas.

## Escenarios

| Escenario | Puri | Contact Flow | Web | Riesgo |
| --- | --- | --- | --- | --- |
| Bajo | pocas consultas, SQL cacheado | 0–20 emails/mes | subdominio, pocos assets | margen amplio si no hay plan Resend dedicado |
| Normal | uso semanal, señales periódicas | hasta hipótesis 100/mes Plus | editor y hosting estándar | medir coste real por negocio |
| Intensivo | uso diario, análisis comercial | cuota casi completa y entregas | media y dominios propios | requiere presupuestos y alertas |
| Abusivo | prompts repetidos, intentos de saltar cuotas | reintentos, contactos falsos, quejas | uploads excesivos | kill switch y suspensión |

Estos escenarios no sustituyen métricas de producción.

## Presupuestos propuestos

Son límites de protección, no precios comerciales:

- Puri estándar: cuota interactiva por usuario y presupuesto mensual por negocio.
- Puri+: cuota de chat, cuota de señales y presupuesto de recomendaciones separados.
- Contact Flow: 10 diarios y 100 mensuales por Plus solo como hipótesis inicial, más presupuesto global.
- Web: límite de media, tamaño, dominios y coste de hosting por negocio.
- Infraestructura: alertas de jobs, consultas lentas y volumen de eventos.
- Provider: alarmas de Resend al 50/80/100%, Paddle/MP por error y conciliación atrasada.

Los valores finales deben salir de un periodo de medición anonimizando negocio, plan, uso y coste.

## IA

El sistema ya registra tokens de entrada, salida, cache, duración y modelo. Para proteger margen:

1. Resolver SQL antes de llamar al modelo.
2. Cachear señales y comparaciones.
3. Limitar historial y tool rounds.
4. Aplicar presupuesto por negocio y plan.
5. Reducir o bloquear análisis proactivo si se agota.
6. Registrar coste desconocido como desconocido, no como cero.
7. Revisar modelos y precios antes de cambiar PURI_MODEL.

## Resend

Con 100 emails mensuales por negocio, el coste incremental puede ser cero si la plataforma tiene capacidad pagada disponible, pero el plan de cuenta, overages, dominios y pay-as-you-go pueden cambiarlo. No asumir que Free sirve para la plataforma completa: 100/día es una cuota global de la cuenta y la política prohíbe envío no consentido.

La decisión de usar Broadcasts o Email API con outbox debe considerar:

- quota global y aislamiento por negocio;
- contactos/audiencias;
- baja y suppression;
- eventos de entrega;
- dominios/remitentes;
- coste fijo de la cuenta;
- cancelación y reintentos.

## Web e infraestructura

Los modelos de web ya imponen límites de media y limpieza Cloudinary. Se debe medir bytes por negocio, número de assets, dominios, tráfico público y coste de hosting. La inclusión en Plus no significa almacenamiento ilimitado: hay que publicar límites operativos transparentes y soft caps antes del lanzamiento.

## Métricas financieras

Dashboard Superadmin propuesto:

- ingreso mensual recurrente por plan;
- cupos promedio y distribución;
- coste IA por negocio/plan;
- emails elegibles, enviados, entregados y coste;
- almacenamiento y dominios;
- margen de contribución por escenario;
- chargebacks, refunds, past_due y churn;
- uso abusivo y suspensiones;
- coste desconocido pendiente de configuración.

No mostrar datos de un negocio a otro.

## Criterios

- No hay coste provider desconocido presentado como cero.
- Cada plan tiene presupuesto y alerta.
- Se puede explicar el margen con inputs y fecha.
- Resend no puede sobrepasar presupuesto global sin kill switch.
- Puri degrada a SQL cuando la IA no está disponible.
- El costo de web está separado de legacy add-on y Plus.
- Finanzas aprueba inputs antes de publicación.
