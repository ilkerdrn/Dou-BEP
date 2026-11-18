/** Test-only helper: creates a synthetic tenant admin in a TEMP database and returns a session cookie,
 * so HTTP tests can open the login-protected management pages. Never used by the running application. */
import {openStore} from './server-foundation/institutional-store.mjs';
export async function panelCookie(dbPath){
 const store=openStore(dbPath);
 try{
  store.createTenantAdmin({tenantId:'anonim-panel-test',tenantName:'Anonim Test',email:'panel@anonim-test.invalid',password:'Sentetik-BEP-Yalniz-Test-2026!'});
  const login=store.signIn({tenantId:'anonim-panel-test',email:'panel@anonim-test.invalid',password:'Sentetik-BEP-Yalniz-Test-2026!'});
  return 'bep_session='+login.token;
 }finally{store.db.close();}
}
