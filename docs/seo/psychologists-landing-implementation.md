# SEO-018 — landing de agenda para psicólogos

Fecha: 4 de septiembre de 2026. Alcance cerrado: `/software-agenda-psicologos` y ajuste contextual de `/para/psicologos`. SEO-001 a SEO-017 permanecen cerradas. No se inicia SEO-019 y no se modifica el marketplace.

## 1. Verificación funcional

La redacción se contrastó con el código actual:

- `Service` mantiene nombre, descripción, duración, precio y asignación a profesionales.
- `Staff`, `StaffSchedule`, `StaffScheduleOverride` y `ScheduleBlock` modelan profesionales, jornadas, excepciones y bloqueos.
- El widget permite elegir servicio, profesional cuando corresponde, fecha, hora y datos de contacto.
- `Appointment` y `Client` mantienen reservas e información administrativa; el panel consulta citas anteriores y servicios agendados.
- El cron de recordatorios selecciona citas activas del día siguiente según la zona horaria y envía email.
- El reagendamiento depende de la configuración, anticipación y disponibilidad. Las citas con abono aprobado requieren contacto con el negocio.
- Google Calendar crea, actualiza y elimina eventos de citas; también consulta ocupación externa según la conexión. No crea videollamadas.
- Los abonos automáticos requieren activar la opción, definir un monto y conectar Mercado Pago.
- El widget usa enlace público o iframe y admite logo y colores de marca.
- Los precios y los 30 días de prueba proceden de constantes centrales.

No se publican reservas recurrentes como capacidad del vertical, aunque exista código de recurrencia, porque no fue aprobado para esta landing.

## 2. Auditoría del copy anterior

| Claim anterior | Clasificación | Resolución |
| --- | --- | --- |
| «Psicólogos y Terapeutas» | D. Inadecuado para el alcance | Se limita a psicólogos y consultas de psicología para no invadir bienestar. |
| «Sistema de reservas online para psicólogos» | A. Verificado, pero competitivo con el hub | Se retira del spoke y se reserva la intención software/sistema para el hub. |
| «Sesiones presenciales y remotas» | B. Parcialmente correcto | Se elimina: un servicio puede llevar nombre/modalidad editorial, pero Puragenda no demuestra teleconsulta integrada. |
| «Reduce la coordinación por WhatsApp» | B. Parcialmente correcto | Se reformula como coordinación manual; no se presenta WhatsApp como canal del producto. |
| «Agenda de pacientes disponible 24/7» | B. Parcialmente correcto | Se sustituye por una explicación concreta del enlace y los horarios disponibles. |
| «Información de su sesión» | B. Ambiguo | Se limita a información necesaria para coordinar la cita. |
| «Agenda privada por profesional» | B. Parcialmente correcto | Se reformula como servicios y jornadas por profesional, que sí están verificados. |
| «Protege horas de alta demanda» | B. Resultado no demostrado | Se explica únicamente la configuración visible del abono. |
| «Para reducir reservas que no se concretan» | C. Resultado no demostrado | Se elimina. |
| «Terapia online y presencial» | D. Fuera del alcance administrativo | Se elimina del FAQ y del cluster. |
| «Ficha clínica» como exclusión | A. Verificado como límite | Se conserva con respuesta explícita y positiva: Puragenda no la reemplaza. |

## 3. Claims corregidos

El nuevo copy solo atribuye a Puragenda funciones administrativas comprobadas. Se eliminaron promesas de teleconsulta, resultados sobre asistencia, canal WhatsApp, alcance terapéutico y privacidad clínica. «Paciente» no se usa como entidad funcional; se prefiere «persona» o «cliente».

## 4. Intención y keyword

El hub responde a `software de agenda para psicólogos`, con secundarias sobre agenda online, sistema de reservas y programa de agenda para psicólogos. Se excluyen software clínico, ficha clínica, terapia online, búsqueda de profesionales y búsquedas locales de pacientes.

## 5. Arquitectura del hub

La página sigue este recorrido: hero B2B, definición directa, problemas de coordinación, ejemplo ficticio, flujo administrativo, reserva e integraciones, alcance administrativo frente a ficha clínica, planes, FAQ y CTA. Es una landing comercial renderizada como Server Component, sin librerías ni JavaScript cliente adicionales.

## 6. Spoke

`/para/psicologos` responde «cómo organizar las citas»: crear servicios, preparar jornadas, añadir bloqueos, compartir la agenda y revisar reservas. Su title, H1, keywords y FAQ evitan `software`, `sistema` y `programa` como intención principal. Enlaza al hub para la evaluación comercial.

## 7. Diferenciación específica

La diferenciación no depende de una función clínica: relaciona tipos de cita, tiempos definidos por el profesional, jornadas individuales y bloqueos, a la vez que explica que la agenda no se convierte en una ficha clínica.

## 8. Ejemplo ficticio

Se rotula «Ejemplo de configuración» y «Ejemplo completamente ficticio». Usa solo `Profesional A`, `Primera cita` de 60 minutos, `Seguimiento` de 45 minutos, lunes y miércoles y un bloqueo de 13:00 a 15:00. Duraciones y precios se declaran ilustrativos, no recomendaciones.

