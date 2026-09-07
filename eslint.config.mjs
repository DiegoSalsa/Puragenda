import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // A later globalIgnores() replaces eslint-config-next's ignore block, so
  // Next.js defaults must be restated here. These patterns exclude local
  // artifacts only — src/, tests/, prisma/, scripts/, and project config
  // stay in scope.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Generated / vendor / coverage
    "coverage/**",
    ".vercel/**",
    "src/generated/**",
    "contexto/**",

    // Local QA scratch, including stale Next.js copies
    "scratch/**",

    // Chrome/Lighthouse SEO audit cache (profiles, extensions, dumps)
    ".seo-cache/**",

    // Gitignored marketing tree: PNG/caption kits plus a nested Remotion
    // project with duplicated agent skill copies. Not Puragenda runtime.
    // That Remotion app has its own eslint config under marketing/reels/.
    "marketing/**",

    // Local SEO/marketing exports (markdown reports may be tracked; they
    // are not lintable JS/TS anyway)
    "seo-audit-puragenda/**",
    "semrush-puragenda/**",
    "carruseles/**",
    "carruseles-instagram-septiembre-2026/**",
    "docs/seo/_seo014-browser/**",

    // Editor/agent attachments and one-off root scratch scripts
    ".codex-remote-attachments/**",
    "check*.ts",
    "migrate_locations.ts",
  ]),
]);

export default eslintConfig;
