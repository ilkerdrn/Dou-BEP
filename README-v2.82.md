# DOU BEP v2.82 — Öğrenci sınav akışı ve gerçek tarayıcı testleri

## Değişiklikler (`accessible-player.mjs`)
- **Sınavı başlat** ekranı; süre bu düğmeyle başlar. Kurum onaylı ek süre `generateAccessibleExamHtml(exam,{extraMinutes})` ile (0–120 dk).
- Kalan süre göstergesi; 10/5/1 dakika **görsel** uyarı (işitme engelli öğrenci için ses gerekmez); süre dolunca yanıtlar kilitlenir, teslim ekranı açılır.
- Soru durumu (cevaplandı/boş), **gözden geçirme** ekranı ve varsayılan odağı "Hayır" olan **teslim onayı**.
- Klavye: Alt+Shift+T kalan süre, Alt+Shift+D soru durumu, Alt+Shift+1…9 seçenek seçimi (mevcut R/S/N/P korunur).
- **Basit ekran** ve **Büyük tıklama alanları** anahtarları.

## Test
`accessible-player.e2e.test.mjs`: gerçek Chromium ile klavye/ekran okuyucu, az gören/işitme engelli ve motor engelli profilleri ile süre dolması; ağ isteği olmadığı doğrulanır. `npm test`: 774/774 PASS.

## Sınırlar
Gerçek NVDA/JAWS ve engelli öğrenci kullanım testleri yapılmadı; tarayıcı testi bunların yerine geçmez. `extraMinutes` henüz sunucu teslim hattına/kurum ek süre kararına bağlanmadı.
