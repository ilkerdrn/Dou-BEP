# DOU BEP Sınav Atölyesi v2.8 — doğrulama özeti

**Tarih:** 28 Ekim 2026. **Çalışma ortamı:** Node.js v22.16.0 / npm 10.9.2, Linux'ta yerel test.

- `npm test`: **260/260 PASS** (önceki 253 + yeni sınav kopyalama ve Windows sürüm kontrol testleri).
- `npm run release:check`: **13/13 PASS**. Yerel uygulama yapılandırması/otomatik güvenlik kuralları; **sızma testi değildir**.
- Yeni kopyalama: onaylı özgün kayıt değişmez; kopya taslak olur, eski onay kaydı ve öğretmen eşdeğerlik işaretleri taşınmaz.
- Yetkisiz erişim, kurum ayrımı, CSRF, kaynak revizyonu ve 200 sınav kurum kotası sunucu testleri: **PASS**.
- Windows port sürüm sınıflandırması otomatik Node testi: **PASS**. Gerçek Windows makinesinde BAT/PowerShell testi **YAPILMADI**.
- Arama ve filtre arayüzü için statik DOM işaretlemeleri kontrol edildi; gerçek tarayıcı/klavye/ekran okuyucu ile v2.8 uçtan uca test **YAPILMADI**.
- NVDA, JAWS, VoiceOver, TalkBack; özel eğitim uzmanı ölçme eşdeğerliği; gerçek çocuk/kullanıcı pilotu; HTTPS/SSO/MFA; bağımsız sızma testi/KVKK incelemesi: **YAPILMADI**.

Bu sürüm, gerçek öğrenci kimlik/tanı/sağlık/ses verileri için uygunluğu kanıtlanmamış **yalnızca anonim, yerel pilot** prototiptir.
