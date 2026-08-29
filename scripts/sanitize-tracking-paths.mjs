import pg from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL or DIRECT_URL is required");

const staticPaths = new Set(["/", "/pricing", "/caracteristicas", "/soluciones", "/faq", "/sobre-nosotros", "/contacto", "/politica-de-privacidad", "/terminos-y-condiciones", "/privacidad/solicitud", "/login", "/register", "/guias"]);
const patterns = [
  [/^\/widget\/[^/]+(?:\/.*)?$/, "/widget/[slug]"],
  [/^\/cita\/[^/]+(?:\/.*)?$/, "/cita/[appointment]"],
  [/^\/reagendar\/[^/]+(?:\/.*)?$/, "/reagendar/[appointment]"],
  [/^\/s\/[^/]+(?:\/.*)?$/, "/s/[token]"],
  [/^\/mi-plan\/[^/]+(?:\/.*)?$/, "/mi-plan/[token]"],
  [/^\/mi-agenda\/(?:entrar|activar|restablecer)\/[^/]+(?:\/.*)?$/, "/mi-agenda/[action]/[token]"],
  [/^\/mis-premios\/[^/]+(?:\/.*)?$/, "/mis-premios/[client]"],
  [/^\/responder\/[^/]+(?:\/.*)?$/, "/responder/[token]"],
  [/^\/encargo\/[^/]+(?:\/.*)?$/, "/encargo/[order]"],
  [/^\/guias\/[^/]+(?:\/.*)?$/, "/guias/[slug]"],
  [/^\/para\/[^/]+(?:\/.*)?$/, "/para/[industry]"],
];

function normalize(path) {
  if (staticPaths.has(path)) return path;
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return "/dashboard/[section]";
  if (path === "/auth" || path.startsWith("/auth/")) return "/auth/[action]";
  for (const [pattern, replacement] of patterns) if (pattern.test(path)) return replacement;
  const first = path.split("/").filter(Boolean)[0];
  return first && /^[a-z0-9-]{1,40}$/i.test(first) ? `/${first}/[other]` : "/other";
}

const client = new pg.Client({ connectionString });
await client.connect();
try {
  const result = await client.query('SELECT "id", "path" FROM "TrackingEvent" WHERE "path" IS NOT NULL');
  const changed = result.rows.map((row) => ({ id: row.id, path: normalize(row.path) })).filter((row, index) => row.path !== result.rows[index].path);
  await client.query("BEGIN");
  for (const row of changed) await client.query('UPDATE "TrackingEvent" SET "path" = $1 WHERE "id" = $2', [row.path, row.id]);
  await client.query("COMMIT");
  console.log(`Sanitized ${changed.length} of ${result.rows.length} stored tracking paths.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
