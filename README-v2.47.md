# DOU BEP v2.47 — DOU Speech Lab fonem geçişleri ve kör A/B dinleme çalışması

**Yalnızca anonim ve sentetik Ar-Ge prototipi.** Gerçek öğrenci kimliği, engellilik/sağlık bilgisi, sınav sorusu, cevap veya personel verisi kullanmayın. v2.46'daki sınav/koordinasyon, denetim, yedekleme, DOU Reader ve mevcut ses deneyi korunur; bu sürüm mevcut SQLite veritabanını değiştirmez.

## Bu sürümün gerçek katkısı

1. `dou-speech-waveform.mjs` içindeki `synthesizeTurkishCoarticulationPreview`: önceki hece-vurgu motorunun ses çizelgesinden hareketle, ardışık ötümlü seslerde osilatör fazını koruyan ve formant armonik ağırlıklarını **kademeli olarak** değiştiren üçüncü, deterministik PCM/WAV araştırma varyantı. Temel/prozodi sürümleri aynen durur. Giriş uzunluğu, süre, perde ve hız üst sınırları korunur; uzaktan model, Windows sesi veya ağ bağlantısı gerektirmez.
2. `dou-speech-listening.mjs`: tam **üç sabit sentetik cümle** için kriptografik rastgele baytlarla dengeli olmayan (her deneme bağımsız %50) A/B sıra ataması; iki WAV'ı da oynatmadan tek seçim yapmayı reddeden durum yönetimi. Bir oy, yeniden düzenleme yok; *daha anlaşılır geliyor / fark yok / ikisi de anlaşılmıyor* kategorileri mevcut.
3. `/dou-speech-listening`: tamamen cihaz içinde çalışan, klavyeyle kullanılabilen kör A/B dinleme **prototipi**. Yalnız düğmeye basıldığında ses üretir, `Blob` URL'lerini temizler, cevapları herhangi bir API'ye veya `localStorage`'a yazmaz. İstenirse yalnız **toplam tercih sayılarından** oluşan, katılımcı kimliği, zaman, metin veya deneme bazlı ham cevap içermeyen `.json` indirir.
4. `/dou-reader-demo`: mevcut temel ve hece-vurgu örneklerine üçüncü **fonem-geçiş** düğmesi ile dinleme laboratuvarı bağlantısı eklendi. Gerçek öğrenci sınavının seslendirme kuralı, yerel Türkçe ses gereksinimi ve veri erişimi değişmedi.
5. `tools/dou-speech-preview.mjs`: güvenli, üzerine yazmayan `--mode coarticulation` seçeneği eklendi. Metin argümanı verilmez; yalnız *Merhaba dünya* üretilir.

**Yöntem uyarısı:** A/B tercihi **anlaşılabilirlik yüzdesi, sözcük doğruluğu (WER), doğal konuşma puanı (MOS), erişilebilirlik sertifikası veya bilimsel geçerlilik değildir**. Körlük yalnız sürüm adlarının seçimden önce saklanmasıdır. Üç örnek, öz-seçimli denemeler ve herhangi bir denetimsiz tarayıcı/ses aygıtı klinik veya akademik sonuç sağlamaz. Gerçek etik onaylı değerlendirmede kontrollü örneklem, Latin kare/karşı dengeleme, insan değerlendirmeciler, transkripsiyon protokolü, erişilebilirlik kontrolü, istatistik planı, gizlilik ve kayıt politikası gerekir.

## Windows yerel kullanım

Yeni ZIP'i eski sürümün **üzerine yazmadan** ayrı klasöre açın. Node.js 22.13+ yeterli:

```powershell
npm.cmd start
```

Tarayıcıda `http://127.0.0.1:4173/dou-reader-demo` veya doğrudan `http://127.0.0.1:4173/dou-speech-listening` açın. A ve B seslerini ayrı ayrı dinleyin. Tarayıcıda ses çalma izni yoksa seçim etkinleşmez; tüm ses oynatma kullanıcı komutuyla başlar. En son toplu raporu cihazınıza indirebilirsiniz; varsayılan olarak hiçbir rapor dosyası oluşturulmaz. Ses varyantlarının gerçek Türkçe anlaşılabilirliği **doğrulanmadı**.

Aynı sabit sentetik cümlenin üç robotik sürümünü CLI ile üretin:

```powershell
node .\tools\dou-speech-preview.mjs --out .\temel.wav
node .\tools\dou-speech-preview.mjs --out .\hece-vurgu.wav --mode prosody
node .\tools\dou-speech-preview.mjs --out .\fonem-gecis.wav --mode coarticulation
```

Her hedefin **henüz bulunmayan** yeni dosya adı olması gerekir. Her WAV 22.050 Hz mono 16-bit PCM üretir; sahte katılımcı verisi de dahil gerçek sınav metni argümanı kabul edilmez. Mevcut Windows `data` klasörünü, audit anahtarlarını, kanıtları ve şifreli yedekleri taşımayın veya değiştirmeyin.

## Doğrulama ve sınırlar

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
```

Bu komutlar Linux tabanlı yerel test ortamında çalıştırılmıştır. Gerçek Windows/PowerShell UI Automation okuyucusu; NVDA/JAWS uyumluluğu, Türkçe ses kalitesi, klavye/ses kullanıcısı geri bildirimi, PDF/UA, KVKK/etik kurul ve kurumsal SSO bağımsız doğrulama ister. Çalışma bir BAP araştırma prototipidir; gerçek öğrencilere sunulacak üretim sistemi değildir.
