# DOU Reader OS — bağımsız Windows pilot durumu

**Mevcut iş:** `tools/dou-reader-windows.ps1` + `tools/dou-reader-windows-host.cs`, bağımsız Windows UI Automation gezinti arayüzü ve kısayollarına sahiptir. Ancak varsayılan ses yolu Windows yerel **SAPI** kullanır. Bu, kendi ses motorumuz değildir ve üretim ekran okuyucusu değildir.

**Yeni deney:** `tools/dou-reader-local-voice-test.ps1`, NVDA ya da SAPI kullanmadan **DOU yerel Node.js Türkçe ses motorunu** Windows'ta WAV üretip çalmayı dener. Kullanıcı gerçek öğrenci, parola veya özel içerik girmez; varsayılan sentetik metin. WAV yalnız rastgele geçici dosyada tutulur ve test sonunda silinir.

```powershell
Set-Location "D:\Projects\Dou-BEP-GITHUB-20261102"
& ".\tools\dou-reader-local-voice-test.ps1"
```

**Birleşme için sonraki kapılar:** bağımsız C# UIA okuyucusuna güvenli, iptal edilebilir ve nonblocking kendi WAV sağlayıcısını bağlama; güvenli UIA öğe türü filtreleri; ses aygıtı kesintisi; ekran okuyucu klavye çakışması; manuel Windows/insan testi. Çalışan SAPI okuyucuyu değiştirmiyoruz.

Bu prototip ve mevcut UIA pilotu tam bağımsız ekran okuyucu / doğrulanmış erişilebilirlik çözümü değildir.
