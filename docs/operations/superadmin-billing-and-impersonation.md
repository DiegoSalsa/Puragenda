# Superadmin: condiciones de cobro y acceso como profesional

Rama `admin/billing-professional-impersonation`, desde el main que ya incorpora el acuerdo comercial de Cinnamon. Esta entrega no cambia tarifas, períodos ni modalidades de ninguna cuenta y no requiere migración.

## Información comercial

El resumen, el listado de suscripciones y el listado/detalle de negocios comparten `admin-subscription-report.ts`. Se muestran el importe vigente, ciclo, modalidad, cupo de profesionales activos y cualquier límite o precio personalizado. BANK_TRANSFER prevalece sobre referencias históricas de proveedores. La conexión del negocio para recibir abonos no se utiliza para clasificar el cobro de Puragenda.

El resumen de CLP mensualiza el precio contratado real, con cupos extra y ciclo anual, y separa el próximo importe de transferencias del importe automático. Las cortesías, cuentas sin modalidad confirmada, pruebas, estados no activos y períodos manuales vencidos quedan fuera del ingreso contratado. Se eliminó la comparación con un supuesto MRR del mes anterior calculado a partir de altas recientes: no existía una fotografía histórica que respaldara esa cifra. Estos indicadores son previsiones, no comprobantes de dinero recibido. Los importes internacionales se consultan en su proveedor y no se convierten ni suman como CLP.

El detalle de una cuenta manual lee el último `MANUAL_SUBSCRIPTION_PAYMENT_RECORDED` de AuditLog y, si su evidencia es válida, muestra monto recibido, referencia e inicio/término exclusivo. El registro mensual de transferencias conserva el comando existente `scripts/record-manual-subscription-payment.ts`; no se crea un sistema de cobros nuevo.

Para Cinnamon, la lectura de producción en una transacción READ ONLY confirmó que el reporte presenta Equipo, transferencia, $17.990 CLP mensuales con IVA, máximo 2 y término exclusivo 16/11/2026 00:00 Santiago. Se encontró la evidencia del pago recibido. No se ejecutó una suplantación ni una escritura de producción durante esta revisión.

Los controles de promociones/sincronización no aparecen para acuerdos manuales y el servidor también los rechaza. El editor genérico permite administrar el estado de una suscripción manual, conservando plan, ciclo, cupos, precio, fechas y referencias; no sincroniza su importe con un proveedor. Cambiar el acuerdo requiere su flujo de operación comercial existente. El CSV de negocios incluye modalidad, tarifa, ciclo y límite.

## Suplantación

En el detalle del negocio se conserva «Entrar como propietario» y se agrega «Entrar como profesional» en cada profesional activo con cuenta vinculada y disponible. Se muestra su rol/perfil de acceso. No se crea una identidad para profesionales sin usuario, ni se cambia su rol, contraseña o perfil.

La acción requiere una sesión vigente de Superadmin y comprueba en el servidor el profesional, negocio, estado activo y usuario vinculado. Rechaza usuarios eliminados o Superadmin. Reutiliza la selección normal de negocio de la cuenta: si el negocio principal resuelto es otro, rechaza el acceso para evitar entrar en un negocio distinto del seleccionado. Una cuenta con acceso a varios negocios requerirá resolver antes esa selección; no se fuerza otro negocio mediante una cookie confiada al cliente.

Se emite la sesión habitual del usuario, con su rol y tokenVersion reales y `adminAccess=false`. Los permisos continúan resolviéndose desde su perfil de acceso activo. La cookie independiente de Superadmin se conserva; las sesiones antiguas que solo tienen la cookie legada deben autenticarse nuevamente antes de suplantar, para no perder el acceso de retorno.

Antes de abrir la sesión se registra `ADMIN_IMPERSONATION_STARTED`, con el operador, negocio, usuario y profesional objetivo. Si falla la auditoría, no se abre la sesión. Un aviso de sesión de soporte permite «Volver al Superadmin», incluso cuando la cuenta tiene un muro de pago. Salir registra `ADMIN_IMPERSONATION_ENDED` y restaura la sesión del operador sin sustituir su cookie de panel.

## Validación

La suite cubre precios especiales/estándar, cupos extra, anualización, promociones, transferencias con referencias históricas, cortesías, estados/vencimiento, moneda internacional, evidencia de pago, controles manuales protegidos y suplantación por roles. También comprueba la autorización previa, rechazo de cuentas ajenas/inactivas/no vinculadas/eliminadas/Superadmin, selección de negocio, registro de auditoría y conservación de cookies.

Se probó además el flujo real con Chrome headless, una aplicación compilada y PostgreSQL local desechable: acuerdo visible, controles automáticos ocultos, entrada como STAFF con perfil de agenda propia, bloqueo de la gestión de profesionales, retorno al panel y cookie de Superadmin intacta. Se revisaron pantallas de escritorio y móvil. No hubo errores de JavaScript. Los datos ficticios y las capturas permanecen bajo scratch, fuera del repositorio.

El baseline de la antigua tarea SEO congelaba los archivos de Superadmin por hash. Solo se actualizaron las ocho huellas de archivos modificados por esta solicitud; se conservaron las comprobaciones de contenido y las demás fuentes protegidas.

Resultado final: **201 archivos y 1.344 pruebas aprobados**, incluidos los 20 casos de integración comercial con PostgreSQL; 4 archivos y 84 pruebas omitidos por las condiciones existentes de la suite. Typecheck y build aprobados. Lint sin errores, con 32 advertencias existentes. La aplicación compilada se probó en escritorio de 1440 px y móvil de 390 px, y el recorrido de suplantación comprobó también que el perfil personalizado puede negar estadísticas aunque el rol STAFF habitual las permita.
