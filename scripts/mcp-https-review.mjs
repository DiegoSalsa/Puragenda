import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { fromZonedTime } from "date-fns-tz";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Fictitious fixture only. This is a scripted MCP client, NOT ChatGPT evidence.
const directory = new URL("../artifacts/mcp/iteration-2/", import.meta.url);
let phase = "fixture configuration";
const clients = [];
try {
  const access = JSON.parse(await fs.readFile(new URL("review-access.json", directory), "utf8"));
  const fixture = JSON.parse(await fs.readFile(new URL("fixture.json", directory), "utf8"));
  const origin = access.origin;
  assert(new URL(origin).protocol === "https:" && new URL(origin).hostname.endsWith(".trycloudflare.com"), "Only the temporary isolated review host is allowed");
  const report = { classification: "VALIDADO MEDIANTE CLIENTE MCP", realChatGPT: false, selectionSource: "scripted", origin, toolCalls: [], scenarios: {}, verifiedAt: null };
  const secret = () => randomBytes(32).toString("base64url");
  const scopes = "account:read agenda:read analytics:read clients:read loyalty:read appointments:write";
  const resource = `${origin}/mcp`;
  const createSession = () => {
    const cookies = new Map();
    return async (path, options = {}) => {
      const url = new URL(path, origin); assert.equal(url.origin, origin, "Never forward cookies outside the fixture origin");
      const headers = new Headers(options.headers);
      if (cookies.size) headers.set("Cookie", [...cookies].map(([k, v]) => `${k}=${v}`).join("; "));
      const response = await fetch(url, { ...options, headers, redirect: "manual" });
      for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";")[0]; const i = pair.indexOf("="); cookies.set(pair.slice(0, i), pair.slice(i + 1)); }
      return response;
    };
  };
  const json = async (response, expected = 200) => { assert.equal(response.status, expected, `Unexpected HTTP status in ${phase}`); return response.json(); };
  async function link(account, businessId = "preview-business") {
    phase = "HTTPS metadata";
    const metadata = await json(await fetch(`${origin}/.well-known/oauth-authorization-server`)); assert.equal(metadata.issuer, origin); assert(metadata.code_challenge_methods_supported.includes("S256"));
    const protectedResource = await json(await fetch(`${origin}/.well-known/oauth-protected-resource/mcp`)); assert.equal(protectedResource.resource, resource);
    const request = createSession(); phase = "fixture login";
    await json(await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(account) }));
    phase = "DCR";
    const callback = "http://127.0.0.1:3110/callback";
    const client = await json(await request("/oauth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_name: "Puragenda isolated SDK review", redirect_uris: [callback], token_endpoint_auth_method: "none" }) }), 201);
    const verifier = secret(), state = secret();
    const query = new URLSearchParams({ response_type: "code", client_id: client.client_id, redirect_uri: callback, resource, scope: scopes,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", state });
    phase = "authorize";
    const auth = await request(`/oauth/authorize?${query}`); assert.equal(auth.status, 303);
    const consentUrl = new URL(auth.headers.get("location")); assert.equal(consentUrl.origin, origin);
    const consent = await request(consentUrl); assert.equal(consent.status, 200);
    const html = await consent.text(); assert(html.includes('name="businessId"'));
    const csrf = /name="csrf" value="([^"]+)"/.exec(html)?.[1]; assert(csrf);
    phase = "scripted fixture consent POST";
    const decision = await request("/oauth/decision", { method: "POST", headers: { Origin: origin }, body: new URLSearchParams({ requestId: consentUrl.searchParams.get("id"), csrf, businessId, decision: "approve" }) });
    assert.equal(decision.status, 303); const returned = new URL(decision.headers.get("location")); assert.equal(returned.searchParams.get("state"), state); assert.equal(returned.searchParams.get("iss"), origin);
    phase = "PKCE token exchange";
    const token = await json(await request("/oauth/token", { method: "POST", body: new URLSearchParams({ grant_type: "authorization_code", client_id: client.client_id, redirect_uri: callback, resource, code: returned.searchParams.get("code"), code_verifier: verifier }) }));
    assert.equal(token.expires_in, 600);
    const sdk = new Client({ name: "isolated-https-review", version: "1" });
    await sdk.connect(new StreamableHTTPClientTransport(new URL(resource), { requestInit: { headers: { Authorization: `Bearer ${token.access_token}` } } })); clients.push(sdk);
    return { sdk, request, client, token };
  }
  const invoked = new Set();
  async function call(connection, name, args = {}, expectedError) {
    phase = `tool ${name}`;
    const result = await connection.sdk.callTool({ name, arguments: args });
    const data = result.structuredContent ?? {};
    const safeArgs = Object.fromEntries(Object.entries(args).map(([key, value]) => [key, /receipt|operationKey|customer/i.test(key) ? "[REDACTED]" : value]));
    report.toolCalls.push({ tool: name, arguments: safeArgs, isError: !!result.isError, errorCode: data.error ?? null, returnedKeys: Object.keys(data) });
    if (expectedError) assert.equal(data.error, expectedError); else { assert(!result.isError, `Tool failed: ${name}`); invoked.add(name); }
    return data;
  }
  async function approve(connection, receipt) {
    phase = "scripted fixture approval";
    const page = await connection.request(`/mcp/confirm/${receipt}`); assert.equal(page.status, 200);
    const html = await page.text(); const csrf = /name="csrf" value="([^"]+)"/.exec(html)?.[1]; assert(csrf);
    const approved = await connection.request(`/mcp/confirm/${receipt}`, { method: "POST", headers: { Origin: origin }, body: new URLSearchParams({ csrf, approve: "yes" }) }); assert.equal(approved.status, 200);
  }
  const owner = await link(access.owner);
  const listed = await owner.sdk.listTools(); assert.equal(listed.tools.length, 30); report.discoveredTools = listed.tools.map((t) => t.name);
  const profile = await call(owner, "get_connected_account"); assert.equal(profile.nickname, "Booking API Fixture"); report.scenarios.A = "PASS: linked fixture business";
  await call(owner, "get_business_profile"); await call(owner, "list_accessible_locations"); await call(owner, "get_today_overview");
  const agenda = await call(owner, "list_appointments", { period: "tomorrow" }); assert.equal(agenda.appointments.length, 2); assert(!JSON.stringify(agenda).includes("preview-secondary-private")); report.scenarios.B = "PASS: two primary-location appointments for tomorrow";
  await call(owner, "get_appointment_details", { appointmentId: "preview-carolina-tomorrow" }); await call(owner, "list_services"); await call(owner, "list_staff");
  const available = await call(owner, "get_available_slots", { date: fixture.friday, serviceId: "preview-service", staffId: "preview-staff", selectedOptionAlternativeIds: ["preview-option-local"] }); assert.equal(available.selection.duration, 60); assert(available.slots.length); report.scenarios.C = { status: "PASS", date: fixture.friday, duration: 60, slots: available.slots.length };
  const revenue = await call(owner, "get_revenue_summary", { period: "this_month" });
  for (const key of ["due", "collected", "pending", "currencyCode"]) assert.equal(revenue[key], fixture.primaryCurrentMonthBeforeMutations[key]); report.scenarios.D = { status: "PASS", due: revenue.due, collected: revenue.collected, pending: revenue.pending, currency: revenue.currencyCode };
  await call(owner, "compare_periods", { current: "this_month", previous: "previous_month" });
  const popular = await call(owner, "get_popular_services", { period: "this_month" }); const prior = await call(owner, "get_popular_services", { period: "previous_month" });
  assert.equal(popular.services[0]?.name, "Servicio de prueba"); assert.equal(prior.services[0]?.name, "Servicio de prueba");
  assert.equal(popular.services[0]?.appointments, fixture.primaryPaidServiceBookings.currentMonth); assert.equal(prior.services[0]?.appointments, fixture.primaryPaidServiceBookings.previousMonth);
  report.scenarios.E = { status: "PASS", currentServiceBookings: popular.services[0].appointments, previousServiceBookings: prior.services[0].appointments };
  await call(owner, "get_staff_performance", { period: "this_month" }); await call(owner, "search_clients", { query: "Carolina" }); await call(owner, "get_client_summary", { clientId: "preview-carolina" }); await call(owner, "get_client_activity", { sort: "frequent" }); await call(owner, "get_loyalty_summary"); await call(owner, "get_gift_cards_summary");
  const at = (date, clock) => fromZonedTime(`${date}T${clock}:00`, fixture.timezone).toISOString();
  const createArgs = { operationKey: randomUUID(), locationId: "preview-location", serviceId: "preview-service", staffId: "preview-staff", startTime: at(fixture.tomorrow, "16:00"), selectedOptionAlternativeIds: ["preview-option-local"], customerName: "Carolina Prueba", customerEmail: "preview-carolina@example.invalid", customerPhone: "+56900000001" };
  const prepared = await call(owner, "prepare_appointment_creation", createArgs); await call(owner, "create_appointment", { receipt: prepared.receipt }, "BROWSER_APPROVAL_REQUIRED"); await approve(owner, prepared.receipt);
  const created = await call(owner, "create_appointment", { receipt: prepared.receipt }); assert.equal(created.httpStatus, 201); assert.deepEqual(await call(owner, "create_appointment", { receipt: prepared.receipt }), created); report.scenarios.F = "PASS: required approval, created once, replayed same result";
  const move = await call(owner, "prepare_appointment_reschedule", { operationKey: randomUUID(), appointmentId: created.id, locationId: "preview-location", startTime: at(fixture.friday, "16:00") }); await approve(owner, move.receipt); const moved = await call(owner, "reschedule_appointment", { receipt: move.receipt }); assert.equal(moved.startTime, at(fixture.friday, "16:00")); report.scenarios.G = "PASS: approved reschedule to Friday";
  const cancellation = await call(owner, "prepare_appointment_cancellation", { operationKey: randomUUID(), appointmentId: created.id, locationId: "preview-location" }); await approve(owner, cancellation.receipt); assert.equal((await call(owner, "cancel_appointment", { receipt: cancellation.receipt })).status, "CANCELLED");
  await call(owner, "get_appointment_details", { appointmentId: "foreign-appointment", locationId: "foreign-business-location" }, "LOCATION_FORBIDDEN"); report.scenarios.I = "PASS: foreign tenant target refused; model businessId rejected by strict schemas in local tests";
  const employee = await link(access.specialist); await call(employee, "get_revenue_summary", { period: "this_month" }, "FORBIDDEN"); await call(employee, "get_appointment_details", { appointmentId: "preview-secondary-private", locationId: "preview-secondary" }, "LOCATION_FORBIDDEN");
  const reconnected = await link(access.owner); assert.equal((await call(reconnected, "get_connected_account")).id, profile.id); report.reconnectionStableProfile = true;
  const publicSearch = await call(owner, "search_public_businesses", { query: "Booking" }); assert(publicSearch.businesses.length === 1);
  await call(owner, "get_public_business_details", { slug: "mcp-private-fixture" }, "BUSINESS_NOT_FOUND"); await call(owner, "get_public_business_details", { slug: "booking-api-fixture" }); await call(owner, "get_public_service_catalog", { slug: "booking-api-fixture" });
  const freeSlots = await call(owner, "get_public_availability", { slug: "booking-api-fixture", date: fixture.friday, serviceId: "preview-free-service", staffId: "preview-staff" }); assert(freeSlots.slots.length);
  const free = await call(owner, "prepare_public_booking", { ...createArgs, operationKey: randomUUID(), slug: "booking-api-fixture", serviceId: "preview-free-service", selectedOptionAlternativeIds: [], startTime: freeSlots.slots[0].startTime }); await approve(owner, free.receipt);
  const booked = await call(owner, "confirm_public_booking", { receipt: free.receipt }); assert.equal(booked.httpStatus, 201); assert.equal(booked.booking.price, 0); assert.deepEqual(await call(owner, "confirm_public_booking", { receipt: free.receipt }), booked); report.scenarios.J = "PASS: opt-in, free service, approval and idempotency";
  phase = "OAuth revocation";
  assert.equal((await owner.request("/oauth/revoke", { method: "POST", body: new URLSearchParams({ client_id: owner.client.client_id, token: owner.token.access_token }) })).status, 200);
  const revoked = await fetch(resource, { method: "POST", headers: { Authorization: `Bearer ${owner.token.access_token}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }) }); assert.equal(revoked.status, 401); assert(revoked.headers.get("www-authenticate").includes('error_description="')); report.scenarios.H = "PASS: revoked grant rejected over HTTPS";
  assert.deepEqual([...invoked].sort(), listed.tools.map((t) => t.name).sort()); report.successfulTools = invoked.size; report.oauth = { discovery: true, dcr: true, pkce: true, signedSessionLogin: true, scriptedConsent: true, issuerAndState: true, revocation: true, accessTokenLifetimeSeconds: 600 };
  report.verifiedAt = new Date().toISOString();
  await fs.writeFile(new URL("https-client-evidence.json", directory), JSON.stringify(report, null, 2)); console.log("PASS: HTTPS OAuth and all 30 tools via official MCP SDK. Scripted fixture checks A-J passed; this is NOT a ChatGPT conversation test.");
} catch (error) { console.error(`FAIL at ${phase} (${error?.name || "Error"}); credential-bearing error payload intentionally omitted.`); process.exitCode = 1; }
finally { await Promise.allSettled(clients.map((c) => c.close())); }
