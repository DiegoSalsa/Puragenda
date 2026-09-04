# SEO-017 — Landing B2B para centros de estética

Fecha de implementación: 2026-09-04

Ruta principal: `/software-agenda-estetica`

Spoke contextual: `/para/estetica`

## 1. Verificación funcional previa

Se auditó el código actual, sin usar páginas antiguas como prueba. El esquema y las superficies del producto confirman servicios con duración y precio, opciones, asignación de servicios a profesionales, jornadas, pausas y bloqueos, citas, clientes, historial administrativo, widget, enlace público, personalización, abonos y recordatorios por email. También existen rutas de cancelación/reagendamiento y sincronización con Google Calendar.

Evidencia principal:

- `prisma/schema.prisma`: `Business`, `Staff`, `StaffSchedule`, `BlockedDate`, `Service`, `ServiceOptionCategory`, `ServiceOptionAlternative`, `Appointment` y `Client`.
- `src/app/widget/[slug]/widget-client.tsx` y `src/app/api/business/[slug]/book/route.ts`: selección, precio/duración de opciones y creación de reservas.
- `src/app/dashboard/staff`, `src/app/dashboard/services` y `src/app/dashboard/appearance`: profesionales, servicios, horarios, pausas, bloqueos, marca y widget.
- `src/app/api/cron/reminders/route.ts`: recordatorios por email para citas del día siguiente en la zona horaria del negocio.
- `src/app/api/appointments/manage/route.ts` y rutas de `reschedule`: cancelación y reagendamiento sujetos a reglas.
- `src/server/services/google-calendar.service.ts`: integración de citas con Google Calendar.
- `src/core/constants.ts`: pricing, límites de profesionales y prueba de 30 días usados por la landing.

No se encontró un modelo funcional que reserve cabinas, camas, salas, boxes, máquinas o aparatología como recursos compartidos. Tampoco se verificó un producto de paquetes, bonos o saldo de sesiones. La existencia de historial de citas y reservas recurrentes no demuestra gestión comercial de paquetes de tratamientos.

## 2. Auditoría del copy anterior de `/para/estetica`

| Afirmación anterior | Clasificación | Resolución |
| --- | --- | --- |
| “Software de Gestión para Centros de Estética y Spa” | D — obsoleta/inexacta | Se reemplazó por “Puragenda para centros de estética”. El spoke deja la intención comercial al hub y no intenta posicionar spa. |
| “Gestiona cabinas, profesionales y tratamientos estéticos” | C — no demostrada | Se eliminó la gestión de cabinas. Se conservó la organización por profesional y servicio con lenguaje no clínico. |
| “Atrae, agenda y fideliza a tus pacientes” | B — parcialmente cierta | Se cambió a una explicación verificable de configuración y se usa “clientas”. No se promete atracción ni fidelización. |
| Widget con colores de marca | A — verificada | Se mantiene como capacidad, aunque el spoke prioriza la configuración operativa. |
| Servicios con distinta duración y precio | A — verificada | Se mantiene y se explica con ejemplos editoriales ficticios. |
| “Información e historial de pacientes… segura y respaldada en la nube” | B — parcialmente cierta | Se retiró del spoke. El producto conserva historial administrativo, pero la frase podía sugerir expediente clínico y garantías amplias. |
| “Asignar a cada profesional a una cabina y asegurar que no haya solapamiento” | C — no demostrada | Se eliminó. La agenda controla disponibilidad por profesional, no recursos físicos compartidos. |
| Liberación del bloque después de cancelar | A — verificada con condiciones | Se retiró de la FAQ contextual para evitar duplicar el hub; cancelación y cambios se explican en la landing con sus límites. |
| “Vender tratamientos de varias sesiones” y “planes de sesiones” | C — no demostrada | Se eliminó. Historial o recurrencia no equivalen a paquetes, bonos o saldo de sesiones. |
| Personalizar colores, tipografía y logo | A — verificada | Se conserva en el hub dentro de la experiencia de reserva. |

## 3. Claims correctos publicados

La página afirma únicamente capacidades verificadas: catálogo, duración, precio, opciones, profesionales, horarios, pausas, bloqueos, enlace/widget/iframe, marca, abonos mediante Mercado Pago cuando se configuran, recordatorios por email, cancelación/reagendamiento según reglas, historial administrativo y pricing central.

## 4. Claims eliminados o reformulados de `/para/estetica`

- **Cabinas/boxes:** retirada la promesa de asignación y prevención automática de solapamientos porque no existe un modelo de recursos físicos.
- **Planes de sesiones:** retirada la venta o administración de paquetes porque no se verificaron bonos, paquetes ni saldo de sesiones.
- **Spa:** eliminado del title, descripción, FAQ y keywords para no convertir esta fase en una landing híbrida.
- **Lenguaje clínico:** “pacientes”, “tratamientos”, “gestión clínica” y el historial con lectura clínica se sustituyeron por clientas, servicios no clínicos e historial administrativo de citas.
- **“Gestión premium” e “integral”:** reemplazadas por acciones concretas del producto.

## 5. Keyword e intención

El hub tiene como intención principal “software de agenda para centros de estética”. El cluster secundario incorpora de forma natural sistema de reservas, agenda online, software para estética, programa para centro de estética y agenda para esteticistas. El spoke evita “software”, “sistema” y “programa” en su metadata y keywords para responder a una intención práctica de configuración.

## 6. Arquitectura del hub

El hub contiene hero comercial, definición extractable, problemas de coordinación, ejemplo ficticio, recorrido operativo, configuración individual/equipo, horarios y bloqueos, abonos, canales de reserva, recordatorios y cambios, alcance, pricing, FAQ y CTA.

