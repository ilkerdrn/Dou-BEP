# DOU BEP Sınav Atölyesi v2.50 — Yerel fonem karıştırma matrisi ve anonim toplu analiz

**Yalnız anonim ve sentetik BAP/Ar-Ge çalışmasıdır.** Gerçek öğrenci/sınav/sağlık bilgileri veya doğrudan insan araştırma verilerini kurumun etik/KVKK süreçleri olmadan kullanmayın. Bu, klinik fonem testi veya doğal Türkçe TTS değildir.

## Bu sürümde ne değişti?

- `/dou-speech-phoneme`: Mevcut 8 sabit sentetik uyaranlı alıştırma aynı kaldı. Tüm yanıtlar verildikten sonra **yalnız açık sekmenin belleğinde** dört ayrı 2×2 hedef/duyulan karıştırma matrisi oluşturulur. Sözcük başına tek gözlem olduğundan bu tablolar araştırma geçerliliği sağlamaz. **Matris dışa aktarılmaz.** Eski JSON raporu değişmedi; hedef sözcük, ham seçim veya deneme sırası rapora eklenmez.
- `/dou-speech-pool`: Kullanıcının cihazında 10–100 tamamlanmış anonim JSON raporu birleştirir. Sadece `dou-phoneme-forced-choice-v1` biçimi kabul edilir. Raporlarda ek alanlar, kimlik/tarih, geçersiz toplam, eksik deneme reddedilir; her dosya en fazla 4096 bayt olmalıdır. Tarayıcıda dosya adları gösterilmez veya dışa aktarılmaz; sunucuya/harici hizmete yükleme yoktur.
- Çıktı: Rapora göre sayılar, her ses karşıtlığı için hata oranı ve *koşullu* Wilson %95 aralığı. Raporların farklı insanlardan geldiği veya bağımsız örneklem olduğu **doğrulanamaz**. Aynı rapor tekrar seçilebilir; tekrarları algılama ve bağımsızlık ispatı yoktur. Dolayısıyla aralıkları nüfusa genellemek doğru değildir.
- **Önemli teknik sınır:** Önceki JSON raporları yalnız çift düzeyinde toplamlara sahip olduğundan toplu raporlardan yönlü `Sasa → Şaşa` gibi bir karıştırma matrisi hesaplanamaz. Yönlü matris sadece oturum içinde gösterilir ve sayfa kapanınca silinir.
- Mevcut üniversite sınav editörü, uyarlama/onay akışları, SQLite şeması, DOU Reader, Windows pilotu, sentetik WAV çekirdeği ve eski sürüm dosyaları korunur. Gerçek sınav okuyucusuna deneysel akustik motor bağlanmaz.

## Windows'ta açma

1. ZIP'i **mevcut v2.49 kurulumunun ve `data` klasörünün üzerine yazmadan** ayrı bir klasöre çıkarın. Node.js 22.13+ gerekir.
2. Yeni klasörde PowerShell açıp `npm.cmd start` çalıştırın.
3. İlk olarak `http://127.0.0.1:4173/dou-speech-phoneme` sayfasında sentetik sekiz denemeyi tamamlayın. Matrisin cihazda görünmesini ve yalnız anonim sayısal JSON'un indirildiğini kontrol edin.
4. Çok sayıda **yalnız deneysel/anonim** JSON mevcutsa `http://127.0.0.1:4173/dou-speech-pool` sayfasına gidin. En az 10, en fazla 100 tam rapor seçip cihazda hesapla düğmesine basın. Dosyaların farklı kişilerden geldiği teyit edilemediği için sonuçları bilimsel çıkarım olarak kullanmayın.
5. Kaynak doğrulaması: `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot`.

## Kabul edilmemesi gereken iddialar

- Bu, NVDA/JAWS alternatifi veya kurumsal erişilebilirlik sertifikası **değildir**. Windows UI Automation ve yerel Türkçe sesler gerçek cihazlarda ayrıca sınanmalı.
- Sentetik, robotik WAV üreten DOU Speech Lab doğal veya anlaşılır Türkçe üretiminin kanıtı **değildir**. Fonetik uzman ve onaylı insan dinleme çalışması hâlâ gereklidir.
- Bunlar küçük, tasarımsal olarak yanlı ve tekrarlanabilir laboratuvar örnekleridir; istatistiksel güven aralığı tek başına deney tasarımını geçerli yapmaz.
- Gerçek öğrenci bilgilerinin korunması, canlı SQLite veri şifreleme, SSO, PDF/UA, NVDA testleri, kurumsal etik ve gerçek kullanıcı erişilebilirlik onayı henüz tamamlanmadı.
