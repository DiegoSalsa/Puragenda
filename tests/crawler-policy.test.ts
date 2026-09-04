import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { metadata as demoMetadata } from "@/app/demo/layout";
import { metadata as notFoundMetadata } from "@/app/not-found";
import { GET as llmsGet } from "@/app/llms.txt/route";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  DEMO_LOGIN_PATH,
  DEMO_PUBLIC_PATH,
  NOT_FOUND_ROBOTS,
  SEARCH_AND_RETRIEVAL_USER_AGENTS,
  isNoIndexPath,
  isPathDisallowedForCrawler,
} from "@/lib/crawler-policy";

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/soluciones",
  "/caracteristicas",
  "/sistema-de-agendamiento-online",
  "/software-agenda-barberias",
  "/software-agenda-peluquerias",
  "/barberias",
  "/peluquerias",
  "/faq",
  "/contacto",
  "/sobre-nosotros",
  "/alternativa-agendapro",
  "/para/barberias",
  "/para/peluquerias",
  "/funciones/reservas-online-con-abono",
  "/guias",
  "/guias/como-elegir-sistema-reservas-chile",
  "/casos-de-exito",
  "/casos-de-exito/soccerbarber",
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

  it("serves /demo as a noindex page and starts the demo only via POST", () => {
    expect(demoMetadata.robots).toMatchObject({ index: false, follow: false });
    const demoPage = readFileSync(join(process.cwd(), "src/app/demo/page.tsx"), "utf8");
    const demoAction = readFileSync(join(process.cwd(), "src/server/actions/demo.actions.ts"), "utf8");
    expect(demoPage).toContain("startDemoAction");
    expect(demoPage).toContain("<form action={startDemoAction}>");
    expect(demoPage).not.toContain(DEMO_LOGIN_PATH);
    expect(demoAction).toContain("startDemoAction");
    expect(demoAction).toContain("redirect(\"/dashboard\")");
  });

  it("marks 404 metadata as noindex without a home canonical", () => {
    expect(notFoundMetadata.robots).toEqual(NOT_FOUND_ROBOTS);
    expect(notFoundMetadata.alternates).toEqual({ canonical: null });
    expect(notFoundMetadata.openGraph).not.toMatchObject({ url: "https://www.puragenda.cl" });
    expect(notFoundMetadata.openGraph).not.toMatchObject({ url: "/" });
  });

  it("keeps llms.txt as a complement to robots and sitemap", async () => {
    const response = llmsGet();
    const body = await response.text();
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(body).toContain("https://www.puragenda.cl/robots.txt");
    expect(body).toContain("https://www.puragenda.cl/sitemap.xml");
    expect(body).toContain("No sustituye");
    expect(body).toContain("/para/barberias");
    expect(body).toContain("/sistema-de-agendamiento-online");
    expect(body).toContain("/software-agenda-barberias");
    expect(body).toContain("/software-agenda-peluquerias");
    expect(body).not.toContain("/dashboard");
    expect(body).not.toContain("/api/");
  });

});
