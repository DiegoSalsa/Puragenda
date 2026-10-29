import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

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
  return spawnSync(process.execPath,[resolve("scripts/vercel-build.mjs")],{cwd:directory,env:{...env,VERCEL_ENV:environment,VERCEL_GIT_COMMIT_REF:branch,PURAGENDA_RC1_STAGING_BUILD:approved},encoding:"utf8",windowsHide:true,timeout:10000});
}
afterAll(()=>{
  if(dirname(resolve(directory))!==resolve(tmpdir())||!basename(directory).startsWith("puragenda-rc1-build-"))throw new Error("OWNED_TEST_DIRECTORY_REQUIRED");
  rmSync(directory,{recursive:true,force:true});
});
describe("RC1 push/deployment isolation",()=>{
  it("disables automatic Vercel deployment for exactly RC1 without changing legacy schedules",()=>{
    const config=JSON.parse(readFileSync("vercel.json","utf8"));
    expect(config.git.deploymentEnabled).toEqual({"release/puragenda-next-rc1":false});
    expect(config.crons).toHaveLength(5);
    expect(config.crons.some((cron:{path:string})=>cron.path==="/api/cron/puragenda-next")).toBe(false);
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
