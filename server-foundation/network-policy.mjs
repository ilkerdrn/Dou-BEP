/** v2.93: Opt-in LAN (computer lab) mode. Default stays loopback-only.
 * With BEP_LAN_MODE=1 the server listens on the lab network, but ONLY the learner exam surface is reachable from other
 * machines (the /pilot page, its assets, the offline voice files and five learner API calls). Teacher/admin pages, login
 * and every other API stay reachable from this computer (loopback) only, so passwords never cross the network.
 * Traffic is plain HTTP: use an isolated lab network or put an HTTPS reverse proxy in front (institutional IT decision).
 */
import os from 'node:os';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
export const isLoopback=addr=>!addr||addr==='::1'||addr==='127.0.0.1'||String(addr).startsWith('::ffff:127.');
const HOST=/^[a-z0-9][a-z0-9.-]{0,79}$/i;
export function lanConfig(env=process.env){
 if(env.BEP_LAN_MODE!=='1')return {enabled:false,hosts:[],ips:[],bind:'127.0.0.1'};
 const extra=String(env.BEP_LAN_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(x=>HOST.test(x));
 const ips=Object.values(os.networkInterfaces()).flat().filter(i=>i&&i.family==='IPv4'&&!i.internal).map(i=>i.address);
 const bind=/^[0-9.]{7,15}$/.test(env.BEP_LAN_BIND||'')?env.BEP_LAN_BIND:'0.0.0.0';
 return {enabled:true,bind,ips,hosts:[...new Set([...extra,...ips,os.hostname().toLowerCase()])].filter(x=>HOST.test(x))};
}
export const hostSet=(port,lan)=>{const s=new Set([`127.0.0.1:${port}`,`localhost:${port}`,'127.0.0.1','localhost']);if(lan?.enabled)for(const h of lan.hosts){s.add(`${h}:${port}`);s.add(h);}return s;};
export const originSet=(port,lan)=>new Set([...hostSet(port,lan)].filter(h=>h.includes(':')).map(h=>`http://${h}`));
export const LEARNER_API=new Set(['/api/pilot/redeem','/api/pilot/draft','/api/pilot/submit','/api/pilot/break/start','/api/pilot/break/end']);
/** Static files the learner page needs: /pilot plus the transitive static imports of pilot.mjs, parsed from source. */
export function learnerAssets(root){
 const set=new Set(['/pilot','/pilot.mjs','/pilot.css','/pilot-refresh.css','/dou-reader.css','/dou-theme.css']);
 const queue=['pilot.mjs'],seen=new Set();
 while(queue.length){const f=queue.pop();if(seen.has(f))continue;seen.add(f);const p=join(root,f);if(!existsSync(p))continue;
  const src=readFileSync(p,'utf8');
  for(const m of src.matchAll(/(?:import|export)\s+(?:[^'"\n;]*?\s+from\s+)?['"]\.\/([^'"]+\.mjs)['"]/g)){set.add('/'+m[1]);queue.push(m[1]);}}
 return set;
}
export function lanBlocked({req,path,lan,learner}){
 if(!lan.enabled||isLoopback(req.socket?.remoteAddress))return false;
 if(path.startsWith('/api/'))return !(req.method==='POST'&&LEARNER_API.has(path));
 return !(learner.has(path)||path.startsWith('/okur/'));
}
export const learnerUrls=(port,lan)=>lan.enabled?(lan.ips.length?lan.ips:lan.hosts).map(h=>`http://${h}:${port}/pilot`):[];
