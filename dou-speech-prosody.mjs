/** DOU Speech Lab v2.46 — deterministic experimental Turkish prosody planner.
 * Approximate orthographic syllables, NOT validated intelligible TTS.
 * Pure local computation; no I/O, microphone, OS speech or networking.
 */
const VOWELS=new Set([...'aeıioöuü']);
const ALPHABET=new Set([...'abcçdefgğhıijklmnoöprsştuüvyz']);
const NUMBERS=['sıfır','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'];
const SAMPLE_RATE=22050;
const BASE_DURATIONS={vowel:125,voiced:80,noise:85,burst:65,glide:45};
function safeText(input){
 if(typeof input!=='string')throw new TypeError('Metin bir dizge olmalıdır.');
 if(input.length>100)throw new RangeError('Deneysel sentez en fazla 100 karakter kabul eder.');
 const text=input.toLocaleLowerCase('tr-TR').replace(/[0-9]/g,d=>` ${NUMBERS[Number(d)]} `);
 if([...text].some(c=>!ALPHABET.has(c)&&!/[\s,.!?;:–-]/u.test(c)))throw new RangeError('Yalnız Türkçe harfleri, rakamları ve temel noktalama kabul edilir.');
 return text;
}
function kindOf(letter){if(VOWELS.has(letter))return 'vowel';if(letter==='ğ')return 'glide';if('sşfzvçh'.includes(letter))return 'noise';if('ptk'.includes(letter))return 'burst';return 'voiced';}
/** Approximate Turkish orthographic syllables, not a linguistic reference. */
export function syllabifyTurkish(word){
 if(typeof word!=='string'||![...word].every(c=>ALPHABET.has(c)))throw new RangeError('Yalnız küçük Türkçe harflerle bir sözcük bekleniyor.');
 if(!word)return [];
 const chars=[...word],vowelIndexes=[];
 chars.forEach((c,i)=>{if(VOWELS.has(c))vowelIndexes.push(i);});
 if(vowelIndexes.length<=1)return [word];
 const cuts=[];
 for(let j=0;j<vowelIndexes.length-1;j++){
  const from=vowelIndexes[j],to=vowelIndexes[j+1],consonants=to-from-1;
  // One consonant belongs to next syllable; two consonants split 1+1.
  cuts.push(consonants===0?to-1:to-2);
 }
 let start=0;const parts=[];
 for(const cut of cuts){parts.push(chars.slice(start,cut+1).join(''));start=cut+1;}
 parts.push(chars.slice(start).join(''));
 return parts.filter(Boolean);
}
function contour(pitch,stressed,final,isQuestion){
 const center=pitch*(stressed?1.10:.97);
 const end=center*(final?(isQuestion?1.075:.91):.985);
 return [Math.max(90,Math.min(220,center)),Math.max(90,Math.min(220,end))];
}
/** Bounded prosody plan for synthetic lab phrases only. */
export function planTurkishProsody(text,{pitchHz=125,rate=1}={}){
 if(typeof pitchHz!=='number'||!Number.isFinite(pitchHz)||pitchHz<90||pitchHz>220)throw new RangeError('Deneysel perde 90-220 Hz olmalıdır.');
 if(typeof rate!=='number'||!Number.isFinite(rate)||rate<0.75||rate>1.5)throw new RangeError('Deneysel hız 0,75-1,5 aralığında olmalıdır.');
 const normalized=safeText(text);
 const tokens=normalized.match(/[a-zçğıöşüı]+|[\s]+|[,.!?;:–-]+/gu)||[];
 const words=tokens.filter(t=>[...t].every(c=>ALPHABET.has(c)));
 const items=[];let syllableCount=0,wordCount=0,wordIndex=0;
 for(const token of tokens){
  if([...token].every(c=>ALPHABET.has(c))){
   wordCount++;const syllables=syllabifyTurkish(token);
   const lastWord=wordIndex===words.length-1;wordIndex++;
   const isQuestion=lastWord&&/\?\s*$/u.test(normalized);
   for(let j=0;j<syllables.length;j++){
    const syllable=syllables[j];syllableCount++;
    const stressed=j===syllables.length-1,final=lastWord&&stressed;
    const [pitchStartHz,pitchEndHz]=contour(pitchHz,stressed,final,isQuestion);
    for(const letter of [...syllable]){
     const kind=kindOf(letter);
     const emphasis=kind==='vowel'&&stressed?1.20:1;
     const durationMs=Math.round(BASE_DURATIONS[kind]*emphasis/rate);
     items.push({kind,letter,syllable:syllableCount-1,stressed,pitchStartHz,pitchEndHz,durationMs,length:Math.round(durationMs*SAMPLE_RATE/1000)});
    }
   }
  }else{
   const strong=/[.!?;]/u.test(token),comma=/[, :–-]/u.test(token);
   const durationMs=Math.round(Math.min(350,strong?260:comma?105:65)/rate);
   items.push({kind:'silence',letter:'',syllable:-1,stressed:false,pitchStartHz:0,pitchEndHz:0,durationMs,length:Math.round(durationMs*SAMPLE_RATE/1000)});
  }
 }
 if(!items.some(x=>x.kind!=='silence'))throw new RangeError('Seslendirilebilecek Türkçe harf bulunamadı.');
 const count=items.reduce((n,s)=>n+s.length,0);
 if(count>SAMPLE_RATE*16)throw new RangeError('Deneysel ses süresi sınırı aşıldı.');
 return {items,sampleRate:SAMPLE_RATE,syllableCount,wordCount,durationSeconds:count/SAMPLE_RATE,experimental:true};
}
