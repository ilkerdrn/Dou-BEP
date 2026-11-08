import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const css=read('dou-unified-ui.css');
const modules=[
 ['Genel Bakış','institution.html','/kurum'],
 ['Sınav Hazırla','institutional-exams.html','/kurumsal-sinav'],
 ['Word / PDF Aktar','exam-source-import.html','/sinav-dosya-aktar'],
 ['Sınav Koordinasyonu','coordination.html','/sinav-koordinasyon'],
 ['Uyarlama Kararları','accommodation-admin.html','/uyarlama-kararlari'],
 ['Toplu Uyarlama','batch-exams.html','/toplu-sinav'],
 ['Operasyon Merkezi','operations.html','/sinav-operasyon'],
 ['BEP Kazanım Aktarımı','bep-import.html','/bep-import'],
 ['Erişilebilirlik Kabulü','acceptance.html','/erisilebilirlik-kabul'],
 ['Kontrol Listesi','accessibility-check.html','/erisilebilirlik-kontrol'],
 ['Demo Oturumları','pilot-admin.html','/pilot-yonetim'],
 ['DOU Reader','dou-reader-demo.html','/dou-reader-demo'],
 ['Ünsüz Deneyi','dou-speech-phoneme.html','/dou-speech-phoneme'],
 ['Ses Havuzu','dou-speech-pool.html','/dou-speech-pool'],
 ['Dinleme Testi','dou-speech-listening.html','/dou-speech-listening'],
 ['Ses Anlaşılabilirliği','dou-speech-intelligibility.html','/dou-speech-intelligibility']
];
test('all 16 navigable admin modules load one final locally served design stylesheet',()=>{
 const server=read('server.mjs');
 for(const [name,file,url] of modules){
  const html=read(file);
  assert.equal((html.match(/href="\/dou-unified-ui\.css"/g)||[]).length,1,name);
  assert.ok(html.indexOf('/dou-unified-ui.css')>html.indexOf('/bep-v4.css'),name);
  assert.match(html,/data-design-version="4"/,name);
  assert.match(html,/src="\/admin-navigation\.js"/,name);
  assert.ok(server.includes("'"+url+"'"),name+' route unavailable');
 }
});
test('existing module-specific layouts are covered by common neutral cards and fields',()=>{
 for(const selector of ['.coord-card','.batch-card','.ops-panel','.source-card','.bep-import-panel',
  '.overview>div','.ops-kpis>section','.coord-kpis>div',
  '.coord-form input','.decision-fields input','.ops-toolbar select','.source-grid input']){
  assert.ok(css.includes(selector),selector);
 }
 assert.match(css,/--adm-accent:#d70926;--adm-accent-dark:#b50720/);
 assert.match(css,/--paper:#f5f5f2;--line:#e6e5e1/);
 assert.match(css,/\.ops-toolbar button,.coord-actions button,.batch-actions button/);
});
test('sidebar design retains status meanings and excludes high-contrast student mode',()=>{
 assert.match(css,/body\[data-design-version="4"\]:not\(\.high\):not\(\.high-contrast\)/);
 assert.match(css,/\.status\.live,.decision-status\.approved/);
 assert.match(css,/\.decision-status\.revoked/);
 assert.match(css,/\.coord-warning,.ops-warning,.batch-alert,.notice\[role="note"\]/);
 assert.doesNotMatch(css,/@import\s+url\(["']?https?:/);
});
