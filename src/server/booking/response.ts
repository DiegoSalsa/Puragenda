export function bookingJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", Vary: "x-api-key" } });
}
