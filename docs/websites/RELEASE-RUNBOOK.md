# Release y rollback de Sitio Web Chile

Procedimiento de release. Actualización read-only 2026-10-03: las migraciones launch/MP ya están aplicadas; checkout/launch están en `1`, hay snapshots/ofertas existentes y un acuerdo MP pendiente. La prueba oficial de débito diferido sigue sin evidencia: **NO-GO de adquisición pública**. Para el frente comercial usar `WEBSITE_PUBLIC_ACQUISITION_ENABLED=0`/ausente, sin alterar contratos existentes. Ver [estado auditado y nuevo flujo](PUBLIC-COMMERCIAL-LAUNCH.md).

## Orden de release

### Preflight obligatorio (no muta)

1. Abrir Vercel Project `puragenda` → Environment Variables y comprobar presencia por nombre/ámbito sin revelar valores. `AUTH_SECRET` es la variable efectiva de sesión; `NEXTAUTH_SECRET` es solo fallback. Confirmar que Preview no comparte credenciales MP de producción antes de una prueba.
2. Ejecutar `PRODUCTION_PREFLIGHT_CONFIRM=READ_ONLY_ONLY node scripts/preflight-website-production.mjs <evidence-path>` contra la conexión aprobada. Las dos migraciones históricas ya deben figurar aplicadas (`pending=[]`), `readOnly=true` y sin locks conflictivos. El script histórico puede etiquetar ese caso `REVIEW_REQUIRED`: revisar las filas, sin repetir migraciones. La nueva migración purchase intent se revisa aparte con `prisma migrate status` antes del release comercial.
3. Revisar los dos SQL y el backup recuperable. La operación es aditiva, pero `ALTER TABLE`/índices requieren ventana. No hay `down` migration segura.

4. Registrar SHA aprobado/deployment actual; backup PostgreSQL y prueba de recuperación. Guardar conteos Website, snapshot/ofertas, acuerdos y eventos en almacenamiento privado.
5. WEBSITE_CHECKOUT_ENABLED=0 y WEBSITE_LAUNCH_ENABLED=0. Validar secreto de sesión, token/secreto MP, HTTPS app URL, root domain, media y conexión directa para migrar. No copiar valores a logs/tickets.
6. Revisar `prisma migrate status`, migraciones pendientes y locks. Ejecutar `npm run db:migrate:deploy` solo contra el entorno aprobado. Nunca `db push` en producción ni marcar resuelta una migración parcial sin revisar DDL.
7. Verificar tablas/columnas MP, índices, FKs, RLS/permisos. Prisma validate/generate y build corresponden al SHA aprobado.
8. Desplegar feature-off. Smoke login, agenda, suscripción base y sitios ya pagados. Checkout apagado no modifica entitlement/runtime de sitios vigentes.
9. Configurar `https://www.puragenda.cl/api/webhooks/mercadopago`, secret y topics `subscription_preapproval`, `subscription_authorized_payment` y `payment`. Signature antes de fetch; recurso remoto/operación local deben coincidir; Website se distingue de BASE.
10. Con cuentas de vendedor/comprador oficiales de test del mismo país, Preview aislado y DB de test, completar matriz MP: founder/standard, primer débito `trialEndsAt`, rechazo/replay/cancel/recovery y BASE intacta. Authorized no equivale a pago aprobado.
11. Para un lanzamiento inicial sin snapshot, fijar una `WEBSITE_LAUNCH_AT` ISO UTC aprobada y ejecutar dos veces `npx tsx scripts/grant-website-beta-founder.ts`, sin `--apply`. **La producción auditada ya tiene snapshots/ofertas y fecha: no repetir este paso, no ampliar miembros ni recalcular elegibilidad para el frente comercial.**
12. Solo con aprobación operativa, aplicar una vez `--apply` y `WEBSITE_LAUNCH_SNAPSHOT_CONFIRM` con el ID calculado a partir del timestamp. Verificar miembros/eligibilidad y ausencia de trials automáticos. No cambiar el corte para otorgar beneficios posteriores.
13. Resolver P0/P1 y registrar nuevo GO. Habilitar `WEBSITE_CHECKOUT_ENABLED=1` y verificar ambas cohorts.
14. Habilitar `WEBSITE_LAUNCH_ENABLED=1`; popup/version vista/changelog. Correos permanecen borradores hasta autorización de campaña.
15. Monitorizar errores seguros, UNKNOWN/CREATING, pending/PAST_DUE, precios y reservas. Nunca payloads completos, correos ni tokens.

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
