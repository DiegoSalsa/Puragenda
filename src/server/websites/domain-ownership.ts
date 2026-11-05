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

type DomainProof = { hostname: string; verificationToken: string; tenantVerifiedAt: Date | null; status: string };
/** Reuse one resolution for links, canonical and review messages. A failed DNS
 * read never persists a transfer or removes a domain. */
export async function resolveWebsiteDomains<T extends DomainProof>(domains: T[], now = new Date()) {
  const proofs = new Map<string, Promise<boolean>>();
  const resolved = await Promise.all(domains.filter(domain => domain.status === 'ACTIVE').map(async domain => {
    const key = JSON.stringify([domain.hostname, domain.verificationToken, domain.tenantVerifiedAt?.getTime()]);
    let proof = proofs.get(key);
    if (!proof) { proof = websiteDomainOwnership(domain, now); proofs.set(key, proof); }
    return { domain, owned: await proof };
  }));
  return {
    active: resolved.filter(item => item.owned).map(item => item.domain),
    review: resolved.filter(item => !item.owned).map(item => item.domain),
  };
}
