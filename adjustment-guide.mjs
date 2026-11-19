/** v2.90: Institutional decision GUIDE. It lists adjustments that institutions commonly consider for an access area.
 * It is NOT a diagnosis or an automatic decision: no student data, nothing is stored, the area chosen in the UI is only
 * used to show suggestions. The institution/coordinator decides, and the decision still needs separate approval.
 */
import {ADJUSTMENTS,NEED_AREAS} from './batch-accommodations.mjs';
export const GUIDE_NOTE='Bu bir karar rehberidir; tanı veya otomatik karar değildir. Öğrencinin gerçek ihtiyacı yetkili birim kararıyla belirlenir ve her karar ayrıca onaylanmalıdır. Rehberdeki hiçbir öğe kendiliğinden uygulanmaz.';
const G={
 vision:[['ACCESSIBLE_HTML','Ekran okuyucu ve klavyeyle bağımsız sınav için'],['LARGE_PRINT','Basılı veya ekran metni büyütülür'],['HIGH_CONTRAST','Az gören öğrenci için okunabilirlik'],['READER','Sesli dijital çıktı yerine insan okuyucu gerekirse'],['ASSISTIVE_TECH','Ekran büyütücü, braille ekranı gibi onaylı araçlar']],
 hearing:[['ACCESSIBLE_HTML','Tüm yönergeler yazılı; süre uyarıları görsel'],['SIGN_SUPPORT','Sözlü yönergeler için işaret dili/iletişim desteği'],['QUIET_ROOM','Ses ve dikkat dağıtıcıların azaltılması gerekirse']],
 speech:[['ACCESSIBLE_HTML','Konuşma gerektirmeden klavye ve yazılı yanıt'],['WIDE_RESPONSE','Yazılı yanıt için geniş alan'],['SCRIBE','Alternatif yanıt aracı olarak yazıcı/işaretleyici'],['QUIET_ROOM','Sakin ortamda yanıt verme']],
 motor:[['ACCESSIBLE_HTML','Tam klavye ve alternatif giriş aygıtı uyumu'],['ONE_PER_PAGE','Tek soru görünümüyle yanlış tıklama azalır'],['WIDE_RESPONSE','Büyük yanıt alanı, daha az hassas hareket'],['BREAKS','Yorgunluk için onaylı ara'],['SCRIBE','El ile yazamıyorsa yazıcı'],['ASSISTIVE_TECH','Onaylı anahtar, göz/baş izleme, ses kontrolü']],
 reading:[['ACCESSIBLE_HTML','Sesli okuma ve büyütülmüş metin'],['LARGE_PRINT','Okunabilirlik için büyük punto'],['ONE_PER_PAGE','Odaklanmayı kolaylaştırır'],['READER','İnsan okuyucu gerekirse'],['WIDE_RESPONSE','Yazma güçlüğünde geniş alan']],
 other:[]
};
const EXTRA_TIME_AREAS=new Set(['vision','motor','reading']);
export function suggestAdjustments(area){
 if(!Object.hasOwn(NEED_AREAS,area))throw Error('Geçersiz erişim alanı.');
 const items=G[area].map(([code,reason])=>({code,label:ADJUSTMENTS[code].label,kind:ADJUSTMENTS[code].kind,reason,automatic:ADJUSTMENTS[code].kind!=='staff'}));
 return {area,label:NEED_AREAS[area],items,considerExtraTime:EXTRA_TIME_AREAS.has(area),
  note:area==='other'?'Bireysel değerlendirme gerekir; rehber öneri sunmaz. '+GUIDE_NOTE:GUIDE_NOTE};
}
export const GUIDE_AREAS=Object.freeze(Object.entries(NEED_AREAS).map(([id,label])=>({id,label})));
