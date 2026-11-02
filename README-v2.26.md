# DOU BEP Sınav Atölyesi v2.26 — Çevrimdışı disk koruması ve şifreli yedek anahtar yenileme

**Durum:** Anonim/sentetik öğrenci kodlarıyla yerel araştırma prototipi. **Gerçek öğrencilerin kimlik, tanı, sağlık ve resmî uyarlama kayıtlarını girmeyin.** Bu sürüm üretim onayı, KVKK uygunluğu, bağımsız güvenlik testi, MFA veya genel ekran okuyucu uyumluluğu sağlamaz.

## 1. Korunan mevcut işlevler

v2.25'teki sınav editörü, dönem/ders koordinasyonu, iki aşamalı sınav ve düzenleme kararı onayı, Word/PDF kaynak aktarımı, Word/HTML sınav teslim paketleri, ZIP doğrulama, anonim pilot ve güvenli yedekleme korunmuştur. Dosya biçimleri/veritabanı şeması üzerinde yıkıcı dönüşüm yapılmamıştır. Windows üzerindeki mevcut `data` klasörünü **asla yeni sürüm ZIP'iyle üzerine yazmayın**; ayrı test klasörü kullanın.

## 2. Yeni: BitLocker disk koruma kapısı (Windows)

Çalışan SQLite veritabanının **uygulama tarafından sütun düzeyinde şifrelenmediği** özellikle belirtilir. Kurumun Windows sunucusunda BitLocker ile korunan bir disk kullanmak, veritabanı ve SQLite WAL yan dosyaları **disk kapalıyken / kilitliyken** korumaya yardımcı olabilir. Bu, oturum açmış kötü niyetli yerel kullanıcılara, zararlı yazılıma veya yönetici erişimine karşı veritabanı şifrelemesi değildir.

Önce PowerShell'de `npm.cmd run storage:check` çalıştırın. Bu denetim Windows'ta `Get-BitLockerVolume` ile veritabanı sürücüsünün *ProtectionStatus = On, VolumeStatus = FullyEncrypted, EncryptionPercentage = 100* değerlerini arar. İzin yoksa, araç eksikse veya sonuç belirsizse **başarısız sayar**. Hiçbir kurtarma anahtarını ya da parola bilgisini istemez, yazmaz veya göndermez.

Disk kontrolünü zorunlu kılmak için sunucuyu başlatmadan önce aynı PowerShell oturumunda:

```powershell
$env:BEP_REQUIRE_PROTECTED_VOLUME = '1'
node .\server.mjs
```

BitLocker doğrulanmazsa `BEP_STORAGE_BLOCKED` hatasıyla **veritabanı açılmadan** durur. Anonim yerel testler için bu mod varsayılan olarak kapalıdır; mevcut Windows prototipinin çalışmasını engellemez. Windows Home veya BitLocker modülü olmayan sistemlerde denetim geçmeyebilir. Bu koruma `data` klasörüne sahip kullanıcı izinleri, HTTPS, MFA ve bağımsız değerlendirmelerin yerine geçmez. Linux için bu özel kontrol desteklenmez ve zorunlu mod **kapalıya düşmez**: başlatma reddedilir.

**Kurum kurulumunda** yetkili BT ekibi ayrıca BitLocker kurtarma anahtarlarının güvenli saklanmasını, Windows erişim izinlerini, şifreli ayrı yedek hedefini, SQL/WAL dosyalarının gerçekten korunan sürücüde yer aldığını ve yedekten geri dönüş planını değerlendirmelidir. Bu prototip BitLocker'ı kendisi açmaz veya kurtarma anahtarlarını yönetmez.

## 3. Yeni: şifreli yedek parolasını değiştirme

Var olan AES-256-GCM + scrypt `.bepbak` yedek dosyasının parolasını, **eskisini silmeden veya üzerine yazmadan** farklı bir parola ile yeni `.bepbak` dosyasına çevirebilirsiniz. İşlem kaynak yedeğin özgünlüğünü ve veritabanı bütünlüğünü önce doğrular; AES-GCM çözme → yeniden şifreleme işlemi akış içinde yapılır. Yeni dosya ayrı bir bütünlük kontrolünden geçmeden yayımlanmaz.

Windows PowerShell'de şifreleri ekranda göstermeyen yerel yardımcı betiği kullanın:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\backup-rotate-windows.ps1 -Source '.\data\backups-local\eski.bepbak' -Destination '.\data\backups-local\yeni.bepbak'
```

Betik eski ve yeni parolayı `Read-Host -AsSecureString` ile **gizli giriş** olarak alır. Yalnızca yerel `node.exe` işlemi sırasında geçici ortam değişkenlerine aktarır; işlem sonunda değişkenleri ve geçici BSTR değerlerini temizler. Ortam değişkenleri Node işleminin belleğinde kısa süreli düz metin bulunacağından bu yine tam bir donanım anahtar kasası değildir. Grafik ekran veya dış sunucu bağlantısı gerektirmez. Alternatif otomasyon için `BEP_BACKUP_PASSPHRASE` ve `BEP_BACKUP_NEW_PASSPHRASE` değişkenleri doğrudan ayarlanabilir, ancak parolaları CLI argümanında, betik dosyasında veya terminal geçmişinde saklamayın.

Komut başarıyla bitince **eski yedek yerinde kalır**; onun parolası da çalışmaya devam eder. `yeni.bepbak` zaten varsa üzerine yazılmaz. Yanlış eski parola, aynı yeni parola veya bozuk dosyada hiçbir yeni yedek yayımlanmaz. Yeni yedeği ayrıca `backup:verify` ve **yeni bir hedefe** `backup:restore` ile deneyin. Geri yükleme canlı veritabanının üzerine yazmaz ve eski oturumları canlandırmaz. Diskte güvenli silme garantisi verilmez; şifreli depolama kullanın.

## 4. Kontroller

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run security:check
npm.cmd run storage:check
```

`security:check` veritabanını salt okunur inceler; gerçek kullanıcı isimleri, öğrenci kodları veya soru içeriklerini yazmaz. `storage:check` desteklenmeyen sistemde ya da korumasız sürücüde sıfır olmayan çıkış kodu verir. Testler anonimdir; hiçbir dış bulut API'sine ihtiyaç yoktur.

## 5. Sınırlar ve BAP kabul kapıları

Bu sürüm canlı SQLite veri tabanını uygulama seviyesinde şifrelemez. Yedek doğrulama işlemleri geçmiş sürümlerde olduğu gibi kısıtlı geçici klasörde kısa süreli düz metin SQLite oluşturabilir; korunmuş bir disk ve izinler olmadan gerçek öğrenci verisi kullanılamaz. Kurumsal MFA/SSO, dinlenimde veritabanı şifreleme tasarımı, veri saklama/imha, erişilebilir etiketli PDF, bağımsız sızma testi, ekran okuyucu ve gerçek kullanıcı çalışmaları tamamlanmadan kurumsal üretim onayı verilmemelidir.

**Sonraki Ar-Ge aşaması:** ana sınav sisteminin güvenliği ve erişilebilirliği doğrulandıktan sonra hiçbir bulut API'sine bağımlı olmayan kurum içi Türkçe ses/screen-reader motoru. v2.26 bu motoru içermez.
