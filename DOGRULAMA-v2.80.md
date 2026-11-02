# DOU BEP v2.80 — Teknik doğrulama (31 Ekim 2026)

**Kapsam:** dört motorlu 48 denemelik anonim raporların koşul içi **aynı hedef sözcük** karşılaştırması. Yeni akustik motor, NVDA sürücüsü, sınav veritabanı şeması veya kurum hesabı değişmedi.

## Test ve doğrulama

- Ayrı test süreçlerinde, 140 test dosyasında **751/751 PASS**; dosyalar onarlı 14 gruba bölündü (`/mnt/data/v280-group-00.log` ... `13.log`). Tüm 140 dosyanın tek, eşzamanlı koşusu süre sınırına takıldı; bu yüzden yalnız bölünmüş çalışma sonuçları raporlanmıştır.
- `node release-check.mjs`: **331/331 PASS** (`/mnt/data/v280-release.log`).
- Hedefli fonem/rapor testleri: **24/24 PASS** (`/mnt/data/v280-targeted.log`).
- `node tools/offline-audit.mjs`: **124 statik kaynak, 0 doğrudan uzak çağrı bulgusu**; ağ çıkışının imkansızlığı kanıtı değildir.
- Tam ZIP ve yama ZIP CRC ve SHA-256 manifest doğrulaması geçti. 511 kaynak dosyasından oluşan tam ZIP ve 110 kaynak dosyasını içeren birikimli yama içerisinde `data/`, SQLite ve gizli anahtarlar yoktur.
- Tam ZIP temiz klasöre çıkarılıp izole SQLite ve geçici demo kurum hesabıyla gerçek yerel HTTP testinden geçirildi: **40/40 PASS** (giriş, oturum, anonim sınav kaydı, ses modülleri ve özel dosya 404 kontrolleri).
- Temiz ZIP üzerinde `node release-check.mjs`: **331/331 PASS**.
- İki **kurgusal/simülasyon** 48-denemelik JSON örneği üretildi; sıkı şema denetimi ve koşul-içi eşleşmiş sözcük analiziyle doğrulandı. İnsan dinleyicisi verisi değildir.

## Yeni karşılaştırma

Her ses koşulu ayrı incelenir. Aynı raporda her hedef sözcük için önceki motor ve aday motor karşılaştırılır; iki doğru / yalnız önceki doğru / yalnız aday doğru / iki yanlış biçiminde toplanır. Altı sözcük çiftine göre yönlü değişim de tabloda gösterilir. Böylece eşit toplam puanlar içindeki yönlü hatalar gizlenmez.

## Önemli sınırlar

Bu çıktılar otomatik kod testi ve kimliksiz **mühendislik provasıdır**; farklı raporlar farklı insanları göstermeyebilir. İşitme düzeyi, gerçek dinleme, akustik eşdeğerlik veya yanıtın özgünlüğü bu JSON ile doğrulanamaz. Klinik/etik kurul onayı, örneklem/güç analizi, bilimsel anlamlılık, erişilebilir sınav ve Windows/NVDA üretim onayı **verilmez**. Mevcut NVDA motorunu değiştirmeyin.

Windows güncelleme betiği gerçek Windows makinesinde henüz sınanmadı. Güncellemeden önce proje ve `data` yedeklerini alın.
