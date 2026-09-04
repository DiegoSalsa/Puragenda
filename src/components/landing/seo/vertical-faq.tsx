import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { seo } from "./styles";

export function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <article className="border-b-2 border-black/10 py-6 last:border-b-0 dark:border-white/15">
      <h3 className="text-lg font-black tracking-tight sm:text-xl">{question}</h3>
      <p className={cn(seo.body, "mt-3 text-base")}>{answer}</p>
    </article>
  );
}

export function VerticalFaq({
  id,
  title,
  kicker = "Preguntas frecuentes",
  children,
}: {
  id: string;
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-14 sm:py-20" aria-labelledby={id}>
      <div className="text-center">
        <p className={seo.kicker}>{kicker}</p>
        <h2 id={id} className={cn(seo.h2, "mx-auto mt-3")}>
          {title}
        </h2>
      </div>
      <div className="mt-4 divide-y-0">{children}</div>
    </section>
  );
}
