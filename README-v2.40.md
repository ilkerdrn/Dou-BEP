# DOU BEP Sınav Atölyesi v2.40 — SQLite depolama güvenliği ön denetimi

**Yalnız anonim/sentetik, yerel BAP araştırma prototipi. Gerçek öğrencilerin kimlik, sağlık veya engellilik bilgilerini bu sürümde kullanmayın.** Önceki sınav hazırlama, bireysel uyarlama, öğretmen–koordinatör kabulü, çevrimdışı PDF, MFA, şifreli yedek ve kurtarma provası korunmuştur.

## Yeni: ana SQLite ve yan dosyalar için salt okunur güvenlik kontrolü

`npm.cmd run storage:preflight -- "D:\BEP-TEST\data\institution.sqlite"` (PowerShell) veya `npm run storage:preflight -- /tmp/bep/data/institution.sqlite --json` (Unix) çalıştırın.

Denetim **veritabanını açmaz veya değiştirmez**. Dosya/kullanıcı izinleri, dizin ve olası sembolik bağlantıları; ana `.sqlite`, `-wal`, `-shm`, `-journal` dosyalarını; Windows BitLocker doğrulaması mümkünse ana ve geçici çalışma hacimlerini ayrı kontrol eder. Rapor öğrenci, kurum, e-posta, soru, gizli anahtar veya tablo verisi içermez. Eksik/şüpheli dosya `FAIL`, Windows ACL gibi otomatik doğrulanamayan koruma `WARN` olarak bildirilir. Doğrulanan disk şifrelemesi **SQLite uygulama düzeyi şifrelemesi değildir**.

`npm.cmd run security:check` mevcut tüm güvenlik kontrolüne SQLite yan dosyası ve geçici hacim kontrollerini de ekler.

### İsteğe bağlı katı başlatma kuralı (POSIX/Linux geliştirme ortamı)

Linux ortamında `BEP_REQUIRE_PRIVATE_SQLITE_FILES=1` ile sunucu **veritabanını açmadan önce** ana ve yan dosya yollarındaki sembolik bağlantıları reddeder; var olan `data` dizini ve dosyalarında grup/diğer kullanıcı izinleri varsa hata verir. Eski kurulumlarda **varsayılan olarak kapalıdır**. Yeni veritabanı henüz yoksa normal açılışın `0700` dizin ve `0600` dosya oluşturması beklenir.

**Windows sınırı:** Bu katı POSIX odaklı mod, NTFS ACL ve kalıtılmış izinleri kendi başına güvenilir doğrulayamadığından Windows'ta **güvenli şekilde durur (fail-closed)**. Windows'ta yanlışlıkla bu bayrağı açıp uygulamanın durmasına yol açmayın. Gerçek Windows sistemi için `BEP_REQUIRE_PROTECTED_VOLUME=1` BitLocker hacim kontrolünü ayrı uygulayabilir; ancak bu, NTFS ACL, KMS veya uygulama düzeyi şifreleme yerine geçmez. Windows üzerindeki son doğrulama gerçek kurum cihazında BT ekibince ayrıca yapılmalıdır.

### Güvenli geçiş sırası

1. Mevcut çalışan `data` klasörünü **yerinde değiştirmeden** önce şifreli yedek ve bağımsız HMAC kanıtını üretin, doğrulayın.
2. Anonim/kopya bir SQLite ile `storage:preflight`, `storage:drill`, `security:check` komutlarını çalıştırın.
3. WAL/SHM/journal ve işletim sistemi geçici klasörü dahil tüm düz veri yüzeyleri için izin ve koruma değerlendirmesi yapın.
4. Kurumun onayladığı SQLCipher/eşdeğeri sürücü + anahtar yaşam döngüsü tasarımından **sonra** yeni bir şifreli veritabanına kontrollü aktarım ve geri dönüş planı test edin.
5. Gerçek kullanıcıyla erişilebilirlik, PDF/UA, SSO, etik/KVKK ve bağımsız güvenlik denetimleri tamamlanmadan üretime geçmeyin.

**Bu sürüm canlı SQLite'ı şifrelemez, SQLCipher geçişini gerçekleştirmez, kurumsal güvenlik sertifikası değildir.**

## Yerel doğrulama

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
npm.cmd run storage:preflight -- "D:\BEP-TEST\data\institution.sqlite"
```

BAP'ın sonraki iş paketi, kurumsal olarak seçilen şifreli canlı veri saklama sürücüsü ve KMS entegrasyonunun ayrık sentetik testidir. Kendi çevrimdışı Türkçe ses/ekran erişim motoru ana uygulamanın kurumsal ve erişilebilirlik kabul kapılarından sonra ayrı Ar-Ge modülüdür.
