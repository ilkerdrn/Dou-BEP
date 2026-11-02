# DOU BEP v2.27 — Doğrulama kaydı

**Kapsam:** Yalnızca anonim yerel araştırma prototipi. Kurumsal üretim onayı, bağımsız sızma testi veya kullanıcı kabulü değildir.

- `npm test`: **412 / 412 PASS**.
- `npm run release:check`: **61 / 61 PASS**.
- `npm run offline:audit`: **64 yayınlanan statik dosyada 0 doğrudan dış ağ çağrısı bulgusu**. Dış bağlantıyı firewall ile ayrıca doğrulamak gerekir.
- MFA testleri: salt parola ile oturum verilmemesi, TOTP tek kullanımlılık, RFC 6238 SHA-1 vektörleri, 5 denemelik kilit, 5 dakikalık bilet, bir kez kullanılan 8 kurtarma kodu, anahtar kaybında fail-closed, tenant ayrımı, CSRF/Origin denetimi.
- İkinci faktör kodu, şifreleme anahtarı, kurtarma kodları ve parola audit tablosuna yazılmaz.
- Windows DPAPI başlatıcısı kaynak düzeyinde kontrol edildi; bu Linux test ortamında gerçek Windows DPAPI etkileşimi test edilmedi.
- Canlı SQLite dosyası uygulama düzeyinde şifreli değildir; kurumsal SSO, tüm roller için MFA zorunluluğu, HTTPS/KVKK ve gerçek kullanıcı erişilebilirlik testleri tamamlanmamıştır.

## Kurtarma ve dağıtım uyarısı

Mevcut `data` klasörünü yerinde değiştirmeyin. Yeni ZIP'i ayrı klasörde test edin. Kurumsal anahtar kaybında (veya Windows kullanıcı profili değişiminde) MFA oturumunun bilerek engellenmesi tasarlanmıştır; eski anahtar olmadan sessiz bypass yoktur. Prototipte gerçek öğrenci/sağlık verisi kullanmayın.
