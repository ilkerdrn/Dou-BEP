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
