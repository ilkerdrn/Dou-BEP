import test from 'node:test';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';import {readFileSync} from 'node:fs';
import {validateBridgeRequest} from './tools/dou-speech-nvda-stdio.mjs';
const bridge=new URL('./tools/dou-speech-nvda-stdio.mjs',import.meta.url).pathname;
const call=payload=>spawnSync(process.execPath,[bridge],{input:JSON.stringify(payload),timeout:12000,maxBuffer:3_500_000});
test('Opt-in local bridge accepts only validated bounded requests',()=>{
 assert.deepEqual(validateBridgeRequest({text:'Merhaba'}),{text:'Merhaba',rate:1,pitchHz:125,acousticModel:'legacy'});
 for(const x of [{text:'A',url:'https://example.com'},{text:'Z'.repeat(261)},{text:123},{text:'OK',acousticModel:'remote'}])assert.throws(()=>validateBridgeRequest(x));
});
test('Experimental NVDA helper receives stdin-only JSON and returns 22050Hz PCM WAV to stdout',()=>{
 const r=call({text:'Merhaba dünya',acousticModel:'legacy'});assert.equal(r.status,0,String(r.stderr));
 assert.equal(r.stdout.subarray(0,4).toString(),'RIFF');assert.equal(r.stdout.readUInt32LE(24),22050);
 assert.equal(r.stdout.readUInt16LE(22),1);assert.equal(r.stdout.readUInt16LE(34),16);
 assert.equal(r.stdout.readUInt32LE(40)+44,r.stdout.length);
});
test('Rejected requests fail closed and never echo text in stderr',()=>{
 const secret='LOCAL-REDACTION-MARKER';const r=call({text:secret,port:5000});
 assert.notEqual(r.status,0);assert.equal(r.stdout.length,0);assert.doesNotMatch(r.stderr.toString(),/LOCAL-REDACTION-MARKER/);
});
test('NVDA research code is opt-in, not in server allowlist, never auto-installed',()=>{
 const py=readFileSync(new URL('./nvda-experimental/synthDrivers/douBepPilot/__init__.py',import.meta.url),'utf8');
 const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
 assert.match(py,/DOU_BEP_NVDA_EXPERIMENTAL/);assert.match(py,/DOU_BEP_ROOT/);
 assert.match(py,/def cancel\(self\)/);assert.match(py,/def pause\(self, switch\)/);
 assert.match(py,/synthIndexReached/);assert.match(py,/synthDoneSpeaking/);
 assert.doesNotMatch(server,/\/nvda-experimental\/|\/tools\/dou-speech-nvda-stdio.mjs/);
});

test('Bridge accepts UTF-8 Turkish payload and preserves valid WAV framing',()=>{
 const r=call({text:'Öğrenci için Türkçe sınav açıklaması',rate:1,pitchHz:125});
 assert.equal(r.status,0,String(r.stderr));
 assert.equal(r.stdout.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(r.stdout.readUInt32LE(40)+44,r.stdout.length);
});
test('Bridge rejects invalid UTF-8 without reflecting payload',()=>{
 const bad=Buffer.from([0x7b,0x22,0x74,0x65,0x78,0x74,0x22,0x3a,0x22,0xc3,0x28,0x22,0x7d]);
 const r=spawnSync(process.execPath,[bridge],{input:bad,timeout:12000,maxBuffer:3_500_000});
 assert.notEqual(r.status,0);assert.equal(r.stdout.length,0);
 assert.match(r.stderr.toString(),/rejected request/);
});
test('Bridge enforces byte limit and does not echo rejected text',()=>{
 const r=call({text:'A'.repeat(260),unexpected:'PRIVATE-DO-NOT-LOG-'+ 'Z'.repeat(2200)});
 assert.notEqual(r.status,0);assert.equal(r.stdout.length,0);
 assert.doesNotMatch(r.stderr.toString(),/PRIVATE-DO-NOT-LOG/);
});

test('Experimental NVDA driver bounds queued speech while busy and preserves cancellation',()=>{
 const py=readFileSync(new URL('./nvda-experimental/synthDrivers/douBepPilot/__init__.py',import.meta.url),'utf8');
 assert.match(py,/MAX_PENDING_UTTERANCES = 8/);
 assert.match(py,/len\(self\._pending\) >= MAX_PENDING_UTTERANCES/);
 assert.match(py,/self\._pending\.clear\(\)/);
 assert.match(py,/self\._generation \+= 1/);
});
