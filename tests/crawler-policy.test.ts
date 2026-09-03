import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as demoGet } from "@/app/demo/route";
import { GET as llmsGet } from "@/app/llms.txt/route";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  DEMO_LOGIN_PATH,
  DEMO_PUBLIC_PATH,
  SEARCH_AND_RETRIEVAL_USER_AGENTS,
  isKnownCrawler,
  isNoIndexPath,
  isPathDisallowedForCrawler,
} from "@/lib/crawler-policy";

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/soluciones",
  "/caracteristicas",
  "/faq",
  "/contacto",
  "/sobre-nosotros",
  "/alternativa-agendapro",
  "/para/barberias",
  "/para/peluquerias",
  "/funciones/reservas-online-con-abono",
  "/guias",
  "/guias/como-elegir-sistema-reservas-chile",
  "/demo",
  "/login",
  "/register",
  "/mi-agenda",
  "/dashboard",
];

const PRIVATE_DISALLOWED_PATHS = [
  "/api/auth/demo",
  "/api/auth/me",
  "/api/dashboard/appointments",
  "/admin/",
  "/cita/abc",
  "/encargo/1",
  "/mi-plan/token",
  "/mis-premios/1",
  "/reagendar/1",
  "/responder/token",
  "/para/x7k9m2v4q8",
  "/para/x7k9m2v4q8/login",
  "/s/token",
];

describe("crawler policy", () => {
  it("allows Googlebot and AI retrieval crawlers on public commercial pages", () => {
    expect(SEARCH_AND_RETRIEVAL_USER_AGENTS).toEqual(
      expect.arrayContaining([
        "Googlebot",
        "bingbot",
        "OAI-SearchBot",
        "ChatGPT-User",
        "Google-Extended",
      ]),
    );

    for (const path of PUBLIC_PATHS) {
      expect(isPathDisallowedForCrawler(path)).toBe(false);
    }
  });

  it("keeps APIs, admin and tokenized customer flows out of robots", () => {
    for (const path of PRIVATE_DISALLOWED_PATHS) {
      expect(isPathDisallowedForCrawler(path)).toBe(true);
    }
  });

  it("does not robots-disallow app surfaces that public pages link to", () => {
    for (const path of ["/dashboard", "/login", "/register", "/demo", "/auth/forgot-password", "/mi-agenda"]) {
      expect(isPathDisallowedForCrawler(path)).toBe(false);
      expect(isNoIndexPath(path)).toBe(true);
    }
  });

  it("does not treat industry landings as the hidden admin prefix", () => {
    expect(isPathDisallowedForCrawler("/para/barberias")).toBe(false);
    expect(isPathDisallowedForCrawler("/para/x7k9m2v4q8/users")).toBe(true);
  });

  it("emits a dedicated robots group per retrieval crawler", () => {
    const manifest = robots();
    const rules = Array.isArray(manifest.rules) ? manifest.rules : [manifest.rules];
    const userAgents = rules.flatMap((rule) => {
      if (!rule.userAgent) return [];
      return Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent];
    });

    expect(userAgents.filter((agent) => agent !== "*")).toEqual([...SEARCH_AND_RETRIEVAL_USER_AGENTS]);
    expect(manifest.sitemap).toBe("https://www.puragenda.cl/sitemap.xml");
    expect("host" in manifest).toBe(false);

    for (const rule of rules) {
      expect(rule.allow).toEqual("/");
      expect(rule.disallow).toEqual(expect.arrayContaining(["/api/", "/para/x7k9m2v4q8"]));
      expect(rule.disallow).not.toContain("/dashboard/");
      expect(rule.disallow).not.toContain("/auth/");
      expect(rule.disallow).not.toContain("/para/");
    }
  });

  it("keeps sitemap to indexable canonical public URLs", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://www.puragenda.cl");
    expect(urls).not.toContain("https://www.puragenda.cl/");
    expect(urls.some((url) => url.startsWith("http://"))).toBe(false);
    expect(urls.some((url) => url.includes("puragenda.vercel.app"))).toBe(false);

    for (const url of urls) {
      const path = new URL(url).pathname === "/" ? "/" : new URL(url).pathname;
      expect(isPathDisallowedForCrawler(path)).toBe(false);
      expect(isNoIndexPath(path)).toBe(false);
      expect(url.endsWith("/") && url !== "https://www.puragenda.cl/").toBe(false);
    }

    expect(urls.some((url) => url.includes("/dashboard"))).toBe(false);
    expect(urls.some((url) => url.includes("/login"))).toBe(false);
    expect(urls.some((url) => url.includes("/widget/"))).toBe(false);
    expect(urls.some((url) => url.includes("/api/"))).toBe(false);
    expect(urls.some((url) => url.includes("/para/x7k9m2v4q8"))).toBe(false);
    expect(urls).toContain("https://www.puragenda.cl/para/barberias");
  });

  it("does not advertise the robots-disallowed demo API in public HTML", () => {
    const marketingFiles = [
      "src/components/landing/footer.tsx",
      "src/components/landing/hero-section.tsx",
      "src/components/landing/ThemeNeoBrutalism.tsx",
      "src/components/landing/Theme70s.tsx",
      "src/app/para/[industry]/page.tsx",
    ];

    for (const file of marketingFiles) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toContain(`href="${DEMO_LOGIN_PATH}"`);
      expect(source).toContain(`href="${DEMO_PUBLIC_PATH}"`);
    }
  });

  it("serves a noindex document to crawlers on /demo and logs humans into the demo", async () => {
    const botResponse = demoGet(
      new NextRequest("http://localhost:3000/demo", {
        headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
      }),
    );
    expect(botResponse.status).toBe(200);
    expect(botResponse.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(await botResponse.text()).toContain("noindex");

    const humanResponse = demoGet(
      new NextRequest("http://localhost:3000/demo", {
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" },
      }),
    );
    expect(humanResponse.status).toBe(307);
    expect(humanResponse.headers.get("location")).toBe("http://localhost:3000/api/auth/demo");
  });

  it("keeps llms.txt as a complement to robots and sitemap", async () => {
    const response = llmsGet();
    const body = await response.text();
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(body).toContain("https://www.puragenda.cl/robots.txt");
    expect(body).toContain("https://www.puragenda.cl/sitemap.xml");
    expect(body).toContain("No sustituye");
    expect(body).toContain("/para/barberias");
    expect(body).not.toContain("/dashboard");
    expect(body).not.toContain("/api/");
  });

  it("recognizes search crawlers without treating browsers as bots", () => {
    expect(isKnownCrawler("Googlebot/2.1")).toBe(true);
    expect(isKnownCrawler("Mozilla/5.0 (compatible; bingbot/2.0)")).toBe(true);
    expect(isKnownCrawler("OAI-SearchBot/1.0")).toBe(true);
    expect(isKnownCrawler("ChatGPT-User/1.0")).toBe(true);
    expect(isKnownCrawler("Mozilla/5.0 (compatible; Google-Extended)")).toBe(true);
    expect(isKnownCrawler("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")).toBe(false);
  });
});
