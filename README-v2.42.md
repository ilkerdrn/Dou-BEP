# DOU BEP v2.42 — DOU Reader Windows UI Automation prototipi

**Hedef:** v2.41'deki sınav içi tarayıcı okuyucusuna ilave olarak, Windows masaüstündeki **izinli uygulamalarda kullanıcı kısayoluna bağlı, tek öğelik** Türkçe sesli okuma. Bu bir **NVDA eşdeğeri, tam ekran okuyucu veya kurum tarafından eğitilmiş yeni Türkçe TTS modeli değildir**. Windows bilgisayarda bağımsız işlevsel doğrulama henüz yapılmadı. Bu paket sentetik/anonim araştırma prototipidir.

## Windows'ta çalıştırma

Önce v2.42 ZIP'ini **yeni bir klasöre** çıkarın; önceki `data` veya anahtar dosyalarını yeni paketle değiştirmeyin. Windows 10/11 masaüstü oturumu, **Windows PowerShell 5.1 (powershell.exe)**, .NET Framework UI Automation ve `System.Speech` gereklidir. Windows PowerShell 7 (`pwsh`) desteklenmez. Node/SQLite bu bağımsız uygulamanın çalışması için gerekli değildir.

Teknik ön denetim (bir GUI başlatmadan C# kaynağını bellekte derler, kurulu Türkçe ses sayısını listeler):

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-windows.ps1 -Check
```

Görsel okuyucu penceresini başlatın:

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-windows.ps1
```

Varsayılan izinli işlem adları: `msedge`, `chrome`, `firefox`, `notepad`. Yalnız hedef uygulamada sesli okumaya izin vermek için uygulamanın **exe uzantısı olmayan işlem adını** açıkça belirtin:

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-windows.ps1 -AllowedProcesses chrome,msedge
```

Açılan DOU Reader penceresinden hedef uygulamaya geçin. Hedef uygulama odaktayken şu kısayolları kullanın:

| Kısayol | İşlev |
|---|---|
| `Ctrl+Alt+R` | Odaklanan erişilebilir öğeyi Türkçe sesle oku |
| `Ctrl+Alt+↓` | Aynı uygulama ağacında bir sonraki okunabilir öğeye ilerle |
| `Ctrl+Alt+↑` | Bir önceki okunabilir öğeye ilerle |
| `Ctrl+Alt+X` | Sesi durdur |

Okuma **yalnız kısayol ile** başlar; sürekli arka plan taraması yapılmaz. Gezinme **uygulamaya klavye/mouse girdisi göndermez, odağı değiştirmez**: sadece otomasyon ağacı üzerinde ilerler. Normal Windows Tab/Shift+Tab navigasyonu bağımsız çalışır. Kısayollar başka uygulamalarla çakışabilir; kaydedilemeyen kısayollar için DOU Reader durum göstergesi uyarır. Çalışma esnasında mikrofon, ekran kaydı veya dosyaya metin kayıt işlemi yoktur.

## Gizlilik ve güvenlik kuralları

- Yalnızca kullanıcı tarafından belirtilen **izinli işlem adları** okunabilir. DOU Reader uygulamasının kendisi, izin listesi dışındaki uygulamalar ve boş/erişilemeyen odaklar reddedilir.
- `IsPassword=true`, ekran dışında bulunan ve `ControlType.Edit` giriş alanları **tamamen atlanır**; `ValuePattern` veya `TextPattern` ile giriş değeri okunmaz. Üçüncü taraf uygulamaların yanlış erişilebilirlik etiketleri veya erişilebilir adları hassas içerik içerebilir. Gizli bilginin asla okunmayacağı garanti edilmez.
- Yalnız `System.Speech` envanterinde kurulu Türkçe `tr-*` SAPI sesi seçilir; yoksa **ses kapalı** kalır. Program internet, bulut API, dosya güncelleme, mikrofon veya arka plan metin depolaması yapmaz. Üçüncü taraf yerel ses sürücülerinin ağ davranışı bu prototip tarafından bağımsız doğrulanmış değildir.
- Konuşma uzunluğu **850 karakter**, gezinme **350 otomasyon adımı** ile sınırlıdır. Uyumsuz uygulamalar `Name` alanını eksik sağlayabilir; tüm Windows öğeleri okunamaz. Chrome/Edge/Firefox'un erişilebilirlik desteği sürümlerine bağlıdır.
- Windows üzerinde **gerçek ses, otomasyon ağaçları, kısayol çakışması, NVDA ile birlikte çalışma ve kullanıcı kabul testi henüz yapılmamıştır**. Otomatik testler şu aşamada Windows'a özgü kodun kaynak politikalarını denetler; çalışma zamanını değil.
- Kurumsal cihazda IT onayı, erişilebilirlik kullanıcı testi, yazılım imzalama/dağıtım politikası ve hassas veri değerlendirmesi tamamlanmadan kullanmayın.

## Dosyalar

- `tools/dou-reader-windows.ps1` — isteğe bağlı Windows başlatıcı, PowerShell/STA/Windows ve izinli süreç doğrulaması, C# kodunun **bellekte derlenmesi**, `-Check` modu.
- `tools/dou-reader-windows-host.cs` — WinForms arabirimi, UI Automation odak/öğe gezinmesi, `RegisterHotKey` ve Türkçe SAPI adaptörü. C# kaynağı HTTP üzerinden sunulmaz.
- `dou-reader-windows.test.mjs` — güvenlik sınırlarına yönelik kaynak bazlı testler.
- Önceki `dou-reader-core.mjs`, `dou-reader-panel.mjs`, `dou-speech.mjs` ve `/dou-reader-demo` özellikleri değişmeden korunmuştur.

## Proje regresyon kontrolleri (Windows'ta Node >= 22.13)

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
```

**Bilinçli sınırlar:** Canlı SQLite uygulama düzeyinde şifreli değil; kurumsal OIDC/SSO ve gerçek PDF/UA/screen-reader kullanıcı testleri tamamlanmadı. DOU Speech yalnız yerel TTS kontrol katmanıdır; kendi Türkçe akustik sentez modelimiz **henüz yoktur**. Ayrıca IAccessible2, sistem bildirimleri, fare izleme, ekranı sürekli okuma, matematik/kod konuşma sözlüğü ve sesli Braille entegrasyonu bu sürümde yoktur.
