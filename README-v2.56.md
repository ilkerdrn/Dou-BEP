# DOU BEP Sınav Atölyesi v2.56 — İki taraflı spektral geçiş deneyi

**Yerel, anonim/sentetik BAP Ar-Ge prototipi.** DOU kurumsal tasarımına sahip olması üniversite tarafından onaylandığı anlamına gelmez. Gerçek öğrenci, tanı, engellilik, sınav veya sağlık kayıtlarını bu prototiple işlemeyin.

## Yeni deney

- DOU Speech Lab'da **“Spektral geçiş denemesini çal”** düğmesi eklendi. Yalnız sabit `Merhaba dünya` örneği kullanılır. Tarayıcıda anlık 22.050 Hz mono, 16-bit PCM WAV hesaplanır. Bulut, indirme, Windows SAPI, mikrofon, ses kaydı, kullanıcı hesabı ve veritabanı gerekmez.
- Sesli/tonal komşu segmentlerin sınırında, önceki segmentin son %20'sinde orta spektruma yaklaşan ve sonraki segmentin ilk %20'sinde hedefe ulaşan **iki taraflı** spektral ağırlık ve seviye geçişleri denenir. Faz süreklidir; duraklar ve sürtünmeli ünsüzler ayrı kalır. Bu bir temel sayısal sinyal işleme denemesidir; fonetik doğruluk veya anlaşılırlık kanıtı değildir.
- Sabit metin ile CLI üretimi: `node tools/dou-speech-preview.mjs --out yeni-deney.wav --mode spectral`. Mevcut dosyayı **üzerine yazmaz**. CLI metin parametresi almaz. Önceki temel, prozodi, fonem-geçişi ve ünsüz profili modları aynen kalır.
- DOU Reader / sınav editörü / Windows okuyucu ile bağlantı **kurulmadı**; laboratuvardan gerçek sınav sorularına geçiş yapılmadı. SQLite şeması, kurum hesapları, sınav kayıtları ve onay mekanizması değişmedi.

## Windows'ta

1. Paketi eski sürümün veya `data` klasörünün üzerine **yazmadan** yeni bir dizine çıkarın. Node.js `>=22.13` gereklidir.
2. Yeni dizinde `BASLAT.bat` veya `npm.cmd start` çalıştırın.
3. `http://127.0.0.1:4173/dou-reader-demo` sayfasına gidin. Alttaki **DOU Speech Lab** bölümünden yeni örneği çalın. Bu deneme, Reader'ın kurulu Türkçe ses ihtiyacından bağımsızdır.
4. Kontroller: `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot`.

**Sınırlar:** Deney, doğal Türkçe TTS veya NVDA/JAWS alternatifi değildir. Gerçek Windows ses aygıtları, insan dinleme/anlaşılırlık, fonetik uzman denetimi, WCAG/PDF-UA, KVKK/etik ve üretim güvenliği henüz doğrulanmadı. Statik çevrimdışılık taraması ağ trafiğini fiziksel olarak engellemez.
