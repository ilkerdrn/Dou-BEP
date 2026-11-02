import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runAcceptancePilot} from './acceptance-pilot.mjs';

test('anonymous BAP acceptance executes actual workflow and writes minimal report',async()=>{
 const temp=mkdtempSync(join(tmpdir(),'bep-acceptance-report-'));
 const path=join(temp,'result.json');
 try{
  const report=await runAcceptancePilot({reportFile:path});
  assert.equal(report.failed,0);
  assert.equal(report.passed,10);
  assert.equal(report.checks.length,10);
  assert.equal(report.productionReady,false);
  assert.equal(report.humanAccessibilityTestingComplete,false);
  assert.ok(report.checks.every(c=>c.status==='PASS'));
  const text=readFileSync(path,'utf8');
  for(const secret of ['KOD-001','Anonymous-Local-Fixture','bep_session','@pilot-a.test','fixture.sqlite','tampered']){
   assert.ok(!text.includes(secret),'Sensitive or operational material in report');
  }
  assert.equal(JSON.parse(text).format,'DOU-BEP-ANONYMOUS-ACCEPTANCE-1');
 }finally{rmSync(temp,{recursive:true,force:true});}
});

test('acceptance never opens or modifies caller BEP_DB_PATH',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bep-sentinel-'));
 const sentinel=join(dir,'existing-data.sqlite');
 const before=Buffer.from('Existing user data must never be touched.');
 writeFileSync(sentinel,before);
 const old=process.env.BEP_DB_PATH;
 try{
  process.env.BEP_DB_PATH=sentinel;
  const report=await runAcceptancePilot();
  assert.equal(report.failed,0);
  assert.deepEqual(readFileSync(sentinel),before);
 }finally{
  if(old===undefined)delete process.env.BEP_DB_PATH;else process.env.BEP_DB_PATH=old;
  rmSync(dir,{recursive:true,force:true});
 }
});
