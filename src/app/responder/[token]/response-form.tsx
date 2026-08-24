"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Send } from "@/components/icons/hover-icons";

type Field = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
};

export function ResponseForm({
  token,
  question,
  fields,
  initialThanks = false,
}: {
  token: string;
  question: string;
  fields: Field[];
  initialThanks?: boolean;
}) {
  const legacy = useTranslations("legacy");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialThanks);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-interactions/form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answers, comment, rating: rating ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || legacy("FwkZ9mZ4ThOE"));
        return;
      }
      setDone(true);
    } catch {
      setError(legacy("FwkZ9mZ4ThOE"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
        <div className="w-full rounded-2xl border border-emerald-500/20 bg-card p-8 text-center shadow-2xl">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <h1 className="mt-4 text-2xl font-bold"><LocalizedText id="uyT8RFVFy_L8" /></h1>
          <p className="mt-2 text-sm text-muted-foreground"><LocalizedText id="XhNCvhuOLYyV" /></p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6">
      <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#7C3AED]">Puragenda</p>
          <h1 className="mt-2 text-2xl font-bold">{question}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.length === 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground"><LocalizedText id="TfiIBI7rb_0z" /></label>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, index) => index + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
                      rating === value ? "border-[#7C3AED] bg-[#7C3AED] text-white" : "border-border bg-muted"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <label htmlFor={field.id} className="text-sm font-medium text-muted-foreground">
                {field.label}
              </label>
              <textarea
                id={field.id}
                required={field.required}
                value={answers[field.label] || ""}
                onChange={(event) => setAnswers((prev) => ({ ...prev, [field.label]: event.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-[#7C3AED]/40"
              />
            </div>
          ))}

          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium text-muted-foreground"><LocalizedText id="Iyn5mpiewA6f" /></label>
            <textarea
              id="comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:border-[#7C3AED]/40"
            />
          </div>

          {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5B21B6] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <LocalizedText id="WjSK3kX6TUW2" />
          </button>
        </form>
      </div>
    </div>
  );
}
