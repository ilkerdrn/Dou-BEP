import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const css=readFileSync(new URL('./dou-theme.css',import.meta.url),'utf8');
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
const token=n=>css.match(new RegExp('--'+n+':(#[0-9A-Fa-f]{6})'))[1];
test('every HTML page loads the shared theme last among stylesheets',()=>{
 for(const f of readdirSync(new URL('.',import.meta.url)).filter(x=>x.endsWith('.html'))){
  const html=readFileSync(new URL('./'+f,import.meta.url),'utf8');
  const links=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m=>m[1]);
  assert.equal(links.at(-1),'/dou-theme.css',f);
 }
});
test('theme colours keep at least 4.5:1 contrast for text and 3:1 for focus ring',()=>{
 const pairs=[['dou-ink','dou-bg'],['dou-muted','dou-card'],['dou-red','dou-card'],['dou-ok','dou-ok-bg'],['dou-warn','dou-warn-bg'],['dou-danger','dou-danger-bg']];
 for(const [a,b] of pairs)assert.ok(ratio(token(a),token(b))>=4.5,`${a}/${b}`);
 assert.ok(ratio(token('dou-focus'),token('dou-card'))>=3);
 assert.ok(ratio('#FFFFFF',token('dou-red'))>=4.5,'white on red button');
});
test('theme is offline and defines keyboard focus and large student targets',()=>{
 assert.doesNotMatch(css,/@import|url\(|https?:\/\//);
 assert.match(css,/outline:4px solid var\(--dou-focus\)/);
 assert.match(css,/body\.dou-student button[^{]*\{[^}]*min-height:52px/);
});
