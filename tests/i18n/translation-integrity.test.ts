import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  resolveInitialLocale,
  resolveLocale,
} from "../../src/i18n/config";

type MessageTree = { [key: string]: string | MessageTree };

function flattenMessages(tree: MessageTree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((result, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") result[path] = value;
    else Object.assign(result, flattenMessages(value, path));
    return result;
  }, {});
}

function loadMessages(locale: string) {
  const file = resolve(process.cwd(), "messages", `${locale}.json`);
  return flattenMessages(JSON.parse(readFileSync(file, "utf8")) as MessageTree);
}

describe("internationalization catalogs", () => {
  it("keeps every locale aligned with the Spanish source catalog", () => {
    const sourceKeys = Object.keys(loadMessages(DEFAULT_LOCALE)).sort();
    expect(sourceKeys.length).toBeGreaterThan(100);

    for (const locale of SUPPORTED_LOCALES) {
      const messages = loadMessages(locale);
      expect(Object.keys(messages).sort(), locale).toEqual(sourceKeys);
      expect(Object.values(messages).every((message) => message.trim().length > 0), locale).toBe(true);
    }
  });

  it("resolves common browser language tags safely", () => {
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("it-IT")).toBe("it");
    expect(resolveLocale("pt-BR")).toBe("pt");
    expect(resolveLocale("zh-TW")).toBe("zh-CN");
    expect(resolveLocale("unknown")).toBe(DEFAULT_LOCALE);
  });

  it("opens in Spanish unless the visitor explicitly saved another language", () => {
    expect(resolveInitialLocale(undefined)).toBe("es");
    expect(resolveInitialLocale(null)).toBe("es");
    expect(resolveInitialLocale("en")).toBe("en");
  });
});
