# Release y rollback de Sitio Web Chile

Plan preparado, **NO ejecutado en producción**. No habilitar comunicación/adquisición mientras el reporte mantenga NO-GO.

## Orden de release

1. Registrar SHA aprobado/deployment actual; backup PostgreSQL y prueba de recuperación. Guardar conteos Website, snapshot/ofertas, acuerdos y eventos en almacenamiento privado.
2. WEBSITE_CHECKOUT_ENABLED=0 y WEBSITE_LAUNCH_ENABLED=0. Validar secreto de sesión, token/secreto MP, HTTPS app URL, root domain, media y conexión directa para migrar. No copiar valores a logs/tickets.
3. Revisar `prisma migrate status`, migraciones pendientes y locks. Ejecutar `npm run db:migrate:deploy` solo contra el entorno aprobado. Nunca `db push` en producción ni marcar resuelta una migración parcial sin revisar DDL.
4. Verificar tablas/columnas MP, índices, FKs, RLS/permisos. Prisma validate/generate y build corresponden al SHA aprobado.
5. Desplegar feature-off. Smoke login, agenda, suscripción base y sitios ya pagados. Checkout apagado no modifica entitlement/runtime de sitios vigentes.
6. Configurar `/api/webhooks/mercadopago`, secreto y topics subscription_preapproval, subscription_authorized_payment y payment cuando aplique. Signature antes de fetch; recurso remoto/operación local deben coincidir; Website se distingue de BASE.
7. Con cuentas/entorno de prueba autorizados, completar matriz MP: founder/standard, primer débito trialEndsAt, rechazo/replay/cancel/recovery y BASE intacta. Authorized no equivale a pago aprobado.
8. Fijar una WEBSITE_LAUNCH_AT ISO UTC aprobada. Ejecutar dos veces `npx tsx scripts/grant-website-beta-founder.ts`, sin --apply. Comparar candidatos/ya marcados/nuevos. Si hay otro snapshot, conciliar sin ampliar el snapshot sellado.
9. Solo con aprobación operativa, aplicar una vez --apply y WEBSITE_LAUNCH_SNAPSHOT_CONFIRM con el ID calculado a partir del timestamp. Verificar miembros/eligibilidad y ausencia de trials automáticos. No cambiar el corte para otorgar beneficios posteriores.
10. Resolver P0/P1 y registrar nuevo GO. Habilitar WEBSITE_CHECKOUT_ENABLED=1 y verificar ambas cohorts.
11. Habilitar WEBSITE_LAUNCH_ENABLED=1; popup/version vista/changelog. Correos permanecen borradores hasta autorización de campaña.
12. Monitorizar errores seguros, UNKNOWN/CREATING, pending/PAST_DUE, precios y reservas. Nunca payloads completos, correos ni tokens.

## Checkout ambiguo

CREATING/UNKNOWN bloquea otro POST: no se presume idempotencia de PreApproval. No borrar la operación tras timeout. Soporte busca el acuerdo por referencia exacta website:<UUID> usando herramientas autorizadas y comprueba vendedor/monto/moneda/periodicidad y binding local. Si existe, reparación transaccional supervisada vincula ID único a operación/add-on y ejecuta sync por GET. Si no puede demostrarse ausencia, mantener bloqueo. Tras cancelar, esperar confirmación del proveedor antes de cerrar la operación. No hay endpoint público que permita adjuntar IDs arbitrarios.

## Post-deploy smoke pendiente

- Founder AVAILABLE: 15 días, 5990 permanente, dismiss/ESC/foco, reload sin repetición.
- PROBAR: 15×24h exactas; segundo click no reinicia; publica/reserva en trial.
- Standard: 9990, sin trial ni founder; preview sí, publicación sin pago bloqueada.
- Disclosure MP mensual/primer cobro; pending/authorized no concede paid access.
- Invoice verificada activa; replay no duplica; cancel WEBSITE deja BASE intacta; reactivar conserva precio/período pagado.
- Builder autosave/conflicto segunda pestaña, preview privado, fotos tenant-specific.
- Las tres plantillas públicas con catálogo actual, SEO/JSON-LD, 360/390 y reserva única persistida.
- Expiry corta runtime al instante, conserva contenido, CTA5990 sin otro trial.
- Dominio TXT tenant-specific, proyecto/DNS/TLS, principal/desconexión, sin adopción cross-tenant.
- Superadmin diagnóstico completo y operación pendiente; founder no editable arbitrariamente.

## Rollback

| Incidente | Acción |
| --- | --- |
| MP / adquisición | CHECKOUT_ENABLED=0, LAUNCH_ENABLED=0; mantener webs pagadas/webhook para conciliar. Nunca cancelar BASE ni borrar operaciones |
| Deployment | Volver a versión compatible con esquema aditivo; un build previo sin MP Website no procesa acuerdos nuevos. Conservar procesador webhook compatible mientras existan acuerdos |
| Migración | Feature-off, inspeccionar DDL/transacción/locks y forward fix incremental. Restaurar backup solo tras revisar escrituras posteriores y aprobar recuperación. No DROP de contenido/ofertas |
| Runtime | Suspender sitio/host afectado mediante controles existentes/routing, mantener agenda/app/sitios sanos y todos los snapshots/media |
| Dominio | Retirar principal inválido, volver a subdominio probado y preservar reserva/challenge. No borrar en provider una asociación sin prueba tenant |
| Débito temprano | Apagar adquisición; rechazar ACTIVE temprano y conciliar cobro/compensación con operador autorizado. Rechazar webhook no revierte dinero |

No se añadió un flag global de runtime: adquisición está separada de la política existente de publicación/base/entitlement; suspensión individual evita tumbar Puragenda.
