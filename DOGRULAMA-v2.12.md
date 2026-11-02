# DOU BEP Sınav Atölyesi v2.12 — test ve kısıt raporu

Tarih: 29 Ekim 2026. Node.js 22.16.0; Chromium kurulu fakat yerel sunuculara Chromium erişimi yönetici ilkesiyle engelleniyor.

| Kontrol | Sonuç | Kanıt/kısıt |
|---|---|---|
| Otomatik birim ve HTTP entegrasyon testleri | **302/302 PASS** | `npm test` |
| Yerel dağıtım ve savunma kontrolleri | **13/13 PASS** | `npm run release:check`; sızma testi değildir |
| v2.12 görsel materyal kataloğu | **PASS** | 11 benzersiz kayıt; şekil/sayı aralığı, Türkçe arama, filtre |
| Materyal uygulama ve sınav içeriğinin korunması | **PASS** | Soru metni, cevap, kazanım, puan korunuyor; geçmiş inceleme temizleniyor |
| v2.11 varsayılan görsel parmak iziyle uyum | **PASS** | Değişmeyen daire ve sayı doğrusu mevcut doğrulamayı koruyor; diğer şekil yeniden doğrulama gerektiriyor |
| Öğrenci kâğıdı çıktısı | **PASS — otomatik** | Önceden var olan `questionHtml` ile yerel görselleştirme birim testi |
| HTTP galeri ve JS dağıtımı | **PASS** | Doğru MIME, CSS seçicileri, yedi eşsiz DOM kontrolü, girişsiz bankaya 401 |
| Gerçek oturumlu Chromium tıklama testi | **YAPILAMADI** | `net::ERR_BLOCKED_BY_ADMINISTRATOR` |
| NVDA, JAWS, VoiceOver, TalkBack / baskı / özel eğitim uzmanı pilotu | **YAPILMADI** | Gerçek kişilerle test gerektirir |
| KVKK, HTTPS/SSO/MFA, kurum onayı, bağımsız sızma testi | **YAPILMADI** | Üretim uygunluğu ilan edilmez |

Kaynak pakete gerçek öğrenci veritabanı, oturum anahtarı, kişisel bilgi, ekran görüntüsü veya test veritabanı eklenmemiştir.
