# DOU BEP v2.44 doğrulama raporu — 29 Ekim 2026

Bu rapor yalnız sentetik/yerel test koşullarını kapsar. Windows UI Automation/SAPI gerçek cihaz testi veya engelli kullanıcı kabulü içermez.

- Tam regresyon: **513/513 başarılı** (`npm test`, Node 22.16.0).
- Sürüm/güvenlik/dağıtım kapıları: **152/152 başarılı** (`npm run release:check`).
- Çevrimdışı statik tarama: **74 dosya**, **0 doğrudan dış kaynak bulgusu**; ağ/firewall ölçümü değildir.
- BAP anonim uçtan uca kabul senaryosu: **10/10**; `productionReady=false`.
- Windows okuyucuda UIA `AriaRole` (30101) ve `HeadingLevel` (30173) için salt okunur meta veriye dayalı gezinme; gerçek Windows derleme/GUI/SAPI doğrulaması **yapılmadı**.
- Gizlilik: metin girişleri/parolalar atlanır; otomatik focus listener, key injection, pano, mikrofon, ağ çağrısı yoktur. Erişilebilir adlar başka uygulamalar tarafından hatalı etiketlenmiş olabilir.
- Aşağıdaki temiz ZIP smoke sonucu yalnız HTTP yüzeyini denetler; PDF/UA, NVDA eşdeğerliği, bağımsız Türkçe akustik TTS, SSO/OIDC ve canlı SQLite şifreleme halen kapsam dışıdır.

## Temiz ZIP açılış testi

- Paketten açılmış klasörde yalıtılmış geçici SQLite ile Node sunucusu başlatıldı.
- **11 web adresi HTTP 200** ve `/api/health` **2.44.0** döndürdü.
- **4 özel sunucu/veri adresi HTTP 404** döndürdü.
- `/api/acceptance/exams` yetkisiz istek **HTTP 401** döndürdü.
- Kaynak veritabanı değiştirilmedi; gerçek Windows Reader başlatılmadı.
