# DOU Reader MVP — Soru / Seçenek Ayrı Seslendirme

## Kapsam
Bu değişiklik, öğrenci pilot ekranı ve anonim Reader demosunda aynı
yerel Türkçe konuşma motoruyla üç ayrı **kullanıcı başlatmalı** okuma sunar.
Mevcut üretim BEP V4, Windows native Reader, sınav yanıt akışı veya özel ses
araştırması dosyaları değiştirilmedi.

1. **Soruyu ve seçenekleri oku:** Mevcut tam-soru seslendirmesi korunur.
2. **Soru metnini oku:** Soru numarası, soru metni, yazılı yönerge ve varsa
   görsel betimlemeyi okur. Seçenekleri okumaz.
3. **Seçenekleri oku:** Soru numarası ve görünür seçenekleri okur;
   eşleştirmede sol/sağ satırları da kapsar. Soru metnini tekrarlamaz.
   Soru seçenek içermiyorsa bu düğme pasiftir.

## Erişilebilir kısayollar
Kısayollar yalnız sınav oynatıcı açıkken etkindir. Yanıt girişlerine
odaklanıldığında, metin düzenlenirken, klavye IME bileştirmesi sürerken
veya başka bir işlem olayı önceden işlediyse uygulanmaz.

| Kısayol | Eylem |
|---|---|
| Alt+Shift+R | Soruyu ve seçenekleri oku |
| Alt+Shift+J | Yalnız soru metnini oku |
| Alt+Shift+O | Yalnız seçenekleri oku |
| Alt+Shift+S | Durdur |
| Alt+Shift+N / P | Sonraki / önceki soru |
| Alt+Shift+H | Kısayol yardımını aç veya kapat |

Kısayolların klavye dili ve ekran okuyucu ile olası çakışmaları gerçek
Windows/NVDA pilotunda ayrıca test edilmelidir. Tüm komutlara Tab tuşuyla
erişilebilen görünür düğmeler de sunulur.

## Kesin güvenlik sınırı
- `audioAllowed:false` ise **üç okuma biçimi de reddedilir**.
- Seslendirmeye yalnız öğrenciye gösterilebilir soru alanları girer.
  Yanıt anahtarı, öğretmen notu, öğrenci cevapları okunmaz.
- Her okuma 16.000 karakter sınırına ve önceki yerel ses denetimlerine tabidir.
- Başka soruya geçilince önceki soru sesi durur.
- Cihazda kurulu yerel Türkçe ses bulunmuyorsa okuma pasiftir;
  hiçbir dış servis, ElevenLabs veya otomatik uzaktaki ses devreye girmez.
- Bu değişiklik bağımsız doğal Türkçe TTS motoru olarak sunulmaz.

## Windows yerel doğrulama
```powershell
Set-Location "D:\Projects\DOU-READER-SPEECH-INDEPENDENT"
node --test dou-reader-core.test.mjs dou-reader-panel.test.mjs dou-speech.test.mjs dou-reader.http.test.mjs dou-reader-cue-preview.test.mjs
node --test reader-speech-research/*.test.mjs
```

## İnsan kabul kontrolü
1. Sınav/demoyu açın ve üç okuma düğmesinin etiketini görün.
2. Yerel Türkçe ses kuruluysa üç düğmeyle sırasıyla dinleyin.
3. Alt+Shift+J ve Alt+Shift+O kısayollarını deneyin.
4. Bir yanıt alanına odaklanınca kısayolların devreye girmediğini
   ve yazılan yanıtları değiştirmediğini kontrol edin.
5. İzin kapalı soruda okumanın pasif olduğunu doğrulayın.
6. Soru değiştirirken önceki sesin kesildiğini doğrulayın.
7. NVDA ve ekran büyütme/kontrast araçlarıyla odağı ve butonları
   ayrıca denetleyin.

Kod testleri gerçek ses kalitesini, NVDA erişilebilirlik kabulünü veya
kurumsal canlıya alma iznini kanıtlamaz.
