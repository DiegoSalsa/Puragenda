"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import {
  Mail,
  Send,
  Users,
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowUpRight,
  Clock,
  Sparkles,
  Zap,
} from "lucide-react";
import type { SubscriptionPlan } from "@/core/entities";

interface MarketingDashboardProps {
  plan: SubscriptionPlan;
  campaignsSentThisMonth: number;
  maxCampaignsPerMonth: number;
  maxAudienceSize: number;
  lastCampaign: {
    subject: string;
    audienceSize: number;
    sentAt: string;
  } | null;
  history: Array<{
    id: string;
    subject: string;
    audienceSize: number;
    sentAt: string;
  }>;
}

export function MarketingDashboard({
  plan,
  campaignsSentThisMonth,
  maxCampaignsPerMonth,
  maxAudienceSize,
  history,
}: MarketingDashboardProps) {
  const legacy = useTranslations("legacy");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const hasReachedLimit = campaignsSentThisMonth >= maxCampaignsPerMonth;
  const campaignProgress = Math.min(
    (campaignsSentThisMonth / maxCampaignsPerMonth) * 100,
    100
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading || hasReachedLimit) return;

    setIsLoading(true);
    setAlert(null);

    try {
      const res = await fetch("/api/marketing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });

      const data = await res.json();

      if (res.status === 403) {
        setAlert({
          type: "error",
          title: "Límite alcanzado",
          message:
            data.message ||
            "Ya enviaste tu campaña de marketing este mes.",
        });
      } else if (!res.ok) {
        setAlert({
          type: "error",
          title: data.error || "Error",
          message:
            data.message ||
            "Ocurrió un error al enviar la campaña. Intenta de nuevo.",
        });
      } else {
        setAlert({
          type: "success",
          title: "¡Campaña enviada!",
          message:
            data.message ||
            `Se enviaron ${data.audienceSize} correos exitosamente.`,
        });
        setSubject("");
        setMessage("");
      }
    } catch {
      setAlert({
        type: "error",
        title: "Error de conexión",
        message: "No se pudo conectar con el servidor. Verifica tu conexión.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Status Cards + Upsell ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card: Campañas este mes */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10">
              <CalendarCheck className="h-5 w-5 text-brand-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                <LocalizedText id="xKN0BWAaalV0" />
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {campaignsSentThisMonth}
                <span className="text-base font-normal text-muted-foreground">
                  /{maxCampaignsPerMonth}
                </span>
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${campaignProgress}%`,
                background: hasReachedLimit
                  ? "#ef4444"
                  : "linear-gradient(90deg, #7C3AED, #5B21B6)",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {hasReachedLimit
              ? legacy("xwr21iB8a9da")
              : legacy("h-gOuZwe_Cak")}
          </p>
        </div>

        {/* Card: Audiencia máxima */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10">
              <Users className="h-5 w-5 text-brand-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                <LocalizedText id="gI18MBWbnlEd" />
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {maxAudienceSize}
                <span className="text-base font-normal text-muted-foreground ml-1">
                  <LocalizedText id="YSdLUttbKVDp" />
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <Sparkles className="h-3.5 w-3.5 text-brand-foreground" />
            <p className="text-xs text-muted-foreground">
              <LocalizedText id="-o7Qvavda8sc" />{" "}
              <span className="font-semibold text-foreground">
                {plan === "EQUIPO" ? "Equipo" : "Individual"}
              </span>
            </p>
          </div>
        </div>

        {/* Upsell Card (only for Individual plan) */}
        {plan === "INDIVIDUAL" && (
          <div className="relative overflow-hidden rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-br from-[#7C3AED]/5 via-card to-[#5B21B6]/5 p-5 sm:col-span-2 lg:col-span-1">
            {/* Decorative glow */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#7C3AED]/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-brand-foreground" />
                <p className="text-sm font-bold text-brand-foreground"><LocalizedText id="tZPxciA1J9Lf" /></p>
              </div>
              <p className="text-sm text-foreground font-medium mb-1">
                <LocalizedText id="Svh1yjA2EoHN" />
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                <LocalizedText id="puS1LzzdPQDP" /> <strong className="text-foreground"><LocalizedText id="rKYC_KbSPWUU" /></strong> <LocalizedText id="XBFytghkURh4" />
              </p>
              <a
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[#6D28D9] hover:shadow-lg hover:shadow-[#7C3AED]/25"
              >
                <LocalizedText id="xVhYWNLErACL" />
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── Alert ── */}
      {alert && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 ${
            alert.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-red-500/20 bg-red-500/5"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          )}
          <div>
            <p
              className={`text-sm font-semibold ${
                alert.type === "success" ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {alert.title}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{alert.message}</p>
          </div>
        </div>
      )}

      {/* ── Campaign Form ── */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10">
            <Mail className="h-5 w-5 text-brand-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              <LocalizedText id="sdgyG7X7yxoJ" />
            </h2>
            <p className="text-xs text-muted-foreground">
              <LocalizedText id="HVMQ4aWUALBz" />
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject */}
          <div>
            <label
              htmlFor="campaign-subject"
              className="mb-1.5 block text-sm font-medium"
            >
              <LocalizedText id="6Ah5cch1Mkxm" />
            </label>
            <input
              id="campaign-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={legacy("EsL_BIJzBuMt")}
              disabled={isLoading || hasReachedLimit}
              maxLength={120}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm transition-colors placeholder:text-muted-foreground/50 focus:border-[#7C3AED]/50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="campaign-message"
              className="mb-1.5 block text-sm font-medium"
            >
              <LocalizedText id="0q8xcS6tBBRo" />
            </label>
            <textarea
              id="campaign-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={legacy("mQ6uhq4BsgMr")}
              disabled={isLoading || hasReachedLimit}
              rows={5}
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed transition-colors placeholder:text-muted-foreground/50 focus:border-[#7C3AED]/50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {message.length}/2000
            </p>
          </div>

          {/* Submit */}
          <button
            id="btn-nueva-campana"
            type="submit"
            disabled={
              isLoading ||
              hasReachedLimit ||
              !subject.trim() ||
              !message.trim()
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#6D28D9] hover:shadow-lg hover:shadow-[#7C3AED]/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <LocalizedText id="gW3Ouj6Rm0Rb" />
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <LocalizedText id="uz8Tq3Oj2sV1" />
              </>
            )}
          </button>

          {/* Strategic text */}
          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            <Sparkles className="inline h-3 w-3 text-brand-foreground mr-1" />
            <LocalizedText id="BEJP7d-AmnCE" />
          </p>
        </form>
      </div>

      {/* ── Campaign History ── */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10">
              <Clock className="h-5 w-5 text-brand-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                <LocalizedText id="XNlCvrrxIS2U" />
              </h2>
              <p className="text-xs text-muted-foreground">
                <LocalizedText id="JOaSOXvqeaDg" />
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <LocalizedText id="Sc_7-FpoqETz" />
                  </th>
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <LocalizedText id="jKqRfKGFWUnr" />
                  </th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <LocalizedText id="k7Kp73gsrNZx" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate max-w-[200px] sm:max-w-[300px]">
                          {campaign.subject}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#7C3AED]/10 px-2.5 py-0.5 text-xs font-medium text-brand-foreground">
                        <Users className="h-3 w-3" />
                        {campaign.audienceSize}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(campaign.sentAt).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
