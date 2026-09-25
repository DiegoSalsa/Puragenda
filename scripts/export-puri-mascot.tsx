import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { PuriMascot, type PuriVariant } from "../src/components/brand/puri-mascot";

const destination = join(process.cwd(), "public", "brand", "puri");
mkdirSync(destination, { recursive: true });

for (const variant of ["default", "greeting", "wave", "thinking", "attention", "success"] satisfies PuriVariant[]) {
  const svg = renderToStaticMarkup(<PuriMascot variant={variant} xmlns="http://www.w3.org/2000/svg" width="512" height="512" />);
  writeFileSync(join(destination, `puri-${variant}.svg`), `${svg}\n`);
}

const avatar = renderToStaticMarkup(<PuriMascot compact xmlns="http://www.w3.org/2000/svg" width="128" height="128" />);
writeFileSync(join(destination, "puri-avatar.svg"), `${avatar}\n`);
