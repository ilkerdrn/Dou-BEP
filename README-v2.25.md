# DOU BEP Sınav Atölyesi v2.25 — Kalıcı Giriş Koruması ve Yerel Güvenlik Denetimi

**Kapsam:** Üniversite sınavları için anonim, yerel, BAP araştırma prototipi. v2.24'ün onaylı teslim ZIP'i, Word/PDF kaynak aktarımı, uyarlama kararları, koordinasyon, Excel listeleri ve tüm mevcut modülleri korunur. **Gerçek öğrenci veya sağlık verisi girmeyin.**

## v2.25 yenilikleri

1. **Kalıcı başarısız giriş sınırlaması:** Hatalı kullanıcı/parola girişleri SQLite'daki `auth_login_throttle` tablosunda yalnız geri çözülemez SHA-256 eşleştirme anahtarı, sayaç ve zaman damgasıyla saklanır. Her kurum-hesap ikilisi için 15 dakika içinde 5 yanlış deneme olursa 15 dakika geçici kilit uygulanır; **uygulamayı yeniden başlatmak kilidi kaldırmaz**. Hata yanıtları bilinmeyen kullanıcı için de aynıdır. Başarılı giriş throttle kaydını temizler. Eski kullanıcı/sınav/oturum tabloları silinmez. Sınırlama yalnız yerel servis için ek savunmadır; merkezi kimlik hizmeti veya ağ seviyesi saldırı koruması değildir.
2. **Salt okunur güvenlik denetleyicisi:** `npm run security:check` mevcut SQLite veritabanını **açıp değiştirmeden** yerel schema/SQLite bütünlüğünü, dosya izinlerini (POSIX; Windows ACL için uyarı), anonim hesap ve oturum sayılarını, onaylı sınav ve uyarlama SHA-256 eşleşmesini, şifreli yedek dosyası varlığını kontrol eder. E-posta, parola, öğrenci kodu ve sınav içeriği rapora yazılmaz.
3. **Açık kısıt raporu:** Çalışan SQLite için uygulama seviyesinde şifreleme, kurumsal SSO/MFA, HTTPS, KVKK ve gerçek ekran okuyucu kullanıcı testleri bitmediği için denetleyici **her durumda** `productionReady:false` verir. Şifreli yedek dosyasının varlığı güvenilir geri yükleme anlamına gelmez; `npm run backup:verify -- <dosya>` ile ayrıca doğrulama ve izole geri yükleme testi gerekir.
4. **Eski Windows SQLite temizleme düzeltmesi ve v2.24 teslim/rol/onay API'leri aynen korunur.**

## Windows yerel denetim

Node.js 22.13 veya üstü yüklü olmalı. ZIP'i **yeni bir klasöre** çıkartın. Önceki kurulumun `data` klasörünü taşımayın/silmeyin veya mevcut SQLite üzerine yazmayın. PowerShell'de proje klasöründeyken:

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run security:check
```

Yeni veri tabanı kurmak için `KURULUM-YONETICI.ps1` ve `BASLAT.bat` dosyalarını kullanın. Daha önce oluşturulan veri tabanını denetlemek isterseniz **ona dokunmadan**:

```powershell
node tools/security-readiness.mjs "C:\Users\BrokenHero\BEP-LOCAL-TEST-20261029-021022\data\institution.sqlite"
```

Güvenlik denetimi `WARN` verse bile anonim araştırma amaçlı çalışmaya devam edilebilir; `FAIL` ise önce sebebini araştırın. **Gerçek öğrenci/engellilik verisi kullanımına onay değildir.**

## Açık kalan BAP iş paketleri

- Canlı SQLite verisinin dinlenimde şifrelenmesi ve key management; bunun için gerçek veriye geçmeden önce güvenilir kriptografik yaklaşım ve çevrimdışı anahtar yönetimi seçilecek.
- Kurumsal kimlik/SSO, MFA, rol testleri, yedek kurtarma tatbikatı, veri saklama politikası, bağımsız pentest.
- Etiketli/semantik PDF ve gerçek üniversite sınavlarında Word/HTML erişilebilirlik, görme engelli katılımcılarla kabul çalışması.
- Ana sistem tamamlandıktan sonra **zorunlu dış servis kullanmayan** kurum içinde geliştirilecek çevrimdışı Türkçe sentez/ekran erişimi Ar-Ge'si.
