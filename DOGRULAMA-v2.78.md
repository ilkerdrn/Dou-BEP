# DOU BEP v2.78 — Teknik doğrulama raporu

**Kapsam:** DOU Reader yerel dört motorlu 48 deneme raporu analizinde, koşullara göre gruplama, betimsel rapor aralığı, yanıt deseni eşleşme uyarısı ve UI. Sınav motoru, SQLite şeması, NVDA sürücüsü veya akustik üretim değiştirilmedi.

## Gerçekleştirilen kontroller

- `npm test` — **740/740 geçti**, sıfır başarısız (son tam koşu).
- `node release-check.mjs` — **325/325 geçti** (temiz ZIP açılımında yeniden).
- Yeni odaklı rapor modülü testleri — **15/15 geçti** (7 eski + 8 yeni); sürüm arşiv regresyonu 6/6 geçti.
- Tam ZIP'i ayrı dizine çıkartıp izole SQLite ile HTTP smoke: **38/38 kontrol geçti**. Geçici kurum yöneticisi girişi, oturum, boş sınav listesi, anonim deneme sınavı kaydı, Reader/kaynak sunumu, özel kaynakların 404 engeli doğrulandı.
- ZIP CRC bütünlük kontrolü tamamlandı. Tam ZIP ve yama SHA-256 değerleri paket oluşturmada hesaplandı; manifestteki 103 yama dosyasının SHA-256 karşılaştırması tamamlandı.
- Yamadan ve tam ZIP'ten `data/`, SQLite veritabanları, PEM/özel anahtar ve çevresel sırlar hariç tutuldu.

## Analiz sınırlamaları

Raporlar 48 hedef sözcüğün per-motor doğru/yanlış özetini taşır, fakat gerçek deneme sıralaması, ses dinlendiğinin kanıtı, özgünlüğün kriptografik ispatı veya bağımsız katılımcı kimliği yoktur. Aynı doğru/yanlış deseni, farklı kişilerde doğal olarak ortaya çıkabilir; eşleşme **aynı kişi kanıtı değildir**. Ses/sıra metadata alanı eksik veya birbirinden farklıysa havuzlanmış motor farkı karşılaştırma kanıtı sayılmaz. Koşul metadata bilgisi aynı olsa bile akustik eşdeğerlik, bağıl ses yüksekliği, dinleyici bağımsızlığı ve insan anlaşılabilirliği doğrulanmaz. Bilimsel WER/CER, istatistiksel anlamlılık, klinik validasyon, erişilebilir sınav veya Windows NVDA üretim onayı **verilmemiştir**.

## Yerel kurulum / veri güvenliği

Tam projenin temiz klasördeki testinde **yalnız geçici SQLite** kullanılmıştır. Windows `GUNCELLE.bat` işleminin kullanıcının bilgisayarında uygulanması test edilmedi. Mevcut sistemi kapatıp projeyi ve `data/` dizinini ayrıca yedekleyin. `GUNCELLE.ps1` kod dosyalarını doğrulayıp yedeklemeyi amaçlar; canlı kurulum verisine dokunmadan geçmesi ayrıca yerinde kontrol edilmeli.
