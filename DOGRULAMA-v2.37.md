# DOU BEP v2.37 — Yerel doğrulama raporu

**Kapsam:** İki HMAC nesilli denetim kanıtı, eski sınav/uyarlama/teslim koduyla uyumluluk, anonim BAP kabulü. Bunlar sertifikasyon, penetrasyon testi veya gerçek Windows çalıştırması değildir.

- Otomatik Node.js testleri: **465 / 465 başarılı**.
- Sürüm ve kaynak denetimleri: **113 / 113 başarılı**.
- Anonim BAP uçtan uca kabul senaryosu: **10 / 10 başarılı**.
- Yerel statik çevrimdışı kaynak denetimi: **67 dosyada 0 bulgu**.
- v2.37 anahtar yenileme özel senaryoları: **6 / 6 başarılı**. Eski kanıtın sabit kalması, yeni kanıtın yeni anahtarla imzalanması, yeniden kullanımın reddi, bozuk kanıt/yanlış anahtar, audit kayıt değişikliği, kapalı-başlatma ve CLI doğrulaması kapsamda.

**Açık sınırlar:** Yalnız iki nesil desteklenir. Gerçek Windows/NTFS ACL ve DPAPI, kurumsal KMS, gerçek veri şifreleme, SSO, bağımsız denetim ve PDF/UA/ekran okuyucu testleri bu ortamda doğrulanmadı.
