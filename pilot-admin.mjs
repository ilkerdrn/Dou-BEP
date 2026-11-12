/** Teacher session dashboard. HTML elements are created with textContent, not innerHTML. */
import {summarizeObjectives} from './objective-observations.mjs';
const $=id=>document.getElementById(id);let csrf='',lastCode='',activeReview=null;
function msg(s,error=false){$('message').textContent=s;$('message').className='notice '+(error?'err':'good');}
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
async function api(path,method='GET',body){const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:{...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.message||'İşlem başarısız.');return data;}
function action(label,handler,className='ghost'){const b=el('button',label);b.type='button';b.className=className;b.addEventListener('click',async()=>{b.disabled=true;try{await handler();}catch(error){msg(error.message,true);}finally{b.disabled=false;}});return b;}
function stateLabel(s){return {issued:'Kullanılabilir',started:'Sınav açıldı',submitted:'Teslim edildi',revoked:'İptal',expired:'Süresi doldu'}[s]||s;}
async function refresh(){const [candidates,pilots]=await Promise.all([api('/pilot/eligible-exams'),api('/pilot')]);const current=$('exams').value;const menu=$('exams');menu.replaceChildren();const eligible=candidates.items.filter(x=>x.eligible);for(const item of eligible){const op=el('option',item.title+' · Sürüm '+item.revision+' · '+item.questionCount+' soru');op.value=item.id;menu.append(op);}if(eligible.some(x=>x.id===current))menu.value=current;$('create').disabled=!eligible.length;menu.disabled=!eligible.length;$('pilot-empty-exams').hidden=eligible.length>0;$('pilot-exam-help').textContent=eligible.length?eligible.length+' pilot oturumuna uygun onaylı sınav bulundu. Kod vermek istediğiniz sınavı seçin.':'Pilot oturumuna uygun onaylı sınav yok. Aşağıdaki nedenleri kontrol edin.';
 const unavailable=candidates.items.filter(x=>!x.eligible);
 const reasons=$('pilot-ineligible-exams');reasons.replaceChildren();reasons.hidden=!unavailable.length;
 if(unavailable.length){
  reasons.append(el('strong',unavailable.length+' onaylı sınav pilot kodu için uygun değil'));
  const list=el('ul');
  for(const item of unavailable)list.append(el('li',item.title+' · '+item.reason));
  reasons.append(list);
 }
 const region=$('sessions');region.replaceChildren();if(!pilots.items.length)region.append(el('p','Henüz pilot oturumu oluşturulmadı.'));
 for(const item of pilots.items){const section=el('div');section.className='session-item';section.append(el('strong',stateLabel(item.status)+' · '+item.id.slice(0,8).toUpperCase()),el('small','Sınav: '+item.examId.slice(0,8)+' · Oluşturuldu: '+new Date(item.createdAt).toLocaleString('tr-TR')+' · Bitiş: '+new Date(item.expiresAt).toLocaleTimeString('tr-TR')));
 const buttons=el('div');buttons.className='inline';buttons.append(action('İncele',()=>show(item.id)));
 if(item.status==='started')buttons.append(action('Kurtarma kodu oluştur',async()=>{
  if(!confirm('Bu oturumun mevcut öğrenci erişimi iptal edilip yeni tek kullanımlık kod oluşturulsun mu? Süre uzamayacak; yalnız yerel ara kaydedilmiş yanıtlar korunacak.'))return;
  const result=await api('/pilot/'+item.id+'/recover','POST',{});
  lastCode=result.item.code;
  $('code').textContent=lastCode;
  $('new-code').hidden=false;
  $('pilot-code-expiry').textContent='Kurtarma kodu son geçerlilik: '+new Date(result.item.expiresAt).toLocaleString('tr-TR')+'. Orijinal oturum süresi uzamaz. Eski öğrenci oturumu geçersizdir.';
  msg('Kurtarma kodu yalnızca bir kez gösterildi. Öğrenciye güvenli şekilde iletin.');
  $('new-code').scrollIntoView({block:'nearest'});
  await refresh();
 }));if(['issued','started'].includes(item.status))buttons.append(action('İptal',async()=>{if(confirm('Bu tek kullanımlık oturum iptal edilsin mi?')){await api('/pilot/'+item.id+'/revoke','POST',{});await refresh();}}));buttons.append(action('Kaydı sil',async()=>{if(confirm('Bu oturum ve anonim yanıtlar geri alınamaz biçimde silinsin mi?')){await api('/pilot/'+item.id,'DELETE');$('details').hidden=true;await refresh();}},'danger'));section.append(buttons);region.append(section);
 }
}
function renderReview(review){
 activeReview=review;const box=$('review-questions');box.replaceChildren();
 $('review-summary').textContent=`${review.reviewedQuestions}/${review.totalQuestions} soru değerlendirildi. Girilen puan: ${review.assessedPoints}/${review.assessedMaximum}. Bu değerler yalnızca puan girilmiş sorular içindir.`;
 $('review-csv').href='/api/pilot/'+review.sessionId+'/review.csv';
 const goals=$('objective-observations');goals.replaceChildren();
 for(const g of summarizeObjectives(review)){
  const entry=el('div');entry.className='objective-observation';
  entry.append(el('strong',g.objective),el('p',`${g.reviewed}/${g.questionCount} soru değerlendirildi · ${g.earned}/${g.possible} değerlendirilen puan · ${g.unreviewed} soru henüz puanlanmadı · ${g.notes} gözlem notu`));
  if(g.rate!==null)entry.append(el('p',`Girilen puan oranı: %${g.rate} (yalnızca puanlanan sorular).`));
  goals.append(entry);
 }
 if(!goals.children.length)goals.append(el('p','Henüz kazanım gözlemi bulunmuyor.'));

 for(const q of review.questions){
  const card=el('fieldset');card.className='review-question';const title=el('legend','Soru '+q.number+' · '+q.maxPoints+' puan');card.append(title);
  card.append(el('p',q.prompt));
  const answer=el('p','Anonim yanıt: '+(q.response===null?'Yanıt yok':typeof q.response==='string'?q.response:Object.entries(q.response).map(([k,v])=>k+' → '+v).join(' · ')));answer.className='answer-content';card.append(answer);
  if(q.objective){const objective=el('p','Hedef: '+q.objective);objective.className='muted';card.append(objective);}
  const grid=el('div');grid.className='review-row';
  const scoreLabel=el('label','Öğretmen puanı (0–'+q.maxPoints+')');const score=el('input');score.type='number';score.min='0';score.max=String(q.maxPoints);score.step='0.01';score.placeholder='Değerlendirilmedi';score.value=q.score===null?'':String(q.score);score.dataset.scoreId=q.id;scoreLabel.append(score);
  const noteLabel=el('label','Gözlem notu');const note=el('textarea');note.rows=2;note.maxLength=300;note.placeholder='Kısa, anonim gözlem (en fazla 300 karakter)';note.value=q.note;note.dataset.noteId=q.id;noteLabel.append(note);
  grid.append(scoreLabel,noteLabel);card.append(grid);box.append(card);
 }
}
async function show(id){const result=await api('/pilot/'+id);const item=result.item;$('details').hidden=false;
 $('detail-info').textContent='Durum: '+stateLabel(item.status)+' · Referans: '+item.id.slice(0,8).toUpperCase();
 const region=$('answers');region.replaceChildren();$('manual-review').hidden=true;activeReview=null;
 if(!item.answers){region.append(el('p','Henüz yanıt gönderilmedi.'));return;}
 const out=el('p','Yanıtlar teslim edildi. Aşağıdan manuel soru değerlendirmesi yapabilirsiniz.');region.append(out);
 const response=await api('/pilot/'+id+'/review');$('manual-review').hidden=false;renderReview(response.review);
}
$('review-form').addEventListener('submit',async e=>{e.preventDefault();if(!activeReview)return;
 const btn=$('review-save');btn.disabled=true;
 try{const entries={};for(const q of activeReview.questions){
  const score=$('review-questions').querySelector(`[data-score-id="${q.id}"]`);
  const note=$('review-questions').querySelector(`[data-note-id="${q.id}"]`);
  if(!score||!note)throw Error('Değerlendirme alanı bulunamadı.');
  if(score.value!==''&&!score.checkValidity())throw Error('Soru '+q.number+' için puan 0–'+q.maxPoints+' arasında olmalı.');
  entries[q.id]={score:score.value===''?null:Number(score.value),note:note.value};
 }
 const result=await api('/pilot/'+activeReview.sessionId+'/review','PUT',{reviewVersion:activeReview.reviewVersion,entries});
 renderReview(result.review);msg('Manuel değerlendirme güvenli biçimde kaydedildi.');
 }catch(err){msg(err.message,true);}finally{btn.disabled=false;}
});
$('create').addEventListener('click',async()=>{const btn=$('create');btn.disabled=true;try{const result=await api('/pilot','POST',{examId:$('exams').value});lastCode=result.item.code;$('code').textContent=lastCode;$('new-code').hidden=false;const expires=new Date(result.item.expiresAt);$('pilot-code-expiry').textContent='Kodun son geçerlilik zamanı: '+expires.toLocaleString('tr-TR')+'. Kod yalnızca bir kez kullanılabilir; öğrenci sayfası yenilenirse pilot oturumu yeniden alınamaz.';msg('Kod oluşturuldu. Şimdi kodu kopyalayıp öğrenciye iletin; daha sonra tekrar görüntülenemez.');await refresh();}catch(e){msg(e.message,true);}finally{btn.disabled=false;}});
$('refresh').addEventListener('click',()=>refresh().catch(e=>msg(e.message,true)));
$('copy').addEventListener('click',async()=>{try{if(!lastCode)return;await navigator.clipboard.writeText(lastCode);msg('Kod kopyalandı.');}catch{msg('Kopyalama izni yok; kodu elle seçebilirsiniz.',true);}});
(async()=>{try{const s=await api('/session');if(!s.authenticated){$('login').hidden=false;return;}csrf=s.csrf;$('actor').textContent=s.member.email+' · '+s.member.tenantId+' · '+s.member.role;$('workspace').hidden=false;await refresh();}catch(e){msg(e.message,true);$('login').hidden=false;}})();

