# DOU BEP Sınav Atölyesi — v2.67 doğrulaması

Tarih: 30 Ekim 2026. Yalnız yerel, sentetik ve anonim pilot. Resmî kurumsal kullanıma onay değildir.

## Değişiklikler

- 12 yönetim + 4 Reader/laboratuvar ekranında tek ve aynı 12 menü yolu, etkin sayfa ve yeni sınav kısayolu.
- Premium koyu bordo/erik sidebar, beyaz kartlar, responsive sayfalar ve klavye kontrolü.
- Sınav editöründe yükleme durumu, modül hatasında görünür yeniden deneme ekranı. Önceki 3 eksik statik JS dosyasının izinli HTTP rotaları korundu.
- Veri tabanı şeması, oturum API'sı, onay motoru ve deneysel ses bileşenlerine yeni veri yolu eklenmedi.

## Testler

- 12 bağımsız test grubunda 127 test dosyası ve **662/662 otomatik test başarılı**.
- `node release-check.mjs`: **281/281 kontrol PASS**.
- `node tools/acceptance-pilot.mjs`: **10/10 anonim sentetik senaryo PASS**; `productionReady=false`.
- `node tools/offline-audit.mjs`: **104 yayınlanmış dosyada 0 doğrudan harici kaynak çağrısı** (statik analiz; firewall denetimi değildir).
- Yeni yönetim menüsü, tüm HTTP navigasyon rotaları, sunucu tarafından yayımlanan JS/CSS ve özel kaynakların 404 koruması: hedefli testler PASS.
- İzole SQLite demo kurumuyla gerçek HTTP test: giriş (200), session (200), sınav listesi (200), anonim demo sınav kaydı (201), 5 HTML/JS/CSS kaynağı (200): **9/9 PASS**.
- Chromium tabanlı tarayıcı üzerinden localhost görsel testi bu çalıştırma ortamının tarayıcı ağ politikası nedeniyle yapılamadı. Kullanıcının Windows bilgisayarında son ekran ve klavye kabul testi gereklidir.

## Kullanıcı verisi koruması

- Kaynak ZIP'inde `data/`, SQLite, gerçek kullanıcı hesapları, sırlar, anahtarlar, test raporu JSON'ları veya loglar yok.
- Küçük yama yalnız kaynak dosyaları ve arayüzleri değiştirir; kendi `data/` klasörüne dokunmaz; değiştirilen dosyaları önce yedekler.
- Yükleme başarıyla tamamlandı demek, gerçek öğrenci verisiyle kullanıma hazır demek değildir.
