/** Explicit opt-in: read user-selected JSON files locally; never upload or retain them. */
import {parseQuadAuditJson,aggregateQuadAuditReports,MAX_AUDIT_REPORTS,MAX_AUDIT_BYTES} from './dou-speech-report-audit.mjs';
import {examineQuadResearchEvidence} from './dou-speech-research-gate.mjs';
const $=id=>document.getElementById(id);
const fileInput=$('audit-files'),button=$('audit-run'),clear=$('audit-clear'),status=$('audit-status'),results=$('audit-results');
const names={legacy:'Önceki',spectral:'Spektral',contrast:'Kontrast',place:'Boğumlanma'};
function empty(){results.replaceChildren();results.hidden=true;status.textContent='Henüz yerel rapor analiz edilmedi.';fileInput.value='';}
function cell(row,value,tag='td'){const el=document.createElement(tag);el.textContent=String(value);row.append(el);}
function makeTable(headers,rows){const table=document.createElement('table');table.className='dou-audit-table';
 const head=table.createTHead().insertRow();for(const h of headers)cell(head,h,'th');
 const body=table.createTBody();for(const fields of rows){const row=body.insertRow();for(const v of fields)cell(row,v);}
 return table;
}
function present(audit,evidence){results.replaceChildren();
 const heading=document.createElement('h3');heading.textContent=`${audit.reportCount} yerel rapor · ${audit.trialCount} yanıt`;results.append(heading);
 const intro=document.createElement('p');intro.textContent='Betimsel doğruluk / önceki motora göre fark (yüzde puan). Aynı katılımcının birden fazla raporu bulunabilir.';results.append(intro);
 const conditions=document.createElement('p');conditions.textContent=audit.comparability.comparable?
  'Deney koşulları raporlarda aynı bildirilmiş (katılımcılar bağımsız doğrulanmadı).':
  'KARŞILAŞTIRILAMAYAN RAPORLAR: Sıra veya ses koşulu eksik/farklı. Birleşik motor farklarını yorumlamayın.';
 results.append(conditions);
 const entries=Object.entries(audit.armCounts);
 results.append(makeTable(['Motor','Doğru / deneme','Oran','Öncekiye fark'],entries.map(([arm,r])=>[
  names[arm],`${r.correct}/${r.trials}`,`${(r.accuracy*100).toFixed(1)}%`,audit.comparability.comparable?`${(r.deltaFromLegacy*100).toFixed(1)} yp`:'— (koşul farklı/eksik)'])));
 const sub=document.createElement('h3');sub.textContent='Ses çiftlerine göre yanlış duyma';results.append(sub);
 results.append(makeTable(['Çift',...entries.map(([arm])=>names[arm])],audit.pairCounts.map(p=>[
  p.pair,...entries.map(([arm])=>`${p.arms[arm].wrong}/${p.arms[arm].trials}`)])));
 const conditionsTitle=document.createElement('h3');conditionsTitle.textContent='Deney koşulları ve rapor grupları';results.append(conditionsTitle);
 results.append(makeTable(['Sıra koşulu','Ses koşulu','Rapor','Önceki doğru','Spektral doğru','Kontrast doğru','Boğumlanma doğru'],
  audit.comparability.groups.map(g=>[g.schedule,g.audioVersion,g.reportCount,...entries.map(([arm])=>
   `${g.armCounts[arm].correct}/${g.armCounts[arm].trials}`)])));
 const quality=document.createElement('h3');quality.textContent='Oturum dağılımı (doğru / 12)';results.append(quality);
 results.append(makeTable(['Motor','En düşük','Ortanca','En yüksek','Öncekinden iyi/eşit/kötü'],entries.map(([arm])=>{
  const r=audit.reportDistributions[arm];return [names[arm],r.minimumCorrect,r.medianCorrect,r.maximumCorrect,
   `${r.aboveLegacy}/${r.equalLegacy}/${r.belowLegacy}`];})));
 const evidenceHeading=document.createElement('h3');evidenceHeading.textContent='Araştırma kanıtı kontrolü — üretim onayı değildir';results.append(evidenceHeading);
 const evidenceSummary=document.createElement('p');
 evidenceSummary.textContent=`Ön keşif için belirlenen ${evidence.exploratoryCollectionTarget} rapor hedefine göre ${evidence.reportCount} rapor var (${evidence.remainingReportsToTarget} eksik). Bu hedef bilimsel örneklem/güç hesabı değildir. Gerçek bağımsız dinleyici sayısı BİLİNMİYOR.`;results.append(evidenceSummary);
 for(const group of evidence.groups){
  const groupHeading=document.createElement('h4');groupHeading.textContent=`Koşul: ${group.schedule} / ${group.audioVersion} · ${group.reportCount} rapor`;results.append(groupHeading);
  const groupHelp=document.createElement('p');groupHelp.textContent='Aynı raporda önceki motorla fark (12 sözcük üzerinden); gruplar arası karşılaştırma veya istatistiksel anlamlılık değildir.';results.append(groupHelp);
  results.append(makeTable(['Motor','Daha iyi / eşit / kötü','Ortanca doğru farkı','En düşük / en yüksek'],group.pairedRows.map(row=>[
   names[row.arm],`${row.improved} / ${row.tied} / ${row.worse}`,row.medianDifferenceCorrect,
   `${row.rangeDifferenceCorrect[0]} / ${row.rangeDifferenceCorrect[1]}`])));
  const transitionHeading=document.createElement('p');transitionHeading.textContent='Aynı sözcük hedefinde motor geçişleri: her raporda 12 ortak hedef vardır. Sadece önceki doğru / sadece aday doğru sayıları, farkın yönünü gösterir; bağımsız dinleyici veya bilimsel anlamlılık kanıtı değildir.';results.append(transitionHeading);
  results.append(makeTable(['Motor','İkisi doğru','Yalnız önceki doğru','Yalnız aday doğru','İkisi yanlış'],
   group.targetTransitions.map(change=>[names[change.arm],change.totals.bothCorrect,
    change.totals.legacyOnly,change.totals.candidateOnly,change.totals.bothWrong])));
  const transitionsHeading=document.createElement('p');transitionsHeading.textContent='Sözcük çifti bazında hedef değişimi (yalnız önceki doğru / yalnız aday doğru):';results.append(transitionsHeading);
  results.append(makeTable(['Ses çifti',...group.targetTransitions.map(change=>names[change.arm])],
   group.targetTransitions[0].byContrast.map((contrast,i)=>[contrast.contrast,
    ...group.targetTransitions.map(change=>`${change.byContrast[i].legacyOnly} / ${change.byContrast[i].candidateOnly}`)])));
  const nextHeading=document.createElement('p');nextHeading.textContent='Deneysel öncelik sırası (dört motorda toplam yanlış duyma sayısı; gerçek akustik neden kanıtlanmadı):';results.append(nextHeading);
  results.append(makeTable(['Ses çifti','Yanlış / tüm yanıtlar'],group.pairPriorities.map(pair=>[pair.pair,`${pair.totalWrong}/${pair.totalAttempts}`])));
  if(group.ceiling.allMotorsPerfect){const ceiling=document.createElement('p');ceiling.textContent='Tavan uyarısı: Bu koşuldaki bütün raporlar her motorda tam doğru; karşılaştırma farkı ölçülemiyor.';results.append(ceiling);}
 }
 for(const note of evidence.warnings){const warning=document.createElement('p');warning.textContent=`Uyarı: ${note}`;results.append(warning);}
 const gate=document.createElement('p');gate.textContent='İnsan anlaşılabilirlik, gerçek sınav kullanımı ve NVDA üretim izni: VERİLEMEZ (kişiler, dinleme koşulu ve Windows testleri bağımsız doğrulanmadı).';results.append(gate);
 const patterns=document.createElement('p');patterns.textContent=`Yanıt deseni: ${audit.responsePatterns.uniqueResponsePatterns} farklı desen; ${audit.responsePatterns.matchingPatternGroups} eşleşen desen grubu, ${audit.responsePatterns.reportsInMatchingGroups} rapor. Bu, aynı dinleyiciyi kanıtlamaz.`;results.append(patterns);
 const block=document.createElement('p');block.textContent='Erişilebilirlik / NVDA üretim onayı: VERİLEMEZ. İnsan değerlendirmesi ve Windows testleri eksik.';results.append(block);
 for(const warning of audit.warnings){const p=document.createElement('p');p.textContent=warning;results.append(p);}
 results.hidden=false;
}
button.addEventListener('click',async()=>{
 results.hidden=true;results.replaceChildren();
 const files=Array.from(fileInput.files??[]);
 if(!files.length||files.length>MAX_AUDIT_REPORTS){status.textContent='1 ila 16 JSON raporu seçin.';return;}
 button.disabled=true;
 try{
  const reports=[];
  for(const f of files){
   if(f.size>MAX_AUDIT_BYTES||!f.name.toLowerCase().endsWith('.json'))throw new TypeError('Yalnız 32 KB altındaki JSON dosyaları kabul edilir.');
   reports.push(parseQuadAuditJson(await f.text()));
  }
  const audit=aggregateQuadAuditReports(reports);
  present(audit,examineQuadResearchEvidence(reports));
  status.textContent=`Yerel betimsel analiz ve koşul denetimi tamamlandı (${audit.reportCount} rapor). Dosyalar sunucuya gönderilmedi.`;
 }catch(e){status.textContent=String(e?.message??e);results.hidden=true;}
 finally{fileInput.value='';button.disabled=false;}
});
clear.addEventListener('click',empty);empty();
