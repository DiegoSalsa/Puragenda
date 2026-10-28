"use client";
import type { ComponentProps } from "react";
import LegacyBillingPanel from "./billing-panel";
import styles from "./website-builder.module.css";

export default function CommercialWebsiteBillingPanel(props: ComponentProps<typeof LegacyBillingPanel>) {
  if (props.addon?.provider !== "included") return <LegacyBillingPanel {...props} />;
  return <details id="website-billing" className={styles.googleSettings}>
    <summary>Sitio web incluido en Puragenda+</summary>
    <div><h3>TU SITIO FORMA PARTE DE TU PLAN</h3><p className={styles.helper}>Editor, hosting, SSL, subdominio y conexión de dominio propio incluidos. La compra del dominio se paga por separado.</p><p className={styles.helper}>Durante la prueba puedes crear y publicar tu sitio. El acceso sigue la vigencia de tu plan; tus textos y configuraciones se conservan al vencer.</p></div>
  </details>;
}

export type { EditorAddon, EditorPrice } from "./billing-panel";
