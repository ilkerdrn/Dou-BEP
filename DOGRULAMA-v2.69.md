# DOU BEP v2.69 yerel kaynak doğrulaması — 30 Ekim 2026

## Değişiklik özeti

- Türkçe tam sayı açılımı 0–9999, başında sıfır ve büyük rakamların kontrollü eski moda dönüşü.
- Cümle sınırına göre yerel WAV ritmi, metin okunuşu ön izlemesi, iki deneysel ayar ve tarayıcı belleği temizliği.
- `dou-speech-number-words.mjs` statik HTTP allowlist üzerinden yayımlandı; test ve özel dosyalar yayımlanmaz.
- v2.68 varsayılan `digits` + `legacy` yolu WAV SHA-256 karşılaştırmasıyla korunmuştur:
  `2cebdd18392e39905a537af3ad10c0500ac4f92fdde3ca1c02e084ad8cc1fea3`
  (örnek: `2026 yılında merhaba! Bugün güzel.`)

## Test notları

- 129 test dosyası, toplam **677 test**: tüm testler sonuç olarak geçti; bir Windows ACL süreci ilk yoğun paralel geçişte zamanlamaya bağlı başarısız oldu, ardından **aynı test 5/5 bağımsız koşumda geçti**.
- Kaynak regresyon grupları: ilk 11 grup **633/633**; son grupta 31/31 (başarısız ilk senaryonun tekli tekrarına göre), korumalı yedekleme 7/7, depolama kurtarma 6/6.
- Dağıtım denetimi **292/292 başarılı**. Statik çevrimdışı taraması **107 dosya, 0 doğrudan harici kaynak bulgusu**.
- Bunlar gerçek tarayıcı görsel kabulü, kullanıcı anlaşılırlık testi veya NVDA doğrulaması değildir.
- Üretilen WAV: 22.050 Hz, 16-bit mono; örnek yaklaşık 7,98 sn.

## Güvenlik, kapsam ve sınırlamalar

Metin tarayıcıda hesaplanır; sunucuya gönderilmez. 360 karakter/60 sn ve en çok 30 parça sınırları korunur. Kullanıcı girişi diskte, API'de veya olay kayıtlarında saklanmaz. Kaynak incelemesi ve statik çevrimdışı denetim, işletim sisteminin gerçekten internete çıkmadığını bağımsız olarak kanıtlamaz.

**Prototip gerçek öğrenci ve sınav verisi için onaylı değildir.** NVDA uyumluluğu, üretim ses motoru, gerçek fonetik anlaşılırlık ve akademik doğrulama henüz tamamlanmamıştır.
