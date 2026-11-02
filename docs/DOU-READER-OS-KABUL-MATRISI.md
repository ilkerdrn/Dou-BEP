# DOU Reader OS — Windows kabul matrisi

> Durum: **Açık / Windows testi bekliyor.** Bu belge doğrulama yapılmadan başarı iddiası oluşturmaz.
> Yalnız sentetik ve kişisel olmayan içerik kullanılır. Gerçek öğrenci verisi, parolalar,
> sınav soruları ve üretim veritabanı bu test kapsamı dışındadır.

## Otomatik ön-kabul — tek komut, varsayılan olarak pencere açmaz

```powershell
$test = Join-Path (Join-Path 'D:' 'Projects') 'DOU-READER-WINDOWS-TEST'
$acceptance = Join-Path (Join-Path $test 'tools') 'dou-reader-acceptance.ps1'
powershell.exe -NoProfile -STA -File $acceptance
```

- Node testleri: `dou-reader-own-voice.test.mjs` — geçerli WAV, Türkçe karakterler, hız uçları, uygunsuz metnin reddi ve kaynak regresyonları.
- Windows UIA C# derleme: `dou-reader-windows.ps1 -Check` — `ReaderSpeechContract.SelfTest()` ile 12 bozuk WAV başlık türü, uzun Türkçe metin parçalama ve sınır denetimleri.
- Üretim verisi, veritabanı, git dalı, GitHub Actions veya ağ servislerini değiştirmez.
- İşlem başarısı **sesin duyulduğu veya gerçek erişilebilirliğin doğrulandığı anlamına gelmez**.

## Manuel kabul — yalnız sentetik metin

İstenirse otomatik kontrol sonrası ayrı terminalde `powershell.exe -NoProfile -STA -File $acceptance -LaunchReader` başlatılır. Bu aşama otomatik testin zorunlu parçası değildir.

| No | Senaryo | Başarı kıstası | Durum |
|---|---|---|---|
| 01 | DOU sesi dene | Kendi Türkçe motoru ile "Merhaba dünya" duyulur; Windows SAPI gerekmez | Bekliyor |
| 02 | Ctrl+Alt+R, Not Defteri | İzinli ve okunabilir UIA öğe adı seslendirilir; Edit içerikleri okunmaz | Bekliyor |
| 03 | Ctrl+Alt+P, uygulama odaktayken | Kalan ses durur; tekrar basınca mevcut parça baştan devam eder | Bekliyor |
| 04 | Duraklat / devam düğmesi | UI klavye ile Tab ve Enter kullanılarak erişilebilir | Bekliyor |
| 05 | Ctrl+Alt+X | Anlık durdurma sonrası kuyruk tamamen silinir; tekrar P sürdürmez | Bekliyor |
| 06 | İzin dışı uygulamaya geçiş | Yeni okuma reddedilir, eski ses durur ve bekleyen metin atılır | Bekliyor |
| 07 | Parola / giriş alanı ve çocukları | UIA gizli veya Edit alanlarında herhangi bir metin okunmaz | Bekliyor |
| 08 | Kısayol çakışması | Ctrl+Alt+P meşgulse asıl Ctrl+Alt+R/X vb. kısayollar çalışmaya devam eder | Bekliyor |
| 09 | Tek seferde 8 parça | Uzun sentetik içerik sırayla okunur, karışma olmaz | Bekliyor |
| 10 | Ses aygıtı yok / iptal yarışı | İşlem güvenli şekilde sonlanır, sistemde Node süreçleri birikmez | Bekliyor |
| 11 | Yüksek kontrast ve %200 metin | Windows kontrast/ölçeklendirmesinde içerik ve klavye odağı görülebilir | Bekliyor |
| 12 | Pencereyi kapatma | Kısayollar serbest bırakılır, ses kesilir, hiçbir WAV diske yazılmaz | Bekliyor |

## Kapanış koşulları

MVP-1 ancak **ses duyulurluğu, durdurma, izinli uygulama sınırları, klavye erişimi ve kullanıcı kabulü** tamamlandığında kapatılır. Bu aşamaya kadar PR #8 birleştirilmez. Görsel tasarımın premium olması, erişilebilirlik ve kullanılabilirlik testlerinin yerine geçmez.

## Sınırlar

Bu sürüm Not Defteri'ne yazılan metnin içeriğini, parolaları veya düzenlenebilir kontrol değerlerini **okumaz**. UIA öğe isimlerini, rol başlıklarını ve salt-okunur metin düğümlerini deneysel olarak okur. Sürekli belge metin akışı, tam ekran okuyucu, Word/PDF içeriği, Braille ve doğal Türkçe konuşma üretimi sonraki gelişme aşamalarıdır.
