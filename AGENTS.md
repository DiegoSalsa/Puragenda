## Paddle integration

When writing or modifying code that integrates with Paddle:

- Before suggesting or changing Paddle integration code, use the `paddle-docs` MCP server to check current Paddle documentation. Do not rely on training data alone: the API and SDK evolve frequently.
- This is a Next.js / TypeScript project. Use the official Node.js SDK, `@paddle/paddle-node-sdk`, for server-side Paddle API and webhook work. Do not expose Paddle API keys or webhook secrets to browser code.
- Use the sandbox environment by default for all development and testing. Sandbox API keys contain `*sdbx`; sandbox client-side tokens begin with `test*`.
- Use `paddle-sandbox` for authenticated MCP operations unless the prompt explicitly says "live", "production", or refers to real customer data. Never infer permission to use `paddle-live`.
- Always verify webhook signatures with `paddle.webhooks.unmarshal()` before parsing, storing, or acting on an event. Reject invalid signatures and make processing idempotent using Paddle event IDs.
- Read API keys and webhook secrets from environment variables only. Never commit, inline, log, or return credentials. Keep server-only variables unprefixed (never `NEXT_PUBLIC_`).
- Before any destructive account change, including updating prices, archiving products, or cancelling subscriptions, ask for explicit confirmation. State the target environment and affected resource(s) before calling `paddle-sandbox` or `paddle-live`.
- For any live operation, confirm the exact account/environment and use narrowly scoped API keys. Prefer a sandbox dry run first whenever possible.
