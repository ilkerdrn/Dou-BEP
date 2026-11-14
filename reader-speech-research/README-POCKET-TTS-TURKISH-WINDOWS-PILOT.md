# DOU Reader — Pocket TTS Turkish ilk yerel ses denemesi

## Ne değişti?
Piper için varsayılan **D:\DOU-PIPER-LAB** klasörü bulunmadığından
`reader:neural:check` komutu **NOT READY** döndü. Bu bir uygulama hatası
değil, bilgisayarda yerel ses modeli olmadığı anlamına gelir.

Bu çalışma, Pocket TTS Turkish'i **ayrı** bir `D:\DOU-POCKET-TTS-LAB`
ortamında yalnızca bir anonim sabit Türkçe cümlede değerlendirebilmek
içindir. DOU Reader, DOU Speech robotik araştırma motoru, gerçek sınavlar,
öğrenci hesapları, kullanıcı verileri ve Windows UI Automation değiştirilmedi.

Pocket TTS Turkish geliştirici README:
https://github.com/witetech/pocket-tts-turkish
Model kartı: https://huggingface.co/wite-tech/pocket-tts-turkish

Yayıncı, kod için Apache-2.0, model ağırlıkları için CC-BY-4.0
bildiriyor. Bunlar bağımsız hak ve kurumsal kullanım incelemesi
yerine geçmez. Özellikle konuşmacı hakları, upstream hakları,
sürüm ve tedarik zinciri ayrıca incelenmelidir. Hazır altı ses
`female_1..3`, `male_1..3` olarak sunuluyor; hiç kimsenin
kişisel sesini klonlamıyoruz.

## Adım 1: Yalnızca mevcut durumu kontrol et
```powershell
Set-Location "D:\Projects\DOU-READER-SPEECH-INDEPENDENT"
npm run reader:pocket:check
```
Paket kurulmadıysa `NOT READY` döner. Bu normaldir; komut indirmez.

## Adım 2: Yalnızca kendi araştırma bilgisayarında opt-in kurulum
Python 3.10, 3.11 veya 3.12 x64 ve Windows Python Launcher
(`py.exe`) gerekir. Python kurulumu ve üçüncü taraf paketler
ayrı kaynaklardan geldiği için önce izin ve güvenlik değerlendirmesi
yapın. Bu komut internetten pip paketleri yükler:
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\dou-reader-pocket-tts.ps1" -Setup
```
Sanal ortam `D:\DOU-POCKET-TTS-LAB\.venv` içinde kalır.
Mevcut Node paketlerini, DOU BEP veritabanını veya Reader kodunu
değiştirmez. PyTorch gibi büyük bağımlılıklar indirilebilir.
Tedarik zinciri ve kurumsal politika onaylanmadan çalıştırmayın.

## Adım 3: İlk sabit Türkçe örnek sesi oluştur
İlk model indirmesine ayrıca izin verilmelidir; yayıncının belirttiği
model yaklaşık 440 MB'tır. Bu komut yalnız
`POCKET-TTS-FIXED-EXAMPLE-TR001.txt` içindeki açık, anonim
bir cümleyi kullanır:
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\dou-reader-pocket-tts.ps1" -Generate -AllowModelDownload -Voice female_2
```
Model önceden önbellekteyse internetsiz deneme için:
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\dou-reader-pocket-tts.ps1" -Generate -Voice male_1
```
Bir çıktı dosyası varsa üzerine yazılmaz.
Oluşturulan WAV, `D:\DOU-POCKET-TTS-LAB\` klasöründedir;
proje deposuna veya sunucuya yüklenmez. İlk kurulum / ilk model
indirmesi internet ister; sonraki üretim yalnızca model ve
gerekli kaynaklar zaten yereldeyse internetsiz denenebilir.
Testin yerel çalışması ağ trafiğinin bütünüyle imkânsız olduğunu
kanıtlamaz; bunu OS izolasyonuyla güvence altına alın.

## Sonraki kabul kapıları
- WAV gerçekten anlaşılır mı? Dinleyerek, kör A/B testleriyle,
  Türkçe kelime doğruluğu ve vurgu ölçümüyle değerlendirmek gerekir.
- Kurum lisansı ve tedarik zinciri uygun mu?
- Windows CPU üzerinde kaynak/g gecikme yeterli mi?
- Erişilebilir öğrenci pilotu ve gizlilik incelemeleri yapıldı mı?

**Bu sürüm gerçek sınav okuyucusuna doğal TTS bağlamaz.**
Bir WAV oluşması, modelin doğal veya production-ready olduğuna
kanıt değildir. Her türlü entegrasyon önce bu kapılardan geçmelidir.

## Kaynak kod testleri
```powershell
node --test reader-speech-research/reader-pocket-tts-source.test.mjs
node --test reader-speech-research/reader-neural-readiness.test.mjs
```


## Demo ekranında yerel 24 kHz WAV dinleme
Yeni `dou-reader-neural-sample.mjs` dosyası yalnız demo sayfasında
`Yerel doğal Türkçe ses — Pocket TTS denemesi` bölümünü sağlar.
Piper/ElevenLabs sabit anons önizlemesinden ayrıdır çünkü o bölüm
22.050 Hz WAV isterken Pocket TTS Turkish 24 kHz PCM16 mono WAV üretir.

1. `npm start` ile `http://localhost:4173/dou-reader-demo` adresini açın.
2. Deneysel Pocket TTS bölümünde yalnız `D:\DOU-POCKET-TTS-LAB\DOU-PocketTTS-TR001-female_2.wav`
   dosyasını yerel dosya seçiciyle yükleyin.
