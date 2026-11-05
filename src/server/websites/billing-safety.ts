import type { Prisma } from '@prisma/client';
import { getCommercialPlanAccess } from '@/server/services/commercial-plan-access';
import { WebsiteError } from './errors';
import { prisma } from '@/server/db/prisma';

export async function assertWebsiteAgreementNotPrimary(businessId: string, addon: {mpSubscriptionId?:string|null;paddleSubscriptionId?:string|null}) {
  const business = await prisma.business.findUnique({where:{id:businessId},select:{deletedAt:true,subscription:{select:{mpSubscriptionId:true,paddleSubscriptionId:true}},commercialSubscription:{select:{externalSubscriptionId:true}}}});
  if (!business || business.deletedAt) throw new WebsiteError('Negocio no disponible');
  const primaryIds = [business.subscription?.mpSubscriptionId,business.subscription?.paddleSubscriptionId,business.commercialSubscription?.externalSubscriptionId].filter(Boolean);
  if ([addon.mpSubscriptionId,addon.paddleSubscriptionId].some(id=>!!id && primaryIds.includes(id))) throw new WebsiteError('El contrato de sitio coincide con la suscripción principal. Requiere revisión antes de modificarlo.');
}

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
