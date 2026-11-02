# DOU BEP v2.6 — Doğrulama sonuçları (28 Ekim 2026)

- `npm test`: **240/240 başarılı** (Node.js v22.16.0).
- `npm run release:check`: **13/13 başarılı**.
- İki eşzamanlı editörün sürüm çakışması: SQLite üzerinde test edildi; **eski revizyon yeni kaydı ezemedi**.
- Kurtarma: güncel olmayan yerel kopyayı **ayrı yeni sınav** olarak saklama testi başarılı.
- Yetkisiz HTTP `/api/exams`: **401**; sunucudan otomatik kayıt modülü ve JSON içe aktarma modülü: **200**; parola betiği: **404**.
- Chromium ile anonim örnek içerik üzerinde **1360px/390px statik ekran önizlemesi** yapıldı; yatay taşma görülmedi. Bu gerçek oturumlu uçtan uca tarayıcı testi değildir.
- ZIP'in açılıp yeniden sınanması paketleme sonrasında tekrar yapılacak.

## Kalan zorunlu çalışmalar

Gerçek engelli kullanıcılarla ekran okuyucu testleri, çok kullanıcılı kurumsal sunucu/Https/SSO/MFA, KVKK süreçlerinin hukuki doğrulaması ve pedagojik uzman incelemesi **tamamlanmadı**. Gerçek öğrenci kimliği ve sağlık verisi ile kullanılmaz.
