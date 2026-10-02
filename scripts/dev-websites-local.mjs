import { spawn } from 'node:child_process';
const build = process.argv.includes('--build');
const start = process.argv.includes('--start');
const env = {
  ...process.env,
  DATABASE_URL: 'postgresql://websiteqa@127.0.0.1:55439/websiteqa',
  DIRECT_URL: 'postgresql://websiteqa@127.0.0.1:55439/websiteqa',
  AUTH_SECRET: 'local-website-qa-auth-secret-isolated-2026',
  WEBSITE_QA: '1', WEBSITE_MEDIA_MOCK: '1', WEBSITE_DOMAIN_PROVIDER: 'mock', WEBSITE_VERCEL_WRITES_ENABLED: '', VERCEL_TOKEN: '', VERCEL_PROJECT_ID: '', VERCEL_TEAM_ID: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '', WEBSITE_ROOT_DOMAIN: 'localhost',
  WEBSITE_BUILD_QA: build || start ? '1' : '',
  // QA must never deliver real mail, including booking notifications and OTP.
  RESEND_API_KEY: '', SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '',
  GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '',
  MERCADOPAGO_ACCESS_TOKEN: '', PADDLE_API_KEY: '', PADDLE_SANDBOX_API_KEY: '',
  PADDLE_LIVE_API_KEY: '', PADDLE_NOTIFICATION_WEBHOOK_SECRET: '', WEBSITE_PRICE_STANDARD: '', WEBSITE_PRICE_BETA_FOUNDER: '',
  NEXT_PUBLIC_PADDLE_ENV: 'sandbox', NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: '',
  NEXT_PUBLIC_GA_ID: '', NEXT_PUBLIC_POSTHOG_KEY: '',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3005',
};
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', ...(build ? ['build'] : start ? ['start', '-p', '3006', '-H', '127.0.0.1'] : ['dev', '-p', '3005', '-H', '127.0.0.1'])], { env, stdio: 'inherit', windowsHide: true });
process.on('SIGINT', () => child.kill());
child.on('exit', code => process.exit(code || 0));
