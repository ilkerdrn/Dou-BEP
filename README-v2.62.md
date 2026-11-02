# DOU BEP Sınav Atölyesi v2.62 — Türkçe grafem/hece denetimi

**BAP araştırma prototipi.** Bu sürüm gerçek Türkçe konuşma sentezleyicisi, NVDA eşdeğeri, doğal fonetik doğrulama, bilimsel dinleme sonucu veya üniversite kurum onayı **değildir**. Gerçek engellilik/tanı verisi veya canlı sınav verisi ile denemeyin.

## Yenilik: sınırlandırılmış Türkçe yazımsal model denetimi

- `dou-speech-orthography.mjs` yalnız 14 sabit laboratuvar örneği (`TR01`–`TR14`) için çalışır. Farklı metin, dosya, URL veya parametre kabul etmez.
- Daha önceden gözden geçirilmiş örnek hece bölümleri, mevcut `syllabifyTurkish` ve `planTurkishProsody` çıktılarına karşı ikinci bir referans olarak denetlenir. Her hecede bir ünlü segmenti, beklenen hece sınırları, sözde vurgu işaretleri ve segment sınıfları karşılaştırılır.
- Sekiz Türkçe yazılı ünlü (`a e ı i o ö u ü`) ön/arka, düz/yuvarlak ve açıklık (açık/orta/kapalı) özellikleriyle **ortografik** olarak tanımlanır. Bunlar akustik ölçüm veya otomatik fonem transkripsiyonu değildir.
- `/dou-reader-demo` içinde **14 örneğin hece yapısını denetle** kontrolü, erişilebilir iki tablo ve ekran okuyucunun okuyabileceği durum metni eklenmiştir. Raporda yalnız sabit örnek kodları, sayılar ve özellik kategorileri yer alır; örnek sözcükler, kişi, öğrenci, sınav metni veya ses kaydı bulunmaz.
- `npm run speech:orthography-audit` argüman kabul etmeyen, salt-okunur çevrimdışı JSON raporunu ve SHA-256 bütünlük özetini konsola yazar. Bu modül normal Reader'ın ses motoruna, sınav onayına, SQLite verilerine veya deneysel A/B/C WAV algoritmalarına bağlanmaz.

## Başlatma ve test (Windows)

1. v2.62 ZIP içeriğini kendi klasörüne çıkartın. Önceki kurulumun `data` klasörünü **üzerine yazmayın**; mevcut veriyi ayrıca yedekleyin.
2. Windows'ta Node.js **22.13+** ile `BASLAT.bat` veya `npm.cmd start` çalıştırın. Adres: `http://127.0.0.1:4173/dou-reader-demo`.
3. **14 örneğin hece yapısını denetle** düğmesine basın. İki tablo klavye ile incelenebilir. İsterseniz `npm.cmd run speech:orthography-audit` ile sayısal JSON raporu alabilirsiniz.
4. Regresyon komutları: `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot`.

## Bilimsel ve güvenlik sınırı

- Sabit örneğe göre başarılı bir heceleme karşılaştırması **fonetik doğruluk, iyi telaffuz, doğal TTS veya anlaşılırlık kanıtı değildir**. `ğ`, sözcük vurgusu, istisnalar, kelime içi morfoloji ve bağlantılı konuşma bu deneysel modelde kapsamlı işlenmiyor.
- Gerçek Windows/NVDA/JAWS ve bağımsız TTS değerlendirmesi, kurumsal sızma/erişilebilirlik kontrolleri, etik onay ve uzman dinleme çalışması hâlâ gerekir.
- Çevrimdışı kaynak taraması yalnız arayüzlerdeki doğrudan uzak kaynak bağlantılarını inceler. OS/ağ düzeyinde test edilmiş izolasyon değildir.
