# Puragenda · Programa base de protección de datos

Este documento acompaña la implementación de tracking de `trackingtest` y debe revisarse con asesoría legal chilena antes de declarar cumplimiento. La referencia normativa es la Ley 21.719, cuya entrada en vigor está prevista para el 1 de diciembre de 2026.

## Responsable y contacto

- Responsable operativo: PuroCode / Puragenda.
- Canal para titulares: `contacto@purocode.com` y `/privacidad/solicitud`.
- Responsable de privacidad: designar formalmente al dueño o a un delegado con autonomía, medios y acceso a las solicitudes.

## Registro de tratamientos

| Tratamiento | Datos | Base | Finalidad | Conservación |
| --- | --- | --- | --- | --- |
| Analítica de producto | ID seudónimo de visitante/sesión, ruta, dominio de referencia, UTM, evento permitido y, si corresponde, ID interno de cuenta/negocio | Consentimiento | Medir adquisición, activación, uso y errores | 395 días |
| Evidencia de consentimiento | Decisión, versión de política, IDs seudónimos opcionales, usuario autenticado opcional, fecha de servidor | Obligación de acreditar la licitud | Demostrar y respetar la elección del titular | 395 días |
| Solicitudes de titulares | Nombre, correo, tipo, detalle, ID seudónimo opcional, estado y notas de resolución | Obligación legal / gestión de derechos | Verificar identidad y responder solicitudes | Mientras sea necesario; las solicitudes resueltas se depuran después de 1.460 días |

No se envían nombres, teléfonos, correos ni contenido de formularios a la analítica de producto. Las propiedades están allowlisteadas en `src/lib/analytics/events.ts`.

## Proveedores y transferencias

- Supabase: base operativa y almacenamiento de los registros.
- Vercel: hosting y ejecución de rutas.
- PostHog: opcional; solo se inicializa con token configurado y consentimiento. La captura de sesiones está desactivada por defecto.

Antes de producción, registrar los acuerdos de tratamiento, subencargados, ubicaciones y garantías para transferencias internacionales de cada proveedor. Si PostHog no tiene un acuerdo y evaluación aprobados, mantener `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` sin configurar.

## Derechos y plazos operativos

1. La persona presenta la solicitud en `/privacidad/solicitud`.
2. La bandeja de superadmin aparece en `/para/x7k9m2v4q8/privacy-requests`.
3. El equipo verifica identidad por un canal confiable y marca la solicitud como verificada.
4. Se responde dentro de 30 días corridos, con una única prórroga cuando corresponda. Las solicitudes de bloqueo temporal se responden dentro de 2 días hábiles y no se procesan nuevos eventos identificables mientras están pendientes.
5. Para supresión u oposición del tracking, dejar de procesar nuevos eventos y eliminar los eventos localizables cuando no exista otra base legal para conservarlos.

## Seguridad e incidentes

- `TrackingEvent`, `TrackingConsent` y `PrivacyRequest` tienen RLS habilitado y no deben exponerse al Data API.
- El panel de superadmin es el único lector de solicitudes y métricas agregadas.
- Las rutas públicas tienen validación Zod, límites de tasa y no registran payloads en logs.
- Mantener un registro de incidentes, evaluar riesgo, preservar evidencia y notificar según el procedimiento legal aplicable.

## Liberación

- Revisar y versionar la política de privacidad y los términos con asesoría legal.
- Confirmar contratos/DPA de proveedores y transferencias.
- Ejecutar pruebas de consentimiento, revocación, solicitudes y retención.
- Confirmar que `CRON_SECRET` exista en Production y que el cron de retención se active solo tras el despliegue de producción autorizado.
