# DOU BEP v2.28 — Yerel doğrulama sonucu

**Sürüm:** 2.28.0 · **Tarih:** 29 Ekim 2026 · **Kullanım kapsamı:** Anonim/sentetik BAP araştırma prototipi.

- `npm test`: **418/418 PASS** (yerel Linux Node 22 ortamında).
- `npm run release:check`: **67/67 PASS**. Bu kontrol bağımsız güvenlik denetimi değildir.
- `npm run offline:audit`: **64 arayüz dosyası, 0 doğrudan haricî kaynak bulgusu**. Ağ çıkışı güvenlik duvarı ile ayrıca kontrol edilmelidir.
- MFA kurum politikası: yalnız MFA etkin yönetici tarafından değiştirilebilir; güncel parola doğrulaması yapılır, çok-kurum izolasyonu korunur.
- MFA-only oturum: mevcut/parola girişinden gelen hesaplarda dinamik kısıtlama, yalnız MFA kurulum/durum/çıkış yollarının açık olması, CSRF/Origin, oturum sonlandırma testleri.
- Kurum politikası zorunluyken MFA kapatılması reddedilir. Üye oluşturma/pasifleştirme yalnız yeniden parola doğrulaması ile yapılır.
- Kurum politikası varsayılan olarak isteğe bağlıdır. Veri tabloları ve önceki sınavlar silinmez; `tenant_mfa_policy` yalnızca şemaya eklenir.

**Sınırlamalar:** Gerçek Windows tarayıcı, DPAPI ve BitLocker kullanıcı cihazında test edilmedi. HTTPS, canlı SQLite'nın uygulama düzeyinde şifrelenmesi, SSO, bağımsız sızma testi, KVKK/etik ve engelli bireylerle erişilebilirlik kabul testleri tamamlanmadı. Gerçek öğrenci ve sağlık verisi kullanılamaz.
