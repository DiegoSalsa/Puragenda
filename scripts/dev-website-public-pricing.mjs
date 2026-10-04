import { spawn } from "node:child_process";
const build=process.argv.includes("--build"), start=process.argv.includes("--start");
const off=process.argv.includes("--off");
// Only the isolated QA cluster. No .env, real provider credentials or delivery.
const env={...process.env,
  DATABASE_URL:"postgresql://websiteqa@127.0.0.1:55439/websiteqa",DIRECT_URL:"postgresql://websiteqa@127.0.0.1:55439/websiteqa",
  AUTH_SECRET:"local-website-commercial-qa-secret-2026",NEXTAUTH_SECRET:"",
  WEBSITE_QA:"1",WEBSITE_MEDIA_MOCK:"1",WEBSITE_BUILD_QA:build||start?"1":"",
  WEBSITE_DOMAIN_PROVIDER:"mock",WEBSITE_VERCEL_WRITES_ENABLED:"",VERCEL_TOKEN:"",VERCEL_PROJECT_ID:"",VERCEL_TEAM_ID:"",
  WEBSITE_ROOT_DOMAIN:"localhost",WEBSITE_BILLING_SIMULATOR:"1",WEBSITE_CHECKOUT_ENABLED:"1",WEBSITE_LAUNCH_ENABLED:"0",
  WEBSITE_PUBLIC_ACQUISITION_ENABLED:off?"0":"1",WEBSITE_LAUNCH_AT:"2026-10-03T01:20:00Z",
  LOCAL_PAYMENT_SIMULATOR:"true",LOCAL_PAYMENT_SIMULATOR_SECRET:"local-website-commercial-qa-secret-2026",
  MERCADOPAGO_ACCESS_TOKEN:"local-simulator-no-network",MERCADOPAGO_WEBHOOK_SECRET:"local-simulator-no-network",
  RESEND_API_KEY:"",SMTP_HOST:"",SMTP_USER:"",SMTP_PASS:"",GOOGLE_CLIENT_ID:"",GOOGLE_CLIENT_SECRET:"",
  PADDLE_API_KEY:"",PADDLE_SANDBOX_API_KEY:"",PADDLE_LIVE_API_KEY:"",PADDLE_NOTIFICATION_WEBHOOK_SECRET:"",
  WEBSITE_PRICE_STANDARD:"",WEBSITE_PRICE_BETA_FOUNDER:"",NEXT_PUBLIC_PADDLE_CLIENT_TOKEN:"",NEXT_PUBLIC_PADDLE_ENV:"sandbox",
  CLOUDINARY_API_KEY:"",CLOUDINARY_API_SECRET:"",NEXT_PUBLIC_GA_ID:"",NEXT_PUBLIC_POSTHOG_KEY:"",
  NEXT_PUBLIC_APP_URL:"http://localhost:3010",
};
const child=spawn(process.execPath,["node_modules/next/dist/bin/next",...(build?["build"]:start?["start","-p","3010","-H","127.0.0.1"]:["dev","-p","3010","-H","127.0.0.1"])],{env,stdio:"inherit",windowsHide:true});
process.on("SIGINT",()=>child.kill());child.on("exit",code=>process.exit(code||0));
