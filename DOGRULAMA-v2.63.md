# DOU BEP Sınav Atölyesi v2.63 — Doğrulama

**Tarih:** 30 Ekim 2026. **Kapsam:** yalnız sentetik BAP araştırma prototipi; gerçek öğrenci verileri, klinik ölçüm veya üretim izni içermez.

## Yeni tanılama

- Kapalı 18 örnekli Türkçe yazım/telaffuz istisna korpusu; **18/18** örneğin bağımsız örnek hece referansı mevcut sezgisel heceleyiciyle aynı.
- `ğ` içeren **6 örnek**, sözcük başı ünsüz kümesi içeren **3 örnek** ve `-yor` vurgusu için **3/3 referans uyuşmazlığı** saptandı. Toplam **12 örnek** insan/uzman incelemesi için işaretlendi. Bunlar gerçek fonetik doğruluk veya anlaşılırlık ölçümü değildir.
- Önceki A/B/C sentetik WAV üreticileri, sınav onayı, yetki denetimi, SQLite şeması değiştirilmedi.

## Yerel testler

- `node --test --test-concurrency=8 *.test.mjs server-foundation/*.test.mjs tools/*.test.mjs`: **630/630 PASS**.
- `node release-check.mjs`: **257/257 PASS**.
- `node tools/acceptance-pilot.mjs`: **10/10 PASS** (sentetik veri; `productionReady=false`).
- `node tools/offline-audit.mjs`: **95 yayımlanmış UI dosyası, 0 doğrudan harici çağrı bulgusu**. Ağ/fayrvol izolasyonu kanıtı değildir.
- `node tools/dou-speech-exception-audit.mjs`: kararlı ve SHA-256 özetli JSON; girdi reddi ve eski A/B/C seslerinin değişmemesi test edildi.
- ZIP temiz klasöre çıkarıldı; sağlık API'si **2.63.0**, **18/18** açık HTTP yolu 200, **11/11** özel/izin verilmeyen yol 404, yetkisiz `/api/audit` 401. ZIP CRC kontrolü geçti.

## Açık sınırlamalar

Bu ürün henüz doğal Türkçe TTS, NVDA/JAWS eşdeğeri veya kurumsal dağıtıma hazır değildir. Türkçe sözcük örnekleri uzman tarafından doğrulanmış fonetik veri değildir. Windows gerçek cihaz, tarayıcı ses çalma, erişilebilirlik saha testi ve etik/kurumsal onay tamamlanmadı. Paket içinde canlı veritabanı, gizli anahtar, kişisel kayıt veya üretilmiş kabul raporu bulunmuyor.
