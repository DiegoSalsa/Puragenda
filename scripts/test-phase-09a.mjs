// Auditoría 08: cluster PostgreSQL desechable, loopback-only, sin .env ambientales.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, realpathSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { localCommercialDatabase, deployCommercialMigrations } from './commercial-migrations.mjs';
import pg from 'pg';

const root = path.resolve('scratch/phase09a');
mkdirSync(root, { recursive: true });
mkdirSync(path.resolve('scratch/audit04'), { recursive: true });
const binary = process.env.PG_BIN_DIR ?? 'C:/Program Files/PostgreSQL/17/bin';
const executable = name => path.join(binary, name + (process.platform === 'win32' ? '.exe' : ''));
const statePath = path.join(root, 'cluster.json');
const mode = process.argv[2] ?? 'tests';
if (readdirSync('.').some(name => /^\.env(?:\.|$)/.test(name) && name !== '.env.example')) throw Error('AUDIT_REQUIRES_NO_AMBIENT_ENV_FILES');
if (mode === 'init') {
  const data = path.join(root, 'pg-' + randomBytes(6).toString('hex'));
  mkdirSync(data);
  execFileSync(executable('initdb'), ['-D', data, '-U', 'phase09a', '-A', 'trust', '--encoding=UTF8', '--no-locale'], { stdio: 'ignore', windowsHide: true });
  execFileSync(executable('pg_ctl'), ['-D', data, '-o', '-h 127.0.0.1 -p 55449', '-l', path.join(data, 'server.log'), 'start'], { stdio: 'ignore', windowsHide: true });
  const database = 'postgresql://phase09a@127.0.0.1:55449/puragenda_commercial_test_onboarding';
  writeFileSync(statePath, JSON.stringify({ data, database }));
  const client = new pg.Client({ connectionString: 'postgresql://phase09a@127.0.0.1:55449/postgres' });
  await client.connect();
  try {
    if (realpathSync((await client.query('SHOW data_directory')).rows[0].data_directory).toLowerCase() !== realpathSync(data).toLowerCase()) throw Error('OWNED_CLUSTER_REQUIRED');
    await client.query('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN');
    await client.query('CREATE DATABASE puragenda_commercial_test_onboarding');
  } finally { await client.end(); }
  await deployCommercialMigrations(database);
  console.log('Owned PostgreSQL cluster listening on loopback:55449');
} else {
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  if (!realpathSync(state.data).startsWith(realpathSync(root) + path.sep)) throw Error('OWNED_CLUSTER_REQUIRED');
  if (mode === 'stop') {
    execFileSync(executable('pg_ctl'), ['-D', state.data, 'stop', '-m', 'fast'], { stdio: 'inherit', windowsHide: true });
  } else {
    const database = localCommercialDatabase(state.database);
    const args = mode === 'contact' ? ['scripts/test-audit-05.mjs', 'tests', 'tests/integration/contact-flow-postgres.integration.test.ts', ...process.argv.slice(3)]
      : mode === 'contact-free' ? ['scripts/test-audit-05.mjs', 'tests', 'tests/integration/contact-flow-free-postgres.integration.test.ts', ...process.argv.slice(3)]
      : ['scripts/test-audit-05.mjs', mode, ...process.argv.slice(3)];
    const allowed = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE', 'COMSPEC', 'PATHEXT', 'PROGRAMFILES', 'PROGRAMFILES(X86)']);
    const env = {
      ...Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase()))),
      NODE_ENV: 'test',
      DATABASE_URL: database,
      DIRECT_URL: database,
      COMMERCIAL_V2_TEST_DATABASE_URL: database,
      ONBOARDING_TEST_DATABASE_URL: database,
      COMMERCIAL_V2_INTERNAL_WRITES: '1',
      PURI_PLUS_INTERNAL_ENABLED: '1',
      PURAGENDA_NEXT_ENABLED: '1',
      CONTACT_FLOW_LAB_ENABLED: '1',
      CONTACT_FLOW_TOKEN_SECRET: randomBytes(32).toString('hex'),
      CONTACT_FLOW_PUBLIC_CONSENT_ENABLED: '1',
      CONTACT_FLOW_PRODUCTION_ENABLED: '0',
      CONTACT_FLOW_EXTERNAL_RELEASE: 'false',
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_STAGING_NETWORK_GUARD: '1',
      AUTH_SECRET: randomBytes(32).toString('hex'),
      NEXTAUTH_SECRET: randomBytes(32).toString('hex'),
      RESEND_API_KEY: '',
      NODE_OPTIONS: `--import=${pathToFileURL(path.resolve('scripts/next-staging-network-guard.mjs')).href}`,
    };
    const direct = mode === 'contact' || mode === 'contact-free' || mode === 'tests';
    const command = direct
      ? [path.resolve('node_modules/vitest/vitest.mjs'), 'run', '--reporter=dot', ...(mode === 'tests' ? process.argv.slice(3) : args.slice(2))]
      : args;
    const result = spawnSync(process.execPath, command, { env, stdio: 'inherit', windowsHide: true });
    process.exitCode = result.status ?? 1;
  }
}
