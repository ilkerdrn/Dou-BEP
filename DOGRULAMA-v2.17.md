# DOU BEP Sınav Atölyesi v2.17 — teknik doğrulama

**Tarih:** 29 Ekim 2026. **Ortam:** Node.js v22.16 / `node:sqlite`; yalnızca yerel sentetik pilot.

| Kontrol | Sonuç | Açıklama |
|---|---|---|
| `npm test` | **346/346 PASS** | Önceki 339 test + yeni 5 karar ve 2 HTTP testini içerir |
| `npm run release:check` | **16/16 PASS** | Yerel yapılandırma/kod kontrolleri, sızma testi değildir |
| Karar taslağı ve ikinci kişi onayı | PASS | Kararı oluşturan / son güncelleyen aynı kararı onaylayamaz |
| Yetkisiz erişim / tenant ayrımı | PASS | Kararlar farklı kuruma kapalı; rol ve CSRF denetlenir |
| Kayıt değişince onayın düşmesi | PASS | Sürüm artırılır, onay parmak izi temizlenir |
| Karar iptali ve olay geçmişi | PASS | İptal edilen karar toplu kontrolden geçmez |
| Dönemli çok dersli toplu üretim ön kontrolü | PASS (HTTP/modül düzeyi) | Dönemli listelerin her satırı sunucu kararlarıyla kontrol edilir; CSV `onayli` tek başına yeterli değildir |
| Yeni sayfa ve statik dosyalar | PASS (yerel HTTP) | `/uyarlama-kararlari` ve JS/CSS servis edilir; `server-foundation` dışarı açılamaz |
| Chromium gerçek ekran etkileşimi | **YAPILAMADI** | `ERR_BLOCKED_BY_ADMINISTRATOR` ile yerel sayfaya erişim engellendi |
| Ekran okuyucu / erişilebilirlik / pedagojik uzman testi | **YAPILMADI** | Gönüllü kullanıcı ve uzman kabul testleri gerekli |
| KVKK / SSO / MFA / HTTPS / penetrasyon testi | **YAPILMADI** | Gerçek kişisel/özel nitelikli veri kesinlikle yüklenmemeli |

## Bilinen tasarım sınırları

- Sunucu tarafında yeni `accommodation_decisions` ve `accommodation_events` tabloları açılır; veriler **disk şifrelemesiz** SQLite'da tutulur. Yalnız anonim/sentetik kodlar kullanılabilir.
- Dönemli Excel/CSV dışında eski CSV yolları eski davranışı korur: eski akış kurumsal onay kanıtı değildir.
- ZIP hâlâ tarayıcıda oluşur; kötü niyetli bir istemci kontrolü atlatabilir. Bu sürüm **gerçek verili üretim için güvenlik sınırı değildir**. Güvenli sunucu taraflı toplu üretim tamamlanmadan dağıtıma çıkılmaz.
- Yeni sayfa ekran okuyucu ve gerçek kullanıcı açısından doğrulanmadı. Kurumsal kimlik sistemi, veri sınıflandırması, erişim gözden geçirme, retansiyon/silme prosedürü ve mevzuat uygunluğu dış değerlendirme gerektirir.
- v2.16 ile hazırlanmış sahte kayıtlar yeni karar onayına otomatik geçirilmez. Önce şifreli yedek alıp doğrulayın; mevcut `data/` klasörünü silmeyin.
