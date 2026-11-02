# DOU BEP v2.70 — doğrulama özeti

30 Ekim 2026 — yerel araştırma ortamı.

## Gerçekleştirilen değişiklikler
- `dou-speech-context-normalization.mjs`: yalnız seçildiğinde tarih/saat doğrulaması, 5 kısaltma dönüşümü.
- `dou-speech-free-text.mjs`: `contextMode` alanı, varsayılan `literal` koruma, 360 karakter / 60 saniye sınırları aynı.
- `dou-speech-free-text-ui.mjs`, `dou-reader-demo.html`: erişilebilir seçenek ve planlanan okunuş önizlemesi.
- `server.mjs`: yalnız gerekli yeni modül için açık allowlist.
- Önceki ses algoritmaları ve SQLite verileri değiştirilmedi.

## Test edilenler
- Hedefli `node --test dou-speech-context-normalization.test.mjs dou-speech-number-words.test.mjs dou-speech-free-text.test.mjs`: **22/22 başarılı** (ilk tam tur); ilave saat-kopyası düzeltmesinden sonra yeni 7/7 testi tekrar başarılı.
- `node release-check.mjs`: geçti (ayrıntı için yerel `bep-v270-release.log`).
- `node tools/offline-audit.mjs`: **108 dosya, 0 sorun** (yalnız statik denetim).
- İzole geçici SQLite ile gerçek HTTP: **17/17** (giriş, oturum, listeleme, anonim sınav kaydı, yeni Reader modül/özel dosya HTTP erişimi).
- Tam regresyon denemesi: ilk ağır test grubu **100 sn süre sınırına takıldı**, başarı olarak sayılmadı. Önceki sürümlerin tüm testlerini yeni sürümde tamamladığımız iddia edilmez.

## Kapsam dışı
Gerçek kullanıcı kabulü, görme engelli katılımcı dinlemesi, Windows NVDA, algısal kalite, saha ve kurum güvenlik testleri yapılmadı. Yeni WAV otomatik testleri Türkçe sesin anlaşılır veya doğal olduğunu kanıtlamaz.
