# DOU BEP Sınav Atölyesi v2.65 — Deneysel birleşik ritim ve perde katmanı

**Durum:** Sentetik BAP araştırma prototipi. Gerçek öğrenci, sınav, kişisel veri veya üretim ekran okuyucusu kullanımı için onaylı değildir.

## Değişiklikler

- `dou-speech-cadence.mjs`: Yalnız EX13–EX15 sabit kodlarını kabul eden bağımsız deneysel ritim planlayıcısı. Önceki v2.64 vurgu planına ek olarak bitişik tonlu seslerin perde sınırları eşitlenir, vurgulu/vurgusuz ünlü süreleri ve kazanç katsayıları dar, belirlenmiş sınırlarla ayarlanır.
- `dou-speech-waveform.mjs`: İsteğe bağlı üçüncü WAV kolu `synthesizeFixedCadencePreview`. Mevcut `baseline` ve `candidate` ses işleyişinin varsayılan davranışı değiştirilmemiştir.
- `dou-reader-demo.html` / `.mjs`: Klavyeyle erişilebilir sayısal durum tablosu, ayrı C oynatma kontrolü ve canlı durum bildirimi. Yalnız sabit sentetik örnek kullanılır; yanıt, mikrofon kaydı, uzaktaki API veya öğrenci metni yoktur.
- `tools/dou-speech-cadence-audit.mjs`: Argümansız, yazma yapmayan, SHA-256 özeti içeren anonim JSON denetimi.
- `dou-speech-cadence.test.mjs`: Sınır, deterministik WAV, eski ses kollarının değişmezliği, fonem eşleşmesi ve gizlilik testleri.

## Çalıştırma

ZIP'i eski `data` dizininden ayrı klasöre çıkar. Node.js >=22.13 ile `BASLAT.bat` kullanabilir veya `npm start` çalıştırabilirsin. `http://127.0.0.1:4173/dou-reader-demo` sayfasındaki **v2.65 Birleşik hece süresi ve perde deneyi** bölümünü aç. EX13/EX14/EX15 kodunu üstteki açılır listeden seç ve C sesini dinle.

CLI: `npm run speech:cadence-audit`. Test: `node --test --test-concurrency=8 *.test.mjs server-foundation/*.test.mjs tools/*.test.mjs`. Diğer kontroller: `npm run release:check`, `npm run offline:audit`, `npm run acceptance:pilot`.

## Sınırlamalar

Bu robotik ses modeli doğal/anlaşılır Türkçe konuşma üretmez. Spektral geçiş, süre ve perde hesaplamaları kulakla anlaşılabilirlik ölçütü değildir. `ğ`, ünsüz kümeleri, çok sözcüklü telaffuz ve vurgular uzman doğrulaması gerektirir. Gerçek Windows NVDA/JAWS, otomatik erişilebilirlik testleri, bağımsız ekran okuyucu entegrasyonu, PDF/UA, etik kurul ve KVKK onayları tamamlanmamıştır. Üretim kullanımı uygun değildir. Eski veritabanı şeması, sınav ve Reader iş akışı değiştirilmedi; testler yalnız sentetik veriler üzerindedir.
