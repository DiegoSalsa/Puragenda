import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve(process.env.AUDIT07_BROWSER_MODULES ?? 'C:/Users/diego/.codex/tools/puri-onboarding-qa/package.json'));
const { chromium } = require('playwright');
const state = JSON.parse(fs.readFileSync('scratch/next-staging/current.json', 'utf8')), target = path.resolve(state.target);
assert(target.startsWith(path.resolve('scratch/next-staging') + path.sep)); assert.equal(state.httpOrigin,'http://127.0.0.1:3128');
const accounts = JSON.parse(fs.readFileSync(path.join(target,'staging-accounts.private.json'),'utf8')); assert(accounts.synthetic);
const account = accounts.accounts.find(a=>a.plan==='PURAGENDA');
const version = /version:\s*"([^"]+)"/.exec(fs.readFileSync('src/config/changelog.ts','utf8'))[1];
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[], errors=[]; const ok=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS '+name)};
try {
  const context = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page = await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===state.httpOrigin||url.protocol==='data:'?route.continue():route.abort()});
  await context.addCookies([{name:'puragenda_changelog_seen',value:version,url:state.httpOrigin}]);
  await page.goto(state.httpOrigin+'/login'); await page.locator('input[type="email"]').fill(account.email); await page.locator('input[type="password"]').fill(account.password);
  await page.locator('button[type="submit"]').click(); await page.waitForURL('**/dashboard**', {timeout:60000});
  const entry = page.getByRole('button',{name:'Preguntarle a Puri',exact:true}); await entry.waitFor();
  ok('Synthetic Basic owner signs in through the actual browser form',new URL(page.url()).pathname.startsWith('/dashboard'));
  await entry.click(); const dialog=page.locator('aside[role="dialog"]'); await dialog.waitFor();
  ok('Basic plan can open Puri on mobile with accessible dialog semantics',await dialog.getAttribute('aria-modal')==='true');
  await dialog.locator('textarea').fill('Muéstrame la agenda de hoy'); await dialog.locator('button[type="submit"]').click(); await dialog.locator('[role="alert"]').waitFor();
  ok('AI unavailable is visible without crashing the dashboard',await dialog.locator('[role="alert"]').count()===1);
  await page.keyboard.press('Escape'); await dialog.waitFor({state:'hidden'});
  ok('Escape returns focus to the mobile Today Puri entry',await entry.evaluate(e=>document.activeElement===e));
  for (const section of ['services','agenda','clients']) {
    const response=await page.goto(state.httpOrigin+'/dashboard/'+section); await page.locator('#tutorial-main').waitFor();
    ok('Operational '+section+' remains usable after AI failure',response.status()===200 && await page.locator('#tutorial-main').isVisible());
  }
  await page.setViewportSize({width:1366,height:900}); await page.locator('[data-tour="contextual-help"]:visible').click(); await page.locator('.driver-popover').waitFor();
  ok('Manual driver help opens on the real desktop dashboard',await page.locator('.driver-overlay').count()===1);
  await page.locator('.driver-popover-close-btn').click(); ok('Client runtime has no uncaught browser exceptions',errors.length===0);
  await page.screenshot({path:path.resolve('scratch/audit07/browser/dashboard-desktop.png'),fullPage:false});
  await context.close(); fs.writeFileSync('scratch/audit07/dashboard-browser-results.json',JSON.stringify({passed:true,syntheticOnly:true,aiProviderCalls:0,checks,errors},null,2));
} finally {await browser.close()}
