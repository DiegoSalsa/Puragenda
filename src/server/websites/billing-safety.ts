import type { Prisma } from '@prisma/client';
import { getCommercialPlanAccess } from '@/server/services/commercial-plan-access';
import { WebsiteError } from './errors';

export async function assertStandaloneWebsiteContract(businessId: string, db: Pick<Prisma.TransactionClient, 'business'>) {
  if ((await getCommercialPlanAccess(businessId, new Date(), db)).v2) throw new WebsiteError('El sitio web forma parte de Puragenda+. No requiere una contratación independiente.');
}

/** Called under the Business lock before claiming any Plus provider write. */
export async function assertNoOverlappingWebsiteBilling(businessId: string, plan: string | null, db: Pick<Prisma.TransactionClient, 'websiteAddon'>, now = new Date()) {
  if (plan !== 'PURAGENDA_PLUS') return;
  const addon = await db.websiteAddon.findUnique({ where: { businessId }, include: { checkoutOperations: { where: { state: { in: ['CREATING', 'UNKNOWN', 'PENDING', 'AUTHORIZED'] } }, take: 1 } } });
  if (!addon) return;
  const recurring = !!(addon.mpSubscriptionId || addon.paddleSubscriptionId) && addon.status !== 'CANCELLED' && !addon.cancelAt;
  const paid = !!addon.validUntil && addon.validUntil > now;
  const uncertain = !addon.cancelAt && addon.checkoutOperations.length > 0;
  if (recurring || paid || uncertain) throw new WebsiteError('Revisa la migración del contrato de sitio web antes de contratar Puragenda+. Conservamos su contenido y período pagado.');
}
