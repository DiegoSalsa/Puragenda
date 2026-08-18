# LottySkin: abonos de Mercado Pago

## Diagnóstico

Puragenda usa una aplicación de Mercado Pago creada en Chile (`MLC`) y LottySkin cobra con una cuenta argentina (`MLA`). La autorización OAuth de la vendedora es válida, pero Checkout Pro rechaza el pago antes de procesarlo con:

> La cuenta del vendedor es de otro país (`FL-3ec82513`).

La solución definitiva requiere que Mercado Pago habilite el marketplace para Argentina o indique cómo crear y aprobar una aplicación `MLA` separada para Puragenda.

## Solicitud para soporte técnico

Ticket abierto el 12 de agosto de 2026: **WCS-45707** (estado inicial: **Aguardando soporte**).

**Asunto:** Habilitación de Marketplace multipaís Chile–Argentina

Somos Puragenda (https://www.puragenda.cl), una plataforma SaaS de reservas. Nuestra aplicación Marketplace/OAuth está registrada en Chile (`MLC`). Una vendedora autorizada de Argentina (`MLA`), LottySkin, obtiene un token OAuth válido y podemos crear preferencias en ARS, pero Checkout Pro bloquea antes del pago con “La cuenta del vendedor es de otro país”, código `FL-3ec82513`.

Necesitamos habilitar una aplicación/marketplace para Argentina o confirmar el proceso de onboarding multipaís para vendedores `MLA` desde nuestra plataforma chilena. Usamos Checkout Pro con OAuth Authorization Code y la URL de redirección `https://www.puragenda.cl/api/mercadopago/callback`.

Por favor, indíquennos:

1. Si debemos crear un Application ID `MLA` separado.
2. Qué requisitos comerciales, de identidad/KYC y de aprobación necesita Puragenda.
3. Si una misma plataforma puede operar aplicaciones por país conservando el mismo dominio y callback.
4. Si es posible habilitar la cuenta actual para vendedores argentinos.

## Modo temporal: link por servicio

1. LottySkin crea en su propia cuenta argentina de Mercado Pago un link por cada servicio y monto de abono.
2. En Puragenda abre **Configuración → Abonos**, selecciona **Link de pago por servicio** y guarda.
3. Abre **Servicios**, edita cada servicio y pega su link HTTPS en **Link de pago para este abono**.
4. La clienta reserva y paga en el link de LottySkin. La cita queda en **Esperando abono**.
5. LottySkin verifica que el dinero llegó a su cuenta y, desde la agenda, pulsa **Marcar abono recibido**. Puragenda confirma la cita y envía la notificación.

No debe activarse el modo temporal hasta que todos los servicios que exigen abono tengan un link configurado.
