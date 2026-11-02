# DOU BEP v2.45 — DOU Speech Lab deneysel ses sentezi

**Araştırma prototipi — canlı öğrenci verisi kullanmayın.** Önceki v2.44 sınav, Reader, güvenlik, denetim, uyarlama ve yedekleme modülleri korunur. Windows Reader'ın NVDA benzeri genel ekran okuma işlevleri gerçek cihazda hâlâ doğrulanmadı.

## Yeni çalışan özgün sentez çekirdeği

`dou-speech-waveform.mjs` Windows SAPI, Web Speech, ağ, indirilmiş modeller veya mikrofon kullanmadan 22.050 Hz mono 16-bit PCM WAV baytlarını kendisi üretir. Türkçe ünlü seslere yaklaşık formant frekansları ve bazı ünsüzlere gürültü/atım modeli uygular. Ses **çok robotik ve fonetik olarak yaklaşık** olabilir; doğal Türkçe, anlaşılabilirlik, artikülasyon, fonem hizalaması, ses kalitesi veya erişilebilir sınavda kullanılabilirliği kanıtlanmamıştır. Bu bir **akustik deneydir**, gerçek TTS ürünü değildir.

**Ayrıştırma ve veri güvenliği:** En fazla 100 karakter kabul eder; yalnız Türkçe harfler, tek rakamlar, boşluk ve basit noktalama işaretleri desteklenir. Desteklenmeyen ifadeler reddedilir. Üretim algoritması deterministiktir, veriyi bir yere göndermediği gibi kaydetmez. Kurumsal sınav yanıtları bu laboratuvara bağlanmaz.

## Kullanım

1. Node.js >=22.13 ile ayrı klasörde `npm.cmd start` çalıştırın.
2. `http://127.0.0.1:4173/dou-reader-demo` adresini açın.
3. **DOU Speech Lab — özgün robotik ses deneyi** alanında *Deneysel sesi üret ve çal* düğmesine basın. Sadece sabit sentetik **“Merhaba dünya”** sesini üretir; gerçek sınavı veya soruları okumaz. Ses kapalıysa mevcut Reader ve yazılı sınav aynı şekilde çalışır.

Windows veya Linux üzerinde doğrudan WAV üretmek için, **yeni ve henüz bulunmayan** bir dosya yolu verin:

```powershell
node .\tools\dou-speech-preview.mjs --out .\DOU-Speech-deney.wav
```

Komut yalnız anonim örneği üretir; var olan WAV dosyasını ezmez. Dosya depolanmasını istemiyorsanız demo düğmesini kullanın: tarayıcı ses verisini yalnızca bellekte tutar ve çalınca kaldırır.

## Eski özellikler ve sınırlar

- `tools/dou-reader-windows.ps1`: Windows masaüstü UI Automation okuyucu pilotu, kurulu Türkçe SAPI sesi gerektirir, ayrı çalışır. Bu yeni ses deneyi Windows okuyucuya otomatik bağlanmaz.
- `dou-speech.mjs`: sınav içindeki politikaya bağlı sesli okuma için yalnız `localService=true` kurulu Türkçe sesleri kullanır; **varsayılan seslendirme bu modülde değişmedi**.
- `dou-speech-waveform.mjs`: yalnız anonim demo/test amaçlı bağımsız ses üretimi.
- Windows UIA, gerçek Türkçe telaffuz ve görme engelli kullanıcı testleri yapılmadı; PDF/UA, canlı SQLite şifreleme ve SSO eksikleri sürüyor.
- Kullanıcıya ait gerçek isim, engellilik bilgisi, soru veya sınav verisini bu ses laboratuvarında denemeyin.

Çalıştırma denetimleri: `npm test`, `npm run release:check`, `npm run offline:audit`, `npm run acceptance:pilot`.
