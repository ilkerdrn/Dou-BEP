# DOU BEP Sınav Atölyesi v2.48 — DOU Speech ünsüz sınıfları araştırma prototipi

**Yalnızca anonim/sentetik BAP Ar-Ge prototipi. Gerçek öğrenci, engellilik, sağlık, sınav içeriği veya personel bilgisi kullanmayın.** Önceki sınav/uyarlama/kurum, Reader, denetim, yedekleme, DOU Speech ve kör A/B modülleri korunmuştur. Veritabanı şeması ve mevcut sınav seslendirme politikası değiştirilmedi.

## Bu sürümde kodlananlar

- `dou-speech-waveform.mjs`: Önceki üç deneysel WAV modeline **dördüncü, tamamen yerel `synthesizeTurkishArticulationPreview` modeli** eklendi. `s/ş`, `f/h`, `z/v`, `p/t/k`, `b/d/g`, `m/n`, `l/r/y` gibi Türkçe harf gruplarında ayrı, sınırlı akustik profiller kullanır. Sesli parçalarda osilatör fazı ve formant geçişi korunur; sürtünmeli sesler için farklı filtrelenmiş gürültü, patlamalı sesler için kısa gürültü zarfı ve genizsiller için farklı formant profilleri üretilir. Bu **basitleştirilmiş harf sınıflandırmasıdır; fonetik doğruluk, IPA dönüştürücü, dil modeli veya anlaşılır Türkçe TTS değildir**.
- `/dou-reader-demo`: Kullanıcı tetiklemeli **“Ünsüz ayrımı denemesini çal”**, **“Sasa sesini çal”** ve **“Şaşa sesini çal”** düğmeleri eklendi. Yalnız kod içine yazılmış sentetik sabit örnekler işlenir. Kullanıcı/öğrenci metni bu motora gönderilmez. URL nesneleri dinleme bitiminde veya durdurulduğunda temizlenir.
- `tools/dou-speech-preview.mjs`: `--mode articulation` ile sabit **“Merhaba dünya”** örneğini ayrı, yeni bir WAV dosyasına üretir. Komut serbest `--text` kabul etmez; var olan dosyanın üzerine yazmaz.
- `dou-speech-articulation.test.mjs`: Determinizm, PCM/WAV sınırları, otomatik teknik ses ölçümleri, `s/ş`, `m/n`, `p/k`, `z/v` ayrımları, geçersiz girdi, güvenli CLI ve demo gizlilik sınırları için testler. Bunlar **insan tarafından konuşma tanıma veya doğru telaffuz değerlendirmeleri değildir**.

## Windows'ta ayrı klasörde dene

1. Yeni ZIP'i önceki DOU BEP klasörünün üzerine yazmadan **ayrı klasöre** çıkar. `data` klasörünü, gerçek verileri ve önceki denetim anahtarlarını taşımayın.
2. Node.js 22.13+ ile klasörde PowerShell açıp `npm.cmd start` çalıştır.
3. Tarayıcıda `http://127.0.0.1:4173/dou-reader-demo` adresini aç. DOU Speech Lab bölümünde “Sasa” ve “Şaşa” örneklerini karşılaştır. Tarayıcı ses izni gerekli olabilir; internet, mikrofon veya Windows konuşma sesi gerekmez. Mevcut sınav okuyucu adaptörünün kendi Windows/Türkçe yerel ses gereksinimi ayrıdır.
4. Laboratuvarın aynı sentetik cümlesinin dördüncü robotik WAV varyantı:

```powershell
node .\tools\dou-speech-preview.mjs --out .\unsuz-profili.wav --mode articulation
```

**Hedef WAV dosyası önceden bulunmamalıdır.** 22.050 Hz, mono, 16-bit PCM üretir. Hız ve perde sınırlandırılmıştır; bu uygulamada üretim sınavı metinleriyle ses sentezi yapılamaz. Diğer üç deneysel varyant ve `/dou-speech-listening` kör dinleme prototipi eskisi gibi çalışır; eski A/B çalışmasının kolları değiştirilmedi (sonuçların karşılaştırılabilirliği için).

## Test ve üretim sınırları

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
```

Linux tabanlı ortamda yapılan otomatik kontroller gerçek Windows UI Automation derlemesi, NVDA/JAWS entegrasyonu, insan anlaşılabilirliği (ör. kör transkripsiyon doğruluğu/WER), hece/fonem doğruluk denetimi, çocuk/yetişkin ses algısı, PDF/UA, KVKK/etik kurul veya kurumsal SSO onayı değildir. Bu ses, profesyonel bir okuyucunun yerine geçmez; gerçek öğrencilerde varsayılan kullanımı uygun değildir. Canlı SQLite uygulama düzeyinde şifreli değildir.
