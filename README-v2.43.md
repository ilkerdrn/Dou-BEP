# DOU BEP Sınav Atölyesi v2.43 — DOU Reader gezinme + DOU Speech Türkçe matematik

**Araştırma prototipi / sentetik veriler.** v2.42'nin bütün sınav, bireysel uyarlama, koordinasyon, erişilebilir çıktı ve denetim modülleri korunmuştur. Gerçek Windows cihazında UI Automation/SAPI entegrasyon testi ve gerçek kullanıcı erişilebilirlik testleri **henüz yapılmadı**. Proje henüz gerçek öğrenci verileriyle üretim kullanımı için onaylı değildir.

## Yeni bileşenler

- `dou-speech-pronunciation.mjs`: bağımsız, saf ve çevrimdışı Türkçe matematik/telaffuz ön işlemcisi. `≤`, `≥`, `≠`, `≈`, `±`, `×`, `÷`, `√`, `²`, `³`, `π`, `∞`, `∑` ve basit `x^2`, `y^3`, `<=`, `>=`, `!=` işaretlerini okunabilir sözcüklere çevirir. Tarih, dosya yolu, `1/2` gibi belirsiz bölmeleri bilinçli olarak değiştirmez. **Matematiksel anlam doğrulaması veya genel LaTeX çözümü değildir.**
- `dou-speech.mjs`: ses başlamadan önce bu ön işlemciyi kullanır. Yalnız `localService === true` olan, tarayıcının listelediği Türkçe sesleri kabul eder. Çok uzun matematik genişletmelerinde sessizce kesmek yerine sesi kapatır ve yazılı içerik kullanılmaya devam edilir.
- `tools/dou-reader-windows-host.cs`: mevcut istek üzerine odak okuma/önceki-sonraki öğe kontrolüne **sonraki bağlantı**, **sonraki düğme** gezinmesi ve -3 ile +3 arası yerel SAPI hız ayarı eklendi. Matematik sözlüğünün küçük, yerel C# karşılığı Windows okuyucusunda kullanılır. Bu kaynak bellekte derlenmek üzere tasarlanmıştır, bu Linux ortamında gerçek Windows derlemesi test edilemedi.
- `/dou-reader-demo`: 2. sentetik soru artık kare ve eşitsizlik sembollerini içerir. Öğretmen ses yasağı olan 3. soru seslendirilemez.

## Windows yerel okuyucu başlatma

ZIP'i **ayrı bir klasöre** çıkarın. Önceki `data` dizininizi veya şifreleme anahtarlarını bu klasöre kopyalamayın. Gereksinim: Windows 10/11 masaüstü, `powershell.exe` (Windows PowerShell 5.1, .NET Framework), STA oturumu, UIAutomation ve Windows'a kurulu `tr-*` SAPI sesi. PowerShell 7 `pwsh` desteklenmez.

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-windows.ps1 -Check
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-windows.ps1
```

Yalnız belirttiğiniz işlem adları için izin:

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-windows.ps1 -AllowedProcesses chrome,msedge
```

| Windows kısayolu | İşlev |
|---|---|
| Ctrl+Alt+R | Hedef uygulamada odaklanan erişilebilir öğeyi oku |
| Ctrl+Alt+↓ | Sonraki okunabilir erişilebilir öğe |
| Ctrl+Alt+↑ | Önceki okunabilir erişilebilir öğe |
| Ctrl+Alt+L | Aynı uygulamada sonraki erişilebilir **bağlantı** |
| Ctrl+Alt+B | Aynı uygulamada sonraki erişilebilir **düğme** |
| Ctrl+Alt+X | Konuşmayı durdur |

DOU Reader penceresindeki **Konuşma hızı** sürgüsü (-3 / +3) sadece yerel SAPI hızını ayarlar. Kısayollar çakışabilir. Bu gezinme Windows'un gerçek klavye odağını değiştirmez; otomasyon ağacında ilerler. Başlıklar arasında gezinme, Braille, IAccessible2 ve uygulamaya sürekli odak dinleyicisi bu sürümde yoktur. Sadece kullanıcı kısayoluna cevap verir.

**Gizlilik sınırı:** İzinli süreçler dışında okuma yapılmaz; `IsPassword=true`, `ControlType.Edit`, ekran dışındaki öğeler atlanır; `ValuePattern`, `TextPattern`, pano veya mikrofon okunmaz. Ancak başka uygulamanın hatalı etiketlediği erişilebilir adı hassas veri içerebilir. Windows/UIA sağlayıcısının veya yüklü SAPI ses sürücüsünün ağ davranışı bağımsız denetlenmiş değildir.

## Web demo ve kontroller

```powershell
npm.cmd start
```

Açılan uygulamada `http://127.0.0.1:4173/dou-reader-demo` adresinden sentetik örnekleri deneyebilirsiniz. Sınav içindeki okuyucunun kısayolları Windows bağımsız okuyucusundan **farklıdır**: Alt+Shift+R oku, Alt+Shift+S durdur, Alt+Shift+N sonraki, Alt+Shift+P önceki, Alt+Shift+H yardım. Form alanlarında devre dışıdır.

## Test komutları

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
```

**Net sınır:** Yeni Türkçe matematik okunuşu sistem içinde kodlanmıştır; ancak bağımsız Türkçe **akustik TTS/ses modeli** henüz geliştirilmemiştir. Sesler hâlâ Windows/tarayıcı sisteminden gelir. NVDA eşdeğerliği veya PDF/UA onayı iddiası yoktur. Gerçek kullanıcı/cihaz erişilebilirlik kabulü, ses testi, SSO/OIDC ve canlı SQLite şifreleme eksik kalmıştır.
