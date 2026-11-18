// Real-browser end-to-end checks of the learner flow for distinct accessibility profiles.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createDemo,normalizeExam} from './core.mjs';
import {generateAccessibleExamHtml} from './accessible-player.mjs';
const require=createRequire(import.meta.url);
let chromium=null;
try{({chromium}=require('playwright'));}catch{}
const skip=chromium?false:'playwright yok';

function exam(){const e=normalizeExam(createDemo());e.adaptations.visualCues=false;e.duration=10;
 e.questions=e.questions.filter(q=>q.type==='choice').slice(0,2);
 e.questions[0].prompt='Dört artı üç kaçtır?';e.questions[0].options=['Altı','Yedi','Sekiz'];
 return e;}
async function open(html,opts={}){
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:900,height:900},...opts});
 const requests=[];page.on('request',r=>{if(!r.url().startsWith('data:')&&!r.url().startsWith('about:'))requests.push(r.url());});
 await page.setContent(html);return {browser,page,requests};
}

test('A: klavye ve ekran okuyucu — tam akış, kısayollar, onaylı teslim',{skip},async()=>{
 const {browser,page,requests}=await open(generateAccessibleExamHtml(exam()));
 try{
  assert.equal(await page.locator('#exam-ui').isHidden(),true,'başlamadan sınav gizli');
  await page.keyboard.press('Tab');await page.focus('#start-btn');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'prompt','odak soruya taşınır');
  assert.match(await page.textContent('#progress'),/Henüz cevaplanmadı/);
  await page.keyboard.press('Alt+Shift+T');assert.match(await page.textContent('#status'),/Kalan süre: (9|10) dakika/);
  await page.keyboard.press('Alt+Shift+2');
  assert.match(await page.textContent('#status'),/Seçenek B seçildi/);
  assert.match(await page.textContent('#progress'),/Cevaplandı/);
  await page.keyboard.press('Alt+Shift+D');assert.match(await page.textContent('#status'),/1 soru cevaplandı, 1 soru boş/);
  await page.keyboard.press('Alt+Shift+N');assert.match(await page.textContent('#progress'),/Soru 2/);
  await page.click('#finish');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'review-summary');
  assert.match(await page.textContent('#review-list'),/Soru 2: BOŞ/);
  await page.click('#submit');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'confirm-cancel','güvenli varsayılan: iptal');
  await page.keyboard.press('Enter');assert.equal(await page.locator('#done').isHidden(),true);
  await page.click('#submit');await page.click('#confirm-ok');
  assert.equal(await page.locator('#done').isVisible(),true);
  assert.equal(await page.locator('#question-area').isHidden(),true);
  assert.deepEqual(requests,[],'ağ isteği yok');
 }finally{await browser.close();}
});

test('B/C: az gören ve işitme engelli — büyük yazı, yüksek kontrast, görsel süre uyarısı, ses gerekmez',{skip},async()=>{
 const e=exam();e.adaptations.fontSize=24;e.adaptations.highContrast=true;e.duration=11;
 const {browser,page}=await open(generateAccessibleExamHtml(e));
 try{
  await page.clock?.install?.({time:0});
  await page.click('#start-btn');
  assert.equal(await page.evaluate(()=>document.body.classList.contains('high-contrast')),true);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--text-size').trim()),'24px');
  await page.clock.fastForward(61*1000);await page.waitForTimeout(1300);
  const alert=page.locator('#time-alert');
  assert.equal(await alert.isVisible(),true,'görsel uyarı');
  assert.match(await alert.textContent(),/10 dakika kaldı/);
 }finally{await browser.close();}
});

test('D: motor engelli — tek soru, basit ekran, büyük tıklama alanları, onaylı ek süre',{skip},async()=>{
 const {browser,page}=await open(generateAccessibleExamHtml(exam(),{extraMinutes:5}));
 try{
  assert.match(await page.textContent('#duration-text'),/10 dakika \+ kurum onaylı 5 dakika ek süre/);
  await page.click('#start-btn');
  assert.equal((await page.textContent('#timer')).startsWith('15:'),true);
  await page.check('#simple-mode');await page.check('#big-targets');
  assert.equal(await page.locator('.voice-panel').isHidden(),true);
  const box=await page.locator('#next').boundingBox();assert.ok(box.height>=76,'büyük hedef');
  assert.equal(await page.locator('.answer-choice').count(),3,'bir anda tek soru');
  await page.locator('.answer-choice').nth(0).click();
  assert.match(await page.textContent('#progress'),/Cevaplandı/);
 }finally{await browser.close();}
});

test('süre dolunca yanıtlar kilitlenir ve teslim ekranı açılır',{skip},async()=>{
 const e=exam();e.duration=1;
 const {browser,page}=await open(generateAccessibleExamHtml(e));
 try{
  await page.clock.install({time:0});await page.click('#start-btn');
  await page.clock.fastForward(61*1000);await page.waitForTimeout(1300);
  assert.match(await page.textContent('#time-alert'),/Süre doldu/);
  assert.equal(await page.locator('#review').isVisible(),true);
  assert.equal(await page.locator('#review-list button').first().isDisabled(),true);
 }finally{await browser.close();}
});
