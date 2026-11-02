# DOU BEP v2.33 — Doğrulama Kapsamı

**Tarih:** 29 Ekim 2026. **İş türü:** Yerel anonim prototip doğrulaması; üretim kabulü değildir.

- `npm test`: **444/444 başarılı** (yerel Node.js 22).
- `npm run release:check`: **92/92 başarılı**; kaynak kontrolleridir, penetrasyon testi değildir.
- `npm run offline:audit`: **64 yayımlanmış arayüz dosyası / 0 doğrudan dış çağrı bulgusu**; işletim sistemi seviyesinde ağ izolasyonunu kanıtlamaz.
- `npm run acceptance:pilot`: **10/10 başarılı**, geçici, anonim veritabanı; gerçek öğrenci sürecini doğrulamaz.
- `server-foundation/pdf-reviewed-alternatives*.test.mjs`: kaynak metin + erişilebilir açıklama zorunluluğu, hatalı beyan reddi, yetkisiz/CSRF erişiminin engellenmesi, onay bütünlüğü.
- Örnek üniversite PDF'si: PDF1.7/Tagged, 3 sayfa; `pdftotext -layout`, `pdfinfo` ve sayfa görüntüsü kontrol edildi. PDF/UA veya ekran okuyucu uygunluğu çıkarılamaz.

**Başka sistemde doğrulanması gerekenler:** Windows PowerShell + DPAPI, NVDA/JAWS, Word ve farklı PDF görüntüleyicileri, öğretim elemanı değerlendirmesi, kurumsal kimlik/rol/kayıt güvenliği, KVKK ve uzman PDF/UA kontrolü.
