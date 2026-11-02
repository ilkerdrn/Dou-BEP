# DOU BEP v2.41 — DOU Reader ve DOU Speech (yerel ses adaptörü) pilotu

**Kapsam:** Üniversite sınavlarının anonim öğrenci ekranında, metni ve seçenekleri konuşmayla destekleyen **uygulamaya gömülü** Türkçe soru okuyucu. **Bu sürüm NVDA eşdeğeri bir Windows ekran okuyucusu veya OpenAI/DOU tarafından sıfırdan eğitilmiş bağımsız ses sentezleme modeli değildir.** Önceki v2.40 kurum, sınav, iki aşamalı kabul, SQLite, MFA, denetim kanıtları ve yedekleme modülleri korunmuştur. Gerçek öğrenci, engellilik veya sağlık verileriyle kullanıma hazır değildir.

## Öğrenci açısından yeni olanlar

1. `http://127.0.0.1:4173/dou-reader-demo` adresinde sınav kodu olmadan, üç **sentetik** soru ile okuyucuyu deneyin. Üçüncü soruda seslendirme kapalıdır; bunun Reader ile de aşılamadığını görün.
2. `http://127.0.0.1:4173/pilot` adresinde anonim sınav kodu kullanıldığında **DOU Reader** paneli gösterilir. Önceki soru/sonraki soru, soruyu oku, duraklat, sürdür, durdur, hız ve yerel Türkçe ses seçimi bulunur.
3. Kısayollar: `Alt+Shift+R` okuma, `Alt+Shift+S` durdurma, `Alt+Shift+N` sonraki soru, `Alt+Shift+P` önceki soru, `Alt+Shift+H` yardım. Metin yazarken veya seçim kutularındayken kısayollar tetiklenmez. Bazı Windows/Türkçe klavye düzenlerinde Alt+Shift ile dil değiştirme çakışabilir; bu durumda ekrandaki düğmeleri ve Tab/Shift+Tab kullanın.
4. `speechSynthesis` tarafından `localService === true` olarak bildirilen **Türkçe** sesler listelenir. Belirsiz/uzak sesler **seçilmez**; yerel ses bulunamazsa sessiz çalışır ve yazılı sınav erişimi devam eder.
5. Çevrimdışı `Erişilebilir HTML` paketindeki mevcut okuma özelliği de artık yerel olduğu doğrulanmamış sese otomatik geçmez.

**Gizlilik:** Reader mikrofon veya ses kaydı başlatmaz; ses metni, oturum bilgisi ya da sınav yanıtlarını başka bir sunucuya **uygulama tarafından** göndermez. Ses listesi tarayıcının sağladığı işletim sistemi motorundan okunur. `localService` bayrağı **işletim sistemi düzeyinde ağ trafiğinin bağımsız kanıtı değildir**; tüm sistemi ağdan ayırarak ayrıca test etmek gerekir. Başka modüllerdeki açık rıza gerektiren sesli yanıt kaydetme özelliği bu Reader'dan farklıdır.

## Windows PowerShell'de yerel Türkçe SAPI ses kontrolü

```powershell
powershell.exe -NoProfile -File .\tools\dou-speech-windows.ps1
```

Bu komut *yalnızca kurulu Türkçe Windows `System.Speech` seslerini listeler*, yeni yazılım/ses indirmez ve soru metnini işlemez. `System.Speech` seslerinin varlığı, seçtiğiniz tarayıcının bu sesleri `localService=true` olarak göstereceğini **garanti etmez**. Tarayıcıdaki panelden ayrıca kontrol edin. Gerçek Windows üzerinde manuel doğrulama henüz yapılmadı.

## Teknik modüller

- `dou-reader-core.mjs`: öğretmenin `audioAllowed=false` kuralı, öğrenciye görünen soru metni, seçenekler, Türkçe yerel ses filtrelemesi, kısayol politikası.
- `dou-speech.mjs`: tarayıcıya/işletim sistemine bağlı `speechSynthesis` adaptörü, konuşma durdurma ve eski oynatma callbacks'lerini iptal etme; **yeni bir TTS akustik modeli değildir**.
- `dou-reader-panel.mjs`: öğrenci ekrandaki kontroller ve klavye gezinmesi.
- `dou-reader-demo.html`, `dou-reader-demo.mjs`, `dou-reader.css`: kod gerektirmeyen anonim görsel ve işitsel örnek.
- `tools/dou-speech-windows.ps1`: salt okunur SAPI envanteri, sunucu tarafından yayımlanmaz.

## Yerel testler

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
npm.cmd start
```

`npm.cmd test` yeni okunabilirlik, yerel ses filtreleme, uzak sesin reddi, kesilmiş metnin reddi, ayrı okuyucu HTTP yolu, gizli öğretmen cevaplarının seslendirilmeyişi ve durdurma/yeniden oynatma yarışlarını test eder. Bunlar gerçek ses kalitesi, klavye ergonomisi, NVDA/JAWS/VoiceOver veya WCAG/PDF/UA insan kabul testi değildir. Chromium başsız tarayıcı ile tam fonksiyonel/görsel test bu çalışma ortamında tamamlanamadı; gerçek Windows tarayıcısında manuel test gereklidir.

## Bilinen sınırlar ve sonraki işler

- Bu sürüm **tüm Windows uygulamalarındaki menüleri, bildirimleri, odak ağacını veya ekranı okuyamaz**. Bunun için UI Automation / IAccessible2, uygulama-sistem izinleri, güvenli olay akışı ve ayrı Windows programı gerekiyor.
- DOU Speech şu an **yerel kurulu TTS motorunu kontrol eden adaptördür**. Kendi sıfırdan eğitilen veya geliştirilen Türkçe ses modelinin sentezleme, veri toplama, kalite ve lisans çalışmaları henüz başlamadı.
- Deneysel `node:sqlite`, canlı şifreleme, kurumsal SSO/OIDC, gerçek erişilebilirlik kabul testleri ve etik/KVKK onayı olmadan üretime alınmamalı.
- `data` klasörünü veya eski veritabanlarını v2.41 ZIP ile **ezmeyin**. ZIP sentetik örnekler ve kaynak kodu içerir; mevcut Windows kurulumu ayrı kalmalıdır.
