# DOU BEP v2.26 — Yerel doğrulama özeti

- Tarih: 29.10.2026.
- `npm test`: **407 / 407 PASS** (yerel Linux, Node v22.16.0).
- `npm run release:check`: **54 / 54 PASS**.
- `npm run offline:audit`: **64 yayınlanan arayüz dosyası**, statik doğrudan harici kaynak bulgusu **0**. Bu, tüm ağ erişimlerinin imkânsız olduğunu kanıtlamaz.
- Koruma kapısı: simüle edilen Windows BitLocker durumlarında açık/tam şifreli ise kabul, kapalı/kısmi/belirsiz ise reddetme; zorunlu disk korumasında Linux test başlatıcısı SQLite dosyası oluşturulmadan duruyor.
- Yedek parola yenileme: kaynak yedek sabit kalıyor, yeni ve farklı parola ile AES-256-GCM yedeği açılabiliyor; hatalı parola/aynı parola/hedef çakışması güvenle reddediliyor; yeni yedekten yeni SQLite hedefine geri yükleme test edildi.
- Gizli Windows PowerShell parola girişi aracı kaynak olarak incelendi ancak gerçek Windows ortamında çalıştırılmadı; kullanıcı/kurum tarafından ayrıca denenmeli.
- **Sınırlar:** Gerçek Windows BitLocker sürücüsü, çeşitli Windows sürümleri, gerçek kullanıcıya yönelik tarayıcı etkileşimi, uygulama seviyesinde SQLite şifreleme, erişilebilir PDF, kurum MFA/SSO, KVKK ve bağımsız sızma testi doğrulanmadı. Üretime hazır değildir. Gerçek öğrenci veya engellilik verisi kullanılmamalıdır.
