# DOU Reader — Doğal Türkçe yerel ses ilk adım

## Durum
Bu sürüm **model keşfi ve güvenli araştırma provasıdır**; doğal ses modeli
kurulduğu, anlaşılır Türkçe üretildiği veya gerçek sınav okuyucusuna
bağlandığı iddiası DEĞİLDİR. Eski robotik prototip ve tarayıcı/Windows
Reader değiştirilmedi.

Mevcut `reader-speech-research/piper-local-research.mjs` altyapısı:
- Yerel Piper `piper.exe`, Türkçe ONNX, ona karşılık gelen JSON ve model
  kartı gerektirir.
- Sadece açık izinle, bir araştırma metninin sabit ID'sini işler.
- Sınav soruları, öğrenci yanıtları ve serbest kullanıcı metnini kabul etmez.
- Geçici WAV oluşturup biçimini kontrol eder, klasörü temizler.
- İnsan dinleme/kavrama ölçümü yapmaz; üretime bağlamaz.

Bu ek, tek klasör üzerinden **salt okunur, tek komutluk Windows ön
kontrolünü** getirir. Güvenilmeyen binary'yi çalıştırmaz, indirme
veya kurulum yapmaz, veritabanına erişmez ve ağ bağlantısı kurmaz.

## Önce tek komut (güvenli, model gerekmez)
```powershell
Set-Location "D:\Projects\DOU-READER-SPEECH-INDEPENDENT"
npm run reader:neural:check
```
Bu komut yalnız `D:\DOU-PIPER-LAB` klasörünü araştırır.
Klasör yoksa `NOT READY` yazar. Bu normaldir, hata veya kurulum
yapıldığı anlamına gelmez. Yerel proje dosyaları etkilenmez.

Başka, önceden hazırlanmış klasör için:
```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-neural-local.ps1 -BundlePath "D:\REVIEWED-LOCAL-TTS"
```

## Beklenen klasör yapısı
```text
D:\DOU-PIPER-LAB\
  piper.exe                       # Bağımsız doğrulanmış, Windows uyumlu binary
  tr_TR-authorized-medium.onnx    # Lisans/konuşmacı izni ayrıca incelenmiş model
  tr_TR-authorized-medium.onnx.json
  MODEL_CARD                      # Orijinal kaynak, eğitim verisi, lisans bilgisi
```
Bu isimler örnektir; dosyalar projeye dahil edilmedi ve komut
bunları indirmez. Aynı klasörde tam **bir** `tr_TR-*.onnx` modeli
bulunmalı. Test amaçlı sahte exe/model dosyalarını dinleme için
kullanmayın.

`candidateDetected:true` yalnız dosya ve yapılandırma biçimlerinin
uygun göründüğünü ifade eder; lisans, model doğruluğu, ses kalitesi
ve güvenli native yürütme **onaylanmış değildir**.

## Gerçek yerel dinleme (ancak inceleme ve izolasyondan sonra)
Bilinen kaynaktan alınmış, doğrulanmış bir Piper ikilisi, yasal olarak
uygun bir Türkçe model ve ağdan tamamen izole edilmiş Windows ortamı
sağlanınca araştırmacı isteğe bağlı aşağıdaki komutu kullanabilir:
```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-neural-local.ps1 -BundlePath "D:\DOU-PIPER-LAB" -PromptId TR001 -Play -RightsReviewed
```
`-RightsReviewed` bir izin/lisans belgesi değildir. Gerçek lisans incelemesi
ve OS düzeyinde ağ izolasyonu yapılmadıysa `-Play` kullanmayın.
Önceki `dou-piper-windows-listening-lab.ps1` arayüzü yalnız
sabit anonim `TR001` cümlesini seslendirir. Bu, üretim Reader'a
dinamik seslendirme bağlamaz.

## Modellerde lisans ve kalite
Piper Türkçe `dfki` modelinin MODEL_CARD dosyası, eğitim verisi için
`CC BY-NC-SA 4.0` belirtir. Bu modelin üniversite/kurumsal/ticari
kullanımda otomatik uygun olduğunu varsaymayın.

Kaynak: https://huggingface.co/rhasspy/piper-voices/blob/main/tr/tr_TR/dfki/medium/MODEL_CARD

Diğer araştırma adayı: Pocket TTS Turkish, 110M parametreli yerel CPU
uyumlu bir model sunuyor. Yayıncı model ağırlıklarını CC-BY-4.0,
kodunu Apache-2.0 olarak beyan ediyor; bağımsız kalite, güvenlik,
konuşmacı hakları ve üniversite uyumluluğu kontrol edilmelidir.
Piper/ONNX kontrol komutu Pocket TTS modelini doğrulamaz.

Kaynak: https://huggingface.co/wite-tech/pocket-tts-turkish
Kod: https://github.com/witetech/pocket-tts-turkish

## Sıradaki kapılar
1. Uygun lisanslı/izinli doğal Türkçe model belirlemek
2. Yerel kaynakları ve native yürütülebilirleri güvenli incelemek
3. Sabit, anonim Türkçe cümlelerde gerçek dinleme ve yazıya çeviri puanları
4. Gecikme/bellek ve donanıma uygunluk ölçümü
5. Erişilebilirlik kullanıcı kabulü ve veri izolasyon incelemesi
6. Ancak bu kapılardan sonra gerçek sınav okuyucusuna entegrasyonu değerlendirmek

## Testler
```powershell
node --test reader-speech-research/reader-neural-readiness.test.mjs reader-speech-research/reader-neural-wrapper-source.test.mjs
node --test reader-speech-research/*.test.mjs
```
Bu testler sahte, yerel dosya fikstürleri kullanır ve native TTS
başlatmaz. Geçmiş test geçişleri bu yeni değişikliğin sonucunu
garanti etmez.
