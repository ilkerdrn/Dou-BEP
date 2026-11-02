# DOU BEP v2.42 — Yerel doğrulama raporu

**Tarih:** 29 Ekim 2026. **Kapsam:** anonim/sentetik verilerle Windows DOU Reader bileşeni ve mevcut sınav sistemi regresyonu.

- Otomatik Node regresyonu: **503/503 PASS** (0 hata).
- Kaynak ve sürüm kontrolü (`release:check`): **143/143 PASS**.
- `offline:audit`: yayımlanan **73 HTML/JS/CSS dosyasında 0 statik dış kaynak/API bulgusu**.
- Anonim BAP kabul pilotu: **10/10 PASS**, `productionReady=false`.
- Temiz ZIP kurulumunda **12 arayüz HTTP 200**, 4 özel yol **HTTP 404**, anonim operasyon API **HTTP 401** olarak doğrulandı.
- Yeni Windows okuyucu kaynak güvenliği: **5/5 PASS**. Windows PowerShell 5.1 + STA, açık süreç izin listesi, `IsPassword`, `Edit`, `IsOffscreen` atlamaları, yalnız kurulu `tr-*` SAPI sesi, kullanıcı kontrollü kısayollar, metin/navigasyon sınırları, sunucu allowlist'i dışı yerel bileşen.

**Önemli sınırlama:** Bu testler Windows `UIAutomationClient`, `System.Speech`, `System.Windows.Forms` sistem API'lerini **gerçek Windows ortamında derleyip çalıştırmadı**. Windows üzerinde `-Check` ön denetimi, yerel ses testi, klavye çakışmaları, gerçek uygulamalarda erişilebilirlik, kullanıcı/NVDA birlikte çalışabilirlik ve güvenlik incelemesi henüz gereklidir. Bu sürüm NVDA eşdeğeri veya özgün eğitilmiş TTS modeli değildir. Üretim/gerçek öğrenci verileriyle kullanım için onay değildir.

Komutlar: `npm test`, `npm run release:check`, `npm run offline:audit`, `node tools/acceptance-pilot.mjs --report <ayrı rapor yolu>`. Windows için `powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-windows.ps1 -Check`.
