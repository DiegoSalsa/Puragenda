// Audit 06 only uses an owned, disposable loopback PostgreSQL cluster.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, realpathSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { localCommercialDatabase, deployCommercialMigrations } from './commercial-migrations.mjs';
import pg from 'pg';

const root = path.resolve('scratch/audit06');
mkdirSync(root, { recursive: true });
mkdirSync(path.resolve('scratch/audit04'), { recursive: true });
const binary = process.env.PG_BIN_DIR ?? 'C:/Program Files/PostgreSQL/17/bin';
const executable = name => path.join(binary, name + (process.platform === 'win32' ? '.exe' : ''));
const statePath = path.join(root, 'cluster.json');
const mode = process.argv[2] ?? 'tests';
if (mode === 'init') {
  const data = path.join(root, 'pg-' + randomBytes(6).toString('hex'));
  mkdirSync(data);
  execFileSync(executable('initdb'), ['-D', data, '-U', 'audit06', '-A', 'trust', '--encoding=UTF8', '--no-locale'], { stdio: 'ignore', windowsHide: true });
  execFileSync(executable('pg_ctl'), ['-D', data, '-o', '-h 127.0.0.1 -p 55446', '-l', path.join(data, 'server.log'), 'start'], { stdio: 'ignore', windowsHide: true });
  const database = 'postgresql://audit06@127.0.0.1:55446/puragenda_commercial_test_audit06';
  writeFileSync(statePath, JSON.stringify({ data, database }));
  const client = new pg.Client({ connectionString: 'postgresql://audit06@127.0.0.1:55446/postgres' });
  await client.connect();
  try {
    if (realpathSync((await client.query('SHOW data_directory')).rows[0].data_directory).toLowerCase() !== realpathSync(data).toLowerCase()) throw Error('OWNED_CLUSTER_REQUIRED');
    await client.query('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN');
    await client.query('CREATE DATABASE puragenda_commercial_test_audit06');
  } finally { await client.end(); }
  await deployCommercialMigrations(database);
  console.log('Owned PostgreSQL cluster listening on loopback:55446');
} else {
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  if (!realpathSync(state.data).startsWith(realpathSync(root) + path.sep)) throw Error('OWNED_CLUSTER_REQUIRED');
  if (mode === 'stop') {
    execFileSync(executable('pg_ctl'), ['-D', state.data, 'stop', '-m', 'fast'], { stdio: 'inherit', windowsHide: true });
  } else {
    const database = localCommercialDatabase(state.database);
    const args = mode === 'websites' ? ['scripts/test-audit-05.mjs', 'tests', 'tests/integration/audit06-websites-postgres.integration.test.ts', ...process.argv.slice(3)]
      : ['scripts/test-audit-05.mjs', mode, ...process.argv.slice(3)];
    const result = spawnSync(process.execPath, args, { env: { ...process.env, COMMERCIAL_V2_TEST_DATABASE_URL: database }, stdio: 'inherit', windowsHide: true });
    process.exitCode = result.status ?? 1;
  }
}
