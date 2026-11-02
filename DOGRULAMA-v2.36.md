# DOU BEP v2.36 — Yerel Doğrulama Notları

Tarih: 29.10.2026. Araştırma prototipi, yalnız sentetik/anonim veri.

| Denetim | Sonuç | Sınır |
|---|---:|---|
| `npm test` | **459/459 PASS** | Otomatik yerel modül/HTTP testleri, bağımsız güvenlik testi değildir |
| `npm run release:check` | **108/108 PASS** | Kaynak/çalıştırılabilir sürüm kontrolleri, saldırı testi değildir |
| `npm run acceptance:pilot` | **10/10 PASS** | Geçici anonim SQLite üzerinde iş akışı; gerçek kullanıcı kabulü değildir |
| `npm run offline:audit` | **67 dosyada 0 bulgu** | Statik doğrudan bağlantı taraması; paket ağı gerçekten hiç kullanamaz demek değildir |
| `node --test tools/audit-evidence.test.mjs` | **6/6 PASS** | Eski kayıt değiştirme/silme; kanıt/anahtar değişimi; dış dizin; başlangıçta kapalı hata |
| Gerçek `audit:key → audit:seal → audit:verify` komut zinciri | **PASS** | Sentetik DB üzerinde 1 kayıt; SQLite salt okunur; anahtar JSON'a yazılmadı |
| `security:check` ile ayrı kanıt doğrulaması | **PASS** | Sentetik SQLite üzerinde 1 mühürlü olay |

## Özellikle kontrol edilen negatif senaryolar

- Eski audit olayının silinmesi veya içeriğinin değiştirilmesi → `audit_prefix_mismatch`.
- İmzalı kanıt verisinin değiştirilmesi veya farklı anahtar kullanımı → `signature_mismatch`.
- Yeni audit olayı eklenmesi → eski kanıt geçerli kalır **ancak yeni olay korunmaz**.
- Anahtar ve kanıtın `data/` altına yerleştirilmesi veya sembolik dizinle yönlendirilmesi → reddedilir.
- `BEP_REQUIRE_AUDIT_EVIDENCE=1` ve değişmiş eski olay → sunucu SQLite `openStore` aşamasına geçmez.
- Eksik SQLite yolu → otomatik yeni veritabanı yaratılmaz.
- Eski kanıt dosyasını aynı isimle tekrar üretme → mevcut dosya ezilmez.

## Kısıtlar

Bu mekanizma **snapshot bazlı simetrik HMAC** doğrulamasıdır. Yeni olaylar otomatik korumaya alınmaz, haricî WORM kaydı/kurumsal anahtar kasası yoktur. Anahtar ve kanıt birlikte ele geçirilirse veya eski veritabanı ile eski kanıt birlikte geri döndürülürse tespiti garanti değildir. Gerçek Windows DPAPI/BitLocker, canlı SQLite şifreleme, SSO/HTTPS, KVKK/etik, NVDA/JAWS ve PDF/UA testleri yapılmadı. BAP araştırma prototipi kurumsal üretime hazır değildir.
