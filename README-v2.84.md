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
