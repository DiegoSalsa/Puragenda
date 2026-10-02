import { z } from "zod";
import { WebsiteError } from "./errors";
export type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string };
export type DomainResult = { verified: boolean; active: boolean; records: DnsRecord[]; message: string };
export interface DomainProvider {
  readonly key: "vercel" | "mock";
  addDomain(hostname: string): Promise<DomainResult>;
  getDomainStatus(hostname: string): Promise<DomainResult>;
  verifyDomain(hostname: string): Promise<DomainResult>;
  removeDomain(hostname: string): Promise<void>;
}
const projectSchema = z.object({ name: z.string(), apexName: z.string(), projectId: z.string(), verified: z.boolean(), verification: z.array(z.object({ type: z.string(), domain: z.string(), value: z.string() })).optional() });
const configSchema = z.object({ misconfigured: z.boolean(), configuredBy: z.string().nullable(), recommendedCNAME: z.array(z.object({ rank: z.number(), value: z.string() })), recommendedIPv4: z.array(z.object({ rank: z.number(), value: z.array(z.string()) })) });
export class VercelDomainProvider implements DomainProvider {
  readonly key = "vercel" as const;
  constructor(private token: string, private projectId: string, private teamId?: string, private transport: typeof fetch = fetch) {}
  private async request(path: string, method = "GET", body?: unknown) {
    const url = new URL(path, "https://api.vercel.com"); if (this.teamId) url.searchParams.set("teamId", this.teamId);
    let response: Response;
    try { response = await this.transport(url, { method, headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", signal: AbortSignal.timeout(8000) }); }
    catch { throw new WebsiteError("La conexión está tardando. Intenta verificar nuevamente en unos minutos."); }
    if (method === "DELETE" && response.status === 404) return null;
    if (!response.ok) {
      if (response.status === 409 || response.status === 400) throw new WebsiteError("El dominio necesita revisión: puede estar conectado a otro proyecto o requerir verificar su propiedad.");
      if (response.status === 404) throw new WebsiteError("El proveedor todavía no encuentra este dominio. Intenta conectarlo nuevamente.");
      throw new WebsiteError("No pudimos consultar la conexión del dominio. Intenta nuevamente.");
    }
    return response.status === 204 ? null : response.json();
  }
  private projectPath(hostname?: string, version = 9) { return `/v${version}/projects/${encodeURIComponent(this.projectId)}/domains${hostname ? `/${encodeURIComponent(hostname)}` : ""}`; }
  async addDomain(hostname: string) {
    try { await this.request(this.projectPath(undefined, 10), "POST", { name: hostname }); }
    catch {
      // A same-project response is not tenant ownership. The caller must have
      // completed the Puragenda TXT challenge before retrying/adopting it.
      throw new WebsiteError("El dominio ya existe o necesita verificación de propiedad antes de conectarse.");
    }
    return this.getDomainStatus(hostname);
  }
  async getDomainStatus(hostname: string): Promise<DomainResult> {
    const [project, config] = await Promise.all([
      this.request(this.projectPath(hostname)).then(value => projectSchema.parse(value)),
      this.request(`/v6/domains/${encodeURIComponent(hostname)}/config`).then(value => configSchema.parse(value)),
    ]);
    if (project.projectId !== this.projectId || project.name !== hostname) throw new WebsiteError("El dominio no está conectado al proyecto esperado");
    const records: DnsRecord[] = (project.verification ?? []).filter(record => record.type === "TXT").map(record => ({ type: "TXT", name: record.domain, value: record.value }));
    const cname = [...config.recommendedCNAME].sort((a, b) => a.rank - b.rank)[0];
    const ipv4 = [...config.recommendedIPv4].sort((a, b) => a.rank - b.rank)[0];
    if (hostname !== project.apexName && cname) records.push({ type: "CNAME", name: hostname, value: cname.value });
    else if (ipv4) ipv4.value.forEach(value => records.push({ type: "A", name: hostname, value }));
    const active = project.verified && !config.misconfigured && ["A", "CNAME", "http"].includes(config.configuredBy ?? "");
    return { verified: project.verified, active, records, message: active ? "Tu dominio está conectado. La conexión segura se gestiona automáticamente." : !project.verified ? "Agrega el registro de verificación y los registros de conexión." : "Esperamos los cambios de tu proveedor de dominio. Pueden tardar en propagarse." };
  }
  async verifyDomain(hostname: string) {
    const current = projectSchema.parse(await this.request(this.projectPath(hostname)));
    if (current.projectId !== this.projectId || current.name !== hostname) throw new WebsiteError("El dominio no está conectado al proyecto esperado");
    if (!current.verified) await this.request(`${this.projectPath(hostname)}/verify`, "POST");
    return this.getDomainStatus(hostname);
  }
  async removeDomain(hostname: string) { await this.request(this.projectPath(hostname), "DELETE"); }
}
export class MockDomainProvider implements DomainProvider {
  readonly key = "mock" as const;
  async addDomain(hostname: string) { return this.getDomainStatus(hostname); }
  async getDomainStatus(hostname: string): Promise<DomainResult> { return { verified: false, active: false, records: [{ type: "TXT", name: `_verify.${hostname}`, value: "demostracion-local-no-publicar" }, { type: "CNAME", name: hostname, value: "conexion-simulada.invalid" }], message: "Simulación local. No cambies los registros de tu dominio real." }; }
  async verifyDomain(hostname: string): Promise<DomainResult> { return { ...await this.getDomainStatus(hostname), verified: true, active: true, message: "Conectado en esta demostración local. Tu dominio real no se ha modificado." }; }
  async removeDomain() {}
}
export function websiteDomainProvider(): DomainProvider {
  if (process.env.NODE_ENV !== "production" && process.env.WEBSITE_QA === "1" && process.env.WEBSITE_DOMAIN_PROVIDER === "mock") return new MockDomainProvider();
  if (process.env.WEBSITE_DOMAIN_PROVIDER === "vercel" && process.env.WEBSITE_VERCEL_WRITES_ENABLED === "true" && process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) return new VercelDomainProvider(process.env.VERCEL_TOKEN, process.env.VERCEL_PROJECT_ID, process.env.VERCEL_TEAM_ID);
  throw new WebsiteError("La conexión de dominios todavía no está habilitada. Puedes solicitar ayuda desde aquí.");
}
