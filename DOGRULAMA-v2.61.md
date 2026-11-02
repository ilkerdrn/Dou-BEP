# DOU BEP Sınav Atölyesi v2.61 — Yerel doğrulama raporu

**Tarih:** 30 Ekim 2026. **Platform:** izolasyonlu Linux çalışma ortamı, Node.js v22.16.0. **Kapsam:** sentetik C geçiş filtresi ve mevcut uygulamanın otomatik regresyonları. Bu rapor gerçek Windows cihaz/NVDA/JAWS/insan çalışması veya kurumsal üretim onayı değildir.

## Başarıyla çalıştırılan kontroller

| Komut / yöntem | Sonuç |
|---|---|
| `node --test dou-speech-join-study.test.mjs` | 6/6 PASS |
| `npm test` | 615/615 PASS, 0 FAIL |
| `npm run release:check` | 247/247 PASS, 0 FAIL |
| `npm run offline:audit` | 93 yayımlanan UI dosyasında 0 statik doğrudan harici kaynak bulgusu |
| `npm run acceptance:pilot` | 10/10 PASS; sentetik veriler, `productionReady=false` |
| `node tools/dou-speech-join-audit.mjs` | 14 sabit örnek, 15 uygun ünlü–gürültülü ünsüz birleşimi |
| ZIP açılıp izole veritabanıyla Node sunucusu başlatıldı | `/api/health`: 2.61.0, local-only |
| HTTP açık adres denetimi | 21/21 HTTP 200 |
| Özel / dosya sunulmayan yollar | 12/12 reddedildi (400 veya 404) |
| Yetkisiz `/api/audit` | HTTP 401 |
| ZIP CRC testi ve paket gizli dosya kontrolü | PASS; `data/`, SQLite, `node_modules`, gerçek güvenlik anahtarı ve sentetik kabul JSON raporu ZIP'e alınmadı |

## Sürüm içeriği

- **Yeni:** `dou-speech-join-study.mjs` ve `dou-speech-join-study.test.mjs`; sabit korpusun C geçiş deneyi, web arayüzü, yerel numarik JSON denetimi.
- PCM16 dosya başlığının 44 baytı korunur; örnek sayısı ve süre değiştirilmez. Gönderilen WAV kaynak tamponu mutasyona uğramaz; izin verilmeyen segment birleşimleri işlenmez. Kırpılmış çıktı kabul edilmez.
- Önceki A/B ses algoritmaları değiştirilmedi; A ve B geri uyumluluk kontrolleri geçiyor. Ayrı C deneyi yalnız `TR01`–`TR14` sabit sentetik kodlarını kabul eder.
- `data/`, kurumsal sınavlar, sınav kaydı, onay ve gerçek okuyucu politikası değiştirilmedi. Kullanıcının Windows bilgisayarında işlem yapılmadı. GitHub Actions kullanılmadı.

## Araştırma ve güvenlik sınırları

- **15 uygun geçiş**, yalnız 14 sabit yapay örnekteki ses sınıfı birleşimidir; 15 fonetik doğrulanmış ses ya da doğal Türkçe TTS kapasitesi anlamına gelmez.
- RMS ve örnek-sıçraması ölçümü insanlarda anlaşılabilirlik, doğallık veya ses kalitesi iyileşmesini kanıtlamaz. Bazı C örneklerinde sınır-sıçraması yükselmiştir.
- Yerel arayüz, yanıt/tercih, öğrenci kimliği, ses kaydı veya mikrofon istemez. Statik çevrimdışı tarama işletim sistemi düzeyinde tüm ağ çıkışlarının imkânsızlığını garanti etmez.
- Gerçek Windows cihaz ve NVDA/JAWS kullanımı, gerçek tarayıcı ses deneyi, fonetik uzman, etik kurul, KVKK, üretim altyapısı ve bağımsız doğal Türkçe TTS **test edilmemiş/tamamlanmamıştır**.
