# DOU BEP Sınav Atölyesi v2.49 — çevrimdışı sentetik fonem ayırt etme laboratuvarı

**Önemli:** Bu kaynaklar yalnız anonim/sentetik BAP Ar-Ge prototipidir. Gerçek öğrenci, engellilik, sağlık, personel veya gerçek sınav içerikleriyle çalıştırmayın. Windows DOU Reader hâlâ cihaz üzerinde doğrulanmamış bir prototiptir; ses deneyi NVDA ve anlaşılır Türkçe TTS yerine geçmez.

## Geliştirmeler

- **`/dou-speech-phoneme`**: Yerel tarayıcıda sekiz sabit kısa sentetik ses için *iki seçenekli dinleme ve tanıma alıştırması*. `s/ş`, `m/n`, `p/k`, `v/z` karşıtlıklarını, iki hedef sözcük de birer defa olacak şekilde toplam sekiz kez sınar. Sıra ve seçenek yönleri tarayıcının kriptografik rastgelelik kaynağından alınan baytlarla karıştırılır. Bu bilimsel anlamda kalibre edilmiş veya doğrulanmış bir fonem test bataryası değildir.
- **Tam dinleme şartı**: Ses bitmeden veya oynatma hata verirse yanıt etkinleşmez. Bir yanıt daha sonra değiştirilemez. Tamamlanmadan sonraki örneğe geçilmez. Kullanıcı dilediğinde denemeyi kapatabilir.
- **Bellek içi sonuç**: Cevaplar tarayıcı sekmesinin belleğinde tutulur; mikrofon, öğrenci kaydı, ağ API'si, yerel depolama, çerez veya serbest metin girişi kullanılmaz. Yalnız sekiz deneme tamamlandığında istek üzerine indirilebilen JSON, **toplam doğru/yanlış** ve karşıtlık başına toplam sayıları içerir. Hedef sözcük, yanıt, soru sırası, kimlik veya zaman bilgisi dışa aktarılmaz.
- **Teknik WAV karşıtlık tanısı**: `dou-speech-phoneme-diagnostics.mjs` ve `tools/dou-speech-phoneme-audit.mjs`, aynı sabit örneklerin 22.050 Hz mono PCM çıktısını karşılaştırır. Süre, mutlak dalga biçimi farkı ve kırpılma sayısını raporlar; öğrenci verilerine veya veritabanına dokunmaz.
- **Regresyon koruması**: Mevcut sınav tasarımı, farklılaştırılmış sınav belgeleri, öğretmen/onay güvenliği, şifreli yedekler, DOU Reader ve önceki DOU Speech modelleri değişmeden korunur. Veritabanı şeması/migrasyonu değiştirilmemiştir. Yeni deney gerçek sınavda otomatik ses motoru değildir.

## Windows yerel kurulum

1. v2.49 kaynak ZIP'ini **yeni, ayrı bir klasöre** açın; çalışan v2.48 kurulumunuzun veya `data` klasörünün üzerine yazmayın.
2. Node.js 22.13+ ile yeni klasörde PowerShell açın ve `npm.cmd start` çalıştırın.
3. Tarayıcıda `http://127.0.0.1:4173/dou-speech-phoneme` sayfasını açın. **Sesi dinle** düğmesine basıp ses tamamlandıktan sonra iki yazılı seçenekten birini seçin. Sonraki örneğe geçin.
4. Sekiz deneme tamamlandığında yalnız anonim **toplu sonuçları** JSON olarak indirin. Katılımcı verisini kayıt altına almak için bu kaynakları değiştirmeyin; etik ve KVKK protokolü gerekir.
5. Laboratuvarın *saf teknik* metrikleri için `npm.cmd run speech:phoneme-audit` komutunu çalıştırın. Komut metin parametresi kabul etmez ve diske rapor yazmaz.

## Araştırma kısıtları

- `s/ş`, `m/n`, `p/k`, `v/z` örneklerinin farklı WAV dosyaları üretmesi, Türkçe seslerin doğru çıkarıldığını, insan tarafından anlaşılabilirliğini veya daha iyi olduğunu **göstermez**.
- Sekiz denemelik yerel alıştırma, cihazın sesi ve katılımcının duyma koşulları bilinmeden yorumlanamaz. JSON herhangi bir *klinisyen kararı*, öğrenci performansı veya üretim yeterliliği için kullanılamaz.
- Akustik model gerçek doğal konuşma üretmiyor. Bağımsız kullanıcı/kör transkripsiyon deneyleri, fonetik uzman incelemesi, izinli konuşma korpusu, istatistiksel protokol ve kör değerlendirme henüz gerekli.
- Windows UI Automation, NVDA/JAWS uyumluluğu, kurum SSO, canlı verinin uygulama düzeyinde şifrelenmesi, PDF/UA ve gerçek kullanıcı erişilebilirlik kabulü tamamlanmamıştır.

## Yerel doğrulama

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
npm.cmd run speech:phoneme-audit
```

Testler sentetik veriye ve kaynak koduna dayalıdır. Gerçek Windows ekran okuyucu veya insan konuşma algısı testinin yerine geçmez. GitHub Actions kullanılmaz.
