"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import { saveLoyaltyConfigAction } from "@/server/actions/dashboard.actions";
import { Loader2, Save, ToggleLeft, ToggleRight, Gift, Hash, Percent, DollarSign } from "lucide-react";

interface LoyaltyConfigFormProps {
  initialData: {
    isLoyaltyEnabled: boolean;
    stampsRequired: number;
    rewardName: string;
    discountType: string;
    discountValue: number;
    loyaltyCodePrefix: string;
  };
}

export function LoyaltyConfigForm({ initialData }: LoyaltyConfigFormProps) {
  const legacy = useTranslations("legacy");
  const [isEnabled, setIsEnabled] = useState(initialData.isLoyaltyEnabled);
  const [stampsRequired, setStampsRequired] = useState(initialData.stampsRequired);
  const [rewardName, setRewardName] = useState(initialData.rewardName);
  const [discountType, setDiscountType] = useState(initialData.discountType);
  const [discountValue, setDiscountValue] = useState(initialData.discountValue);
  const [loyaltyCodePrefix, setLoyaltyCodePrefix] = useState(initialData.loyaltyCodePrefix);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await saveLoyaltyConfigAction({
      isLoyaltyEnabled: isEnabled,
      stampsRequired,
      rewardName,
      discountType,
      discountValue,
      loyaltyCodePrefix,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: legacy("u3_t2x7hfcU6") });
    }

    setLoading(false);
    setTimeout(() => setMessage(null), 4000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium"><LocalizedText id="3Fsd3_4p-Tbb" /></p>
          <p className="text-xs text-muted-foreground">
            {isEnabled ? legacy("dsOLd6Gjm_X_") : legacy("eMrosfqSnkAk")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsEnabled(!isEnabled)}
          className="h-11 w-11 flex items-center justify-center transition-colors duration-200"
          aria-label={isEnabled ? "Desactivar" : "Activar"}
        >
          {isEnabled ? (
            <ToggleRight className="h-10 w-10 text-[#7C3AED]" />
          ) : (
            <ToggleLeft className="h-10 w-10 text-muted-foreground" />
          )}
        </button>
      </div>

      <div className="h-px bg-border" />

      {/* Config fields — visually dimmed if disabled */}
      <div className={`space-y-5 transition-opacity duration-300 ${isEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
        {/* Stamps Required */}
        <div className="space-y-1.5">
          <label htmlFor="stampsRequired" className="flex items-center gap-2 text-sm font-medium">
            <Hash className="h-4 w-4 text-[#7C3AED]" />
            <LocalizedText id="-ArpPW2eBDfG" />
          </label>
          <input
            id="stampsRequired"
            type="number"
            min={1}
            max={50}
            value={stampsRequired}
            onChange={(e) => setStampsRequired(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/30"
          />
          <p className="text-xs text-muted-foreground"><LocalizedText id="aHvTYQHcYTL7" /></p>
        </div>

        {/* Reward Name */}
        <div className="space-y-1.5">
          <label htmlFor="rewardName" className="flex items-center gap-2 text-sm font-medium">
            <Gift className="h-4 w-4 text-[#7C3AED]" />
            <LocalizedText id="nBMscV3Ms_bs" />
          </label>
          <input
            id="rewardName"
            type="text"
            value={rewardName}
            onChange={(e) => setRewardName(e.target.value)}
            placeholder={legacy("jdduhvPed4B1")}
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="loyaltyCodePrefix" className="flex items-center gap-2 text-sm font-medium">
            <Hash className="h-4 w-4 text-[#7C3AED]" />
            <LocalizedText id="3YuhjeQbqnP2" />
          </label>
          <input
            id="loyaltyCodePrefix"
            type="text"
            maxLength={16}
            value={loyaltyCodePrefix}
            onChange={(e) => setLoyaltyCodePrefix(e.target.value.toUpperCase())}
            placeholder={legacy("sy2FbBPdnUOR")}
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 font-mono text-sm uppercase outline-none transition-colors focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/30"
          />
          <p className="text-xs text-muted-foreground">
            <LocalizedText id="qrqZksCKT4dw" /> {(loyaltyCodePrefix.trim() || "PREMIO").toUpperCase()}<LocalizedText id="11MsNcjpBRgW" />
          </p>
        </div>

        {/* Discount Type */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <LocalizedText id="KrtBnOO1iiH9" />
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setDiscountType("PERCENTAGE")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all duration-200 ${
                discountType === "PERCENTAGE"
                  ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                  : "border-border bg-muted text-muted-foreground hover:border-[#7C3AED]/30"
              }`}
            >
              <Percent className="h-4 w-4" />
              <LocalizedText id="tKXpGZhUl_nJ" />
            </button>
            <button
              type="button"
              onClick={() => setDiscountType("FIXED")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all duration-200 ${
                discountType === "FIXED"
                  ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                  : "border-border bg-muted text-muted-foreground hover:border-[#7C3AED]/30"
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <LocalizedText id="1z9Mmx_dtMYH" />
            </button>
          </div>
        </div>

        {/* Discount Value */}
        <div className="space-y-1.5">
          <label htmlFor="discountValue" className="flex items-center gap-2 text-sm font-medium">
            <LocalizedText id="H90hEZUL3lxa" />
          </label>
          <div className="relative">
            <input
              id="discountValue"
              type="number"
              min={0}
              max={discountType === "PERCENTAGE" ? 100 : 999999}
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 pr-12 text-sm outline-none transition-colors focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/30"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {discountType === "PERCENTAGE" ? "%" : "$"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {discountType === "PERCENTAGE"
              ? legacy("i5a43xBc4JAn")
              : legacy("pI4AjEmucA2d")}
          </p>
        </div>
      </div>

      {/* Preview */}
      {isEnabled && (
        <div className="rounded-xl border border-dashed border-[#7C3AED]/30 bg-[#7C3AED]/5 p-4 animate-fade-up">
          <p className="text-xs font-medium text-[#7C3AED] mb-2"><LocalizedText id="yeYAoB9GrrMB" /></p>
          <p className="text-sm text-foreground">
            <LocalizedText id="mytP-rADnT4T" /> <strong>{stampsRequired}</strong> <LocalizedText id="ME9d-yHEObYK" />{" "}
            <strong>{rewardName || "Premio"}</strong> —{" "}
            {discountType === "PERCENTAGE"
              ? `${discountValue}% de descuento`
              : `$${discountValue.toLocaleString()} de descuento`}
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-6 h-11 text-sm font-medium text-white transition-all duration-200 hover:bg-[#6D28D9] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <LocalizedText id="dowjI1lRaqyF" />
        </button>

        {message && (
          <p className={`text-sm font-medium animate-fade-in ${message.type === "success" ? "text-emerald-500" : "text-red-500"}`}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
