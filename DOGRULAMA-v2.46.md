# DOU BEP v2.46 — yerel doğrulama raporu (29 Ekim 2026)

**Yalnız sentetik, çevrimdışı araştırma prototipi.** İnsan tarafından anlaşılabilirlik, Türkçe doğal ses/tonlama, Windows UI Automation, gerçek NVDA karşılaştırması ve görme engelli öğrenci kabulü doğrulanmamıştır. Üretim verisi kullanmayın.

- `npm test`: **524/524 PASS** — Node v22.16.0, sıfır başarısız test.
- `npm run release:check`: **164/164 PASS** — statik sürüm/sözleşme kontrolü, penetrasyon testi değil.
- `npm run offline:audit`: **77 arayüz dosyası, 0 doğrudan harici istek bulgusu** — statik tarama, gerçek ağ izolasyonu değil.
- `npm run acceptance:pilot`: **10/10 PASS** — anonim, `productionReady=false`.
- Yeni sentetik ses testleri: Türkçe ortografik hece kesimi, son hece vurgusu, soru tonlaması, hız/perde sınırları, WAV kalite ölçümü, yanlış WAV başlığı, kullanıcı metni argümanını reddetme, çıktı üzerine yazmama.

## Sabit anonim “Merhaba dünya” karşılaştırması

| Ölçüm | v2.45 temel | v2.46 hece–vurgu |
|---|---:|---:|
| WAV biçimi | PCM 16-bit mono | PCM 16-bit mono |
| Örnekleme hızı | 22.050 Hz | 22.050 Hz |
| Süre | 1,25 s | 1,34 s |
| RMS genlik | 0,1445 | 0,1456 |
| Tepe genlik | 0,6586 | 0,6588 |
| Kırpılmış örnek | 0 | 0 |

**Bu sayılar sesin daha iyi/daha doğal/daha anlaşılır olduğuna kanıt değildir.** Özellikle sistem hâlâ basit formant/gürültü esaslı robotik ses üretir ve sınavlarda öğrencilerin kullanacağı akustik motor değildir.

## Diğer güvenlik sınırları

- Yeni deneysel sentez yalnız sabit anonim cümleyi alır; kurumsal sınav sorularına, öğrenci kodlarına ve yanıtlara erişmez.
- Eski sınav içi seslendirme yerel Türkçe işletim sistemi sesi ve öğretmen izniyle çalışmaya devam eder.
- Canlı SQLite uygulama düzeyinde şifrelenmemiştir. SSO/OIDC, bağımsız KVKK değerlendirmesi, erişilebilir PDF/UA, gerçek Windows ve kullanıcı kabulü hâlâ bekler.
- ZIP'e geçici SQLite, denetim anahtarı, öğrenci kaydı veya otomatik kabul raporu konulmaz.
