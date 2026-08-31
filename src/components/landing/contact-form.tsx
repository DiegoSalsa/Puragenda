"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/analytics/client";

export function ContactForm() {
  const t = useTranslations("contact");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = encodeURIComponent(
      t("whatsappMessage", { name, email, message })
    );
    track("whatsapp_clicked", { placement: "contact_form" });
    void fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ name, email, message, website, sourcePath: window.location.pathname }),
    })
      .then((response) => {
        if (response.ok) track("contact_lead_submitted", { placement: "contact_form" });
      })
      .catch(() => undefined);
    window.open(`https://wa.me/56949255006?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-black border-4 border-black dark:border-white p-8 rounded-2xl shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFFFF] space-y-4"
    >
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="contact-website">Sitio web</label>
        <input id="contact-website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-black uppercase mb-1">{t("name")}</label>
        <input
          type="text"
          required
          minLength={2}
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border-2 border-black dark:border-white bg-transparent p-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
          placeholder={t("namePlaceholder")}
        />
      </div>
      <div>
        <label className="block text-sm font-black uppercase mb-1">{t("email")}</label>
        <input
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-2 border-black dark:border-white bg-transparent p-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
          placeholder="tu@email.com"
        />
      </div>
      <div>
        <label className="block text-sm font-black uppercase mb-1">{t("message")}</label>
        <textarea
          rows={4}
          required
          minLength={10}
          maxLength={3000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border-2 border-black dark:border-white bg-transparent p-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
          placeholder={t("messagePlaceholder")}
        />
      </div>
      <button
        type="submit"
        className="w-full bg-[#7C3AED] text-white border-4 border-black dark:border-white px-6 py-4 font-black uppercase text-lg shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:translate-y-1 transition-transform mt-4"
      >
        {t("sendWhatsapp")} →
      </button>
    </form>
  );
}
