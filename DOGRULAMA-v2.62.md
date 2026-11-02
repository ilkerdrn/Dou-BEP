# DOU BEP Sınav Atölyesi — v2.62 doğrulama

**Kapsam:** 30 Ekim 2026; yerel ve anonim/sentetik araştırma prototipi. Gerçek bir üniversite üretim, fonetik anlaşılırlık, NVDA/JAWS veya erişilebilirlik sertifikasyonu **değildir**.

## Yeni sürüm

- 14 sabit sentetik örnek, 31 sezgisel/yazımsal hece, 15 sözcük içi hece sınırı, 8/8 Türkçe ünlü grafemi.
- 14/14 örnekte bağımsız beklenen yazımsal hece parçalanması ile mevcut sezgisel planlayıcı uyumlu.
- Ünlü açıklığı / yuvarlaklık / ön-arka özellikleri üzerinde yapısal denetim ve uyumsuzluk kodları; kişi/sınav metni dışa aktarılmaz.
- A/B/C WAV algoritmaları, Reader ses politikası, kurumsal onay akışı ve SQLite şeması değiştirilmedi.

## Kontroller

- `node --test --test-concurrency=4 *.test.mjs server-foundation/*.test.mjs tools/*.test.mjs`: **622/622 başarılı** (yeniden doğrulanan yerel test koşusu).
- `npm run release:check`: **252/252 PASS**.
- `npm run acceptance:pilot`: **10/10 PASS**, yalnız anonim/sentetik veri; `productionReady=false`.
- `npm run offline:audit`: **94 dosya tarandı, 0 doğrudan harici kaynak bulgusu**; firewall/ağ izolasyonu kanıtı değildir.
- `npm run speech:orthography-audit`: yalnız sabit 14 örnek; JSON SHA-256 özeti; argüman kabul etmez.
- Temiz ZIP, yeni izole SQLite ile açıldı: `/api/health` **2.62.0**, **18/18** açık adres HTTP 200, **9/9** izin dışı yol HTTP 404, yetkisiz `/api/audit` HTTP 401. ZIP bütünlük kontrolü geçti.
- Bu HTTP kontrolü gerçek Windows/NVDA kullanıcı testi değildir; `core.mjs` beklenen biçimde izinli/yayımlanan istemci modülüdür.

## Sınırlamalar

- Sabit korpus başarıları bilimsel Türkçe fonem modeli, fonetik uzman doğrulaması, doğal ses sentezi veya anlaşılırlık sonucu değildir.
- Gerçek cihazda Windows/NVDA/JAWS testi, insan araştırması etik kurul/uzman kontrolü, kişisel veri koruması ve kurumsal üretim güvenliği ayrı çalışmalardır.
- Mevcut `data` klasörü yeni ZIP üzerine kopyalanmamalı; canlı öğrenci verisi kullanılmamalıdır.
