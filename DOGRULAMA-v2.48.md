# DOU BEP v2.48 — teknik doğrulama (29 Ekim 2026)

**Tüm doğrulamalar yalnız sentetik/anonim verilerle yapılmıştır. Gerçek kullanıcı, Windows cihaz, fonetik doğruluk ve akademik erişilebilirlik kabulü yapılmamıştır.**

- `npm test`: **539/539 PASS**. Ünsüz modeli ve önceki sınav, güvenlik, DOU Reader, A/B dinleme testleri dahil.
- `npm run release:check`: **178/178 PASS**. Yeni deneysel arayüzün sabit cümlelerle, mevcut Reader'dan ve özel test kodlarından ayrı çalışması kontrol edildi. Yalnız kaynak düzeyindeki testtir.
- `npm run offline:audit`: **80 UI dosyası, 0 doğrudan harici kaynak bulgusu**. İşletim sistemi ağ yalıtımı veya üçüncü taraf güvenlik denetimi değildir.
- `npm run acceptance:pilot`: **10/10 PASS**, yalnız sentetik BAP senaryoları; `productionReady=false`.
- Ünsüz kontrastları: `s/ş`, `m/n`, `p/k`, `v/z` için aynı uzunluktaki karşılaştırma örnekleri farklı PCM dalga biçimleri üretti. Yeni WAV sentezi deterministik ve 22.050 Hz, 16-bit mono; testte sıfır kırpılma. Farklı PCM, fonetik doğruluk veya anlaşılabilirlik anlamına gelmez.
- Windows: bağımsız UI Automation okuyucu ve SAPI adaptörü gerçek cihazda **test edilmedi**. NVDA/JAWS, görme engelli katılımcılar, insan anlaşılabilirlik testi, PDF/UA, KVKK, SSO/OIDC ve canlı veritabanı şifrelemesi **eksik**.

- ZIP temiz kurulumu ve HTTP güvenlik duman testi: **13/13 HTTP 200**, **7/7 özel yol HTTP 404**, `/api/health` **2.48.0**, yetkisiz `/api/audit` **HTTP 401**; sentetik geçici SQLite ile ayrı klasörde çalıştırıldı.
