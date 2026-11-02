# DOU BEP v2.34 — Yerel doğrulama notları

- Tam otomatik regresyon: **450 / 450 PASS** (`npm test`, Node.js 22.16; 2026-10-29).
- Kaynak/sürüm ve dağıtım korumaları: **98 / 98 PASS** (`npm run release:check`).
- Anonim BAP kabul senaryosu: **10 / 10 PASS** (`npm run acceptance:pilot`); ayrı geçici SQLite, gerçek öğrenci verisi yok.
- Statik çevrimdışı denetim: **67 yayımlanmış tarayıcı dosyası**, doğrudan uzak kaynak kullanımı **0 bulgu**. Bu ağ çıkışını gerçekten kısıtladığını kanıtlamaz.
- Yeni v2.34 testler: **6/6** hedefli modül ve HTTP testleri; revizyon eşleştirme, iki ayrı yetkili, tenant izolasyonu, CSRF, rol ayrımı, imzası bozulan onay, eski kabulün geçersizleşmesi, SQLite yeniden açılış.
- Denetlenen tasarım: öğretmen yalnız sınav sahibi olarak ilk beyanı verir; koordinatör/yönetici yalnız farklı hesapla ikinci beyanı verir. Beyanlar onaylı soru içeriğinin SHA-256 özeti ve sürümüyle bağlıdır. Sunucu kayıtları yalnız kişi hesap kimliği, tarih ve doğrulama bayrakları içerir.
- **Gerçek ekran okuyucu veya erişilebilirlik kullanıcı testi yapılmadı.** PDF/UA, WCAG, kurumsal onay, KVKK/etik ve bağımsız sızma testi sonuçları değildir.
- Çalışan kullanıcının Windows ortamı, gerçek MFA/DPAPI cihaz testi, gerçek veritabanı geçişi, üretim yük testi ve tam çevrimdışı ağ denemesi bu konteyner testlerinin dışında kalır.
