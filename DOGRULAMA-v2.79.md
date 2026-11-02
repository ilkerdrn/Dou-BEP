# DOU BEP v2.79 — Teknik doğrulama (31 Ekim 2026)

**Kapsam:** Koşul bazlı anonim dört motorlu dinleme raporu değerlendirmesi; oturum içi önceki motor farkı, sözcük çifti hata önceliği, örneklem/özdeş yanıt deseni/tavan etkisi uyarıları. Sınav motoru, veritabanı şeması, mevcut dört akustik motor, NVDA varsayılan ayarları **değiştirilmedi**.

## Bu sürümde doğrulananlar

- Tam regresyon: `node --test --test-concurrency=8 *.test.mjs server-foundation/*.test.mjs tools/*.test.mjs`: **748/748 PASS**, 0 fail (`bep-v279-all-tests.log`).
- Dağıtım kaynak denetimi: `node release-check.mjs`: **330/330 PASS** (`bep-v279-release.log`).
- Odaklı analiz testleri: üç rapor denetim test dosyasında **23/23 PASS** (`bep-v279-targeted.log`). Yeni v2.79 için 8 test eklendi.
- `node tools/offline-audit.mjs`: **124 yayımlanan dosyada 0 doğrudan uzak kaynak bulgusu**. Bu yalnız statik kaynak taramasıdır, firewall testi değildir.
- **Temiz tam ZIP:** ayrı klasöre açılıp geçici SQLite ile çalıştırıldı. Demo kurum girişi, oturum, anonim sınav taslağı oluşturma, yeni ses araştırma modülünün sunulması ve özel dosyalara HTTP 404 kontrolü dahil **40/40 HTTP kontrolü geçti** (`bep-v279-live-smoke.log`).
- Aynı temiz ZIP üzerinde `node release-check.mjs` ayrıca **330/330 geçti** (`bep-v279-release-clean.log`).
- Tam ZIP ve yama CRC; manifestteki 108 dosyanın SHA-256 hash doğrulaması ve `data/`, SQLite, gizli anahtar hariç tutma denetimi tamamlandı.

## Bilimsel/erişilebilirlik sınırları

- JSON raporu bir dinleyicinin gerçekten sesi duyduğunu, yanıtın özgünlüğünü veya farklı dosyaların farklı kişilere ait olduğunu **kanıtlamaz**.
- Dış kimlik alanı, isim, öğrenci numarası vb. rapor formatı tarafından reddedilir; farklı dinleyicileri doğrulayan veya takip eden bir özellik **yoktur**.
- 12 rapor önerisi **yalnız ön keşif için planlama hedefidir**. İstatistiksel güç analizi, bilimsel validasyon veya yeterli örneklem garantisi değildir.
- Motor başına doğru/yanlış farkları yalnız betimseldir; gerçek akustik neden, sesin anlaşılabilirliği, klinik sonuç, bağımsız katılımcı, p-değeri, gerçek sınav kullanım izni veya NVDA üretim onayı **verilemez**.
- Aynı koşul bilgisi, gerçek kulaklık, oda ve cihaz eşdeğerliğini kanıtlamaz.

## Güvenli kullanım

`http://127.0.0.1:4173/dou-speech-intelligibility` → “Yerel rapor karşılaştırması, koşul denetimi ve araştırma kanıtı kontrolü”. Kullanıcı seçtiği anonim JSON dosyaları yalnız tarayıcı belleğinde analiz edilir. Düğmeye basılmadan yükleme yok; sunucuya aktarım, kayıt, uzaktan TTS, mikrofon veya oturum izi bulunmaz.

**Mevcut Windows'ta kurulum ve gerçek NVDA testi yapılmadı.** Gerçek kurum verilerini kullanan işletim ortamında önce proje ve `data/` klasörünü yedekleyin. Paket mevcut SQLite/veritabanını içermez ve güncelleme yaması `data/` klasörüne dosya yazmak üzere tasarlanmamıştır. NVDA sürücüsünü varsayılan konuşma motoru yapmayın.
