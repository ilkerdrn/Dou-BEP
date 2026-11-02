# v2.19 Doğrulama — 29 Ekim 2026

- `npm test`: **358/358 PASS** (Node.js 22.16; Node Test Runner; 4 yeni oturum testi + önceki işlevlerin testleri).
- `npm run release:check`: **24/24 PASS** (yerel kaynağa dayalı sanity denetimleri; güvenlik sertifikası değildir).
- Yeni testler: 30 dakika hareketsizlik ve 2 saat mutlak süre sonu; dördüncü oturumda en eski oturumun sonlandırılması; yalnız kendi oturumunu listeleme/iptal; farklı kurum oturumunun izole olması; CSRF/Origin/auth HTTP kontrolleri; eski oturumların migrasyonda kapanması.
- Şifreli yedek/geri yükleme testi, yeni `auth.login` denetim kaydı için dinamik kayıt sayısı ile doğrulandı.
- Güvenlik başlıkları ve kurum paneli kontrollü oturum akışı kodda mevcuttur; **gerçek tarayıcıda uçtan uca etkileşim testi yapılmadı**.
- **Yapılmayanlar:** gerçek öğrenci verisiyle test, tam NVDA/JAWS/VoiceOver ve gerçek kullanıcı erişilebilirlik testi, bağımsız sızma testi, SQLCipher/disk şifreleme, HTTPS, OIDC/MFA, kurumsal KVKK/hukuk incelemesi.
- Sunucuda localhost (`127.0.0.1`) için tasarlanmış sentetik veri pilotudur.
