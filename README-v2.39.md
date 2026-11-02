# DOU BEP Sınav Atölyesi v2.39 — Kurtarma provası ve depolama geçişi emniyeti

**Yalnız anonim/sentetik araştırma pilotu içindir; gerçek öğrenci veya engellilik verileriyle kullanmayın.** Eski sürümlerin sınav, uyarlama, onay, erişilebilir PDF, MFA ve yerel denetim modülleri korunmuştur. **Canlı SQLite uygulama seviyesinde şifreli değildir.** Bu sürüm şifreli canlı veritabanı iddiasında bulunmaz.

## Yeni işlev: kanıtlı, izole kurtarma provası

`npm run storage:drill -- <KAYNAK.sqlite>` komutu:

1. Kaynak SQLite dosyasının salt okunur bütünlük ve tablo içerik özetini hesaplar. Bu özet uygulamaya veya rapora yazılmaz.
2. Önce mevcut bağımsız HMAC audit kanıtını, ardından tutarlı SQLite anlık görüntüsündeki aynı kanıtı doğrular.
3. Özel geçici klasörde AES-256-GCM ile şifrelenmiş `.bepbak` yedeğini üretir ve doğrular.
4. Yedeği **yalnız özel geçici klasörde** yeni bir SQLite dosyasına geri yükler; eski web oturumları silinir.
5. Oturumlar hariç tüm uygulama tablolarının yapısını ve tüm satırlarını kaynakla karşılaştırır. Karşılaştırma başarısızsa işlemi engeller.
6. Kaynak üzerinde prova sırasında değişiklik olmuşsa sonuç başarısızdır. Bu nedenle gerçek sistemde planlı bakım süresi gerekecektir.
7. Başarılı ya da başarısız işlemden sonra geçici `.bepbak` ve düz SQLite dosyalarını temizler. Yalnız kimlik/öğrenci/sınav verisi içermeyen başarı raporunu konsola yazar.

**Güvenlik sınırı:** Geri yükleme sırasında **geçici klasörde kısa süreli düz SQLite verisi** oluşur. Bu durum gerçek hassas veriyle işletime uygun değildir; Windows'taki diskin şifreli olduğundan ayrıca emin olunmalı, bağımsız KVKK/etik ve güvenlik onayları alınmalıdır. Sadece test verisiyle deneyin. Bu araç kurumsal şifreleme geçişinin kendisini yapmaz ve veri şifreleme sertifikası değildir.

## Windows tek komut

Önce bağımsız kanıt dosyası ve anahtarı mevcut olmalıdır. Bunlar `.sqlite` dosyasının bulunduğu `data` klasörü dışında farklı dizinlerde saklanır; v2.36/v2.37 rehberlerinde oluşturma yöntemi açıklanmıştır.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\storage-drill-windows.ps1 `
 -Source 'D:\BEP-Test\data\institution.sqlite' `
 -AuditMode single `
 -KeyFile 'E:\BEP-Anahtar\audit.key' `
 -EvidenceFile 'F:\BEP-Kanit\checkpoint.json'
```

Bu komut parolayı gizli sorar; konsola yazdırmaz ve işlem sonrası ilgili ortam değişkenlerini temizler. Gizli parolanın işlem süresince alt işlemin ortamında bulunduğunu unutmayın. Anahtar yenileme zinciri kullanılıyorsa `-AuditMode rotation`, eski/yeni anahtar ve kanıt yollarını belirtin.

## Geliştirme testleri

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
```

## Kurumsal kullanıma geçişten önce gerekenler

- Gerçek zamanlı canlı SQLite şifrelemesi için kurumun lisans/onaylı SQLCipher (veya güvenli eşdeğer) çözümü, uygun Node sürücüsü ve anahtar yaşam döngüsü tasarlanmalı; **mevcut dosyayı üzerine yazarak şifrelemeye başlamayın.**
- Kaynak dosya, `-wal` ve `-shm`, otomatik yedekler, işletim sistemi geçici klasörü, swap ve hata günlükleri için hassas veri sızıntısı analizi yapılmalı.
- Ayrı diskte şifreli güvenilir yedek, güvenli ve onaylı anahtar saklama, düzenli kanıt mührü, rollback ve gerçek geri dönüş provaları şarttır.
- Kurumsal SSO/OIDC, HTTPS, KVKK ve etik kurul, görme engelli katılımcılarla ekran okuyucu testleri, PDF/UA denetimi ve bağımsız sızma testleri henüz tamamlanmadı.
- Kendi çevrimdışı Türkçe ses motoru ile ekran erişim teknolojisi ana sınav uygulamasının kabul kapıları sonrasında ayrı BAP Ar-Ge iş paketi olarak tasarlanacak.
