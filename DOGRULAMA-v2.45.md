# DOU BEP v2.45 — doğrulama raporu (29 Ekim 2026)

Bu rapor yalnız sentetik/yerel test koşullarını kapsar. Windows UI Automation/SAPI gerçek cihaz testi veya engelli kullanıcı kabulü içermez. Sesli WAV örneğinin insan tarafından anlaşılabilirliği doğrulanmadı.

- `npm test`: **517/517 PASS** (Node 22.16.0).
- `npm run release:check`: **158/158 PASS**. Statik kaynak sözleşme testidir, penetrasyon testi değildir.
- `npm run offline:audit`: **75 yayınlanan dosya**, **0 doğrudan dış kaynak bulgusu** (statik; ağ izolasyon testi değil).
- `npm run acceptance:pilot`: **10/10 PASS**; `productionReady=false` ve yalnız sentetik veri.
- `dou-speech-waveform.test.mjs`: deterministik RIFF/WAVE 16-bit mono doğrulaması, Türkçe ünlü/ünlü olmayan sesler, giriş sınırları, CLI dosya ezmeme davranışı.
- WAV örneği: **22.050 Hz mono, 16-bit**, sabit sentetik **“Merhaba dünya”**, ~1,25 s. Robotik akustik laboratuvar denemesidir; doğal Türkçe TTS değildir.
- Kurum veritabanına, gerçek sınav sorularına veya yanıtlarına yeni laboratuvardan erişim yok; sentez girdisi yalnız sabit anonim örnektir.
- Eski sınav okuma sistemi, `localService=true` ile OS seslerine bağlıdır ve sınav içi ses izni kontrolünü korur.

## Temiz paket testi

- Temiz ZIP'de `data`, SQLite, özel anahtar, geçici kabul raporu ve yedek dosyaları yer almıyor.
- Temiz kurulumda izole test SQLite ile Node yerel sunucusu açıldı.
- 11 web arayüzü ve 1 JavaScript sentez modülü **HTTP 200**.
- 6 özel veri/kod yolu **HTTP 404**.
- `/api/health` sürüm **2.45.0**, `/api/acceptance/exams` yetkisiz erişim **HTTP 401**.
- Tarayıcı ses oynatma, bağımsız Windows masaüstü UIA ve gerçek öğrenci erişilebilirlik kullanıcı testleri **çalıştırılmadı**.

**Canlı öğrenci verileri, ses anlaşılabilirliği, üretim güvenliği, PDF/UA, SSO/OIDC ve uygulama düzeyinde canlı SQLite şifrelemesi doğrulanmış değildir.**
