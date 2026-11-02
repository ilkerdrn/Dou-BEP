# DOU BEP Sınav Atölyesi v2.68 — Serbest metin ses deney laboratuvarı

30 Ekim 2026 · Araştırma prototipi, **resmî kullanıma hazır değil**.

## Çalışan yenilik

- DOU Reader (`http://127.0.0.1:4173/dou-reader-demo`) ilk bölümde örnek Türkçe metin girişi, yerel WAV oluşturma/oynatma/indirme/durdurma ve temizleme içerir.
- Metin **isteğe bağlı** girilir; 360 karakter, 60 saniye ve 22.050 Hz mono PCM16 WAV ile sınırlandırılır. Uzun metinler sözcük sınırlarından küçük parçalara ayrılır.
- Türkçe büyük/küçük harfler, temel noktalama, satır sonları ve rakamlar desteklenir. Sayılar **rakam rakam** söylenir. Kesme işareti boşluk olarak ele alınır. İstisnalar ve doğru sözcük vurgusu dilbilimsel olarak doğrulanmamıştır.
- Eski v2.46–v2.67 fonem, A/B/C/D ses çıktıları ve eski sınav okuyucu yolu **değiştirilmedi**. Yalnız bağımsız yeni ses laboratuvarı açıldı.
- Ses üçüncü taraf TTS, `speechSynthesis`, uzak API, servis, harici model, mikrofon veya sistem seslerinden **üretilmez**. JavaScript içinde deterministik sentetik sinyal hesaplanır.
- Girdi sunucuya gönderilmez, diskte kayıt veya sunucu logu oluşturulmaz. WAV yalnız tarayıcı belleğindedir; indirme kullanıcı istediğinde başlar.

## Çok önemli sınırlar

Bu **doğal, güvenilir veya anlaşılır Türkçe TTS değildir**. Robotik deneysel ses, Türkçe metne karşılık PCM üretse de normal konuşma gibi anlaşılma ve ekran okuyucu fonksiyonlarını karşılamaz. Windows UI Automation, SAPI veya NVDA eklentisi geliştirilmeli ve ayrı Windows kullanıcı/erişilebilirlik testleri tamamlanmalıdır. **Gerçek öğrenci sınavı, engellilik/sağlık verisi veya kimlik bilgisi girmeyin.**

## Windows kurulumu (mevcut hesabı koruyarak)

1. `BASLAT.bat` sunucusunu kapatın. Önce mevcut proje klasörünüzü ve `data/` klasörünüzü **yedekleyin**.
2. Güncel kaynak ZIP'ini yeni, boş bir dizine açın. Yeni ZIP içinde `data/` yoktur: bu yüzden eski kurum girişiniz yeni klasöre **taşınmaz**.
3. Var olan kurulumunuzu korumak istiyorsanız **yalnızca kod dosyalarını** (mevcut `data/`, SQLite, log, anahtarlar hariç) mevcut dizininize kopyalayın; dosyaları ezmeden önce yedek alın.
4. `BASLAT.bat` ile başlatın; `http://127.0.0.1:4173/dou-reader-demo` sayfasında örnek metni okutun. Eski demo oturumuna dokunmayın.

## Test

`node --test dou-speech-free-text.test.mjs` ve `node release-check.mjs`

Kodun test edilmesi üretimin kullanıma/akademik doğrulamaya hazır olduğu anlamına gelmez.
