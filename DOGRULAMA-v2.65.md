# DOU BEP Sınav Atölyesi v2.65 — Yerel doğrulama

**Sürüm:** `2.65.0` · **Tarih:** 30.10.2026 · **Statü:** Yalnız sentetik araştırma prototipi, `productionReady=false`.

## İşlevsel kapsam

- `dou-speech-cadence.mjs`: sabit EX13–EX15 örneklerinde v2.64 vurgu planına ek olarak tonlu ses perdelerinin birleşim noktalarını eşler; vurgulu/vurgusuz ünlü süresi ve kazanç katsayılarını ayrı bir C planında uygular.
- `dou-speech-waveform.mjs`: yalnız açıkça çağrıldığında C sentezi üretir; önceki ses kolları varsayılan yol olarak korunur. Önceki örneklerin SHA-256 karşılaştırması testlerde doğrulandı.
- Reader demo tablosu ve ayrı C oynatma kontrolü; kendi sınav soruları / öğrenci kayıtları bu deneysel modüle gönderilmez.
- Tekrarlanabilir, argümansız, okuma-yazma yapmayan CLI denetimi: `npm run speech:cadence-audit`.

## Tamamlanan yerel doğrulamalar

- **644/644 otomatik test** başarılı. Ortamın kesintisiz büyük test süresi sınırı nedeniyle aynı 124 test dosyası sekiz gruba (bir grup da dört alt gruba) bölünerek çalıştırıldı; test gruplarındaki sonuçlar toplandı, atlanan dosya yok.
- **269/269 dağıtım kontrolü** başarılı (`npm run release:check`).
- **10/10 anonim sentetik kabul senaryosu** başarılı (`npm run acceptance:pilot`).
- **97 yayımlanan UI dosyasında 0 doğrudan dış kaynak** (`npm run offline:audit`). Bu yalnız statik taramadır ve ağdan bağımsız çalışma/erişilebilirlik sertifikası değildir.
- **3 sabit örnekte 15 bitişik tonlu sınır ve 9 ünlü süresi** üzerinde kontrol. Ses kalitesi, anlaşılabilirlik ve fonetik doğruluk ölçümü değildir.

## Bilinçli sınırlar

- `ğ` ve ünsüz birleşimlerinin doğru ses üretimi doğrulanmamıştır; vurgular temsili referanslardır.
- Bağımsız, anlaşılır Türkçe TTS / NVDA seviyesinde ekran okuyucu / gerçek Windows tarayıcısı ile erişilebilirlik testi / PDF/UA ve KVKK üretim onayı yoktur.
- Üretim kullanımı ve gerçek özel gereksinimli öğrenci verisi için **hazır değildir**.
- ZIP paketine gerçek veritabanı, `data` dizini, anahtar, log, gizli çevre değişkeni veya üretilen kabul raporu konulmaz.
- GitHub Actions kullanılmadı; kullanıcının yerel bilgisayarına müdahale edilmedi.

## Temiz kurulum

Temiz ZIP ayrı klasöre açıldı ve geçici, izole SQLite veritabanıyla HTTP sunucusu başarıyla başlatıldı. `/api/health` sürümü **2.65.0** döndü; **19/19 açık adres HTTP 200**, **14/14 özel dosya yolu HTTP 404**, yetkisiz `/api/audit` isteği **HTTP 401** döndü. Paket içindeki `README-v2.65.md` ile ayrı klasörde Node.js >=22.13 kullanın.
