# DOU BEP v2.81 R3 — Windows Reader kısayol çakışması düzeltmesi

Bu bir **v2.82 sürüm ilanı değildir**; v2.81 R3 kaynağına uygulanmış sınırlı Reader güvenilirlik yamasıdır.

## Değişiklik

`tools/dou-reader-windows-host.cs` artık global kısayolları tek tek kaydeder; herhangi bir kayıt çakışırsa başarılı önceki kayıtları geri alır. Pencere kapanırken yalnızca başarıyla kaydedilmiş kısayollar kaldırılır. Ses, UIA gezinme, kurum izolasyonu ve sınav veritabanı mantığı değiştirilmedi.

## Yerel doğrulama (Linux / Node)

- `npm test`: 767/767 PASS
- `node release-check.mjs`: 335/335 PASS
- `node tools/exam-closure-smoke.mjs`: 25/25 PASS, geçici veritabanı
- Windows Forms/.NET C# derleme ve gerçek UIA/kısayol testi **yapılmadı**.

## Windows kabul kontrolü

1. Mevcut kurulumun ve `data/` dizininin yedeğini alın. Tam paketi ayrı temiz klasöre çıkarın veya yama paketindeki iki kaynak dosyayı mevcut kurulumdaki aynı yolların üzerine dikkatle uygulayın.
2. `powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-windows.ps1 -Check` ile Windows C# derleme ve Türkçe SAPI varlığını doğrulayın.
3. Gerçek masaüstü oturumunda `powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\tools\dou-reader-windows.ps1` komutuyla Reader açın. Ctrl+Alt+R / Ctrl+Alt+X ve çakışan kısayol senaryosunu sınayın.
4. Başka program aynı tuş birleşimini kullanırken çakışma olduğunda Reader bütün kendi kısayollarını serbest bırakmalı; uygulama kapatılınca hiçbir tuş rezervasyonu kalmamalı.

Not: Bu düzeltme NVDA uyumluluğu, bağımsız Türkçe doğal ses motoru veya kurumsal üretim onayı değildir.
