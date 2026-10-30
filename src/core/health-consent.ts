// A stable text/version shared by the checkbox and the server evidence.
export const HEALTH_CONSENT_VERSION = "health-form-2026-10-30-v1";
export const HEALTH_CONSENT_TEXT = "Declaro que la información proporcionada es verdadera y acepto que el negocio revise estos antecedentes de salud para evaluar mi solicitud y pueda rechazarla.";
const texts: Record<string, string> = {
  es: HEALTH_CONSENT_TEXT,
  en: "I confirm that the information provided is true and agree that the business may review this health information to assess my request and may decline it.",
  pt: "Declaro que as informações fornecidas são verdadeiras e aceito que o estabelecimento analise estes dados de saúde para avaliar minha solicitação e possa recusá-la.",
  it: "Dichiaro che le informazioni fornite sono veritiere e accetto che l'attività esamini questi dati sanitari per valutare la mia richiesta e possa rifiutarla.",
  fr: "Je déclare que les informations fournies sont exactes et j'accepte que l'établissement examine ces informations de santé pour évaluer ma demande et puisse la refuser.",
  de: "Ich bestätige, dass die Angaben wahrheitsgemäß sind, und stimme zu, dass der Betrieb diese Gesundheitsinformationen zur Prüfung meiner Anfrage einsehen und die Anfrage ablehnen darf.",
  "zh-CN": "我声明所提供的信息真实，并同意商家审阅这些健康信息以评估我的申请，且可能拒绝该申请。",
};
export function healthConsentText(locale = "es") { return texts[locale] ?? HEALTH_CONSENT_TEXT; }
