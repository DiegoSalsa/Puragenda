import { resolveTxt } from 'node:dns/promises';

// DNS proof is a bounded lease, never a permanent ownership assertion.
export const WEBSITE_DNS_PROOF_MS = 24 * 60 * 60 * 1000;
export async function websiteTxtMatches(hostname: string, token: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const records = await Promise.race([
      resolveTxt(`_puragenda.${hostname}`),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('DNS_TIMEOUT')), 3000); }),
    ]);
    return records.some(record => record.join('') === token);
  } catch { return false; }
  finally { clearTimeout(timer); }
}
export async function websiteDomainOwnership(domain: { hostname: string; verificationToken: string; tenantVerifiedAt: Date | null }, now = new Date()) {
  if (!domain.tenantVerifiedAt || domain.tenantVerifiedAt > now) return false;
  if (now.getTime() - domain.tenantVerifiedAt.getTime() < WEBSITE_DNS_PROOF_MS) return true;
  return websiteTxtMatches(domain.hostname, domain.verificationToken);
}
