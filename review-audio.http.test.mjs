import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
const tmp=mkdtempSync(join(tmpdir(),'bep-review-'));
process.env.BEP_NO_LISTEN='1';
process.env.BEP_DB_PATH=join(tmp,'test.sqlite');
const {createServer}=await import('./server.mjs');
function get(server,path){return new Promise((resolve,reject)=>{
 const req=http.request({hostname:'127.0.0.1',port:server.address().port,path,headers:{Host:'localhost'},method:'GET'},res=>{
  const arr=[];res.on('data',c=>arr.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(arr).toString()}));
 });req.once('error',reject);req.end();
});}
test('reviewer is served with strict local CSP, no unsafe-inline script and separate JS asset',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const html=await get(server,'/ses-inceleme');assert.equal(html.status,200);assert.match(html.body,/review-audio.js/);
  assert.match(html.headers['content-security-policy'],/script-src 'self'/);
  const script=await get(server,'/review-audio.js');assert.equal(script.status,200);assert.match(script.body,/MAX_FILE_BYTES/);
  const css=await get(server,'/review-audio.css');assert.equal(css.status,200);assert.match(css.body,/#c50e1f/);
  const none=await get(server,'/review-secret');assert.equal(none.status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test.after(()=>rmSync(tmp,{force:true,recursive:true}));
