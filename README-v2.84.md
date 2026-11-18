# DOU BEP v2.84 — Sunucu denetimli ek süre, tek giriş, ortak tasarım, axe denetimi

- **Ek süre:** `POST /api/pilot` artık `extraMinutes` (0–120) kabul eder; `pilot_sessions.extra_minutes` sütunu eklenir (idempotent, veri kaybı yok). Süre kod girilince başlar; `expires_at = başlangıç + (süre + ek süre) + 2 dk`; süre sonrası teslim 401 döner. Öğrenci sayfası sunucunun verdiği `remainingSeconds` ile sayar ve süre bitince yanıtları otomatik teslim eder (kilitlenmeden önce toplanır). Öğretmen arayüzü: Pilot yönetimi → "Kurum onaylı ek süre".
- **Tek giriş:** oturumsuz yönetim paneli istekleri 302 ile `/kurum?next=…` adresine yönlenir; giriş öncesi menü gizlidir. `next` yalnızca kısa panel yollarını kabul eder.
- **Ortak tasarım:** `dou-theme.css` (tüm sayfalar).
- **Erişilebilirlik:** `npm run a11y:axe` (isteğe bağlı `axe-core`+`playwright`); 17 ekran 0 ihlal. Düzeltilenler: açık gri yardımcı metinler, 24 px hedef boyutu, `role="img"` ilerleme çubuğu.
- **Belgeler:** `RAKIP-ANALIZI-v2.84.md`, `ERISILEBILIRLIK-UYUM-RAPORU-TASLAK.md`, `UZMAN-TEST-SENARYOLARI-NVDA.md`, `TEST-SONUC-FORMU.csv`.
- **Testler:** `npm test` 784/784; `release-check` temiz; `exam:closure` PASS.

## Sınırlar
Gerçek NVDA/JAWS ve engelli öğrenci testi, DOU Speech dinleme değerlendirmesi, mola özelliği, KVKK/sızma testi/SSO/HTTPS yapılmadı. Otomatik axe taraması sertifika değildir.

## v2.85 ek: Mola
`pilot_sessions` yeni sütunlar: `break_minutes`, `break_used_ms`, `break_started_at`, `break_count` (idempotent). `POST /api/pilot` → `breakMinutes` (0–60). `POST /api/pilot/break/start` ve `/break/end` (Bearer belirteç). Pilot yönetimi arayüzünde "Kurum onaylı mola hakkı". Testler: `pilot-time.e2e.test.mjs` (786/786).

## v2.86 ek: Öğrenci ekranı düzeni
`/pilot`: soru haritası (sağda sabit, geniş ekranda), ilerleme çubuğu, zaman halkası, "Soruyu işaretle" (Alt+Shift+F), ayrı gözden geçirme ekranı (soru–durum–işaret tablosu, "Soruya git", teslim), DOU Reader paneli sayfa sonuna taşındı (soru ilk ekranda). Karşılaştırma ve ölçüm: `TASARIM-DEGERLENDIRME-v2.86.md`. Testler: 789/789.

## v2.87: DOU Speech · sinir ağı sesi (çevrimdışı)
- Model: **Okur v1.0** (kod Apache-2.0, ağırlıklar **CC BY 4.0, atıf gerekli**; eğitim verisi CC0/MIT/CC BY). Piper dfki (CC BY-NC-SA) ve Meta MMS (CC BY-NC) ticari olmadığı için seçilmedi. Lisans ve atıf: `okur/LICENSE-NOTICE.txt`; bütünlük: `okur/SHA256SUMS`.
- Dosyalar `okur/` altında (~38 MB): 3 ONNX modeli, metin ön işleyici (WebAssembly), ONNX Runtime Web 1.30.0 (MIT), uyarlanmış çalıştırıcı. Tarayıcı yalnızca bu sunucudan yükler; metin cihazdan çıkmaz.
- DOU Reader'da ses listesine **"DOU Speech · sinir ağı (çevrimdışı, deneysel)"** eklendi. Windows'ta Türkçe ses yoksa otomatik bu seçilir. İlk okumada model yüklenir (birkaç saniye).
- Matematik okuması: model sayıları, `+`, `=`, `%` işaretlerini okur; `-`, `x`, `/`, `²` için sayılar arasında "eksi, çarpı, bölü, kare" ön işleyicisi eklendi.
- CSP: `'wasm-unsafe-eval'` yalnızca `/pilot`, `/dou-reader-demo` ve çalıştırıcı dosyasında; başka sayfalarda yok.
- Testler: `dou-speech-neural.test.mjs`, `dou-speech-neural.e2e.test.mjs` (gerçek model ve gerçek Chromium). 799/799.
- Sınırlar: tek ses; model kartına göre stüdyo kayıtlı modellerden daha az doğal; yabancı sözcükler/kısaltmalar Türkçe harf sesleriyle okunur. **Sesin doğal ve anlaşılır olduğu insan dinlemesiyle doğrulanmadı.** Tek iş parçacığı çalışır (cross-origin isolation kapalı).

## v2.89: Excel ile soru yükleme
- `/sinav-dosya-aktar` artık `.xlsx` kabul eder. Şablon: `ORNEK-SORU-SABLONU.xlsx` (sütunlar: `soru_no, soru, secenek_a…e, dogru_cevap, puan, gorsel_betimleme, kazanim`). Doğru cevap harfle verilir (A–E) ve seçenek metnine çevrilir; puan, görsel betimlemesi ve kazanım taslağa taşınır.
- Güvenlik/kalite kuralları aynıdır: tek sayfa, formül/makro/dış bağlantı yok, en çok 60 soru ve 512 KB, kişisel veri taraması, yalnız şablon başlıkları (ad/numara/tanı sütunu eklenemez). Taslak **onaysız** oluşur; öğretmen her soruyu kaynakla karşılaştırıp onaylamadan kurumsal onaya geçemez (kalite kapısı, 422).
- Modül: `question-sheet-import.mjs`; `xlsx-import.mjs` sütun/uzunluk sınırları parametrik yapıldı (mevcut dönemli liste içe aktarması aynı kalır). Testler: `question-sheet-import.test.mjs`, `question-sheet-import.http.test.mjs` (808/808).
- Sınır: Word içindeki tablo/denklem/görsel hâlâ otomatik çevrilmez; Excel'de görsel için yalnız metin betimlemesi girilir.
