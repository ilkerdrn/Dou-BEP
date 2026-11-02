# DOU BEP Sınav Atölyesi v2.57 — Yerel doğrulama (29 Ekim 2026)

**Kapsam:** Anonim/sentetik, çevrimdışı BAP Ar-Ge prototipi. **Üretime veya gerçek öğrenci, sağlık ve engellilik verilerine uygun olduğu onaylanmamıştır.**

## Kaynak ve deney
- v2.56 kaynak ZIP'i temel alınarak eklenti biçiminde `dou-speech-timing.mjs` (süre/perde sınırı planı) ve `dou-speech-comparison.mjs` (yalnız sayısal WAV ölçümü) eklendi.
- Eski `synthesizeTurkishSpectralPreview('Merhaba dünya')` çıktısı SHA-256: `efdfc09b5cb967d02aa20382ce08a16ca221f0ce2b55a9ba86e355bab513b0c2`; **v2.56 ile birebir aynı**.
- Yalnız sabit sentetik ses için vurgulu/durak öncesi ünlü süresi ve komşu tonlu ses perde sınırı deneysel olarak ayarlanır. Durak, gürültü ve patlamalı ünsüzlerden geçiş yapılmaz. Üretim sınırı 16 saniye.
- Karşılaştırma için yeni örnekte 22.050 Hz / mono / PCM16; v2.56 referans süresi `1.3450 sn`, yeni süre `1.3933 sn`; RMS `0.1409 → 0.1444`, en büyük ardışık örnek farkı `0.3447 → 0.3456`, kırpılmış örnek `0`.
- **Bu rakamlar yeni örneğin daha iyi veya anlaşılırlığının yüksek olduğunu GÖSTERMEZ.** MOS, Türkçe telaffuz doğruluğu, fonetik doğrulama ve insan dinleme sonucu yok.

## Testler
- `npm test`: **591/591 PASS**, 0 başarısız. Ek 5 yeni test; v2.56 eski testleri korundu.
- `npm run release:check`: **225/225 PASS**; 6 yeni kaynak sözleşmesi/gizlilik kontrolü. Güvenlik veya erişilebilirlik sertifikası değildir.
- `npm run offline:audit`: **90 yayımlanan arayüz dosyası, 0 doğrudan dış kaynak bulgusu**. Fiziksel ağ kesme testi değildir.
- `npm run acceptance:pilot`: **10/10 PASS**, yalnız anonim/sentetik; `productionReady=false`.
- Temiz kaynak ZIP'i ayrı geçici klasörde açılıp, geçici ve özel SQLite yolu ile `127.0.0.1` üzerinde başlatıldı. **19/19 açık HTTP 200**, **10/10 özel dosya HTTP 404**, yetkisiz `/api/audit` **401**, sağlık sürümü **`2.57.0`**. ZIP CRC kontrolü başarılı.
- ZIP'e canlı `data`, SQLite, özel anahtar, yerel kabul çalıştırma raporu veya `.env` eklenmedi.
- GitHub Actions çalıştırılmadı. Gerçek Windows ses cihazı/NVDA/JAWS, görsel tarayıcı erişilebilirliği, gerçek kullanıcı ve ağ engelleme deneyleri yapılmadı.

## Kalan kritik işler
Kendi doğal ve anlaşılır Türkçe TTS için fonetik korpus, uzman anotasyon, etik izinler ve gerçek kör dinleme değerlendirmeleri; Windows UI Automation ve ekran okuyucu testi; kurumsal KVKK süreçleri; üretim SQLite şifreleme; WCAG/PDF-UA doğrulaması. Gerçek sınav soruları deneysel motorla sentezlenmez.
