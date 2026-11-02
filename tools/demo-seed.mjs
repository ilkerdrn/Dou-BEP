import {openStore} from '../server-foundation/institutional-store.mjs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const db=process.env.BEP_DB_PATH;
const password=process.env.BEP_DEMO_PASSWORD;
const tenantId='dou-demo';
if(process.env.BEP_DEMO_LOCAL_ONLY!=='1'||!db||!password){
 console.error('Demo seed only runs from the explicit local demo launcher.');process.exit(2);
}
const {relative,isAbsolute}=await import('node:path');
const rel=relative(join(root,'data'),resolve(db));
if(!rel||rel.startsWith('..')||isAbsolute(rel)||!/^demo-[\w-]+\.sqlite$/.test(rel)){
 console.error('Demo database must be a new data/demo-*.sqlite file.');process.exit(2);
}
const store=openStore(db);
try{
 store.createTenantAdmin({tenantId,tenantName:'DOU BEP DEMO (SENTETIK)',email:'admin@demo.test',password});
 const login=store.signIn({tenantId,email:'admin@demo.test',password});
 const actor=store.actorFrom(login.token);
 if(!actor||actor.role!=='admin')throw Error('Demo admin login failed');
 for(const [role,email] of [
  ['teacher','ogretmen@demo.test'],['coordinator','koordinator@demo.test'],
  ['reviewer','incelemeci@demo.test'],['observer','gozlemci@demo.test']
 ])store.addMember(actor,{email,role,password});
 console.log('Demo tenant created: '+tenantId);
 console.log('Synthetic accounts: admin, teacher, coordinator, reviewer, observer');
}finally{store.db.close();}
