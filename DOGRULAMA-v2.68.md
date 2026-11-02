# DOU BEP Sınav Atölyesi — v2.68 sürüm doğrulaması

Tarih: 30 Ekim 2026. Yerel araştırma prototipi. Resmî veya kişisel veri kullanımına onay değildir.

## Yeni sürüm

- `dou-speech-free-text.mjs`: 360 karakter/60 sn sınırı, yerel Türkçe grafemlerden robota yakın PCM16 WAV üretimi; metin sözcük sınırlarından 45 karakterden kısa alt seslere ayrılır. Söz dizimsel/fonetik Türkçe TTS doğrulanmış değildir.
- `dou-speech-free-text-ui.mjs`: kullanıcı talebiyle üret/dinle/durdur/indir/temizle. Sentez yalnız tarayıcı tarafında yapılır; veri sunucuya gönderilmez.
- Reader içinde premium örnek metin kartı. Önceki A/B/C/D sabit sesleri ve v2.67 sabit panel menüleri korunur.

## Gerçekleşen testler

- 12 ayrı test grubunda 128 test dosyası, **671/671 otomatik test başarılı**.
- `node release-check.mjs`: **287/287 kontrol başarılı**.
- `node tools/acceptance-pilot.mjs`: **10/10** sentetik kabul senaryosu, `productionReady=false`.
- `node tools/offline-audit.mjs`: **106 dosyada 0 doğrudan dış kaynak çağrısı**; statik taramadır, firewall garantisi değildir.
- Ayrı demo SQLite ile canlı HTTP denetimi: demo giriş, oturum, anonim sınav taslağı oluşturma (201), Reader sayfası ve iki yeni JS dosyası (200), 3 özel dosya reddi (404): **15/15** denetim başarılı.
- WAV örneği robotik, 22.050 Hz mono PCM16, **6,35 saniye**; bilimsel anlaşılırlık testi değildir.

## Sınırlar ve gizlilik

- Üretim hazır Türkçe TTS, NVDA modülü veya bağımsız Windows ekran okuyucu değildir. Metinler ve sayılar dilbilimsel olarak doğru telaffuz garantisi taşımaz.
- Gerçek katılımcılarla değerlendirme ve Windows arayüzünün görsel/klavye/ekran okuyucu kabulü henüz yapılmadı.
- Kaynak pakette `data/`, gerçek hesaplar, SQLite, anahtarlar, sırlar, loglar veya kabul raporları yoktur.
- Yama mevcut `data/` klasörüne, hesaplara ve mevcut veritabanına dokunmaz; değiştirdiği kod dosyalarını yedekler.
