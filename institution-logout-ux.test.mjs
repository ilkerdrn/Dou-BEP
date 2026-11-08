import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./institution.html',import.meta.url),'utf8');
const js=readFileSync(new URL('./institution.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('./bep-v4.css',import.meta.url),'utf8');
const api=readFileSync(new URL('./server-foundation/institutional-api.mjs',import.meta.url),'utf8');

test('campus menu has a named, keyboard reachable sign-out action',()=>{
 assert.match(html,/<button[^>]*id="logout-sidebar"[^>]*aria-label="Kurumsal oturumdan çıkış yap"/);
 assert.match(html,/<button[^>]*id="logout"[^>]*>Oturumu kapat<\/button>/);
 assert.match(css,/\.dou-sidebar-logout:focus-visible/);
 assert.match(css,/\.dou-sidebar-logout\[hidden\]\{display:none!important\}/);
});
test('guest cannot use sign-out or institution navigation before verified login',()=>{
 assert.match(js,/const signedIn=active&&!restricted/);
 assert.match(js,/\$\('logout-sidebar'\)\.hidden=!signedIn/);
 assert.match(js,/navigation\.inert=!signedIn/);
});
test('sidebar exits via the same server-backed logout and session cookie revocation as original action',()=>{
 assert.match(js,/\$\('logout-sidebar'\)\.addEventListener\('click',\(\)=>\$\('logout'\)\.click\(\)\)/);
 assert.match(js,/await api\('\/logout',\{method:'POST'\}\)/);
 assert.match(api,/store\.logout\(token,actor\)/);
 assert.match(api,/bep_session=; HttpOnly; SameSite=Strict; Path=\/; Max-Age=0/);
});
