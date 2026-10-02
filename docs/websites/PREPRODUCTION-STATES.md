# Website commercial state machine

Defined before implementing Mercado Pago Chile (2026-10-02).

Membership is sealed by businessId in WebsiteOfferEligibility. Founder price is CLP 5,990/month forever; standard CLP 9,990/month. Trial is exactly 15 × 24 hours, starts only on explicit activation, and can be consumed once. Base operational subscription must also allow access.

Builder and preview remain accessible in every state. Stored drafts, publication snapshots, assets, services and domains survive billing changes. Public runtime and publish require entitlement. A valid founder trial provides entitlement even while checkout is pending or rejected. Return URLs never confer entitlement.

| State | Condition | Publish/runtime entitlement | CTA | Price / checkout |
| --- | --- | --- | --- | --- |
| F0 | Founder, available, no paid add-on | No | Probar mi web gratis | 15 days then 5,990 |
| F1 | Founder trial active | Trial | Quedarme con mi web | 5,990; first charge at trialEndsAt |
| F2 | Trial active, checkout pending | Trial only | Retomar pago | Same server-created operation |
| F3 | Trial active and independently verified paid period | Trial or settled paid period | Editar mi web | 5,990; new trial checkout cannot charge early |
| F4 | Trial expired, unpaid | No | Activar mi web | 5,990 from activation |
| F5 | Founder paid | Yes through validUntil | Editar mi web | 5,990 |
| F6 | Founder cancellation scheduled locally; MP agreement cancelled | Yes through min(cancelAt, validUntil) | Mantener mi web | New MP checkout, first charge at paid period end |
| F7 | Founder cancelled | No (except unexpired paid/trial period) | Activar mi web | New checkout, 5,990 |
| F8 | Founder past due | Trial only; otherwise suspended | Regularizar pago | 5,990 |
| F9 | Founder reactivated | Yes through settled period | Editar mi web | 5,990; never another trial |
| S0 | Standard unpaid | No | Activar sitio web | 9,990 |
| S1 | Standard checkout pending | No | Retomar pago | 9,990 |
| S2 | Standard paid | Yes through validUntil | Editar mi web | 9,990 |
| S3 | Standard cancellation scheduled locally; MP agreement cancelled | Yes through min(cancelAt, validUntil) | Mantener mi web | New MP checkout, first charge at paid period end |
| S4 | Standard cancelled | No (except remaining settled period) | Activar sitio web | New checkout, 9,990 |
| S5 | Standard past due | No; suspended until confirmed recovery | Regularizar pago | 9,990 |
| S6 | Standard reactivated | Yes through settled period | Editar mi web | 9,990 |

Checkout activation gate and public runtime gate are independent. Turning off acquisition cannot remove a paid customer's entitlement. Provider confirmation is fetched server-side after signature validation and bound to a stored operation, provider ID, reference, currency and server-derived amount. Duplicate resource versions produce no second commercial event; older versions cannot reverse a newer state.

Mercado Pago does not document a cancel-at-period-end operation: stop the recurring agreement immediately but preserve settled entitlement until the existing period ends. Reactivating an already cancelled agreement requires a new checkout. Remaining paid access ends lazily at cancelAt/validUntil without relying on an unconfigured cron.
