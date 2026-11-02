# DOU BEP v2.53 — Yerel doğrulama raporu (29 Ekim 2026)

**Anonim/sentetik yerel araştırma prototipidir.** Kurumsal devreye alma, WCAG/PDF-UA sertifikasyonu veya gerçek öğrenci verisiyle çalışma onayı değildir.

## Kaynak ve davranış kontrolleri

- `npm test`: **568/568 PASS**, 7 yeni v2.53 eşzamanlı sınav seçimi ve eski yanıt regresyon testi dâhil.
- `npm run release:check`: **205/205 PASS**, 5 yeni statik koruma denetimi dâhil.
- `npm run offline:audit`: **87 yayımlanan arayüz dosyası, 0 doğrudan harici kaynak bulgusu**. Statik tarama; gerçek ağ engelleme testi değildir.
- `npm run acceptance:pilot`: **10/10 PASS**; yalnız sentetik kurum sınavları; `productionReady=false`.
- Veritabanı şeması veya migre edilmiş veriye müdahale yok; eski kayıtlar, eski ZIP ve deneysel ses modülleri korunur.

## Temiz ZIP kurulum kontrolü

- ZIP dosyası ayrı geçici klasöre çıkarıldı ve `BEP_DB_PATH` ile ayrı geçici SQLite kullanıldı. Sunucu yalnız `127.0.0.1` üzerinde çalıştırıldı.
- **13/13 yayımlanan HTTP adresi 200** (yeni `/exam-selection.mjs` dâhil), **8/8 özel yol 404**, yetkisiz `/api/audit` isteği **401**, `/api/health` sürümü **2.53.0**.
- ZIP CRC ve yol güvenliği kontrol edildi. `data`, SQLite, WAL, gizli anahtarlar, üretilen test raporları ve kişisel kayıtlar pakete alınmadı.

## Açık kalanlar

- Gerçek Windows UI Automation ve NVDA/JAWS ile klavye/odak sınaması yok.
- DOU Reader'ın tam bir ekran okuyucusu olması, doğal Türkçe TTS anlaşılabilirliği, etik/alan uzmanı değerlendirmesi henüz doğrulanmadı.
- Üretim canlı veritabanı şifreleme, kurum SSO/HTTPS, PDF/UA, KVKK ve gerçek kullanıcı kabul testleri henüz tamamlanmadı.
- Yerel istemci eski HTTP yanıtını yok sayar; sunucuda başlamış isteği geri almaz veya durdurmaz.

**Gerçek öğrenci adı, tanı, engel/sağlık veya özel sınav kaydı kullanılmamalıdır.**
