# DOU BEP v2.81 — Sınav atölyesi kapanış doğrulaması (31 Ekim 2026)

## Yeni geliştirmeler
- Tarayıcıdaki onaylı ZIP ve PDF dosyaları indirilmeden önce **gerçek SHA-256**, `Content-Length`, MIME ve dosya içerik imzası karşılaştırılıyor. Eksik veya beklenmedik dosya kullanıcıya kaydedilmiyor.
- `npm run exam:closure`: geçici SQLite'da iki kurumlu, anonim, **25/25** gerçek HTTP kapanış kontrolü: giriş, oturum, sınav oluşturma/düzenleme, eski revizyon reddi, CSRF, tenant izolasyonu, onay, Word/HTML, PDF pilotu, teslim ZIP, özel kaynakların engellenmesi.
- Yalnız temp dizininde test hesabı oluşturur; mevcut `data/`, gerçek öğrenci veya üniversite hesapları kullanılmaz.

## Testler
- **141 test dosyasında 755/755 PASS**; 15 küçük grupta çalıştırıldı (`/mnt/data/v281-group-00.log` ... `14.log`).
- **335/335** kaynak/dağıtım kuralı PASS (`/mnt/data/v281-release.log`).
- Yeni indirilen dosya doğrulama, teslim ve PDF testleri **27/27 PASS** (`/mnt/data/v281-targeted.log`).
- Gerçek, izole yerel API sınav kapanışında **25/25 PASS** (`npm run exam:closure`).
- **125 yayımlanan dosyada 0 doğrudan dış kaynak çağrısı bulgusu**. Bu, OS seviyesinde ağ yasağının kanıtı değildir.
- Anonim PDF çıktı: PDF v1.7, 3 A4 sayfa; yerel font ve Türkçe karakterlerle görüntüleri render edilip ilk sayfalar kontrol edildi; `pdfUaVerified=false` ve manuel uzman incelemesi gerekli. İlgili demo PDF gerçek öğrenci verisi içermez.

## Üretim/kabul sınırları
Otomatik testler kurumsal üretime, kişisel öğrenci verisine, etik kurul/yasal uyuma, PDF/UA'ya, anlaşılır doğal Türkçe ses sentezine veya NVDA Windows uyumluluğuna onay değildir. Gerçek Windows tarayıcı klavye/ekran okuyucu testi, kurum kullanım pilotu ve erişilebilirlik uzmanının manuel çıktı incelemesi **bekliyor**. Güncelleme PowerShell betiği gerçek hedef Windows cihazında henüz denenmedi; kurulumdan önce proje ve `data` yedeği alınmalıdır.
