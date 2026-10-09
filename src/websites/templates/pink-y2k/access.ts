/** Deliberately unavailable to every tenant and every production deployment. */
export function pinkPrototypeAllowed(
  environment: string | undefined,
  enabled: string | undefined,
  host: string | null,
) {
  return (
    environment === "development" &&
    enabled === "1" &&
    /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host ?? "")
  );
}
