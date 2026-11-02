# DOU BEP v2.77 — Yerel rapor analizi ve doğrulama

**Tarih:** 30 Ekim 2026. **Durum:** araştırma prototipi, erişilebilir sınavda/Windows NVDA üretiminde kullanıma hazır değil.

## Değişen işlevler

- Daha önce indirilen, anonim, dört motorlu `balanced48` JSON raporlarından en fazla 16 adet (dosya başına en fazla 32 KiB) yalnız tarayıcıda elle okunur.
- Beklenmeyen alan, olası kimlik alanı, farklı protokol, yanlış kelime çifti, yanlış motor toplamı, yanlış ses koşulu ve puan tutarsızlığı reddedilir.
- Dört motor için betimsel toplam başarı, önceki motordan yüzde puan farkı ve sözcük çifti bazında yanlış duyma sayısı sunulur.
- Dışa aktarım protokolü `v2.76` ve `v2.77` RMS koşul işaretlerini destekler; deneme sesleri ve NVDA kaynakları değiştirilmedi.
- Ne raporlar ne de konsol analizleri sunucuya, veritabanına, tarayıcı depolamasına veya uzak API'ye otomatik gönderilir.

## Test sonuçları

- `node --test`: **732 / 732 geçti**, 0 başarısız. Log: `/mnt/data/bep-v277-regression-all-final.log`.
- Rapor denetleyicisi; bozuk JSON, şema dışı alan, protokol uyumsuzluğu, alt/üst toplam tutarsızlığı, gizli kimlik alanları, 32 KiB/16 dosya sınırları ve eski v2.76 rapor uyumluluğu için test edildi.
- `node release-check.mjs`: **321 / 321 PASS** (statik ve dağıtım kontrolleri; erişilebilirlik kabulü değildir).
- `node tools/offline-audit.mjs`: 123 yayımlanan arayüz dosyasında doğrudan harici kaynak bulgusu yok (ağ erişimi ispatı değildir).
- İzole temiz ZIP HTTP akışı: **37 / 37 geçti**; geçici demo hesabıyla oturum doğrulama, anonim sınav taslağı HTTP 201, rapor ekranı, yeni modül HTTP 200 ve özel kaynak erişimi HTTP 404 doğrulandı. `data/` altında gerçek kullanıcı kayıtları kullanılmadı.

## Açık sınırlamalar

- JSON dosyalarının kimden geldiği bilinmez, aynı kişinin tekrarlı cevapları tekilden ayırt edilemez. Sayım *bağımsız insan örneklemi* değildir.
- Doğal Türkçe TTS ve gerçek anlaşılabilirlik iyileşmesi kanıtlanmadı. Bilimsel anlamlılık, WER/CER, kullanıcı kabulü veya NVDA üretim onayı verilmez.
- Windows'ta NVDA ile gerçek odak yönetimi, iptal/konuşma sırası, farklı ses aygıtları ve yardımcı teknoloji incelemesi eksik.
- Paket için `data/`, SQLite, anahtarlar, parola/hesaplar kaynağa eklenmez; güncelleme `data/`yı değiştirmemek için yazıldı. Windows'taki gerçek uygulama sonucu burada görülemez.
