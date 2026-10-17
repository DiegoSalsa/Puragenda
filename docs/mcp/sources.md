# Fuentes y decisiones verificadas

Consultadas durante la implementación del 16–17 de octubre de 2026. Son fuentes
primarias; el paquete no usa los manifiestos antiguos de ChatGPT Plugins ni GPT
Actions. Las versiones de librerías quedan fijadas en el lockfile.

| Fuente | Aplicación al cambio |
| --- | --- |
| [OpenAI Plugins](https://developers.openai.com/plugins) | Formato portátil y compatibilidad entre ChatGPT y Codex |
| [Build an MCP server](https://developers.openai.com/plugins/build/mcp-server) | Streamable HTTP, SDK oficial, anotaciones y schemas |
| [Authentication](https://developers.openai.com/plugins/build/auth) | Metadata, PKCE S256, resource, DCR, issuer identification, seguridad por herramienta y perfil estable |
| [Build plugins](https://developers.openai.com/plugins/build/plugins) | Estructura de paquete, manifiestos, assets y metadatos OpenAI |
| [Submission](https://developers.openai.com/plugins/deploy/submission) | Builder, dominio, metadatos, demo y presentación |
| [Plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines) | Privacidad, utilidad, no manipulación y límites de comercio de servicios |
| [App review](https://developers.openai.com/plugins/deploy/app-review) | Cuenta ficticia accesible, escenarios y validación externa |
| [Submission errors](https://developers.openai.com/plugins/deploy/submission-errors) | Validación builder y campos pendientes; no confundir ZIP válido con publicación |
| [Agent Plugins plugin schema 1.0.0](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json) | Snapshot exacto en `schemas/plugin.schema.json` |
| [Agent Plugins MCP schema 1.0.0](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json) | Snapshot exacto en `schemas/mcp.schema.json`; `additionalProperties:false` por servidor |
| [MCP authorization](https://modelcontextprotocol.io/specification/latest/basic/authorization) | Recurso protegido, discovery, audience, PKCE y autorización |
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | Transporte Web Standard stateless y cliente de protocolo real |
| [Node OAuth documentation](https://node-oauthoauth2-server.readthedocs.io/en/master/) | Adaptador de modelos y motor PKCE mantenido 5.3.1 |
| [Codex OAuth implementation](https://github.com/openai/codex/blob/main/codex-rs/rmcp-client/src/perform_oauth_login.rs) | Callback local y variantes con ID; conservar coincidencia exacta al autorizar e intercambiar |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Tablas nuevas privadas, RLS y grants revocados |

También se leyeron las guías incluidas en Next 16.3.8 en
`node_modules/next/dist/docs/`, especialmente Route Handlers, headers/CSP y
`next typegen`. Las reglas Paddle del repositorio no se trasladan a otro SDK:
este cambio no modifica integración, catálogo ni cuenta Paddle.

Hay una discrepancia observable entre los ejemplos avanzados de auth OpenAI
(`extensions` por servidor MCP) y el schema portátil actual. Se preservó la
validez del schema y se documentó la configuración mixta en el portal. La
resolución definitiva de ese caso depende de su validador real, no accesible
mediante una prueba local. No se afirma que el portal ya aceptó el paquete.
