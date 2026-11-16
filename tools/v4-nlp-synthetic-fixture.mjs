/** Anonymous NLP teaching topics inspired by an uploaded YZP207 exam.
 * All prompts/options below are newly authored and paraphrased for demo.
 * The uploaded exam, institution header, answer key and roster are NOT copied.
 * Never use this fixture as a real grading instrument.
 */
import {createDemo} from '../core.mjs';
export function createNlpSyntheticExam(){
 const exam=createDemo();
 exam.title='Doğal Dil İşleme — erişilebilir öğrenci demo sınavı';
 exam.subject='Doğal Dil İşleme';exam.grade='Örnek üniversite dersi';
 exam.profile='';exam.objective='NLP temel kavramları, metin ön işleme ve veri sızıntısını açıklama';
 exam.instruction='Bu deneme tamamen kurgusaldır. Gerçek sınav değildir. Test ve klasik cevapları klavyeyle deneyin; kişisel bilgi yazmayın.';
 exam.adaptations.visualCues=false;
 exam.questions=[
  {id:'nlp-a',type:'choice',prompt:'Bir uygulama, destek görüşmelerinden kişi adlarını ve tarihleri otomatik işaretliyor. Bu hangi doğal dil işleme görevidir?',
   objective:'Bilgi çıkarma',points:20,options:['Metinden bilgi çıkarma','Konuşma üretme','Dil çevirisi','Görsel tanıma'],answer:'Metinden bilgi çıkarma',pairs:[],teacherNote:''},
  {id:'nlp-b',type:'choice',prompt:'Bir metin sınıflandırıcısının TF-IDF sözlüğü eğitim ve değerlendirme olarak ayrılmadan bütün belgeler üzerinde öğrenilirse hangi risk doğar?',
   objective:'Veri sızıntısı',points:20,options:['Veri sızıntısı','Daha küçük sözlük','Eğitim süresinin sıfırlanması','Noktalama kaybı'],answer:'Veri sızıntısı',pairs:[],teacherNote:''},
  {id:'nlp-c',type:'short',prompt:'Klasik soru: Türkçede bir sözcüğe ek geldiğinde oluşabilen ses değişimi, basit kök bulma yöntemini neden yanıltabilir? Kısa bir örnekle kendi cümlelerinizi yazın.',
   objective:'Türkçede biçimbilim ve kök bulma',points:20,options:[],answer:'Ek geldiğinde kökte ses değişimi görülebilir; yalnız ek kırpan sistem geçersiz kök üretebilir.',pairs:[],teacherNote:''},
  {id:'nlp-d',type:'short',prompt:'Klasik soru: Bir NLP sınıflandırma deneyinde veri sızıntısını önlemek için eğitim, test ayırma ve TF-IDF adımlarını hangi sırayla yaparsınız? Kısaca açıklayın.',
   objective:'Doğru model değerlendirmesi',points:20,options:[],answer:'Önce eğitim ve test ayrılır; TF-IDF yalnız eğitimde öğrenilir, test aynı dönüşümle dönüştürülür.',pairs:[],teacherNote:''},
  {id:'nlp-e',type:'truefalse',prompt:'Doğru veya yanlış: Modelin yalnız eğitim verisinde yüksek başarılı olması, yeni metinlerde de aynı başarıyı garanti eder.',
   objective:'Aşırı öğrenmeyi fark etme',points:10,options:[],answer:'Yanlış',pairs:[],teacherNote:''},
  {id:'nlp-f',type:'matching',prompt:'NLP görevlerini uygun tanımlarla eşleştirin.',
   objective:'NLP yöntemlerini ayırt etme',points:10,options:[],answer:'',pairs:[{left:'Tokenizasyon',right:'Metni parçalara ayırma'},{left:'Bilgi çıkarma',right:'Metindeki varlıkları belirleme'}],teacherNote:''}
 ];
 return exam;
}
