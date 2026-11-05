// Pattern scan of every introduced line, including intermediate local commits.
// It is deliberately scoped; a clean result is not proof against every secret type.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = '476e523ae35d8799f7c0e8c9573142c145495dd3';
const git = args => execFileSync('git', args, {encoding:'utf8', windowsHide:true});
const commits = git(['rev-list', '--reverse', `${base}..HEAD`]).trim().split('\n').filter(Boolean);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,}\b/,
  /\bpdl_(?:live|sdbx)_[A-Za-z0-9_]{30,}\b/,
  /\bre_[A-Za-z0-9_-]{32,}\b/,
  /postgres(?:ql)?:\/\/[^\s:'"/]+:[^\s@'"/]+@(?!localhost\b|127\.0\.0\.1\b)[^\s'"/]+/,
];
const findings = [];
function scan(diff, revision) {
  let file = '', line = 0;
  for (const text of diff.split('\n')) {
    if (text.startsWith('+++ b/')) { file = text.slice(6); line = 0; continue; }
    const hunk = text.match(/^@@ .*\+(\d+)/); if (hunk) { line = Number(hunk[1]) - 1; continue; }
    if (text.startsWith('+') && !text.startsWith('+++')) { line++; if (patterns.some(pattern => pattern.test(text))) findings.push({revision, file, line}); }
    else if (text.startsWith(' ')) line++;
  }
}
for (const revision of commits) scan(git(['show', '--format=', '--unified=0', revision]), revision);
scan(git(['diff', '--unified=0', 'HEAD']), 'working-tree');
const untracked = git(['ls-files', '--others', '--exclude-standard']).trim().split('\n').filter(Boolean);
// Git diff --no-index reads each new file without staging or printing contents.
for (const file of untracked) {
  let diff = '';
  try { diff = git(['diff', '--no-index', '--unified=0', '--', process.platform === 'win32' ? 'NUL' : '/dev/null', file]); }
  catch (error) { if (error.status !== 1) throw error; diff = error.stdout; }
  scan(diff, 'untracked');
}
mkdirSync('scratch/audit08', {recursive:true});
writeFileSync('scratch/audit08/secrets.json', JSON.stringify({ scope:'Introduced lines in all audit commits and local changes; credential patterns only', commits: commits.length, untrackedFiles: untracked.length, findings }, null, 2));
console.log(JSON.stringify({commits:commits.length, findings:findings.length}));
process.exitCode = findings.length ? 1 : 0;
