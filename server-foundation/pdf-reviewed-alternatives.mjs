/** v2.33 — explicit human-authored alternatives in the approved academic prompt.
 * These blocks are TEXT TRANSCRIPTIONS, never reconstruction of embedded Office images
 * or equations. Only the approved exam revision containing this exact block may export.
 */
const clean=s=>String(s??'').normalize('NFC');
const unsafe=/(?:https?:\/\/|data:|javascript:|!\[|<\s*(?:img|svg|script|math|table)\b|\[\[(?:image|figure)\]\]|\$\$|\\(?:frac|sqrt|begin|includegraphics)\b)/i;
const types=Object.freeze({denklem:'Denklem',gorsel:'Görsel',görsel:'Görsel'});
function safeField(value,label){
 const text=clean(value).trim();
 if(text.length<8||text.length>600||/\p{Cc}/u.test(text)||unsafe.test(text)||text.includes(':::'))throw Error(`${label}: erişilebilir alternatif metni 8–600 karakterlik güvenli düz metin olmalı.`);
 return text;
}
/** Pure parser: never downloads, guesses, executes or modifies examination content. */
export function parseReviewedAlternative(rows,start){
 const marker=rows[start].trim();
 const kind=types[marker.slice(3)];
 if(!kind||marker!==`:::${marker.slice(3)}`)throw Error('PDF alternatif bloğu :::denklem veya :::gorsel ile başlamalı.');
 const close=rows.indexOf(':::',start+1);
 if(close<0||close-start!==4)throw Error('Erişilebilir alternatif 3 alan ve kapanış ::: içermeli.');
 const names=['Kaynak','Açıklama','Kontrol'];
 const values=[];
 for(let n=0;n<3;n++){
  const line=rows[start+1+n];
  const m=new RegExp(`^${names[n]}:\\s*(.+)$`,'u').exec(line);
  if(!m)throw Error(`Alternatif açıklamada ${names[n]} alanı gerekli.`);
  values.push(m[1]);
 }
 const original=safeField(values[0],'Kaynak');
 const description=safeField(values[1],'Açıklama');
 if(original.toLocaleLowerCase('tr')===description.toLocaleLowerCase('tr'))throw Error('Kaynak ve erişilebilir açıklama aynı olamaz; öğretmen açıklama yazmalı.');
 if(!/^kaynakla karşılaştırıldı$/iu.test(values[2].trim()))throw Error('Öğretmen, Kontrol: kaynakla karşılaştırıldı ifadesini girmeli.');
 const name=kind==='Denklem'?'Denklem':'Görsel';
 return {next:close+1,kind:kind.toLowerCase()==='görsel'?'visual':'math',blocks:[
  {tag:'P',kind:'reviewed-source',text:`${name} — öğretmenin kaynak gösterimi: ${original}`},
  {tag:'P',kind:'reviewed-alternative',text:`${name} — öğretmenin erişilebilir açıklaması: ${description}`}
 ]};
}
export const REVIEWED_ALTERNATIVE_EXAMPLES=Object.freeze({
 denklem:':::denklem\nKaynak: E = m çarpı c kare\nAçıklama: E enerjisi, kütle ile ışık hızının karesinin çarpımına eşittir.\nKontrol: kaynakla karşılaştırıldı\n:::',
 gorsel:':::gorsel\nKaynak: İki sütunlu karşılaştırma grafiği\nAçıklama: Birinci sütun 12, ikinci sütun 16 birimdir; ikincisi 4 birim yüksektir.\nKontrol: kaynakla karşılaştırıldı\n:::'
});
