# DOU BEP v2.64 — Doğrulama

**Tarih:** 30 Ekim 2026. **Kapsam:** kapalı sentetik Türkçe vurgu deneyi; gerçek öğrenci kayıtları, bireysel gereksinim bilgileri ve üretim altyapısı kullanılmadı.

## Değişiklikler

- Yalnız EX13, EX14 ve EX15 kodları için sabit `-yor` örneklerinin vurgu konumları deneysel bir planda 3. heceden 2. heceye taşındı; segment, süre ve perde sınırları ayrı hesaplandı. Kapsam dışındaki 15 örneğe düzeltme uygulanmadı.
- `ğ` bulunan 6 örnek ve sözcük başında ünsüz kümesi olan 3 örnek uzman incelemesinde bırakıldı. Onaylanmış fonetik model iddiası yoktur.
- v2.46 önceki WAV üretim yolu yeni fonksiyonla aynı sayısal işlemden geçirildi; mevcut sabit örneklerin WAV byte kimliği korunur. Yeni deneysel WAV kolu ayrı düğmeyle çalınır.
- Sonuç JSON'u yalnız anonim örnek kodları, sayısal değişimler ve doğrulanmamışlık işaretleri içerir; kişi/soru verisi, serbest metin, mikrofondan ses, web isteği ve kayıt yoktur.

## Yerel kontrol sonuçları

- Tam regresyon: **637/637 başarılı** (`node --test --test-concurrency=8 *.test.mjs server-foundation/*.test.mjs tools/*.test.mjs`).
- Dağıtım statik kontrolleri: **263/263 başarılı** (`npm run release:check`).
- Sentetik kabul: **10/10 başarılı** (`npm run acceptance:pilot`), `productionReady=false`.
- Çevrimdışı varlık taraması: **96 dosyada 0 doğrudan harici çağrı** (`npm run offline:audit`). Bu tek başına firewall/ağ izolasyonu ispatı değildir.
- Sabit EX13 eski ve yeni sesleri 22.050 Hz mono 16-bit WAV; **0 kırpılmış örnek**, her biri **0,72 saniye**.

- Temiz ZIP ayrı dizinde çıkarılıp geçici, izole SQLite ile sunucu başlatıldı: `/api/health` sürümü **2.64.0**, **18/18** açık HTTP adresi `200`, **12/12** özel/izin verilmeyen yol `404`, yetkisiz `/api/audit` `401`.
- ZIP CRC kontrolü başarılı; **427 kaynak/doküman dosyası**. Paket gerçek SQLite/anahtar dosyalarını ve oluşan sentetik kabul raporunu içermez.

## Devam eden sınırlamalar

Doğal Türkçe TTS, NVDA/JAWS eşdeğeri bağımsız ekran okuyucu, gerçek Windows/tarayıcı ses testleri, etik kurul/kurumsal onay, fonetik uzman doğrulaması ve gerçek kullanıcı değerlendirmesi tamamlanmadı. Eski Windows `data` klasörüne dokunulmadı, GitHub Actions kullanılmadı.
