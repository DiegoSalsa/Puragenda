"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Globe, Link2, LoaderCircle } from "lucide-react";
import { connectWebsiteDomain, checkWebsiteDomain, refreshWebsiteDomainStatus, disconnectWebsiteDomain, requestWebsiteDomain, setPrimaryWebsiteDomain, websiteSubdomainAvailability } from "@/server/actions/website.actions";
import type { DnsRecord } from "@/server/websites/domain-provider";
import styles from "./website-builder.module.css";
export type EditorDomain = { id: string; hostname: string; status: string; provider: string; records: DnsRecord[]; message: string | null; primary: boolean };
export default function DomainPanel({ subdomain, rootDomain, domains, requests, onSubdomain, canManage }: {
  subdomain: string; rootDomain: string; domains: EditorDomain[]; requests: { id: string; hostname: string; status: string }[];
  onSubdomain: (value: string) => void; canManage: boolean;
}) {
  const router = useRouter();
  const pollingAttempts = useRef(0), checkingDomain = useRef(false);
  const [candidate, setCandidate] = useState(subdomain), [availability, setAvailability] = useState<{ available: boolean; message: string } | null>(null);
  const [hostname, setHostname] = useState(""), [requested, setRequested] = useState(""), [message, setMessage] = useState(""), [copied, setCopied] = useState(""), [pending, start] = useTransition();
  function run(operation: () => Promise<unknown>, success: string) {
    start(async () => { setMessage(""); try { const result = await operation(); if (result && typeof result === "object" && "error" in result) throw new Error(String(result.error)); setMessage(typeof result === "string" ? result : success); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos completar el cambio"); router.refresh(); } });
  }
  useEffect(() => {
    if (candidate === subdomain) return;
    let cancelled = false;
    const timer = setTimeout(async () => { const result = await websiteSubdomainAvailability(candidate); if (!cancelled) setAvailability("error" in result ? { available: false, message: result.error } : result); }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [candidate, subdomain]);
  useEffect(() => {
    // Bound polling to visible active sessions, 30 seconds apart, at most five checks.
    const pendingDomains = domains.filter(domain => ["PENDING", "VERIFIED"].includes(domain.status) && domain.provider !== "mock");
    if (!pendingDomains.length) return;
    const timer = setInterval(async () => { if (document.hidden || checkingDomain.current || pollingAttempts.current >= 5) return; checkingDomain.current = true; pollingAttempts.current++; await Promise.allSettled(pendingDomains.map(domain => refreshWebsiteDomainStatus(domain.id))); checkingDomain.current = false; router.refresh(); }, 30000);
    return () => clearInterval(timer);
  }, [domains, router]);
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setCopied(value); } catch { setMessage("Puedes seleccionar y copiar el valor de la tabla."); } }
  return <div className={styles.panel}>
    <div className={styles.panelHeading}><h2>Dominio</h2><p className={styles.helper}>La dirección donde tus clientes encuentran tu negocio.</p></div>
    <div className={styles.domainAddress}><Globe size={17} /><p>{subdomain}.{rootDomain}</p><small className={styles.domainStatus}>Tu dirección en Puragenda</small></div>
    <details className={styles.googleSettings}><summary>Cambiar mi dirección</summary><div><label className={styles.field}>Nombre de tu dirección<input value={candidate} maxLength={63} onChange={event => { setCandidate(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setAvailability(null); }} /></label><p className={styles.helper}>{candidate}.{rootDomain}</p><p className={styles.helper}>{availability?.message ?? "Usa el nombre de tu negocio, sin espacios."}</p><button className={styles.secondary} disabled={!availability?.available || candidate === subdomain} onClick={() => { if (window.confirm("Al cambiar la dirección, el enlace anterior dejará de funcionar. ¿Quieres continuar?")) onSubdomain(candidate); }}>Usar esta dirección</button></div></details>
    <div className={styles.divider}><h3>¿Ya tienes tu dominio?</h3><p className={styles.helper}>Conéctalo para que tus clientes vean tu propia dirección.</p><label className={styles.field}>Tu dominio<input placeholder="tumarca.cl" value={hostname} onChange={event => setHostname(event.target.value)} /></label><button className={styles.primary} disabled={pending || !hostname || !canManage} onClick={() => run(() => connectWebsiteDomain(hostname), "Dominio agregado. Sigue las instrucciones de conexión.")}><Link2 size={15} />Conectar dominio</button>{!canManage ? <p className={styles.helper}>La persona propietaria del negocio puede conectar dominios.</p> : null}</div>
    {domains.map(domain => <div key={domain.id} className={styles.domainCard}><strong>{domain.hostname}</strong><span className={styles.domainStatus}>{domain.status === "ACTIVE" ? "Conectado" : domain.status === "FAILED" ? "Necesita atención" : domain.status === "VERIFIED" ? "Verificando la conexión" : "Esperando tus cambios"}{domain.primary ? " · dirección principal" : ""}</span>{domain.provider === "mock" ? <p className={styles.helper}>Demostración local. No modifica tu dominio real.</p> : null}<p className={styles.helper}>{domain.message || "Revisa los registros de tu proveedor de dominio."}</p>{domain.records.length ? <><p className={styles.helper}>{domain.provider === "mock" ? "Ejemplo simulado. No publiques estos registros." : "Copia estos registros en el lugar donde compraste tu dominio."}</p><table className={styles.dns}><thead><tr><th>Tipo</th><th>Nombre</th><th>Valor</th></tr></thead><tbody>{domain.records.map((record, index) => <tr key={index}><td>{record.type}</td><td>{record.name}<button className={styles.copy} aria-label={`Copiar nombre ${index + 1}`} onClick={() => void copy(record.name)}><Copy size={11} /></button></td><td>{record.value}<button className={styles.copy} aria-label={`Copiar valor ${index + 1}`} onClick={() => void copy(record.value)}>{copied === record.value ? <Check size={11} /> : <Copy size={11} />}</button></td></tr>)}</tbody></table></> : null}<div className={styles.row}><button className={styles.secondary} disabled={pending || !canManage} onClick={() => run(() => domain.status === "FAILED" ? refreshWebsiteDomainStatus(domain.id) : checkWebsiteDomain(domain.id), "Verificación completada")}>{pending ? <LoaderCircle size={13} /> : null}Verificar conexión</button>{domain.status === "ACTIVE" && !domain.primary ? <button className={styles.secondary} disabled={pending || !canManage} onClick={() => run(() => setPrimaryWebsiteDomain(domain.id), "Ahora es tu dirección principal")}>Usar como principal</button> : null}<button className={styles.secondary} disabled={pending || !canManage} onClick={() => { if (window.confirm(`¿Desconectar ${domain.hostname}? Tu dirección de Puragenda seguirá disponible.`)) run(() => disconnectWebsiteDomain(domain.id), "Dominio desconectado"); }}>Desconectar</button></div></div>)}
    <div className={styles.divider}><h3>¿Quieres tu propio .cl?</h3><p className={styles.helper}>Cuéntanos qué dirección te gustaría. Revisaremos disponibilidad y te enviaremos una cotización.</p><label className={styles.field}>La dirección que quieres<input value={requested} onChange={event => setRequested(event.target.value)} placeholder="minombre.cl" /></label><button className={styles.secondary} disabled={pending || !requested || !canManage} onClick={() => run(() => requestWebsiteDomain(requested, ""), "Solicitud recibida. Te ayudaremos a encontrar tu dirección.")}>Solicitar ayuda</button><p className={styles.helper}>Pedir una cotización no compra ni cobra un dominio.</p>{requests.map(request => <p key={request.id} className={styles.helper}>{request.hostname} · {request.status === "COMPLETED" ? "Solicitud completada" : request.status === "CANCELLED" ? "Solicitud cerrada" : request.status === "QUOTED" ? "Cotización preparada" : "Revisando tu solicitud"}</p>)}</div>
    {message ? <p className={styles.helper} role="status">{message}</p> : null}
  </div>;
}
