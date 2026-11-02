/** Authenticated preview -> original DOCX structure review or plain-text preview ->
 * explicit teacher confirmation -> server-reparsed independent unapproved draft.
 * No remote APIs, no in-browser storage of student data. */
const $=id=>document.getElementById(id);
let csrf='',lastPreview=null,lastBase64='',lastName='',lastSignature='',lastMode='automatic',lastTranscription='';
const status=(msg,bad=false)=>{const e=$('source-session');e.textContent=msg;e.style.color=bad?'#9c222a':'#233b54';};
function invalidate(){lastPreview=null;lastBase64='';lastSignature='';lastTranscription='';$('source-result').hidden=true;$('source-confirm').checked=false;$('source-save').disabled=true;}
async function request(endpoint,data){const res=await fetch('/api/exam-source/'+endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(data)});
 const body=await res.json().catch(()=>({}));if(!res.ok)throw Error(body.message||body.error||'İstek reddedildi.');return body;}
function signature(){return [$('source-file').files[0]?.name,$('source-file').files[0]?.size,$('source-file').files[0]?.lastModified,$('source-subject').value,$('source-title').value,$('source-duration').value].join('|');}
async function encode(file){if(!file||file.size<1||file.size>1024*1024)throw Error('1 MB sınırına uygun dosya seçin.');const bytes=new Uint8Array(await file.arrayBuffer());let result='';for(let i=0;i<bytes.length;i+=32768)result+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(result);}
const typeLabel={table:'Tablo',equation:'Office denklem nesnesi',visual:'Görsel/çizim'};
function showRich(items){const section=$('source-rich-review'),list=$('source-rich-items');list.replaceChildren();section.hidden=false;
 for(const item of items){const label=document.createElement('label');label.style.display='flex';label.style.gap='12px';label.style.alignItems='start';
  const input=document.createElement('input');input.type='checkbox';input.value=item.id;input.className='source-rich-ack';input.style.minWidth='20px';input.style.minHeight='20px';
  const span=document.createElement('span');span.textContent=`${item.order}. ${typeLabel[item.type]||'Karmaşık öğe'} — kaynak belgeyi açıp öğenin metinsel karşılığını ve ölçme anlamını denetledim.`;label.append(input,span);list.append(label);}
}
function renderResult(result,manual=false){lastPreview=result;lastMode=manual?'manual':'automatic';lastSignature=signature();$('source-result').hidden=false;$('source-confirm').checked=false;$('source-save').disabled=true;
 $('source-summary').textContent=`${result.questions.length} aday soru · ${manual?'ÖĞRETMENİN MANUEL METNİ':result.format.toUpperCase()} · SHA-256: ${result.sourceSha256.slice(0,16)}… · Kaynak dosya sunucuda saklanmadı.`;
 const errors=$('source-blocking');errors.replaceChildren();for(const msg of result.blocking){const p=document.createElement('p');p.className='source-error';p.textContent='Aktarım engeli: '+msg;errors.append(p);}
 const warns=$('source-warnings');warns.replaceChildren();for(const msg of result.warnings){const p=document.createElement('p');p.className='source-warning';p.textContent='Kontrol: '+msg;warns.append(p);}
 const area=$('source-questions');area.replaceChildren();for(const q of result.questions){const card=document.createElement('div');card.className='source-question';
  const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=String(q.number);check.checked=true;check.disabled=result.blocked;
  const summary=document.createElement('span');summary.textContent=`Soru ${q.number} · ${q.type==='choice'?'Çoktan seçmeli':'Kısa yanıt'}\n${q.prompt}`;label.append(check,summary);card.append(label);
  if(q.hasCode){const p=document.createElement('p');p.className='source-warning';p.textContent='Kod satırları ve girintiler korunmuştur; Word çıktısı ile kaynak kodu karşılaştırın.';card.append(p);}
  if(q.options?.length){const ol=document.createElement('ol');ol.type='A';for(const opt of q.options){const li=document.createElement('li');li.textContent=opt;ol.append(li);}card.append(ol);}area.append(card);}
 status(result.blocked?'Bu belgeden otomatik taslak oluşturulamaz. Gerekirse aşağıdaki manuel yolu kullanın.':'Soruları kaynak dosyayla karşılaştırıp açık onay verin.',result.blocked);
}
for(const id of ['source-file','source-subject','source-title','source-duration'])$(id).addEventListener('change',()=>{invalidate();if(id==='source-file'){$('source-rich-review').hidden=true;$('source-rich-items').replaceChildren();$('source-transcription').value='';}});
function invalidateManual(){lastPreview=null;lastSignature='';lastTranscription='';$('source-confirm').checked=false;$('source-save').disabled=true;status('Manuel metin veya öğe kontrolleri değişti; yeniden inceleyin.');}
$('source-transcription').addEventListener('input',invalidateManual);
$('source-rich-items').addEventListener('change',invalidateManual);
$('source-confirm').addEventListener('change',()=>{$('source-save').disabled=!lastPreview||lastPreview.blocked||!$('source-confirm').checked;});
$('source-preview').addEventListener('click',async()=>{
 invalidate();$('source-rich-review').hidden=true;try{
  const file=$('source-file').files[0];if(!file)throw Error('Dosya seçmelisiniz.');if(!$('source-title').value.trim()||!$('source-subject').value.trim())throw Error('Ders ve sınav başlığı gerekli.');
  const b64=await encode(file);status('Dosya inceleniyor…');const result=await request('preview',{filename:file.name,base64:b64});
  lastBase64=b64;lastName=file.name;renderResult(result);
  if(result.manualEligible&&result.richItems?.length)showRich(result.richItems);
 }catch(e){invalidate();status(e.message,true);}
});
$('source-manual-preview').addEventListener('click',async()=>{
 try{
  const file=$('source-file').files[0];if(!file)throw Error('DOCX kaynak dosyası seçin.');
  const transcription=$('source-transcription').value;
  const ack=[...$('source-rich-items').querySelectorAll('input:checked')].map(x=>x.value);
  const base64=await encode(file);status('Orijinal Word ve manuel döküm tekrar inceleniyor…');
  const result=await request('manual-preview',{filename:file.name,base64,transcription,acknowledgedIds:ack});
  lastBase64=base64;lastName=file.name;lastTranscription=transcription;renderResult(result,true);
 }catch(e){invalidate();status(e.message,true);}
});
$('source-save').addEventListener('click',async()=>{try{
 if(!lastPreview||lastPreview.blocked||!$('source-confirm').checked||signature()!==lastSignature)throw Error('Dosya veya bilgiler değişti. Yeniden önizleyin.');
 const selectedNumbers=[...$('source-questions').querySelectorAll('input:checked')].map(x=>Number(x.value));
 if(!selectedNumbers.length)throw Error('En az bir soru seçin.');$('source-save').disabled=true;status('Taslak sunucuya kaydediliyor…');
 const manual=lastMode==='manual';
 if(manual&&$('source-transcription').value!==lastTranscription)throw Error('Manuel metin değişti; yeniden önizleyin.');
 const result=await request(manual?'create-manual-draft':'create-draft',{
  filename:lastName,base64:lastBase64,sourceSha256:lastPreview.sourceSha256,
  ...(manual?{transcription:lastTranscription,transcriptionSha256:lastPreview.transcriptionSha256,acknowledgedIds:[...$('source-rich-items').querySelectorAll('input:checked')].map(x=>x.value)}:{}),
  selectedNumbers,title:$('source-title').value,subject:$('source-subject').value,duration:Number($('source-duration').value),confirmed:true});
 lastBase64='';lastPreview=null;lastSignature='';lastTranscription='';$('source-file').value='';$('source-transcription').value='';$('source-save').disabled=true;
 const a=document.createElement('a');a.href='/kurumsal-sinav?exam='+encodeURIComponent(result.item.id);a.className='portal-btn primary';a.textContent=`Taslağı sınav editöründe aç (${result.questionCount} soru)`;$('source-result').append(a);
 status('Taslak oluşturuldu. Doğru yanıtları, puanları, eksik görselleri ve akademik/erişilebilirlik eşdeğerliğini öğretmen tamamlamalı.');
 }catch(e){$('source-save').disabled=false;status(e.message,true);}});
(async()=>{try{const resp=await fetch('/api/session',{credentials:'same-origin'});const x=await resp.json();if(!x.authenticated||!['teacher','admin','coordinator'].includes(x.member?.role))throw Error('İçe aktarma için öğretmen veya koordinatör yetkisiyle giriş yapın.');csrf=x.csrf;status(`Oturum: ${x.member.role} · ${x.member.tenantId}. Yalnız anonim kaynak sınav yükleyin.`);}catch(e){status(e.message,true);$('source-preview').disabled=true;}})();
