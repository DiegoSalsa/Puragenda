import { prisma } from '@/server/db/prisma';
import { createPuriContext } from './context';
import { PuriAccessError, type PuriContext } from './types';

/** Conversation context is an upper bound, never a durable authorization.
 * Keep OAuth-filtered permissions and deny a revoked scope before returning data. */
export async function revalidatePuriContext(context: PuriContext): Promise<PuriContext> {
  const user = await prisma.user.findUnique({ where: { id: context.user.id },
    select: { id: true, role: true, deletedAt: true, tokenVersion: true } });
  if (!user || user.deletedAt || (context.user.tokenVersion !== undefined && context.user.tokenVersion !== user.tokenVersion)) throw new PuriAccessError('FORBIDDEN');
  let current: PuriContext;
  try {
    current = await createPuriContext(user, { pathname: context.pathname, locale: context.locale,
      locationSlug: context.location?.slug || undefined, agenda: context.ownAgenda ? 'mine' : 'all', period: context.selectedPeriod });
  } catch { throw new PuriAccessError('FORBIDDEN'); }
  if (current.business.id !== context.business.id || current.location?.id !== context.location?.id ||
    current.staffId !== context.staffId || current.ownAgenda !== context.ownAgenda ||
    context.permissions.some(permission => !current.permissions.includes(permission))) throw new PuriAccessError('FORBIDDEN');
  return { ...current, permissions: [...context.permissions], locationCount: Math.max(context.locationCount, current.locationCount) };
}
