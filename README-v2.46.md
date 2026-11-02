# DOU BEP v2.46 — DOU Speech Lab heceleme ve prozodi araştırma prototipi

**Yalnız sentetik veri; gerçek öğrencilerin kimlik/sağlık bilgilerini, sınavlarını veya yanıtlarını kullanmayın.** v2.45 ve tüm önceki sınav, Reader, güvenlik, yedekleme ve erişilebilirlik modülleri korunmuştur. Bu sürüm Windows'ta kurulu seslere bağımlı olmayan *deneysel* bir PCM/WAV sentezleyici üzerinde çalışır; **anlaşılır Türkçe TTS, NVDA eşdeğeri, engellilik uyarlaması veya üretime uygun sınav seslendirme motoru değildir.**

## Yeni araştırma parçaları

- `dou-speech-prosody.mjs`: Türkçe yazımdan yaklaşık hece sınırları, son heceye basit vurgu, ünlü süresi, temel soru/ifade tonlaması, ayarlanabilir perde ve hız ile üst sınır kontrollü ses planı. Bir fonetik sözlük veya doğrulanmış Türkçe dilbilimsel işlem değildir.
- `dou-speech-waveform.mjs`: önceki `synthesizeTurkishPreview` korunmuştur; yeni `synthesizeTurkishProsodyPreview` her ses parçası için zaman/değişken perde eğrisi kullanarak 22.050 Hz / mono / 16-bit PCM WAV üretir. Ses hâlâ yaklaşık formant/gürültü temelli robotik prototiptir.
- `dou-speech-quality.mjs`: WAV dosyasının başlık/geçerlik, süre, tepe genlik, RMS, kırpılmış örnek sayısı, etkin örnek oranı, sıfır geçişi ve en yüksek örnek değişimini ölçer. **Bunlar akustik teknik metriklerdir, insanda anlaşılabilirliği veya doğallığı ölçmez.**
- `/dou-reader-demo`: iki ayrı düğme, yalnız sabit sentetik `Merhaba dünya` ifadesi için eski ve yeni WAV sesini hesaplayıp tarayıcı belleğinde dinletir; ses bitince Blob URL kaldırılır. Gerçek sınav sorusu, giriş alanı veya öğrenci kodu laboratuvara aktarılmaz.
- `tools/dou-speech-preview.mjs`: `--mode prosody` seçeneğiyle ikinci varyantı çıktılar; yeni WAV dosyasının üzerine yazmaz, metin girdisi kabul etmez ve teknik metrikleri konsola yazar.

## Kurulum / deneme

Mevcut Windows `data/` klasörünüzü **değiştirmeyin**. Bu ZIP'i yeni klasöre açın. Node.js 22.13+ ile:

```powershell
npm.cmd start
```

`http://127.0.0.1:4173/dou-reader-demo` adresinde *Deneysel sesi üret ve çal* ve *Hece ve vurgu denemesini çal* düğmelerini dinleyin. Doğallık ve anlaşılabilirlik hakkında insan testi yapılmamıştır.

Yalnız anonim sabit örnek ile komut satırında WAV oluşturma:

```powershell
node .\tools\dou-speech-preview.mjs --out .\temel-robotik.wav
node .\tools\dou-speech-preview.mjs --out .\heceli-robotik.wav --mode prosody
```

Her çıktı için **önceden bulunmayan** dosya adı kullanın. Terminalde RMS, tepe ve kırpılma ölçüleri yer alır. Gerçek sınav belgelerini metin argümanı olarak bu laboratuvara vermeyin; CLI bu özelliği bilerek sağlamaz.

## Geçerlilik ve güvenlik sınırları

- Ortografik Türkçe heceleme ve vurgular *sezgiseldir*, Türkçenin tüm vurgu istisnalarını/yabancı kelimeleri/sayı-okuma kurallarını karşılamaz.
- Robotik sentezde anlaşılabilirlik, fonem doğruluğu, prosodi iyileşmesi, MOS veya erişilebilirlik başarısı **doğrulanmamıştır**. Bir sürümün RMS veya tepe seviyesi diğerinden daha iyi duyulduğunu göstermez.
- Üretim sınavındaki seslendirme mekanizması hâlâ cihazın doğrulanabilir yerel Türkçe seslerini ve öğretmen ses iznini kullanır; deneysel motor gerçek sınavlara bağlanmamıştır.
- Windows UI Automation okuyucu ve gerçek Windows ses testleri bu Linux ortamında yapılmadı. Kendi ileri TTS modelimizin eğitimi, insan ses verisi toplama/etik izin, dilbilimci incelemesi, görme engelli kullanıcı testleri, PDF/UA ve kurumsal SSO/KVKK hâlâ gereklidir.

## Yerel doğrulama

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
```
