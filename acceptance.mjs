/* v2.34 Anonim kurum kabul kayıtları: no free-text field or personal data collected. */
const byId=id=>document.getElementById(id);
const names={source_blocked:'Kaynak/onay kontrolü gerekli',teacher_pending:'Öğretmen bekleniyor',coordinator_pending:'Koordinatör bekleniyor',reviewed:'İki aşama kaydı tamam'};
const checks={teacher:[
 ['question_equivalence','Sorular, seçenekler, puanlar ve kazanımlar kaynak sınavla karşılaştırıldı'],
 ['alternatives_examined','Denklem, tablo, kod ve görsellerin açıklamaları kaynakla karşılaştırıldı veya bulunmadığı teyit edildi'],
 ['accessible_formats_reviewed','Word, HTML ve PDF pilotunun erişilebilirlik sınırları incelendi'],
 ['manual_followup_declared','Gerekli insan/ekran okuyucu testleri ile eksikler ayrıca belirlendi']
],coordinator:[
 ['independent_review','Bağımsız öğretmen inceleme kaydı ve sınav revizyonu kontrol edildi'],
 ['accommodation_workflow','Bireysel uyarlama ve sınav oturumlarının ayrıca kontrol edileceği teyit edildi'],
 ['delivery_constraints','Çıktı sınırları, çevrimdışı çalışma ve teslim kontrolleri gözden geçirildi'],
 ['institutional_limitations','Bu onayın PDF/UA, KVKK, gerçek kullanıcı testi veya kurumsal üretim onayı olmadığı kabul edildi']
]};
let session=null;let report=null;let selected=null;
function note(message){byId('message').textContent=message||'';}
function chip(item){const x=document.createElement('span');x.className=`chip ${item.acceptanceStatus}`;x.textContent=names[item.acceptanceStatus]||'İnceleme';return x;}
function itemText(root,text,tag='p'){const e=document.createElement(tag);e.textContent=text;root.append(e);return e;}
function renderList(){if(!report)return;const items=report.items.filter(i=>!byId('status-filter').value||i.acceptanceStatus===byId('status-filter').value);
 const all=report.items;byId('count-all').textContent=all.length;byId('count-teacher').textContent=all.filter(i=>i.acceptanceStatus==='teacher_pending').length;
 byId('count-coordinator').textContent=all.filter(i=>i.acceptanceStatus==='coordinator_pending').length;byId('count-done').textContent=all.filter(i=>i.acceptanceStatus==='reviewed').length;
 const root=byId('exam-list');root.replaceChildren();byId('empty').hidden=!!items.length;
 for(const item of items){const btn=document.createElement('button');btn.className='exam-item'+(selected===item.id?' active':'');btn.type='button';btn.append(chip(item));itemText(btn,item.title,'span').className='exam-title';itemText(btn,`Revizyon ${item.revision} · ${item.examStatus==='approved'?'Onaylı':'Taslak'}`,'span').className='exam-meta';btn.addEventListener('click',()=>selectExam(item.id));root.append(btn);}
}
function drawStep(id,title,review){const container=byId(id);container.replaceChildren();container.classList.toggle('done',!!review);itemText(container,title,'h3');itemText(container,review?`Beyan kaydı mevcut · ${new Date(review.at).toLocaleString('tr-TR')}`:'Bu revizyon için henüz tamamlanmamış.');}
async function selectExam(id){selected=id;renderList();let item=report.items.find(x=>x.id===id);if(!item)return;
 try{item=await fetchJson(`/api/acceptance/exams/${id}`);}catch(error){note(error.message);return;}
 if(selected!==id)return;
 const delivery=byId('delivery-summary');delivery.replaceChildren();
 if(!item.approvalIntegrity)itemText(delivery,'Teslim kontrolü: Sınav onayı eksik veya geçersiz.');
 else if(!item.delivery)itemText(delivery,'Bu hesap için teslim ön denetimi görüntülenemiyor.');
 else{itemText(delivery,item.delivery.ready?'Yapısal teslim kontrolleri geçildi — uzman incelemesi hâlâ gerekli.':'Teslim engeli: Yapısal çıktı kontrolleri tamamlanmadı.','strong');for(const problem of item.delivery.problems)itemText(delivery,problem.message);}
 byId('detail').hidden=false;
 byId('detail-title').textContent=item.title;byId('detail-meta').textContent=`Sınav revizyonu ${item.revision} · ${item.approvalIntegrity?'Onay özeti güncel':'Onay bekleniyor veya içerik özeti değişmiş'}`;
 const status=byId('detail-status');status.className=`chip ${item.acceptanceStatus}`;status.textContent=names[item.acceptanceStatus];
 drawStep('teacher-step','1. Öğretim sorumlusu incelemesi',item.teacherReview);drawStep('coordinator-step','2. Bağımsız koordinatör incelemesi',item.coordinatorReview);
 const phase=item.canSubmitTeacher?'teacher':item.canSubmitCoordinator?'coordinator':null;
 byId('review-form-area').hidden=!phase;byId('no-action').textContent=phase?'':item.acceptanceStatus==='reviewed'?'İki inceleme kaydı tamam. Bu, kurumsal sertifika anlamına gelmez.':item.acceptanceStatus==='source_blocked'?'Önce sınav revizyonunu onaylayın ve onay bütünlüğünü doğrulayın.':'Bu aşama için farklı yetkili hesap veya önceki inceleme gerekli.';
 if(!phase)return;
 byId('review-heading').textContent=phase==='teacher'?'Öğretmen inceleme kaydı':'Bağımsız koordinatör inceleme kaydı';
 const fieldset=byId('review-checks');fieldset.replaceChildren();itemText(fieldset,'Manuel kontrol maddeleri','legend');
 for(const [key,label] of checks[phase]){const row=document.createElement('label');row.className='review-option';const cb=document.createElement('input');cb.type='checkbox';cb.required=true;cb.dataset.acceptanceKey=key;const text=document.createElement('span');text.textContent=label;row.append(cb,text);fieldset.append(row);}
 byId('review-confirm').checked=false;byId('review-form').dataset.phase=phase;byId('review-form').dataset.revision=String(item.revision);
}
async function fetchJson(url,opts={}){const response=await fetch(url,{credentials:'same-origin',headers:{Accept:'application/json',...(opts.body?{'Content-Type':'application/json','X-CSRF-Token':session.csrf}: {})},...opts});
 const body=await response.json().catch(()=>({}));if(!response.ok)throw Error(body.message||body.error||`HTTP ${response.status}`);return body;}