## 9. Límites administrativos y clínicos

El bloque «Agenda administrativa, no ficha clínica» enumera qué organiza Puragenda y qué no sustituye. No se atribuyen notas terapéuticas, diagnósticos, evaluación, historia clínica, sistema médico ni atención clínica.

## 10. Privacidad

Se enlaza `/politica-de-privacidad` como información general sobre el tratamiento de datos necesarios para coordinar citas. El copy aclara que la política no constituye una certificación sanitaria. No se mencionan HIPAA, ISO ni cumplimientos de salud.

## 11. Google Calendar y videollamada

Se describe el alcance observado: eventos de citas y ocupación externa según conexión/configuración. El hub y el FAQ dicen expresamente que Google Calendar no implica ni crea una videollamada y que Puragenda no ofrece teleconsulta integrada.

## 12. Recordatorios

El único canal publicado es email y el momento se expresa técnicamente como «para las citas del día siguiente». No se promete una anticipación fija de 24 horas, WhatsApp ni SMS.

## 13. Abonos

El copy exige activar la opción, configurar el monto y conectar la cuenta de Mercado Pago. Se presenta como condición administrativa de reserva; no como facturación clínica, seguro, reembolso, Fonasa, Isapre ni boleta médica.

## 14. Structured data

El grafo contiene únicamente `Organization`, `SoftwareApplication`, `FAQPage` y `BreadcrumbList`. No incluye `Review`, `aggregateRating`, `LocalBusiness`, `MedicalBusiness`, `MedicalOrganization` ni tipos de profesionales sanitarios.

## 15. Internal linking

El hub enlaza a `/para/psicologos`, `/sistema-de-agendamiento-online`, Google Calendar, reservas con abono, múltiples profesionales, privacidad, pricing, demo y registro. Se añadieron enlaces entrantes desde `/para/psicologos`, `/soluciones` y `/sistema-de-agendamiento-online`. No se alteró `/para/clinicas`, pues ese enlace era opcional y su copy general requiere una auditoría clínica separada.

## 16. Analytics

Los dos CTA de registro usan `TrackedLink`, `cta="register"` y placements existentes. La ruta se añadió a `STATIC_PATHS`, por lo que `sign_up_cta_clicked` conserva `source_page=/software-agenda-psicologos`. No se crean eventos nuevos.

## 17. Sitemap e indexación

`/software-agenda-psicologos` se añade una vez al sitemap con prioridad 0,9, canonical propio, metadata social y `index, follow`. No se crean aliases, `/psicologos`, páginas por ciudad ni rutas clínicas. `MARKETPLACE_QUALITY_GATE.indexingEnabled` permanece en `false`.

## 18. Archivos

- `src/app/software-agenda-psicologos/page.tsx`
- `src/lib/data/psychologists-software-landing.ts`
- `src/lib/data/industries.ts`
- `src/lib/data/scheduling-system-landing.ts`
- `src/app/soluciones/page.tsx`
- `src/app/sistema-de-agendamiento-online/page.tsx`
- `src/app/sitemap.ts`
- `src/lib/analytics/path.ts`
- `tests/psychologists-software-landing.test.ts`
- Ajustes de regresión en tests de SEO-016 y SEO-017 para admitir la nueva ruta aprobada.

## 19. Tests y validación

La prueba específica cubre metadata, canonical, H1 único, sitemap, FAQ visible, structured data, hub ↔ spoke, enlaces internos, analytics, pricing central, ausencia de tipos médicos/reviews, límites clínicos, ausencia de WhatsApp/SMS, respuesta sobre videollamada, ejemplo ficticio, ausencia de testimonios y marketplace cerrado.

Resultados de cierre:

- `npm test`: 497 tests pasaron y 2 quedaron omitidos por la configuración existente.
- Lint de archivos tocados: aprobado.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado; la ruta aparece prerenderizada con revalidación de una hora.
- Inspección HTTP: 200 en hub, spoke, sitemap, soluciones y sistema de agendamiento; canonical, `index, follow`, H1 y contenido visibles correctos.
- Viewport 390 × 844: `scrollWidth` y `clientWidth` fueron 375 px; overflow horizontal igual a 0.
- `git diff --check`: se ejecuta antes del commit de cierre.

## 20. Limitaciones

- No hay cliente de psicología confirmado o autorizado; se omiten testimonios y métricas.
- No se afirma cumplimiento sanitario especial ni idoneidad para datos clínicos.
- No se ofrece videollamada ni recurrencia automática en el copy.
- El ejemplo explica configuración; no prescribe duraciones, precios ni prácticas profesionales.

## 21. Recomendaciones posteriores

Tras publicar, verificar indexación y consultas reales de Search Console antes de ajustar el cluster. Cualquier expansión clínica, testimonial o referencia a recurrencia exige evidencia y una fase explícita posterior. SEO-019 queda fuera de este cierre.
