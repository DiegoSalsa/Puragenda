import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";

const directory=mkdtempSync(join(tmpdir(),"puragenda-rc1-build-"));
const windows=process.platform==="win32";
for(const [command,output]of [["npm","RC1_FAKE_BUILD_ONLY"],["npx","RC1_UNEXPECTED_MIGRATION"]]) {
  writeFileSync(join(directory,command+(windows?".cmd":"")),windows?`@echo off\r\necho ${output}\r\n`:`#!/bin/sh\nprintf '%s\\n' '${output}'\n`,{mode:0o700});
}
function run(environment:string,approved="0",branch="release/puragenda-next-rc1") {
  const allowed=new Set(["PATH","SYSTEMROOT","WINDIR","TEMP","TMP","COMSPEC","PATHEXT"]);
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.has(key.toUpperCase()))) as Record<string,string>;
  const pathKey=Object.keys(env).find(key=>key.toUpperCase()==="PATH")??"PATH";
  env[pathKey]=directory+delimiter+env[pathKey];
  return spawnSync(process.execPath,[resolve("scripts/vercel-build.mjs")],{cwd:directory,env:{...env,NODE_ENV:"test",VERCEL_ENV:environment,VERCEL_GIT_COMMIT_REF:branch,PURAGENDA_RC1_STAGING_BUILD:approved},encoding:"utf8",windowsHide:true,timeout:10000});
}
afterAll(()=>{
  if(dirname(resolve(directory))!==resolve(tmpdir())||!basename(directory).startsWith("puragenda-rc1-build-"))throw new Error("OWNED_TEST_DIRECTORY_REQUIRED");
  rmSync(directory,{recursive:true,force:true});
});
describe("RC1 push/deployment isolation",()=>{
  it("disables automatic Vercel deployment for RC1 and both audit branches without changing legacy schedules",()=>{
    const config=JSON.parse(readFileSync("vercel.json","utf8"));
    expect(config.git.deploymentEnabled).toEqual({"release/puragenda-next-rc1":false,"fix/puragenda-next-audit-01-registration":false,"fix/puragenda-next-audit-02-agenda":false});
    expect(config.crons).toHaveLength(5);
    expect(config.crons.some((cron:{path:string})=>cron.path==="/api/cron/puragenda-next")).toBe(false);
  });
  it.each(["production","preview","development",""])("refuses every audit %s build before any CLI executes",environment=>{
    for(const branch of ["fix/puragenda-next-audit-01-registration","fix/puragenda-next-audit-02-agenda"]) {
      for(const approved of ["0","1"]) {
        const r=run(environment,approved,branch);
        expect(r.status).toBe(1);expect(r.stderr).toContain("AUDIT_BRANCH_BUILD_DISABLED");
        expect(r.stdout).not.toContain("RC1_FAKE");expect(r.stdout).not.toContain("RC1_UNEXPECTED_MIGRATION");
      }
    }
  });
  it.each([
    ["push","refs/heads/fix/puragenda-next-audit-02-agenda","",false,false],
    ["workflow_dispatch","refs/heads/fix/puragenda-next-audit-02-agenda","",false,false],
    ["pull_request","refs/pull/12/merge","fix/puragenda-next-audit-02-agenda",false,false],
    ["push","refs/heads/main","",true,false],
    ["schedule","refs/heads/main","",true,false],
    ["workflow_dispatch","refs/heads/main","",true,false],
    ["pull_request","refs/pull/13/merge","another-branch",true,true],
  ])("keeps Actions jobs isolated for %s %s %s",(event_name,ref,head_ref,baseline,security)=>{
    const workflow=readFileSync(".github/workflows/security.yml","utf8");
    for(const [job,expected]of [["baseline",baseline],["codex-security",security]] as const) {
      const expression=workflow.match(new RegExp(`^  ${job}:\\r?\\n    if: (.+)$`,"m"))?.[1];
      expect(expression).toBeDefined();
      // These guards use only string comparisons and &&, shared by Actions and JS.
      expect(runInNewContext(expression!,{github:{event_name,ref,head_ref}},{timeout:1000})).toBe(expected);
    }
  });
  it.each(["production","preview"])("refuses an unsolicited RC1 %s build before any CLI executes",environment=>{
    const r=run(environment);expect(r.status).toBe(1);expect(r.stderr).toContain("RC1_AUDIT_ONLY");expect(r.stdout).not.toContain("RC1_FAKE");expect(r.stdout).not.toContain("RC1_UNEXPECTED_MIGRATION");
  });
  it("cannot authorize a production deployment using the staging opt-in",()=>{
    const r=run("production","1");expect(r.status).toBe(1);expect(r.stderr).toContain("RC1_AUDIT_ONLY");
  });
  it("allows an explicitly approved isolated Preview build while skipping migrations",()=>{
    const r=run("preview","1");expect(r.status).toBe(0);expect(r.stdout).toContain("Skipping database migrations for preview");expect(r.stdout).toContain("RC1_FAKE_BUILD_ONLY");expect(r.stdout).not.toContain("RC1_UNEXPECTED_MIGRATION");
  });
  it("preserves the existing non-RC Preview build behavior",()=>{
    const r=run("preview","0","another-branch");expect(r.status).toBe(0);expect(r.stdout).toContain("RC1_FAKE_BUILD_ONLY");expect(r.stdout).not.toContain("RC1_UNEXPECTED_MIGRATION");
  });
});
