# DOU BEP v2.82 — Öğrenci sınav akışı ve gerçek tarayıcı testleri

## Değişiklikler (`accessible-player.mjs`)
- **Sınavı başlat** ekranı; süre bu düğmeyle başlar. Kurum onaylı ek süre `generateAccessibleExamHtml(exam,{extraMinutes})` ile (0–120 dk).
- Kalan süre göstergesi; 10/5/1 dakika **görsel** uyarı (işitme engelli öğrenci için ses gerekmez); süre dolunca yanıtlar kilitlenir, teslim ekranı açılır.
- Soru durumu (cevaplandı/boş), **gözden geçirme** ekranı ve varsayılan odağı "Hayır" olan **teslim onayı**.
- Klavye: Alt+Shift+T kalan süre, Alt+Shift+D soru durumu, Alt+Shift+1…9 seçenek seçimi (mevcut R/S/N/P korunur).
- **Basit ekran** ve **Büyük tıklama alanları** anahtarları.

## Sunucuya bağlı öğrenci sayfası (`/pilot`)
Gerçek teslim hattını kullanan `pilot.mjs` de aynı özellikleri kazandı: kalan süre, görsel süre uyarıları, süre dolunca kilit, soru durumu, Alt+Shift+T/D/1…9, Basit ekran, Büyük tıklama alanları ve teslim onayında "X soru cevaplandı, Y boş" özeti. Süre ve ek süre `exam.duration`'dan gelir; toplu uyarlama hattı ek süreyi zaten `duration`'a ekler (`batch-accommodations.mjs`), bu yüzden ayrı sunucu bağlantısı gerekmedi.

## Test
`accessible-player.e2e.test.mjs` ve `pilot-student.e2e.test.mjs` (/pilot, API taklit edilmiş): gerçek Chromium ile klavye/ekran okuyucu, az gören/işitme engelli ve motor engelli profilleri ile süre dolması; ağ isteği olmadığı doğrulanır. `npm test`: 776/776 PASS.

## Sınırlar
Gerçek NVDA/JAWS ve engelli öğrenci kullanım testleri yapılmadı; tarayıcı testi bunların yerine geçmez. Süre istemcide sayılır; sunucu 45 dakikalık oturum süresini ayrıca uygular. `/pilot` uçtan uca testi gerçek sunucu yerine taklit API kullanır. DOU Speech ses kalitesi ve gerçek NVDA testi insan dinleme/kullanım gerektirir; yapılmadı.
