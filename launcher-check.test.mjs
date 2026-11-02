import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {probe} from './launcher-check.mjs';
async function withServer(marker,fn){const server=http.createServer((req,res)=>{if(marker)res.setHeader('X-DOU-BEP-Local','1');res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true,"scope":"local-only","version":"2.81.0"}');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{await fn(server.address().port);}finally{await new Promise(resolve=>server.close(resolve));}}
test('v2.9 launcher recognizes DOU only with an explicit local-app HTTP marker',async()=>{await withServer(true,async port=>assert.equal(await probe(port),'bep'));});
test('v2.9 launcher does not mistake another HTTP server for DOU',async()=>{await withServer(false,async port=>assert.equal(await probe(port),'other'));});
test('v2.9 launcher recognizes a released localhost port',async()=>{let port;await withServer(false,async p=>{port=p;});assert.equal(await probe(port),'free');});
test('v2.9 launcher script prints a usable port status in command-line mode',()=>{const r=spawnSync(process.execPath,['launcher-check.mjs'],{cwd:import.meta.dirname,env:{...process.env,PORT:'4173'},encoding:'utf8'});assert.ok([0,10,11,12].includes(r.status));assert.ok(r.stdout.includes('4173'));});

test('v2.9 recognizes legacy DOU and tells user to close old startup window',async()=>{const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true,"scope":"local-only","version":"2.6.0"}');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{assert.equal(await probe(server.address().port),'bep_legacy');}finally{await new Promise(resolve=>server.close(resolve));}});

test('v2.9 does not silently reuse v2.7 even if the old server sets the same local marker',async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('X-DOU-BEP-Local','1');res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true,"scope":"local-only","version":"2.7.0"}');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{assert.equal(await probe(server.address().port),'bep_legacy');}finally{await new Promise(resolve=>server.close(resolve));}
});
test('v2.9 rejects marker-only unauthenticated lookalike',async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('X-DOU-BEP-Local','1');res.end('{"ok":true}');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{assert.equal(await probe(server.address().port),'other');}finally{await new Promise(resolve=>server.close(resolve));}
});
