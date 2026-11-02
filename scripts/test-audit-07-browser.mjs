// Isolated browser fixtures exercise the real client components; no sessions,
// providers or production pages. Full authenticated HTTP regression is separate.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const out = path.resolve('scratch/audit07/browser'); mkdirSync(out, { recursive: true });
const qaRequire = createRequire(path.resolve(process.env.AUDIT07_BROWSER_MODULES ?? 'C:/Users/diego/.codex/tools/puri-onboarding-qa/package.json'));
const { chromium } = qaRequire('playwright');
const stubs = {
  'next/navigation': `import {useSyncExternalStore} from 'react'; const subscribe=fn=>{window.addEventListener('qa:navigate',fn);return()=>window.removeEventListener('qa:navigate',fn)};export function usePathname(){return useSyncExternalStore(subscribe,()=>window.__path||'/dashboard/services')};export const useSearchParams=()=>new URLSearchParams();`,
  'next-intl': `export const useTranslations=()=>key=>key;export const useLocale=()=>'es';`,
  'next/link': `import React from 'react';export default function Link(props){return React.createElement('a',props,props.children)};`,
  '@/components/i18n/localized-text': `export const LocalizedText=()=>null;`,
  '@/lib/analytics/client': `export const track=()=>{};`,
  './commercial-usage-panel': `export const CommercialUsagePanel=()=>null;`,
};
await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{ContextualHelpButton}from'./src/components/dashboard/contextual-help';import{DashboardTutorial}from'./src/components/dashboard/tutorial';import{PuriAssistant}from'./src/components/dashboard/puri-assistant';import{DashboardOverlayProvider}from'./src/components/dashboard/dashboard-overlay-context';createRoot(document.getElementById('root')).render(<DashboardOverlayProvider initialChangelogOpen={false}><ContextualHelpButton/><PuriAssistant/>{location.search.includes('auto')?<DashboardTutorial/>:null}</DashboardOverlayProvider>);`, resolveDir: process.cwd(), loader: 'tsx' }, outfile: path.join(out, 'fixture.js'), bundle: true, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'qa-only-adapters', setup(b) {
  b.onResolve({ filter: /.*/ }, args => args.path in stubs ? { path: args.path, namespace: 'qa' } : undefined);
  b.onLoad({ filter: /.*/, namespace: 'qa' }, args => ({ contents: stubs[args.path], loader: 'js', resolveDir: process.cwd() }));
} }] });
const server = createServer((req, res) => {
  if (req.url?.startsWith('/api/')) { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({answer:{message:'Synthetic answer',cards:[],actions:[],toolsUsed:[]}})); return; }
  if (req.url === '/fixture.js' || req.url === '/fixture.css') { res.setHeader('Content-Type', req.url.endsWith('css') ? 'text/css' : 'text/javascript'); res.end(readFileSync(path.join(out, req.url.slice(1)))); return; }
  res.setHeader('Content-Type','text/html'); res.end('<!doctype html><html><head><link rel="stylesheet" href="/fixture.css"></head><body><nav id="tutorial-nav" style="display:none">Hidden nav</nav><main id="tutorial-main" style="margin:80px;padding:20px"><h1>Services QA</h1><button data-tour="service-create" id="hidden-create" style="display:none">Hidden create</button><button id="visible-create">Visible create</button></main><div id="root"></div><script src="/fixture.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const results = [];
async function test(name, fn, options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.addInitScript(({block,auto}) => {
    if (block) { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked','SecurityError'); } }); Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Storage blocked','SecurityError')}}); }
    else if (!auto) localStorage.setItem('hasSeenTutorial_general', 'true');
  }, {block:!!options.blockStorage,auto:!!options.auto});
  try { await page.goto(origin + (options.auto ? '/?auto' : '/')); await page.locator('[data-tour="contextual-help"]').waitFor(); await fn(page, errors); results.push({ name, status:'passed' }); }
  catch (error) { results.push({name,status:'failed',error:error.message}); }
  finally { await context.close(); }
}
try {
  await test('manual tour skips hidden mobile targets', async p => { await p.locator('[data-tour="contextual-help"]').click(); await p.locator('.driver-popover-next-btn').click(); assert.notEqual(await p.locator('.driver-active-element').getAttribute('id'), 'hidden-create'); });
  await test('manual help waits for an existing modal', async p => { await p.evaluate(()=>{const d=document.createElement('div');d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.textContent='Existing modal';document.body.append(d)}); await p.locator('[data-tour="contextual-help"]').click(); assert.equal(await p.locator('.driver-overlay').count(),0); });
  await test('Puri and driver never remain open together', async p => { await p.locator('[data-tour="contextual-help"]').click(); await p.evaluate(()=>window.dispatchEvent(new CustomEvent('puri:ask',{detail:''}))); await p.waitForTimeout(100); assert.equal(await p.locator('.driver-overlay').count(),0); assert.equal(await p.locator('[role="dialog"]').count(),1); });
  await test('route changes destroy an active tour', async p => { await p.locator('[data-tour="contextual-help"]').click(); await p.evaluate(()=>{window.__path='/dashboard/clients';window.dispatchEvent(new Event('qa:navigate'))}); await p.waitForTimeout(100); assert.equal(await p.locator('.driver-overlay').count(),0); });
  await test('blocked browser storage does not crash assistance', async (p, errors) => { await p.locator('[data-tour="contextual-help"]').click(); await p.waitForTimeout(100); assert.deepEqual(errors,[]); }, { blockStorage:true, auto:true });
  await test('automatic first visit skips hidden navigation and persists closure', async p => {
    await p.locator('.driver-popover-next-btn').waitFor(); await p.locator('.driver-popover-next-btn').click();
    assert.notEqual(await p.locator('.driver-active-element').getAttribute('id'), 'tutorial-nav');
    await p.locator('.driver-popover-close-btn').click(); assert.equal(await p.evaluate(()=>localStorage.getItem('hasSeenTutorial_general')),'true');
    await p.reload(); await p.waitForTimeout(700); assert.equal(await p.locator('.driver-overlay').count(),0);
  }, {auto:true});
  await test('resize ends the tour before responsive targets change', async p => {
    await p.locator('[data-tour="contextual-help"]').click(); await p.setViewportSize({width:1280,height:800}); await p.waitForTimeout(100); assert.equal(await p.locator('.driver-overlay').count(),0);
  });
  await test('Puri supports Escape and restores launcher focus', async p => {
    await p.locator('.puri-launcher').click(); await p.locator('[role="dialog"]').waitFor(); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    assert.equal(await p.locator('[role="dialog"]').count(),0); assert.equal(await p.locator('.puri-launcher').evaluate(e=>e===document.activeElement),true);
  });
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
const output = process.argv[2] ?? 'browser-results.json'; writeFileSync(path.join(out,output),JSON.stringify({fixture:'real React components, synthetic loopback page',results},null,2));
console.log(JSON.stringify({passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,output:path.join(out,output)}));
if(results.some(r=>r.status==='failed'))process.exitCode=1;