// Objective summaries never receive response bodies, individual scores, notes or session identifiers.
$('cohort-load').addEventListener('click',async()=>{
 const examId=$('exams').value,button=$('cohort-load');
 $('cohort-csv').hidden=true;$('cohort-results').replaceChildren();
 if(!examId){msg('Önce onaylı bir sınav seçin.',true);return;}
 button.disabled=true;
 try{
  const {summary}=await api('/pilot/objective-summary/'+examId);
  $('cohort-status').textContent=summary.available?`${summary.reviewedSessions} ayrı anonim değerlendirme kullanıldı. Yalnızca aynı sınav sürümü dahil edildi.`:summary.message;
  if(summary.available){
   for(const g of summary.objectives){
    const card=el('div');card.className='objective-observation';
    card.append(el('strong',g.objective));
    card.append(el('p',g.available?`${g.reviewedSessions} anonim oturum · ${g.reviewedQuestions} değerlendirilmiş soru · ${g.unreviewedQuestions} puanlanmamış soru · ${g.earned}/${g.possible} puan (%${g.rate}) · ${g.noteCount} gözlem notu`:g.message));
    $('cohort-results').append(card);
   }
   if(summary.objectives.some(g=>g.available)){$('cohort-csv').href='/api/pilot/objective-summary/'+examId+'.csv';$('cohort-csv').hidden=false;}
  }
 }catch(error){$('cohort-status').textContent='Özet yüklenemedi.';msg(error.message,true);}
 finally{button.disabled=false;}
});
