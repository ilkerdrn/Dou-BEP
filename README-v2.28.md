# DOU BEP Sınav Atölyesi v2.28 — Kurum MFA zorunluluğu

**Sürüm türü:** Yalnızca anonim/sentetik verilerle yerel BAP araştırma prototipi. Bu bir üretim güvenliği onayı değildir.

## Bu sürüm

- Kurum yöneticisi **kendi MFA hesabını etkinleştirip tekrar giriş yaptıktan sonra** `GET/PUT /api/security/mfa/policy` ile kurum genelinde iki aşamalı girişi zorunlu kılabilir. Politika SQLite içinde kurum kimliğiyle saklanır; diğer kurumlara uygulanmaz.
- MFA kurulmamış çalışanın doğru parolayla girişine yalnız **MFA kurulum yetkisi** verilir. `/api/session` bunun için `mfaSetupRequired` döndürür; sınav, şablon, dosya, oturum listesi, yönetim ve ses erişim API'leri engellenir.
- Zorunlu politika açıldığında **önceden açık parola-oturumları** da bir sonraki istekte anında kısıtlanır. Kullanıcı MFA kurduğunda tüm mevcut oturumları iptal edilir ve iki aşamalı yeniden giriş gerekir.
- Kurum MFA zorunluyken MFA'yı kapatma reddedilir. Kullanıcı oluşturma, hesabı pasifleştirme ve kurum MFA politikasını değiştirme işlemlerinde yönetici parolası yeniden doğrulanır. Bu sürümde step-up ikinci bir TOTP istemez; yönetici MFA ile oturum açmış olmalıdır.
- Yönetim ekranına güvenlik politikası seçimi ve parola yeniden giriş alanı eklendi. MFA-only kullanıcı yalnız kurulum alanı ve güvenli çıkışı görür.
- Eski veritabanı tabloları korunur; `tenant_mfa_policy` tablosu ilk açılışta eklenir. Varsayılan politika **isteğe bağlıdır**, bu yüzden eski anonim test kurulumları kilitlenmez.

## Windows'ta çalıştırma

1. **Eski çalışan kurulumun `data` klasörünü kopyalamadan veya değiştirmeden**, ZIP'i ayrı bir dizine açın. Anonim testle başlayın.
2. Node.js 22.13+ kullanın. Windows PowerShell'de yeni klasörden `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\BASLAT-MFA.ps1` çalıştırın.
3. `http://127.0.0.1:4173/kurum` adresinde yönetici hesabıyla girin, **İki aşamalı giriş (TOTP)** bölümünden MFA'yı etkinleştirin. Kurtarma kodlarını güvenli, çevrimdışı bir yerde saklayın.
4. MFA ile tekrar giriş yapın; **Kurum genelinde MFA politikası** bölümünde zorunlu modu seçip güncel parolanızı girin.
5. Diğer test hesaplarının yalnız MFA kurulumu yapabildiğini, ardından yeniden iki aşamalı girişle sınav ekranlarına erişebildiğini kontrol edin.

> **Dikkat:** DPAPI anahtarını yeni Windows kullanıcısında yeniden üretmek, eski MFA hesaplarını açmaz. Önce şifreli yedeğinizi ve anahtar kurtarma planını doğrulayın. Gerçek öğrenci, tanı, sağlık veya kişisel bilgi kullanmayın.

## Geliştirme/denetim

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
```

**Sınırlar:** Kurum SSO/OIDC, Windows üzerinde gerçek DPAPI testleri, uygulama düzeyinde şifreli canlı SQLite, HTTPS, WCAG kullanıcı testleri ve bağımsız sızma testi henüz tamamlanmadı. MFA doğrulaması yerel çalışır fakat TOTP kodunu üreten dış cihaz uygulamasının da kurum tarafından seçilmesi gerekir; kendi kurum içi kod üreticisi bu aşamada yoktur. Ses/ekran erişim motorunun geliştirilmesi ana sınav sistemi sonrası Ar-Ge fazıdır.
