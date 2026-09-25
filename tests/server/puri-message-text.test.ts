import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PuriMessageText } from "@/components/dashboard/puri-message-text";

describe("Puri answer text", () => {
  it("renders bold and bullets without exposing Markdown syntax", () => {
    const html = renderToStaticMarkup(createElement(PuriMessageText, { content: "Hoy revisaría dos cosas:\n- **Cerrar 2 citas pasadas**\n- Preparar la próxima cita" }));
    expect(html).toContain("<strong");
    expect(html).toContain("Cerrar 2 citas pasadas");
    expect(html).toContain("•");
    expect(html).not.toContain("**");
  });

  it("escapes untrusted HTML instead of inserting it", () => {
    const html = renderToStaticMarkup(createElement(PuriMessageText, { content: "<img src=x onerror=alert(1)>" }));
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });

  it("does not show unmatched bold markers", () => {
    const html = renderToStaticMarkup(createElement(PuriMessageText, { content: "**Revisar tu agenda" }));
    expect(html).toContain("Revisar tu agenda");
    expect(html).not.toContain("**");
  });
});
