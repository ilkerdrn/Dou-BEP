# DOU BEP Sınav Atölyesi v2.44 — DOU Reader başlık/belge gezinmesi

**Araştırma prototipi; sentetik veriyle doğrulanmıştır.** v2.43'ün üniversite sınavı, uyarlama, onay, şifreli yedek, Reader ve Speech modülleri korunmuştur. Yeni sürüm bir NVDA eşdeğeri, kurumsal üretim yazılımı veya kendi eğitilmiş akustik TTS motoru değildir.

## Yeni özellikler

1. `tools/dou-reader-windows-host.cs`: Windows UI Automation erişilebilirlik özellikleri `AriaRole` (30101) ve `HeadingLevel` (30173) üzerinden **sonraki / önceki başlığa** gezinme. Sağlayıcı başlık meta verisini göstermiyorsa başlığı tahmin etmez.
2. `Ctrl+Alt+D`: UI Automation ağacında sonraki **metin öğesini** bulup tek öğeyi seslendirme. Tüm belgeyi ya da tarayıcının editörünü okumaz. `TextPattern`, `ValuePattern`, pano veya dosyadan içerik çıkarma yoktur.
3. `dou-speech-pronunciation.mjs`: `∫ ∂ ∈ ∉ ∩ ∪ → ↔ α β θ` için çevrimdışı Türkçe okunuşlar. İlgili Windows C# sözlüğü de genişletildi. Ses halen mevcut **yerel Windows SAPI/tarayıcı Türkçe seslerinden** gelir.
4. Anonim `/dou-reader-demo` sınavında yeni küme/analiz sembolleri eklendi. Seslendirme izni `audioAllowed=false` olan örnek değişmedi; sesi açmaya izin vermez.
5. Sürüm ve güvenlik regresyonları; Windows yerel uygulaması API hizmetine veya internet erişimine ihtiyaç duymaz.

## Windows masaüstü prototipini deneme

ZIP'i ayrı klasöre çıkarın. Önceki Windows `data/` ve gizli anahtarları üzerine **yazmayın**. Windows 10/11, Windows PowerShell 5.1 (`powershell.exe`), STA, .NET UIAutomation ve kurulu Türkçe SAPI sesi gerekir.

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-windows.ps1 -Check
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-windows.ps1
```

Yalnızca belirli uygulamalara izin vermek için `-AllowedProcesses chrome,msedge` parametresini ekleyin. Sunucuyu açmadan Windows okuyucusu kullanılabilir.

| Kısayol | Eylem |
|---|---|
| Ctrl+Alt+R | İzinli uygulamada odaklanan öğeyi seç ve oku |
| Ctrl+Alt+↓ / ↑ | Sonraki / önceki erişilebilir öğe |
| Ctrl+Alt+L | Sonraki bağlantı |
| Ctrl+Alt+B | Sonraki düğme |
| Ctrl+Alt+H | Sonraki **başlık** (yalnız sağlayıcı gerçekten meta veri sunuyorsa) |
| Ctrl+Alt+Shift+H | Önceki başlık |
| Ctrl+Alt+D | Sonraki normal belge metni (`ControlType.Text`) |
| Ctrl+Alt+X | Okumayı durdur |

Sürgü üzerinden -3 ila +3 SAPI ses hızı seçilebilir. Kısayollar başka uygulamalarla çakışabilir. Okuyucu yalnız kullanıcı kısayoluyla, aynı izinli süreç sınırında, en fazla 350 öğelik sınırlı gezinmeyle işlem yapar. **Gerçek Windows klavye odağını değiştirmez**, bağlantılara tıklamaz ve kullanıcı girdisi göndermez. `IsPassword` ve `Edit` alanlarını atlar. Bir uygulamanın erişilebilir adında hassas veri bulunabileceği ve işletim sistemi ses sürücülerinin ağ davranışı bağımsız denetlenmediği için gerçek verilerle henüz kullanılmamalıdır.

## Anonim demo

```powershell
npm.cmd start
```

`http://127.0.0.1:4173/dou-reader-demo` adresinde sentetik sorular. Uygulama içindeki Reader kısayolları **ayrıdır**: Alt+Shift+R oku, Alt+Shift+S durdur, Alt+Shift+N/P soru gez, Alt+Shift+H yardım.

## Doğrulama

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
```

**Test sınırlaması:** Windows C# kodu bu Linux oturumunda gerçek Windows UIAutomation/.NET/SAPI üzerinde derlenip denenemedi. Sağlayıcıların `AriaRole` ve `HeadingLevel` desteği, farklı tarayıcılarda başlık bulunabilirliği, NVDA ile aynı anda çalışması ve erişilebilirlik kullanıcı denemeleri ayrıca doğrulanmalı. Web uygulaması için önceki yerel testler geçmiştir; bu bir WCAG/PDF-UA sertifikasyonu değildir. Kurumsal SSO/OIDC, canlı SQLite şifreleme, özgün Türkçe akustik ses ve braille sürücüleri hâlâ geliştirme kalemleridir.
