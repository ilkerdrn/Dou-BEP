# DOU BEP Sınav Atölyesi v2.59 — Sabit Türkçe sentetik ses korpusu

> Bu sürüm yalnız **anonim/sentetik BAP/Ar-Ge prototipidir**. Gerçek öğrenci, sağlık, engellilik, personel, sınav veya özel ses verisi kullanmayın. Resmî üniversite ürünü, NVDA alternatifi veya doğal Türkçe TTS motoru değildir.

## Geliştirmeler

- `dou-speech-corpus.mjs`: **14 sabit, kod içerisinde tanımlı** sentetik ortografik örnekten oluşan laboratuvar korpusu. Dört örnek sekiz Türkçe ünlü **harf sınıfına**, sekiz örnek dört eş ünlülü ünsüz **yazım karşıtlığına**, iki örnek ise basit durak ve sözde doğal cümle sonuna odaklanır.
- Mevcut v2.56 spektral ve v2.57 zamanlama WAV algoritmaları değiştirilmez; her örneğin iki sürümünde 22.050 Hz, mono 16-bit PCM içindeki süre, RMS, tepe, kırpılma, hizalı sınır adedi, sınır sıçraması ve RMS farkı ölçülür.
- Çıktı yalnız `TR01`–`TR14` gibi **opak örnek kodları ve sayılardan** oluşur. Sözcük, harf dizisi, WAV baytları, kullanıcı girdisi, öğrenci, kimlik, zaman veya dosya adı **rapora girmez**. `vowelClassCoverage`, yalnız ünlü harf sınıfının bulunup bulunmadığını ifade eder.
- `/dou-reader-demo` arayüzünde **"Sabit ses korpusunu ölç"** seçeneği isteğe bağlı olarak anonim, klavye ile erişilebilir bir tablo gösterir; dosya oluşturmaz, ses çalmaz, veri sunucuya göndermez.
- `npm run speech:corpus-audit` komutu aynı sabit korpusu stdout'ta JSON biçiminde üretir ve tekrarlanabilirliğin denetimi için çıktının SHA-256 özetini içerir. Metin, dosya, URL ve herhangi bir argüman kabul etmez.
- Yedi yeni korpus testi; eski modüller, onay, soru bankası, SQLite ve Reader altyapısı korunur. `data` ZIP içinde bulunmaz.

## Windows yerel kullanım

1. ZIP'i eski projenin, özellikle mevcut `data` klasörünün **üzerine çıkarmadan** ayrı bir klasöre çıkarın. Node.js 22.13 veya üstü gerekir.
2. `BASLAT.bat` veya `npm.cmd start` çalıştırın; ardından `http://127.0.0.1:4173/dou-reader-demo` sayfasında **Sabit ses korpusunu ölç** düğmesini seçin.
3. Denetim raporunu kişisel dosya okumadan görmek için proje klasöründe `npm.cmd run speech:corpus-audit` komutunu çalıştırın.
4. Regresyon testleri: `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot`.

## Kapsam sınırları

Sekiz **ortografik** ünlü sınıfını taramak fonetik sesleri kalibre etmez. Dört küçük yazım karşıtlığı bilimsel kontrollü dinleme çalışması değildir. Sayısal WAV özellikleri ses kalitesi, telaffuz doğruluğu, anlaşılırlık, konuşma doğallığı, WCAG uyumu veya üretim onayı yerine geçmez. Gerçek Windows/NVDA/UI Automation, Türkçe fonetik uzmanı, etik/KVKK ve PDF/UA değerlendirmeleri eksiktir. Üretim kullanımına hazır değildir.
