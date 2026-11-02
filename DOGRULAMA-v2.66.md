# DOU BEP Sınav Atölyesi v2.66 — Yerel doğrulama

**Tarih:** 30.10.2026 · **Uygulama sürümü:** `2.66.0` · **Statü:** Sentetik araştırma prototipi, `productionReady=false`.

## Kapsam ve ölçüm

- EX13, EX14, EX15 sabit deneyler; 15 tonlu segment sınırı.
- D sinyali, v2.65 C dalgasının kopyasında, en fazla ~2ms sağ kenar üzerinde sınırlı lokal müdahale yapar. **10 düzeltme kabul, 5 düzeltme reddedildi**. Reddetme şartı: küçük kenar sıçraması, yerel maksimum PCM adımında artış veya PCM tavanı.
- Kabul kriteri yalnız çevresindeki maksimum anlık PCM farkının artmamasıdır; **insan algısı, telaffuz veya konuşma kalitesini doğrulamaz**. Başka sinyal ölçümleri kötüleşebilir.
- Dönüşüm eski A/B/C WAV üreticilerine uygulanmadı, dosyaların SHA-256 özetleri regresyon testlerinde korunuyor.
- CLI JSON çıktısı kimlik, sözcük, soru metni ve gerçek kullanıcı sesi içermez; SHA-256 ile deterministik çıktı.

## Tamamlanan testler

- **652/652 otomatik test başarılı:** 125 test dosyası 12 ayrı grupta çalıştırıldı (ilk tek koşu süre sınırına takıldığından tamamlanmış sayılmadı). Grup test günlükleri `bep-v266-group-1.log`–`bep-v266-group-12.log`.
- **274/274 dağıtım kontrolü başarılı** (`node release-check.mjs`).
- **10/10 anonim sentetik kabul testi başarılı** (`npm run acceptance:pilot`).
- **98 arayüz dosyasında 0 statik doğrudan harici kaynak çağrısı** (`npm run offline:audit`); bu firewall kanıtı değildir.
- v2.66 hedefli sekiz test: açık olmayan tüm ID'ler/parametreler reddedilir, deterministik PCM, çerçeve sayısı eşitliği, sınır dışı PCM müdahalesinin olmaması, kırpılma yokluğu, eski örneklerin bütünlüğü, raporun veri içermemesi ve terminal raporu hash kontrolü.

## Dağıtım sınırları

Bağımsız Türkçe doğal TTS, NVDA eşdeğeri ekran okuyucu, gerçek kullanıcı testleri, Windows gerçek ses deneyimi, PDF/UA ve kurumsal/KVKK onayı tamamlanmamıştır. Gerçek öğrenci/sağlık verileriyle üretimde kullanılmamalıdır. GitHub Actions çalıştırılmadı; kullanıcının PC'sindeki projeye veya veritabanına dokunulmadı. ZIP'e `data/`, SQLite/DB, özel anahtarlar, `.env` veya üretilmiş kabul raporları dahil edilmez.

## Temiz kurulum

Temiz ZIP ayrı klasörde, izole geçici SQLite ile başlatıldı: `/api/health` sürüm **2.66.0**, **20/20 açık HTTP adresi 200**, **16/16 özel dosya yolu 404**, yetkisiz `/api/audit` **401**. ZIP CRC bütünlüğü doğrulandı.
