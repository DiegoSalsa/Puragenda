import { mcpConfig, SCOPES } from "./config";
export function protectedResourceMetadata() {
  const { issuer, resource, origin } = mcpConfig();
  return { resource, resource_name: "Puragenda", authorization_servers: [issuer], scopes_supported: Object.keys(SCOPES), bearer_methods_supported: ["header"],
    resource_documentation: `${origin}/integraciones/chatgpt`, resource_policy_uri: `${origin}/politica-de-privacidad`, resource_tos_uri: `${origin}/terminos-y-condiciones` };
}
export function authorizationServerMetadata() {
  const { issuer, origin } = mcpConfig();
  return { issuer, authorization_endpoint: `${origin}/oauth/authorize`, token_endpoint: `${origin}/oauth/token`, registration_endpoint: `${origin}/oauth/register`,
    revocation_endpoint: `${origin}/oauth/revoke`, response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"], revocation_endpoint_auth_methods_supported: ["none"], code_challenge_methods_supported: ["S256"],
    authorization_response_iss_parameter_supported: true, scopes_supported: Object.keys(SCOPES) };
}
