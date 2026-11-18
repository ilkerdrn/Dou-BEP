import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {suggestAdjustments,GUIDE_AREAS,GUIDE_NOTE} from './adjustment-guide.mjs';
import {ADJUSTMENTS,NEED_AREAS} from './batch-accommodations.mjs';
test('her erişim alanı için rehber vardır ve yalnızca geçerli düzenleme kodları önerilir',()=>{
 assert.deepEqual(GUIDE_AREAS.map(a=>a.id),Object.keys(NEED_AREAS));
 for(const id of Object.keys(NEED_AREAS)){const g=suggestAdjustments(id);
  assert.match(g.note,/karar rehberidir|Bireysel değerlendirme/);
  for(const it of g.items){assert.ok(Object.hasOwn(ADJUSTMENTS,it.code),it.code);assert.equal(it.label,ADJUSTMENTS[it.code].label);assert.ok(it.reason.length>10);}
  assert.equal(new Set(g.items.map(i=>i.code)).size,g.items.length,'tekrarsız');}
});
test('görevli gerektiren düzenlemeler otomatik uygulanır diye işaretlenmez; "diğer" alanı öneri üretmez',()=>{
 for(const id of ['vision','hearing','speech','motor','reading'])for(const it of suggestAdjustments(id).items)assert.equal(it.automatic,it.kind!=='staff',id+' '+it.code);
 assert.deepEqual(suggestAdjustments('other').items,[]);assert.match(suggestAdjustments('other').note,/Bireysel değerlendirme/);
 assert.throws(()=>suggestAdjustments('adhd'),/Geçersiz/);assert.throws(()=>suggestAdjustments('__proto__'),/Geçersiz/);
});
test('rehber tanı koymaz: metinlerde tanı/engel derecesi çıkarımı yok ve kaynak kodu depolama/ağ kullanmaz',()=>{
 const src=readFileSync(new URL('./adjustment-guide.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/\bfetch\(|localStorage|sessionStorage|indexedDB|XMLHttpRequest/);
 assert.match(GUIDE_NOTE,/tanı veya otomatik karar değildir/);
 const all=GUIDE_AREAS.flatMap(a=>suggestAdjustments(a.id).items.map(i=>i.reason)).join(' ');
 assert.doesNotMatch(all,/\b(tanı|rapor|yüzde|%\d)/i);
});
