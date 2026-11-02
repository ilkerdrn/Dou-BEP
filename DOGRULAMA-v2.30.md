# DOU BEP v2.30 - Yerel doğrulama raporu (29.10.2026)

**Kapsam:** Yalnız anonim/sentetik yerel pilot; gerçek öğrenci ve hassas engellilik kayıtları kullanılmamıştır.

- `npm test`: **428/428 başarılı** (eski modüllerin regresyon testleri dahil).
- `npm run release:check`: **79/79 kontrol başarılı**.
- `npm run offline:audit`: yayımlanan **64 arayüz dosyası**, **0 doğrudan haricî kaynak bulgusu**. Bu, ağ çıkışının her koşulda engellendiğini kanıtlamaz.
- `npm run acceptance:pilot`: geçici, bağımsız SQLite ile **10/10 sentetik uçtan uca kontrol başarılı**. Mevcut `data`, `BEP_DB_PATH`, hesaplar veya gerçek öğrenci dosyaları kullanılmadı.
- `node --test tools/pdf-preflight.test.mjs`: **3/3 başarılı**; PDF içeriğini rapora sızdırmama, yapısal etiket sahteciliğine karşı basit kontrol, eksik ve etiketsiz PDF'yi başarılı göstermeme.
- `npm run pdf:preflight -- ORNEK-ANONIM-KAYNAK-SINAV-v2.20.pdf`: örnek PDF'de etiket ağacı, `Marked=true` ve Türkçe katalog dilinin mevcut olduğu **doğrulanamadı**; PDF/UA uyumlu olduğu iddia edilmiyor.

## Tamamlanmamış kabul kapıları

Windows BitLocker/DPAPI cihaz testi, kurumsal SSO/HTTPS, uygulama katmanında canlı veritabanı şifrelemesi, bağımsız sızma testi, etiketli PDF üretimi ve PDF/UA bağımsız doğrulaması, NVDA/JAWS/VoiceOver ile gerçek kullanıcı testi, KVKK/etik, pedagojik eşdeğerlik denetimleri tamamlanmamıştır. `productionReady=false` ve `pdfUaVerified=false` kasıtlıdır.

Mevcut `data` dizini üzerine yazılmadan yeni sürüm **ayrı bir klasöre** çıkarılmalıdır. Önce şifreli yedek alınmalı, geri yükleme ayrı test ortamında doğrulanmalıdır.
