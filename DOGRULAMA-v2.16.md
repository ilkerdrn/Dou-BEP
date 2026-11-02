# v2.16 Doğrulama — 29 Ekim 2026

- Node.js 22.16 ile `npm test`: **339/339 PASS**. Önceki 328 test ve dönemli Excel/koordinasyon testleri dahil.
- `npm run release:check`: **13/13 PASS**. Bunlar sınırlı yerel kod/dağıtım kontrolleridir, gerçek sızma testi değildir.
- Örnek `.xlsx` (artifact_tool ile oluşturulmuş) test sırasında gerçek ZIP + `deflate-raw` yolu üzerinden açıldı; 4 anonim satır doğru okundu.
- Formüllü Excel, dış bağlantı, yabancı başlık, hatalı dosya ve onaysız koordinasyon eşleştirmelerinin reddedilmesi otomatik test edildi.
- Üç ayrı dersten üç sentetik sınav kâğıdı üreten 9 dosyalık test ZIP'i oluşturuldu, ZIP CRC kontrolü başarılı.
- Önceki dönem içermeyen tek/çok dersli CSV akışlarının geriye dönük testi başarılı.
- **YAPILMADI:** gerçek tarayıcıda kullanıcı formu uçtan uca testi; ekran okuyucu, görsel erişilebilirlik, uzman/pedagoji değerlendirmesi, kurumsal entegrasyon, KVKK incelemesi, sızma testi veya gerçek öğrenci pilotu.
- **UYARI:** Gerçek öğrenci kimliği, sağlık veya engellilik bilgileri bu prototipe yüklenemez. Dönemli kaynak sınav uyumluluğu tarayıcı/yerel prototip düzeyindedir; üretim kullanımına geçmeden önce sunucu tarafında güvenli toplu üretim gerekir.
