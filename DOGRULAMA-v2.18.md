# v2.18 doğrulama kaydı

Çalışma ortamı: Node.js 24, yerel SQLite, Node HTTP ve Node Test Runner.

- `npm test`: **354/354 PASS** — Node Test Runner; sunucu dosya üretimi ve paket doğrulama testleri dahil.
- `npm run release:check`: **19/19 PASS** — yerel dağıtım ve kontrol betiği (sızma testi değildir).
- Sunucu tarafında iki farklı ders + aynı anonim aday, bağımsız karar onayı, farklı kurum izolasyonu, revize sınav, geri çekilen karar, rol/CSRF/Origin, ZIP manifest/hash ve offline dosya bütünlüğü denemeleri otomatik testlidir.
- Gerçek Chromium uçtan uca testi, gerçek öğrenci/kullanıcı testi, kurumsal sızma testi ve gerçek erişilebilirlik doğrulaması **yapılmadı**.
- Dosya manifesti, baştan sona kriptografik imza / düzenleyici uygunluk belgesi değildir.
- Gerçek öğrenci verisi bu yerel örnek uygulamaya girilmemelidir.
