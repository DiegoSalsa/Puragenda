#!/usr/bin/env node
/**
 * Local public-link auditor for SEO-003.
 * Usage: node scripts/audit-public-links.mjs [baseUrl]
 */
const BASE = (process.argv[2] || process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const SITE_HOSTS = new Set(["www.puragenda.cl", "puragenda.cl", "puragenda.vercel.app", "127.0.0.1", "localhost"]);
const SKIP_SCHEMES = /^(mailto:|tel:|javascript:|#)/i;
const USER_AGENT = "PuragendaLinkAudit/1.0 (+https://www.puragenda.cl)";

function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function classifyHref(href, pageUrl) {
  if (!href || SKIP_SCHEMES.test(href)) return null;
  let resolved;
  try {
    resolved = new URL(href, pageUrl);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(resolved.protocol)) return null;
  const internal = SITE_HOSTS.has(resolved.hostname);
  return {
    href,
    resolved: resolved.toString(),
    internal,
    host: resolved.hostname,
    path: normalizePath(resolved.pathname),
  };
}

function extractHrefs(html) {
  const found = [];
  const re = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi;
  let match;
  while ((match = re.exec(html))) {
    found.push(match[2]);
  }
  const author = /<link\b[^>]*\brel=["']author["'][^>]*\bhref=["']([^"']+)["']/i.exec(html)
    || /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']author["']/i.exec(html);
  if (author) found.push(author[1]);
  return found;
}

async function probe(url) {
  const chain = [];
  let current = url;
  for (let hop = 0; hop < 6; hop += 1) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
    });
    const location = response.headers.get("location");
    chain.push({ url: current, status: response.status, location });
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    let html = "";
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("html") || contentType.includes("xml") || contentType.includes("text")) {
      html = await response.text();
    } else {
      await response.arrayBuffer();
    }
    return { chain, finalUrl: current, status: response.status, html };
  }
  return { chain, finalUrl: current, status: chain.at(-1)?.status ?? 0, html: "" };
}

function summarizeChain(chain) {
  const hops = Math.max(0, chain.length - 1);
  const first = chain[0];
  const last = chain.at(-1);
  const redirectStatuses = chain.slice(0, -1).map((item) => item.status);
  const temporary = redirectStatuses.some((status) => status === 302 || status === 307);
  return {
    hops,
    firstStatus: first?.status ?? 0,
    finalStatus: last?.status ?? 0,
    finalUrl: last?.url ?? "",
    temporary,
    chain: chain.map((item) => `${item.status}${item.location ? `→${item.location}` : ""}`).join(" | "),
  };
}

async function main() {
  const sitemapProbe = await probe(`${BASE}/sitemap.xml`);
  const sitemapUrls = [...(sitemapProbe.html.match(/<loc>([^<]+)<\/loc>/g) || [])]
    .map((entry) => entry.replace(/<\/?loc>/g, ""));
  if (sitemapUrls.length === 0) {
    throw new Error(`No sitemap URLs from ${BASE}/sitemap.xml (${sitemapProbe.status})`);
  }

  const pageResults = [];
  const linkRows = [];
  const inbound = new Map();

  for (const page of sitemapUrls) {
    const localPage = new URL(new URL(page).pathname, `${BASE}/`).toString();
    const probed = await probe(localPage);
    const summary = summarizeChain(probed.chain);
    pageResults.push({ page: new URL(page).pathname, ...summary });
    const hrefs = extractHrefs(probed.html);
    for (const href of hrefs) {
      const classified = classifyHref(href, localPage);
      if (!classified) continue;
      linkRows.push({
        origin: new URL(page).pathname === "/" ? "/" : new URL(page).pathname,
        ...classified,
      });
      if (classified.internal) {
        inbound.set(classified.path, (inbound.get(classified.path) ?? 0) + 1);
      }
    }
  }

  const uniqueExternal = new Map();
  const uniqueInternal = new Map();
  for (const row of linkRows) {
    const key = row.resolved;
    const bucket = row.internal ? uniqueInternal : uniqueExternal;
    if (!bucket.has(key)) bucket.set(key, { ...row, origins: new Set() });
    bucket.get(key).origins.add(row.origin);
  }

  const probedTargets = new Map();
  async function ensureProbe(url) {
    if (!probedTargets.has(url)) {
      probedTargets.set(url, summarizeChain((await probe(url)).chain));
    }
    return probedTargets.get(url);
  }

  const externalIssues = [];
  for (const [url, meta] of uniqueExternal) {
    const result = await ensureProbe(url);
    const broken = result.finalStatus >= 400 || result.finalStatus === 0;
    const authOrBot = /google\.(com|cl)|instagram\.com|whatsapp\.com|wa\.me/.test(url);
    if (broken || result.temporary || result.hops > 0) {
      externalIssues.push({
        url,
        origins: [...meta.origins],
        ...result,
        broken,
        likelyFalsePositive: authOrBot && !broken,
      });
    }
  }

  const internalRedirectLinks = [];
  for (const [url, meta] of uniqueInternal) {
    const result = await ensureProbe(url);
    if (result.hops > 0) {
      internalRedirectLinks.push({
        href: url,
        origins: [...meta.origins],
        ...result,
      });
    }
  }

  const sitemapPaths = sitemapUrls.map((url) => {
    const path = new URL(url).pathname;
    return path === "/" ? "/" : path.replace(/\/+$/, "");
  });
  const orphans = sitemapPaths.filter((path) => path !== "/" && (inbound.get(path) ?? 0) === 0);
  const underlinked = sitemapPaths.filter((path) => path !== "/" && (inbound.get(path) ?? 0) === 1);

  const brokenExternalOccurrences = linkRows.filter((row) => {
    if (row.internal) return false;
    const result = probedTargets.get(row.resolved);
    return result && result.finalStatus >= 400;
  }).length;
  const internalRedirectOccurrences = linkRows.filter((row) => {
    if (!row.internal) return false;
    const result = probedTargets.get(row.resolved);
    return result && result.hops > 0;
  }).length;
  const redirectChains = internalRedirectLinks.filter((item) => item.hops >= 2).length;

  const report = {
    base: BASE,
    sitemapPages: sitemapPaths.length,
    uniqueExternal: uniqueExternal.size,
    uniqueInternal: uniqueInternal.size,
    brokenExternalOccurrences,
    uniqueBrokenExternal: externalIssues.filter((item) => item.broken).length,
    internalRedirectOccurrences,
    uniqueInternalRedirectTargets: internalRedirectLinks.length,
    redirectChains,
    orphans,
    underlinked,
    internalRedirectLinks,
    externalIssues,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
