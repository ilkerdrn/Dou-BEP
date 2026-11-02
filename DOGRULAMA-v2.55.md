# DOU BEP v2.55 — Yerel doğrulama (29 Ekim 2026)

**Anonim/sentetik BAP geliştirme doğrulamasıdır. Gerçek Windows erişilebilirlik testi veya üretim onayı değildir.**

- `node --test *.test.mjs server-foundation/*.test.mjs tools/*.test.mjs`: **582/582 PASS** (önceki 575 teste ek 7 ses/ses envanteri ve dinleyici yaşam döngüsü testi).
- `node release-check.mjs`: **215/215 PASS** (5 yeni kaynak koruma kontrolü).
- `node tools/offline-audit.mjs`: **88 yayınlanan arayüz dosyası, 0 doğrudan harici kaynak bulgusu**. Bu statik tarama ağ trafiği veya uygulama davranışı için tam kanıt değildir.
- `node tools/acceptance-pilot.mjs`: **10/10 PASS**, yalnız anonim/sentetik senaryolar; `productionReady=false`.
- Uygulamanın sürüm sabiti, paket sürümü ve HTTP sağlık bildirimi **2.55.0** olarak eşleştirildi.
- Yeni Reader testleri: ses envanterinden kaybolma, yeni yerel sese sessiz geçişi engelleme, uzaktan ses olarak bildirilme, geçersiz ses listesi, tekrarlanan/geciken olaylar ve `voiceschanged` dinleyicisinin kaldırılması.
- SQLite şeması, sınav/onay/koordinasyon modülleri ve ses laboratuvarının bağımsızlığı korundu.

## Sınırlar

Tarayıcının `localService===true` bildirimi, işletim sistemi/tarayıcı düzeyinde internet bağlantısının bulunmadığına tek başına kanıt değildir. Gerçek Windows cihazları, Türkçe ses anlaşılabilirliği, NVDA/JAWS, PDF/UA, kurumsal veri koruma, KVKK ve etik onay **doğrulanmadı**. Gerçek öğrenci veya sağlık verileriyle kullanmayın.
