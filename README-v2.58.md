# DOU BEP Sınav Atölyesi v2.58 — Çevrimdışı sentetik ses sınırı denetimi

**Yalnız anonim/sentetik BAP/Ar-Ge pilotu; gerçek öğrenci, sağlık, personel veya sınav verisiyle çalıştırmayın. Kurumun resmi onaylı ürünü değildir.**

## Ne geliştirildi?
- `dou-speech-boundary.mjs`: 22.050 Hz mono PCM16 WAV ile zamanlanmış ses planının kare sayısının birebir örtüşmesini gerektirir. 1–20 ms ölçüm penceresinde segment sınırının iki yanında RMS ve tek-sample sıçrama ölçer; segment sınıflarına göre özet çıkarır. Bozuk WAV, uyumsuz plan, taşan süre, bilinmeyen sınıf reddedilir.
- Yalnız sabit sentetik `Merhaba dünya` için v2.56 spektral ve v2.57 zamanlama WAV'ları segment sınıfı sırasına göre hizalı ölçülür. Sayısal rapor **sözcük, ham ses, soru, öğrenci, dosya adı, kimlik veya zaman bilgisi** içermez.
- `/dou-reader-demo`: “Ses sınırı denetimini göster” düğmesi, açık başlıklı erişilebilir tablo. Ses çalmaz, sınav sorularını işlemez, depolamaz, aktarmaz.
- `npm run speech:boundary-audit`: yalnız sabit sentetik örnek için stdout JSON. Kullanıcı metni, dosya, URL veya argüman kabul edilmez. Kurulu TTS, internet ve hesap gerektirmez.
- Önceki sentez fonksiyonları, DOU Reader, sınav editörü, onay, öğrenci uyarlamaları, SQLite şeması ve ses dosyaları değiştirilmedi. `data` klasörü ZIP içinde yoktur.

## Önemli sınır
RMS, ardışık örnek sıçraması ve pencere ölçümleri **doğallık, insanın algıladığı anlaşılırlık, fonetik doğruluk veya motor kalitesi** değildir. Farklar motorun iyileştiğini kanıtlamaz. Özellikle sentetik ünsüz modelleri dil bilimsel olarak doğrulanmamıştır. Klinik test veya gerçek kullanıcı kabulünün yerine geçmez.

## Windows yerel kullanım
1. v2.58 ZIP'i eski klasör ve `data` üzerinde açmayın; başka klasöre çıkarın. Node.js 22.13+.
2. `BASLAT.bat` veya `npm.cmd start`, ardından `http://127.0.0.1:4173/dou-reader-demo`.
3. Ses sınırı ölçümleri için ayrı düğme, komut satırından `npm.cmd run speech:boundary-audit`.
4. Testler: `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot`.

**Kritik eksikler:** doğal Türkçe TTS, fonetik uzman/gerçek kullanıcı dinleme, Windows UI Automation/NVDA/JAWS, PDF/UA ve kurumsal KVKK onayı. Gerçek kullanıcı verisiyle üretime hazır değildir.