3. `Doğal ses örneğini dinle` düğmesine basın. Yazılı sabit örnek metnini
   gerçekten okuduğunu ve doğal olup olmadığını kulakla doğrulayın.
4. `Örneği durdur` düğmesi çalışmalı. Başka bir WAV sürüklenip seçilse bile
   hiçbir ses otomatik başlamaz.

Dosyalar sunucuya gönderilmez; `Blob` URL'si tarayıcı belleğinde
oluşturulur ve durdurmada ya da sayfadan çıkarken kaldırılır.
Sınav oynatıcıya bağlantı eklenmedi; hiçbir üretim onayı verilmedi.

Kaynak kod testleri:
```powershell
node --test dou-reader-neural-sample.test.mjs dou-reader.http.test.mjs
```
Bu testler gerçek WAV dosyasını incelemez; gerçek kullanıcı kabulü ayrı yapılmalı.


## Aşama 2 — yeni Türkçe deneme cümlesini doğal sesle okutma

Bu yeni özellik **ayrı Windows/PowerShell laboratuvarındadır**. Kurum, öğretmen veya
öğrenci sayfalarında canlı sentez yoktur; HTTP TTS API'si de eklenmedi.
Önceki karşılama WAV dosyası ve sentetik robotik motor korunur.
Modelin 440 MB ağırlıkları zaten yerelde önbelleğe alınmış olmalıdır.

Paketin kurulu olup olmadığını, **hiç metin sormadan veya model çalıştırmadan**
kontrol edin:

```powershell
Set-Location "D:\Projects\DOU-READER-SPEECH-INDEPENDENT"
npm run reader:pocket:live:check
```

Daha sonra yalnız kendi yazdığınız **anonim, sentetik bir deneme cümlesi**
için çevrimdışı sentezi başlatın:

```powershell
npm run reader:pocket:live
```

Komut 5–220 karakterlik anonim örnek metni etkileşimli olarak sorar.
Varsayılan ses `female_2` ve duygu `sakin`dir. Sesler:
`female_1`, `female_2`, `female_3`, `male_1`, `male_2`, `male_3`.
Çıktı `D:\DOU-POCKET-TTS-LAB\manual-samples\` klasörüne benzersiz WAV
dosyası olarak yazılır; `-Play` ile Windows varsayılan ses oynatıcısında açılır.
Mevcut WAV dosyalarının üzerine yazılmaz.

Erkek sesini denemek için:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\tools\dou-reader-pocket-live.ps1" -Speak -Play -Voice male_1 -Emotion sakin
```

Bu komut metni komut satırına eklemez; `Read-Host` ile alıp
`--text-file -` üzerinden UTF-8 standart girdiye aktarır.
Model çağrısında `HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1` ve
`HF_HUB_DISABLE_TELEMETRY=1` ayarlanır; hiç model veya Python paketi indirilmez.
Model önbellekte yoksa hata alınır. Bu önlemler işletim sistemi düzeyinde
**ağ izolasyonunun** yerini almaz; yüksek güvence için ayrıca ağ erişimini
engelleyin.

**Gizlilik sınırları:** Gerçek sınav sorusu, öğrenci/öğretmen kişisel
bilgileri, telefon, e-posta, kurum sırrı veya erişim bilgisi girmeyin.
Ek kimlik örüntüsü kontrolü eksiksiz bir PII sınıflandırıcısı değildir.
Metin uygulama tarafından ayrı TXT dosyasına yazılmaz, fakat WAV dosyası
**duyulabilir içeriği kalıcı olarak saklar**; yerel ses kayıtlarını siz yönetin
ve gerekirse silin. Windows terminalindeki yazılı giriş de ekranda görünür.

### Tarayıcıda ses hızını değiştirme

`http://127.0.0.1:4173/dou-reader-demo` sayfasındaki
`Yerel doğal Türkçe ses — Pocket TTS denemesi` bölümüne gidin.
`manual-samples` klasöründen WAV dosyası seçin; `Dinleme hızı`
alanında 0,75×, 1×, 1,25× veya 1,5× seçin.
Bu yalnız tarayıcı çalma hızıdır: modelde yeniden ses üretmez,
WAV dosyasını değiştirmez ve içerik sunucuya yüklenmez.
Tarayıcı ve Windows sesleri farklı hızlarda perdeyi farklı koruyabilir.

### Teknik kabul kontrolleri

```powershell
node --test reader-speech-research/reader-pocket-live-source.test.mjs dou-reader-neural-sample.test.mjs dou-reader.http.test.mjs
```

Bu testler kod ve sentetik dosya doğrulamasını kapsar.
**Gerçek Windows çalışması, modelin her metinde doğru Türkçe okuması,
sürekli gerçek zamanlı ses akışı, kurumsal haklar ve üretim kullanımı
henüz onaylanmadı.** Her çağrıda CLI modeli yeniden açabilir; bu
aşama kesintisiz ekran okuyucu ses motoru değildir.
