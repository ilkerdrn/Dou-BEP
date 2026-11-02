# DOU BEP Sınav Atölyesi v2.38 — Teknik doğrulama raporu

**Tarih:** 29.10.2026. **Kapsam:** anonim/sentetik yerel BAP araştırma prototipi. Kurumsal üretim onayı değildir.

| Çalıştırılan kontrol | Sonuç |
|---|---|
| `npm test` — tüm Node testleri | **471/471 PASS** |
| `node release-check.mjs` — yapısal ve güvenlik kontrolleri | **119/119 PASS** |
| `npm run offline:audit` — statik arayüz taraması | **67 dosyada 0 bulgu** |
| `npm run acceptance:pilot` — sentetik uçtan uca sınav senaryosu | **10/10 PASS** |
| `node --test tools/attested-backup.test.mjs tools/secure-backup.test.mjs` | **13/13 PASS** |
| Gerçek CLI: `attested-backup.mjs backup` ve `restore` | **Başarılı**, ayrı sentetik SQLite ile |

### Kontrol edilen başlıca hata senaryoları

- Onaylı audit kanıtının değiştirilmesi, denetim kaydının değiştirilmesi, yanlış anahtar ve yanlış yedek parolası reddediliyor.
- Yedek anlık görüntüsü oluşturulurken audit kontrolü zorunlu; hatalı kayıtta `.bepbak` yayımlanmıyor.
- Geri yükleme geçici SQLite doğrulamasından sonra **yalnız yeni dosya yoluna** yayımlanıyor; mevcut hedefe yazılmıyor.
- Son kanıtın kapsamına girmeyen eski bir şifreli yedeğin geri yüklenmesi reddediliyor.
- `single` ve önceki iki nesilli `rotation` kanıt modları çalışıyor.
- Şifreli yedek doğrulaması atomik yayından önce yapılıyor; geri yüklenen önceki HTTP oturumları temizleniyor.

### Güvenlik sınırları

- Canlı SQLite/WAL dosyası **uygulama seviyesinde şifrelenmiyor**. Bu sürüm şifreli, doğrulanmış yedek akışını iyileştirir.
- HMAC kanıtları yalnız mühürlenmiş audit önekini doğrular; sınav metinlerini veya tüm veritabanı satırlarını imzalamaz.
- Bağımsız saklanan anahtar ve kanıtların fiziksel korunması gereklidir. Windows gerçek cihaz/BitLocker/DPAPI testi yapılmadı.
- PDF/UA, KVKK, kurumsal SSO ve gerçek erişilebilirlik kullanıcı testleri tamamlanmadı.