async function load(){note('');try{session=await fetchJson('/api/session');if(!session.authenticated)throw Error('Kurumsal hesabınızla giriş yapın.');report=await fetchJson('/api/acceptance/exams');byId('gate').hidden=true;byId('app').hidden=false;byId('updated').textContent='Son kontrol: '+new Date().toLocaleTimeString('tr-TR');renderList();if(selected&&report.items.some(x=>x.id===selected))selectExam(selected);else byId('detail').hidden=true;
 }catch(e){byId('gate').hidden=false;byId('app').hidden=true;note(e.message);}}
byId('review-form').addEventListener('submit',async event=>{event.preventDefault();const phase=event.currentTarget.dataset.phase;const item=report?.items.find(x=>x.id===selected);if(!item||!phase)return;
 const data={revision:Number(event.currentTarget.dataset.revision),checks:Object.fromEntries([...document.querySelectorAll('[data-acceptance-key]')].map(x=>[x.dataset.acceptanceKey,x.checked])),confirmed:byId('review-confirm').checked};
 const btn=byId('review-submit');btn.disabled=true;try{await fetchJson(`/api/acceptance/exams/${item.id}/${phase}`,{method:'POST',body:JSON.stringify(data)});await load();note('İnceleme beyanı sınav revizyonuna bağlı olarak kaydedildi.');}catch(error){note(error.message);}finally{btn.disabled=false;}});
byId('status-filter').addEventListener('change',renderList);byId('refresh').addEventListener('click',load);load();
