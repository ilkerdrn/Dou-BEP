# DOU BEP Sınav Atölyesi v2.57 — Kontrollü fonem zamanlaması ve WAV karşılaştırması

**Yalnız anonim/sentetik yerel BAP Ar-Ge prototipi.** Üniversitenin resmî, sertifikalı yazılımı değildir. Gerçek öğrenci/sağlık/sınav verisi kullanmayın.

## Yeni
- **`/dou-reader-demo` içinde “Fonem zamanlamasını karşılaştır ve çal”**: yalnız önceden sabitlenen `Merhaba dünya` ifadesi; vurgulu ve durak öncesi ünlü süreleri küçük oranlarla ayarlanır, tonal komşuların perde sınırları ortak değerde birleştirilir; durak ve sürtünmeli sesler arasından geçiş yapılmaz.
- Karşılaştırma yalnız nesnel WAV ölçülerini (süre, RMS, en büyük ardışık örnek farkı, kırpılma) gösterir. **Doğallık, anlaşılabilirlik, telaffuz doğruluğu ve işitsel fayda ölçülmez; yeni sürümün daha iyi olduğu iddia edilmez.** v2.56 spektral ses çıktısı aynı bırakılmıştır.
- Yalnız sabit sentetik örnek CLI komutu: `node tools/dou-speech-preview.mjs --out yeni-deney.wav --mode timing`. Var olan dosya üzerine yazılmaz; `--text` kabul edilmez.
- `dou-speech-timing.mjs` ve `dou-speech-comparison.mjs` yalnız yerel JS; kullanıcı, sınav, mikrofon, sunucu aktarımı, bulut ve veri kaydı yoktur.
- Gerçek sınav okuyucusu / Windows DOU Reader / onay sistemi / SQLite şeması değişmedi ve laboratuvar gerçek sınav içeriklerine bağlanmadı.

## Windows yerel deneme
1. Yeni ZIP'i eski sürümün ve `data` klasörünün **üzerine çıkarmayın**. Node.js 22.13+ gerekir.
2. Yeni klasörde `BASLAT.bat` veya `npm.cmd start` ile açın.
3. `http://127.0.0.1:4173/dou-reader-demo` sayfasında ayrı laboratuvar düğmesini deneyin.
4. Doğrulama: `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot`.

**Kalan işler:** Fonetik uzman ve gerçek dinleme/Windows erişilebilirlik testleri, doğal Türkçe TTS tasarımı, NVDA/JAWS cihaz kanıtı, kurumsal KVKK/etik, PDF/UA, şifreli üretim depolaması. **Gerçek verili üretim hazır değildir.**
