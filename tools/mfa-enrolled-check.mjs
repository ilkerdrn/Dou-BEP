/** Read-only guard for Windows DPAPI key bootstrap. Does not create a DB. */
import {existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
const pathname=process.argv[2];
if(!pathname)process.exit(2);
if(!existsSync(pathname))process.exit(0);
let db;
try{
 db=new DatabaseSync(resolve(pathname),{readOnly:true});
 const table=db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='auth_mfa'").get();
 if(table&&db.prepare('SELECT 1 AS ok FROM auth_mfa WHERE enabled=1 LIMIT 1').get())process.exitCode=11;
}catch(e){console.error('MFA DB durumu dogrulanamadi:',e.code||'unknown');process.exitCode=12;}finally{db?.close();}
