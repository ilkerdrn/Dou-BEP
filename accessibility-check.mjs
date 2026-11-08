/** DOU BEP R2 — local-only manual accessibility audit. No personal data/network/storage. */
import {PILOT_CHECKS,buildPilotEvidence,pilotEvidenceCsv,parsePilotEvidenceJson} from './accessibility-evidence.mjs';
const $=id=>document.getElementById(id);
const container=$('checks'),status=$('pilot-check-count');
const statuses=[['not-tested','Henüz test edilmedi'],['pass','Geçti'],['fail','Sorun var']];
const shortState={'not-tested':'Bekliyor',pass:'Geçti',fail:'Sorun var'};
let activeFilter='all';

function make(tag,className,text){
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=text;
 return el;
}
for(const [i,item] of PILOT_CHECKS.entries()){
 const section=make('article','check-item');
 section.dataset.outcome='not-tested';
 section.dataset.checkId=item.id;
 section.setAttribute('aria-labelledby','pilot-card-title-'+i);
 const heading=make('div','pilot-check-header');
 const number=make('span','pilot-check-number',String(i+1).padStart(2,'0'));number.setAttribute('aria-hidden','true');
 const title=make('h3','pilot-check-title',item.label);title.id='pilot-card-title-'+i;
 const badge=make('span','pilot-check-badge','Bekliyor');badge.id='pilot-badge-'+i;
 heading.append(number,title,badge);
 const help=make('p','pilot-check-help',item.help);help.id='pilot-help-'+i;
 const resultLabel=make('label','pilot-field-label','Kontrol sonucu');resultLabel.htmlFor='status-'+i;resultLabel.id='pilot-status-label-'+i;
 const select=make('select','pilot-result');select.id='status-'+i;select.dataset.check=item.id;
 select.setAttribute('aria-labelledby',title.id+' '+resultLabel.id);select.setAttribute('aria-describedby',help.id);
 for(const [value,text] of statuses){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
 const noteGroup=make('div','pilot-note-group');
 const noteLabel=make('label','pilot-field-label','Teknik gözlem (isteğe bağlı, kimliksiz)');noteLabel.htmlFor='note-'+i;
 const note=make('textarea','pilot-note');note.id='note-'+i;note.dataset.note=item.id;note.rows=2;note.maxLength=180;
 note.placeholder='Örnek: Tab ile üçüncü seçeneğe geçilemiyor';
 const noteLimit=make('span','pilot-note-limit','0 / 180');noteLimit.id='pilot-note-limit-'+i;
 note.setAttribute('aria-describedby',noteLimit.id);noteGroup.append(noteLabel,note,noteLimit);
 section.append(heading,help,resultLabel,select,noteGroup);
 container.append(section);
 select.addEventListener('change',refresh);
 note.addEventListener('input',()=>{noteLimit.textContent=note.value.length+' / 180';$('pilot-export-error').textContent='';});
}

function collect(){return buildPilotEvidence({version:'2.81.0',screenReader:$('pilot-reader').value,platform:$('pilot-platform').value,browser:$('pilot-browser').value,
 items:PILOT_CHECKS.map((item,i)=>({id:item.id,outcome:$('status-'+i).value,note:$('note-'+i).value}))});}
function refresh(){
 const focused=document.activeElement;
 const oldFocusedCard=focused?.closest?.('.check-item');
 const outcomes=PILOT_CHECKS.map((item,i)=>$('status-'+i).value);
 const passed=outcomes.filter(x=>x==='pass').length,failed=outcomes.filter(x=>x==='fail').length;
 const untested=PILOT_CHECKS.length-passed-failed,completed=passed+failed;
 $('pilot-passed').textContent=String(passed);
 $('pilot-failed').textContent=String(failed);
 $('pilot-untested').textContent=String(untested);
 $('pilot-percent').textContent='%'+Math.round(100*completed/PILOT_CHECKS.length);
 $('pilot-progress').value=completed;
 $('pilot-progress-text').textContent=`${completed} / ${PILOT_CHECKS.length} değerlendirildi`;
 status.textContent=`${passed} geçti · ${failed} sorun · ${untested} test edilmedi. ${failed?'Sorunların giderilmesi gerekli.':untested?'Kontroller tamamlanmadı.':'Tüm maddeler işaretlendi; yine de bağımsız uzman incelemesi gerekiyor.'}`;
 let visible=0;
 for(const [i,outcome] of outcomes.entries()){
  const card=container.children[i];card.dataset.outcome=outcome;
  $('pilot-badge-'+i).textContent=shortState[outcome];
  card.hidden=activeFilter!=='all'&&outcome!==activeFilter;
  if(!card.hidden)visible++;
 }
 $('pilot-no-results').hidden=visible!==0;
 // Keep this overview anonymous: only fixed checklist titles and statuses, never notes.
 const findings=$('pilot-findings-list');
 findings.replaceChildren();
 for(const outcome of ['fail','not-tested']){
  for(const [i,value] of outcomes.entries()){
   if(value!==outcome)continue;
   const entry=make('li','pilot-finding');
   const label=make('span','pilot-finding-title',PILOT_CHECKS[i].label);
   const state=make('span','pilot-finding-state',outcome==='fail'?'Sorun var':'Bekliyor');
   entry.dataset.outcome=outcome;
   entry.append(label,state);
   findings.append(entry);
  }
 }
 $('pilot-jump-fail').disabled=failed===0;
 $('pilot-findings-status').textContent=failed
  ?failed+' sorunlu · '+untested+' bekleyen kontrol. Önce sorunlu maddeleri inceleyin.'
  :untested?untested+' kontrol henüz değerlendirilmedi.':'İşaretlenmiş sorun veya bekleyen kontrol yok. Bağımsız değerlendirme yine gereklidir.';
 // A filtered card may disappear after its selected outcome changes. Keep keyboard focus predictable.
 if(oldFocusedCard?.hidden){
  const next=Array.from(container.children).find(c=>!c.hidden);
  (next?.querySelector('.pilot-result')||document.querySelector('[data-filter][aria-pressed="true"]'))?.focus();
 }
}
for(const button of document.querySelectorAll('[data-filter]')){
 button.addEventListener('click',()=>{
  activeFilter=button.dataset.filter;
  for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b===button));
  refresh();
 });
}
function download(name,contents,type){
 const blob=new Blob([contents],{type});const objectUrl=URL.createObjectURL(blob);
 const anchor=document.createElement('a');anchor.href=objectUrl;anchor.download=name;
 document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),5000);
}
function exportEvidence(kind){
 try{
  const report=collect();const stamp=new Date().toISOString().slice(0,10);
  if(kind==='csv')download(`bep-erisilebilirlik-kontrol-${stamp}.csv`,pilotEvidenceCsv(report),'text/csv;charset=utf-8');
  else download(`bep-erisilebilirlik-kontrol-${stamp}.json`,JSON.stringify(report,null,2),'application/json;charset=utf-8');
  $('pilot-export-error').textContent='Anonim teknik kontrol kaydı cihazınıza indirildi. Bu kayıt erişilebilirlik sertifikası değildir.';
 }catch(error){$('pilot-export-error').textContent=error.message;}
}
for(const id of ['pilot-reader','pilot-platform','pilot-browser'])$(id).addEventListener('change',refresh);
$('pilot-jump-fail').addEventListener('click',()=>{
 const index=PILOT_CHECKS.findIndex((item,i)=>$('status-'+i).value==='fail');
 if(index<0)return;
 activeFilter='all';
 for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));
 refresh();
 $('status-'+index).focus();
 $('pilot-export-error').textContent='Sorunlu kontrol '+(index+1)+' açıldı.';
});
$('pilot-jump').addEventListener('click',()=>{
 activeFilter='all';
 for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));
 refresh();
 const next=PILOT_CHECKS.findIndex((item,i)=>$('status-'+i).value==='not-tested');
 if(next>=0){$('status-'+next).focus();$('pilot-export-error').textContent='Bekleyen kontrol '+(next+1)+' açıldı.';}
 else{$('pilot-export-error').textContent='Bekleyen kontrol kalmadı; sonuçları kontrol edip JSON raporunu indirebilirsin.';}
});
$('pilot-import-json').addEventListener('change',async event=>{
 const input=event.currentTarget;
 const file=input.files?.[0];
 input.value='';
 if(!file)return;
 try{
  if(!/\.json$/i.test(file.name)||file.size>65536||file.size===0)throw Error('64 KB altında, .json uzantılı bir kontrol raporu seç.');
  const report=parsePilotEvidenceJson(await file.text());
  // Reading and validation finish before any of the current selections change.
  const hasEdits=PILOT_CHECKS.some((item,i)=>$('status-'+i).value!=='not-tested'||$('note-'+i).value.length>0);
  if(hasEdits&&!window.confirm('Bu sekmedeki mevcut seçimler indirilen JSON raporuyla değiştirilsin mi?')){
    $('pilot-export-error').textContent='İçe aktarma iptal edildi; mevcut seçimler korundu.';return;
  }
  $('pilot-reader').value=report.screenReader;
  $('pilot-platform').value=report.platform;
  $('pilot-browser').value=report.browser;
  for(const [i,item] of report.results.entries()){
   $('status-'+i).value=item.outcome;
   $('note-'+i).value=item.note;
   $('pilot-note-limit-'+i).textContent=item.note.length+' / 180';
  }
  activeFilter='all';
  for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));
  refresh();
  $('pilot-export-error').textContent=`${report.summary.total} maddelik anonim rapor cihazdan açıldı; hiçbir veri sunucuya gönderilmedi.`;
 }catch(error){$('pilot-export-error').textContent='Rapor açılamadı: '+error.message;}
});
$('pilot-export-csv').addEventListener('click',()=>exportEvidence('csv'));
$('pilot-export-json').addEventListener('click',()=>exportEvidence('json'));
$('print').addEventListener('click',()=>window.print());
$('reset').addEventListener('click',()=>{
 const edited=PILOT_CHECKS.some((item,i)=>$('status-'+i).value!=='not-tested'||$('note-'+i).value.length>0);
 if(edited&&!window.confirm('Bu sekmedeki 12 kontrolün tüm sonuçlarını ve notlarını sıfırlamak istiyor musunuz?'))return;
 for(const [i] of PILOT_CHECKS.entries()){
  $('status-'+i).value='not-tested';$('note-'+i).value='';$('pilot-note-limit-'+i).textContent='0 / 180';
 }
 activeFilter='all';for(const button of document.querySelectorAll('[data-filter]'))button.setAttribute('aria-pressed',String(button.dataset.filter==='all'));
 refresh();$('pilot-export-error').textContent='Kontrol seçimleri sıfırlandı.';
});
refresh();
