# DOU BEP Sınav Atölyesi v2.40 — Doğrulama raporu

**Kapsam:** Yalnız yerel, sentetik/anonim araştırma prototipi; gerçek kişi verisi veya kurumsal güvenlik akreditasyonu yok.

- `npm test`: **483/483 PASS**, başarısız 0. Ana sınav, koordinasyon, MFA, erişilebilir belge, yedek ve eski teslim akışları dahildir.
- `npm run release:check`: **130/130 PASS**. Yeni salt okunur ön denetim, açık başlatma koruması, Windows ACL sınırlaması ve yayın dışı özel kaynaklar denetlendi.
- `npm run offline:audit`: **67 yayımlanan arayüz dosyası, 0 doğrudan dış referans bulgusu** (yalnız statik tarama).
- `npm run acceptance:pilot`: **10/10 PASS**, gerçek kurum/öğrenci verisi kullanılmadı.
- Yeni ön denetim birimi: özel dosya izinleri, açık WAL/SHM, sembolik bağlantı ve yetim journal dosyası, POSIX fail-closed kapısı, Windows ACL belirsizliğinde durdurma ve disk şifrelemesiyle uygulama şifrelemesini ayırma testleri.
- Güvenlik durum aracı: açık journal izinleri `FAIL`, geçici hacim koruması `WARN`; raporlarda girdi içeriği sızdırılmıyor.

**Sınır:** Canlı SQLite hâlâ düz veridir. Bu denetim PDF/UA, NVDA, WCAG, KMS, SSO/OIDC, SQLCipher veya kurumsal güvenlik değerlendirmesi yerine geçmez. Windows BitLocker ve ACL kontrolü gerçek Windows cihazında test edilmedi.
