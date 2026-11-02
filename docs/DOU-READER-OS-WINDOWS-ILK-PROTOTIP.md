# DOU Reader OS — bağımsız Windows pilot durumu

**Mevcut iş:** `tools/dou-reader-windows.ps1` + `tools/dou-reader-windows-host.cs`, bağımsız Windows UI Automation gezinti arayüzü ve kısayollarına sahiptir. Ancak varsayılan ses yolu Windows yerel **SAPI** kullanır. Bu, kendi ses motorumuz değildir ve üretim ekran okuyucusu değildir.

**Yeni deney:** `tools/dou-reader-local-voice-test.ps1`, NVDA ya da SAPI kullanmadan **DOU yerel Node.js Türkçe ses motorunu** Windows'ta WAV üretip çalmayı dener. Kullanıcı gerçek öğrenci, parola veya özel içerik girmez; varsayılan sentetik metin. WAV yalnız rastgele geçici dosyada tutulur ve test sonunda silinir.

```powershell
Set-Location "D:\Projects\Dou-BEP-GITHUB-20261102"
& ".\tools\dou-reader-local-voice-test.ps1"
```

**Birleşme için sonraki kapılar:** bağımsız C# UIA okuyucusuna güvenli, iptal edilebilir ve nonblocking kendi WAV sağlayıcısını bağlama; güvenli UIA öğe türü filtreleri; ses aygıtı kesintisi; ekran okuyucu klavye çakışması; manuel Windows/insan testi. Çalışan SAPI okuyucuyu değiştirmiyoruz.

Bu prototip ve mevcut UIA pilotu tam bağımsız ekran okuyucu / doğrulanmış erişilebilirlik çözümü değildir.

## Yeni -OwnVoice modu (Windows kabul testi bekliyor)

Mevcut UI Automation/kısayol sistemini değiştirmeden kendi DOU Türkçe WAV motoru **isteğe bağlı** seçilebilir. Eski SAPI varsayılanı değişmez. Metinler yalnız beyaz listeli uygulamalardan, yazı kutusu/parola içerikleri dışlanarak gelir. Geçersiz/çok uzun arayüz adları reddedilir; otomatik SAPI veya bulut geri dönüşü yapılmaz. WAV yalnız geçici dizinde oluşturulup temizlenir. Konuşma ayrı iş parçacığındadır; durdurma ve yeni odak istekleri önceki alt süreci keser.

```powershell
Set-Location "D:\Projects\Dou-BEP-GITHUB-20261102"
powershell.exe -NoProfile -STA -File ".\tools\dou-reader-windows.ps1" -Check
powershell.exe -NoProfile -STA -File ".\tools\dou-reader-windows.ps1" -OwnVoice -AllowedProcesses notepad
```

Not Defteri'ne yalnız **sentetik, gizli olmayan** Türkçe metin ve başlık girin. İzinli uygulamaya odaklanıp `Ctrl+Alt+R` ile odak öğesini okumayı deneyin; `Ctrl+Alt+X` ile durdurun. İlk denemede UIA etiketleri mevcut deneysel fonem kapsamının dışında kalabilir. Bu durum gerçek kullanım kalitesi testi için ayrıca ele alınmalıdır.

**Durum:** GitHub kaynak düzeyinde geliştirilmiştir; gerçek Windows/.NET derleme, ses cihazı, kısayol ve iptal kabulü henüz tamamlanmadı. NVDA veya dış servis kurulumu gerekmiyor.
