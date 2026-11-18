import test from 'node:test';
import assert from 'node:assert/strict';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isLoopback,lanConfig,hostSet,originSet,LEARNER_API,learnerAssets,lanBlocked,learnerUrls} from './network-policy.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
test('varsayılan: salon modu kapalı, yalnızca loopback ana bilgisayar adları kabul edilir',()=>{
 const lan=lanConfig({});assert.equal(lan.enabled,false);assert.deepEqual([...hostSet(4173,lan)].sort(),['127.0.0.1','127.0.0.1:4173','localhost','localhost:4173']);
 assert.equal(lanBlocked({req:{socket:{remoteAddress:'10.0.0.5'},method:'GET'},path:'/kurum',lan,learner:new Set()}),false,'kapalıyken ağ kapısı devreye girmez (sunucu zaten yalnız loopback dinler)');
 assert.deepEqual(learnerUrls(4173,lan),[]);
});
test('salon modu: ana bilgisayar adları sınırlı ve doğrulanır; kötü adlar atılır',()=>{
 const lan=lanConfig({BEP_LAN_MODE:'1',BEP_LAN_HOSTS:'Sinav-Sunucu, 192.168.1.20 ,evil host,;rm -rf,x'.replace(';rm -rf','bad;name')});
 assert.equal(lan.enabled,true);assert.ok(lan.hosts.includes('sinav-sunucu'));assert.ok(lan.hosts.includes('192.168.1.20'));
 assert.ok(!lan.hosts.some(h=>/\s|;/.test(h)));
 const hs=hostSet(4173,lan);assert.ok(hs.has('192.168.1.20:4173'));assert.ok(!hs.has('evil.example:4173'));
 assert.ok(originSet(4173,lan).has('http://192.168.1.20:4173'));assert.ok(![...originSet(4173,lan)].some(o=>o.endsWith('example')));
 assert.equal(lanConfig({BEP_LAN_MODE:'1',BEP_LAN_BIND:'rm -rf'}).bind,'0.0.0.0');assert.equal(lanConfig({BEP_LAN_MODE:'1',BEP_LAN_BIND:'192.168.1.20'}).bind,'192.168.1.20');
 assert.equal(lanConfig({BEP_LAN_MODE:'0'}).enabled,false);
});
test('ağdan yalnızca öğrenci yüzeyi: yönetim sayfaları, giriş ve diğer API kapalı; loopback serbest',()=>{
 const lan={enabled:true,hosts:['x'],ips:['10.0.0.2'],bind:'0.0.0.0'},learner=learnerAssets(root);
 const remote={socket:{remoteAddress:'::ffff:10.0.0.7'},method:'GET'},local={socket:{remoteAddress:'::ffff:127.0.0.1'},method:'GET'};
 const blocked=(req,path)=>lanBlocked({req,path,lan,learner});
 for(const ok of ['/hazirlik','/hazirlik.mjs','/pilot','/pilot.mjs','/pilot.css','/dou-reader-panel.mjs','/dou-reader-core.mjs','/dou-speech.mjs','/dou-speech-neural.mjs','/dou-theme.css','/okur/models.json','/okur/models/text.6a21984ac693.onnx'])assert.equal(blocked(remote,ok),false,ok);
 for(const bad of ['/kurum','/kurumsal-sinav','/salon-oturumu','/pilot-yonetim','/lab.mjs','/institution.mjs','/server.mjs','/data/institution.sqlite','/api/login','/api/session','/api/pilot','/api/pilot/live','/api/pilot/batch','/api/lan-info','/api/exams','/terminology.json'])assert.equal(blocked(remote,bad),true,bad);
 for(const api of LEARNER_API)assert.equal(blocked({...remote,method:'POST'},api),false,api);
 assert.equal(blocked({...remote,method:'GET'},'/api/pilot/submit'),true,'öğrenci API\'leri yalnız POST');
 assert.equal(blocked({...remote,method:'GET'},'/api/ping'),false,'bağlantı denemesi GET');assert.equal(blocked({...remote,method:'POST'},'/api/ping'),true);
 assert.equal(blocked({...remote,method:'POST'},'/api/login'),true);
 for(const p of ['/kurum','/api/login','/api/pilot/live','/salon-oturumu'])assert.equal(blocked({...local,method:'POST'},p),false,'loopback: '+p);
 assert.equal(isLoopback('::1'),true);assert.equal(isLoopback('::ffff:127.0.0.1'),true);assert.equal(isLoopback('192.168.1.5'),false);assert.equal(isLoopback('::ffff:192.168.1.5'),false);
 assert.deepEqual(learnerUrls(4173,lan),['http://10.0.0.2:4173/pilot']);
});
test('öğrenci varlık listesi pilot.mjs bağımlılıklarını kapsar (sayfa boş kalmaz)',()=>{
 const a=learnerAssets(root);for(const f of ['/pilot.mjs','/dou-reader-panel.mjs','/dou-reader-core.mjs','/dou-speech.mjs','/dou-speech-pronunciation.mjs','/dou-speech-neural.mjs'])assert.ok(a.has(f),f);
 assert.ok(![...a].some(f=>/institution|lab\.mjs|pilot-admin|batch|accommodation/.test(f)),'yönetim betikleri öğrenci listesinde yok');
});
