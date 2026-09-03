# Puragenda · Programa de protección de datos

Este documento acompaña la implementación de `trackingtest`. La referencia normativa es la Ley 21.719, cuya entrada en vigor está prevista para el 1 de diciembre de 2026. La implementación técnica no reemplaza la validación jurídica de la identidad del responsable, contratos ni transferencias.

## Responsable y contacto

- Responsable operativo: PuroCode / Puragenda. El nombre legal, identificación, domicilio y representante se publican mediante `PRIVACY_CONTROLLER_*`; deben contener datos reales en Production.
- Canal para titulares: `contacto@purocode.com` y `/privacidad/solicitud`.
- Responsable de privacidad: designar formalmente al dueño o a un delegado con autonomía, medios y acceso a las solicitudes.

## Registro de tratamientos

| Tratamiento | Datos | Base | Finalidad | Conservación |
| --- | --- | --- | --- | --- |
| Analítica de producto | ID seudónimo de visitante/sesión, plantilla de ruta, dominio de referencia, UTM, evento permitido e ID interno opcional | Consentimiento | Medir adquisición, activación, uso y errores | 395 días |
| Evidencia de consentimiento | Decisión, versión, IDs seudónimos opcionales, usuario autenticado opcional y fecha de servidor | Obligación de acreditar licitud | Demostrar y respetar la elección | 395 días |
| Solicitudes de titulares | Nombre, correo, tipo, detalle, ID seudónimo opcional, estado, evidencia y respuesta | Obligación legal | Verificar identidad y responder derechos | Resueltas: 1.460 días |

No se envían nombres, teléfonos, correos ni contenido de formularios a la analítica. Las propiedades están permitidas explícitamente en `src/lib/analytics/events.ts`.

## Proveedores y transferencias

- Supabase: base operativa y registros.
- Vercel: hosting y ejecución.
- PostHog: opcional; solo tras consentimiento y con captura de sesiones desactivada por defecto.
- Google Analytics 4: opcional; se carga `gtag.js` solo tras consentimiento cuando `NEXT_PUBLIC_GA_ID` está configurado.

Mantener inventario de contratos, subencargados, regiones y garantías de transferencias. Si PostHog no tiene una evaluación aprobada, mantener `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` sin configurar. Si no hay DPA de Google Analytics, mantener `NEXT_PUBLIC_GA_ID` sin configurar.

## Derechos y plazos

1. La persona presenta la solicitud en `/privacidad/solicitud`.
2. El sistema envía acuse al titular, alerta al equipo y crea la tarea en la bandeja restringida.
3. El equipo verifica identidad por un canal confiable.
4. Se responde dentro de 30 días corridos, con una única prórroga documentada; el bloqueo temporal se atiende dentro de 2 días hábiles.
5. Bloqueo, oposición y supresión crean inmediatamente una restricción persistente. Tras verificar identidad, el panel ejecuta supresión de analítica o mantiene el bloqueo y guarda auditoría.
6. Acceso y portabilidad producen un JSON descargable sin contraseñas, tokens ni notas internas. Rectificaciones y supresiones de datos operativos requieren revisar obligaciones contractuales, tributarias y derechos de terceros; el panel no permite cerrar una solicitud sin evidencia técnica.

## Seguridad e incidentes

- Las tablas de tracking, solicitudes, restricciones y rate limiting tienen RLS habilitado y privilegios de `anon`/`authenticated` revocados.
- Las rutas públicas exigen mismo origen, validación Zod y límites de tasa persistentes.
- Rutas con tokens, IDs o slugs se convierten en plantillas en cliente y nuevamente en servidor.
- Un evento solo se acepta si la última evidencia de consentimiento de esa versión está aceptada.
- Mantener registro de incidentes, evaluar riesgo, preservar evidencia y notificar según el procedimiento aplicable.

## Liberación

- Completar `PRIVACY_CONTROLLER_ID`, `PRIVACY_POSTAL_ADDRESS` y `PRIVACY_REPRESENTATIVE` con datos reales y revisar textos con asesoría legal.
- Confirmar contratos/DPA, subencargados y transferencias.
- Ejecutar pruebas de consentimiento, revocación, solicitudes, exportación, supresión y retención.
- Confirmar `CRON_SECRET` en Production. El cron diario borra en lotes, respeta retenciones legales y limpia buckets vencidos.
- Preview no ejecuta migraciones. Production es el único propietario de `prisma migrate deploy`; las pruebas de escritura deberían usar una base Preview separada.