## 7. Cambios del spoke

`/para/estetica` ahora explica cómo preparar el catálogo, asignar profesionales, organizar jornadas/bloqueos y compartir la agenda. Enlaza al hub comercial y utiliza preguntas distintas. Su title es “Puragenda para centros de estética” y su H1 es “Cómo organizar las citas de tu centro con Puragenda”.

## 8. Diferenciación frente a manicure, peluquerías y spa

- Estética trabaja con un catálogo variado de faciales, cejas y pestañas, con profesionales que pueden ofrecer servicios distintos.
- Manicure conserva esmaltado, retiro, mantenimiento, diseños y nail studio.
- Peluquerías conserva corte, color, cabello y estilistas.
- Spa no se usa como intención objetivo ni se crea una ruta propia.

## 9. Ejemplo ficticio

La tabla “Ejemplo de configuración” usa limpieza facial de 60 minutos, diseño de cejas de 30 minutos y extensiones de pestañas de 90 minutos. Las profesionales A y B, los precios y los horarios son ficticios y se rotulan como tales. El ejemplo demuestra la relación servicio → duración → profesional → horario.

## 10. Límites sobre cabinas y recursos

Una FAQ y el bloque de alcance explican que Puragenda organiza disponibilidad por profesional, servicio y horario. Las cabinas, camas, salas, máquinas y aparatología compartidas deben controlarse por separado.

## 11. Límites clínicos

La landing se dirige a estética no clínica. Declara que Puragenda no reemplaza una ficha clínica y no se presenta como herramienta de diagnóstico, indicaciones, medicina estética o tratamientos médicos.

## 12. Structured data

Se reutilizan los helpers existentes para `Organization`, `SoftwareApplication`, `FAQPage` y `BreadcrumbList`. No se añaden `Review`, `aggregateRating`, `LocalBusiness` ni `MedicalBusiness`. `FAQPage` mantiene el patrón semántico del sitio para correspondencia entre contenido visible y datos estructurados; no se presenta como garantía de rich result en Google.

## 13. Internal links

El hub enlaza a `/para/estetica`, `/sistema-de-agendamiento-online`, agenda multiprofesional, reservas con abono, Google Calendar, características, pricing, demo y registro. Recibe enlaces desde el spoke, `/soluciones` y `/sistema-de-agendamiento-online`.

## 14. Analytics

Los CTA de registro usan `TrackedLink` con `cta="register"`. La ruta se agregó a la taxonomía pública y continúa generando `sign_up_cta_clicked`; no se creó un evento nuevo.

## 15. Sitemap e indexación

`/software-agenda-estetica` se añadió una sola vez al sitemap con canonical propio y metadata `index, follow`. No se crearon rutas sinónimas ni rutas por ciudad. `MARKETPLACE_QUALITY_GATE.indexingEnabled` continúa en `false`.

## 16. Archivos

- `src/app/software-agenda-estetica/page.tsx`
- `src/lib/data/aesthetics-software-landing.ts`
- `src/lib/data/industries.ts`
- `src/app/para/[industry]/page.tsx` (reutilizado por el spoke; sin fork de ruta)
- `src/app/sitemap.ts`
- `src/app/soluciones/page.tsx`
- `src/app/sistema-de-agendamiento-online/page.tsx`
- `src/lib/analytics/path.ts`
- `messages/*.json` (etiqueta del enlace global a centros de estética, sin “spa”)
- `tests/aesthetics-software-landing.test.ts`
- `docs/seo/aesthetics-landing-implementation.md`

## 17. Tests y validación

La prueba de SEO-017 cubre metadata, canonical, H1 único, contenido visible, ejemplo ficticio y disponibilidad, pricing central, schema, FAQ, enlaces hub ↔ spoke, analytics, sitemap, ausencia de claims prohibidos, ausencia de prueba social no autorizada, rutas no creadas y gate de marketplace. La validación final incluye suite completa, lint de archivos tocados, typecheck, build, `git diff --check` y smoke local de las cinco rutas solicitadas.

## 18. Limitaciones

- No se administran recursos físicos compartidos ni se afirma que la disponibilidad de una profesional garantice disponibilidad de una cabina o equipo.
- No se publican paquetes, bonos ni saldos de sesiones.
- Los recordatorios descritos son por email para las citas del día siguiente, sin promesa de una anticipación exacta de 24 horas.
- Las citas con abono aprobado requieren contacto con el negocio para cancelar o cambiar.
- No existe un testimonial de estética autorizado para esta landing.

## 19. Recomendaciones posteriores

- Medir en Search Console consultas y páginas de destino del hub y el spoke después de indexar para confirmar que las intenciones se separan como se diseñaron.
- Añadir un caso de uso público solo cuando exista autorización específica y evidencia visible.
- Mantener spa fuera del roadmap de landing independiente hasta contar con demanda y un alcance funcional propio.

## Quality gate editorial

- **A. ¿Se conserva el 80% al cambiar “estética” por “manicure”?** No. El núcleo editorial depende del catálogo variado, servicios distintos por profesional y los ejemplos faciales/cejas/pestañas.
- **B. ¿Promete gestión integral del centro?** No. El bloque de alcance delimita agenda y administración de citas.
- **C. ¿Puede interpretarse que gestiona recursos físicos?** La FAQ y el bloque de alcance responden expresamente que no.
- **D. ¿Puede interpretarse como software clínico?** La página se rotula como no clínica y excluye ficha clínica y procesos médicos.
- **E. ¿Hub y spoke responden preguntas diferentes?** Sí. El hub responde evaluación comercial y alcance; el spoke explica configuración contextual.
