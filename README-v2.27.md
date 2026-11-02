# DOU BEP Sınav Atölyesi v2.27 — Çevrimdışı MFA (anonim pilot)

## Amaç ve kapsam

v2.26 üstüne yerel, tamamen çevrimdışı **RFC 6238 TOTP MFA** eklendi. Parola doğrulansa bile MFA etkin hesapta oturum çerezi verilmez; ikinci adım kısa süreli doğrulama bileti gerektirir. MFA tüm roller için isteğe bağlıdır, kurumsal zorunluluk politikası / SSO değildir. Haricî servis, CDN, SMS veya bulut API gerektirmez. İkinci faktörün gerçekten bağımsız olması için kod üreten ayrı cihaz gereklidir; doğrulayıcı cihaz uygulamasının kendisi bu sürümde geliştirilmemiştir.

## Windows'ta MFA'lı başlatma

1. Node.js 22.13 veya üzerini kurun. ZIP'i **ayrı bir klasöre** çıkarın, çalışan v2.26 kurulumunun `data` klasörünün üzerine yazmayın.
2. PowerShell'de proje klasörüne girip `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\BASLAT-MFA.ps1` çalıştırın. Windows CurrentUser DPAPI korumalı anahtar `%LOCALAPPDATA%\DOU-BEP-LOCAL\mfa-key.dpapi` altında **ayrı** tutulur.
3. `/kurum` paneline giriş yapın. **İki aşamalı giriş** kartından mevcut parolanızı girerek kurulum sırrını bir kez alın; ayrı bir cihazın çevrimdışı TOTP doğrulayıcısına **elle** ekleyin. 6 haneli kodla onaylayın. Oturumlar iptal edilir.
4. Bir kez gösterilen **8 kurtarma kodunu ayrı ve güvenli yerde saklayın**. Sonraki girişte parola ardından TOTP kodu veya tek kullanımlık kurtarma kodu gerekir.
5. Daha sonra **BASLAT-MFA.ps1** ile açmayı sürdürün. `BASLAT.bat` normal pilot başlatıcısıdır, MFA key vermediği için MFA etkin hesaba giriş **güvenlik amacıyla kapalı kalır**.

ÖNEMLİ: DPAPI anahtar dosyasını kaybetmek veya Windows kullanıcısını değiştirmek MFA hesaplarında erişim kaybına yol açar. Anahtarın kurumun onaylı, şifreli kurtarma planına dahil edilmesi gereklidir. Betik anahtar dosyası kayıpsa aktif MFA hesabı olduğunu tespit ettiğinde *yeni anahtar üretmeyi reddeder*. Anahtar kullanıcıya veya uygulama arayüzüne asla gösterilmez. Python, API anahtarı ve harici bulut gerekli değildir. Windows dışı sistemlerde `BEP_MFA_KEY` ortam değişkenine 64 hex veya 32 bayt base64 anahtar verin; üretim ortamına yönelik anahtar yönetimi ayrı bir çalışmadır.

## Güvenlik davranışı

- 6 haneli TOTP SHA-1, 30 saniyelik periyot, ±1 periyot saat kayması. Kabul edilen zaman sayacı bir daha kullanılamaz.
- MFA kurulumu güncel parola ister; onay 10 dakika içinde yapılmalı ve tüm hesap oturumlarını sonlandırır.
- Giriş bileti 5 dakika geçerli; ilk aşama çerez üretmez. Üye/kod/hata/tenant olayları denetim kaydında içerik olarak yazılmaz.
- 5 yanlış MFA denemesinde 15 dakika hesap bazlı geçici kilit; SQLite içinde kalıcıdır. Kurtarma kodu SHA-256 özeti saklanır; başarılı kullanımda silinir.
- MFA sırrı AES-256-GCM ile üye kimliği AAD kullanılarak şifrelenir; `BEP_MFA_KEY` mevcut değilse MFA girişine geçit verilmez. Yanlış anahtarda oturum yeniden kullanımı engellenir.
- MFA güvenliği için HTTPS, gerçek ayrı faktör cihazı, zorunlu MFA politikası ve kurumsal denetimler ayrıca gereklidir. 

## Kısıtlar

**Sistem henüz gerçek öğrenci/engellilik verilerine uygun değil.** MFA, kurumsal SSO yerine geçmez. Canlı SQLite dosyası uygulama düzeyinde şifreli değildir. Windows üzerinde DPAPI ve BitLocker OS destekleridir; kendi kriptografik algoritmamızı icat etmiyoruz. Ağ dışına çıkmayan yapıyı koruyoruz. Gerçek Windows son kullanıcı ve bağımsız erişilebilirlik/sızma testleri henüz tamamlanmadı. Testler anonim verilerle çalışır.

## Test

`npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`.
