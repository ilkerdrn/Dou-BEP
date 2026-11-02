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

## Sprint 03 — bölüm okuma kabul senaryoları (Windows'ta henüz uygulanmadı)

Bu özellik **tüm belgeyi** veya Not Defteri'ne girilmiş düzenlenebilir metni okumaz; yalnız kullanıcı tarafından seçilmiş başlangıç öğesinden itibaren, aynı izinli uygulama içindeki statik UIA `Text` düğümlerini okur. Ağ üzerinden konuşma servisi ve arka plan taraması yoktur.

| No | Sentetik test senaryosu | Beklenen davranış | Durum |
|---|---|---|---|
| 13 | İzinli tarayıcıda Ctrl+Alt+R ardından Ctrl+Alt+Shift+D | Yakındaki erişilebilir, görünür statik metinler kullanıcı komutuyla sırasıyla seslendirilir | Bekliyor |
| 14 | Reader panelindeki **Kısa bölümü oku** düğmesi | Önceden seçilmiş ve süreç izni hâlâ geçerli okuma noktasından devam eder | Bekliyor |
| 15 | Kontrol ağacında 16'dan fazla statik metin | Tek çağrıda en fazla 16 metin düğümü ve 850 karakter; metin sessizce kesilmez | Bekliyor |
| 16 | Düzenlenebilir alan içindeki veya parola alanının altındaki Text düğümleri | Gizli/edit üst öğeleri kontrol edilerek seslendirme reddedilir | Bekliyor |
| 17 | İzin dışı süreç veya değişmiş odak | Komut reddedilir, eski ses durur, geçersiz okuma noktası atılır | Bekliyor |
| 18 | Ctrl+Alt+Shift+D başka bir uygulama tarafından kullanılıyor | Ana kısayollar çalışır; Reader panelindeki düğme kullanılabilir | Bekliyor |
| 19 | Statik metin çok uzun, tekrarlı veya destek dışı karakter içeriyor | Geçersiz öğeler atlanır; desteklenen toplam 850 karakter sınırını aşmaz | Bekliyor |
| 20 | Ağır UIA sağlayıcısı | En fazla 350 adım ve adımlar arasında 1,5 sn tarama bütçesi; **tek tek UIA çağrıları için kesin zaman aşımı garantisi yoktur** | Bekliyor |

| 21 | Kısa bölüm komutunu arka arkaya kullanma | Son okunmuş statik metin ikinci defa okunmaz; seçim/gezinti yapıldığında okuma noktası sıfırlanır | Bekliyor |

**Önemli:** Statik metin düğümleri her tarayıcıda aynı biçimde sunulmaz; boş sonuç normaldir. Gerçek Word/PDF, uzun metinlerde sayfa devamı, tablo hücresi anlamsallaştırma ve ekran okuyucunun sesli keşif deneyimi henüz yoktur. Bu on-demand pilotu, doğrulanmış ürün gibi sunmayacağız.

## Sprint 04 — yapısal gezinme kabul senaryoları

| No | Senaryo | Beklenen davranış | Durum |
|---|---|---|---|
| 22 | Erişilebilir başlıkları bulunan izinli sayfa | **Başlık** düğmesi ilk sonraki başlığa gider; normal odak değişmez | Bekliyor |
| 23 | Açık UIA `List` veya ARIA `list` | **Liste** düğmesi ve Ctrl+Alt+Shift+L aynı izinli süreçte listeyi bulur | Bekliyor |
| 24 | Açık UIA `Table`/`DataGrid` veya ARIA `table`/`grid` | **Tablo** düğmesi ve Ctrl+Alt+Shift+T sonraki tabloyu bulur | Bekliyor |
| 25 | Açık `gridcell`/`cell` ARIA veya UIA `HeaderItem` | **Hücre** düğmesi ve Ctrl+Alt+Shift+C erişilebilir hücre etiketini okur | Bekliyor |
| 26 | Tablo/liste rolü yok veya erişilebilir ad boş | Rol tahmin edilmez; anlaşılır boş sonuç gösterilir | Bekliyor |
| 27 | ARIA rolü UIA kontrol türüyle çelişiyor | Çelişkili rol güvenli biçimde atlanır | Bekliyor |
| 28 | İzin dışı uygulama veya parola/edit alt öğeleri | Okuma ve ses kuyruğu iptal edilir; gizli içerik okunmaz | Bekliyor |
| 29 | Ctrl+Alt+Shift+L/T/C kısayol çakışması | Temel Ctrl+Alt+R/X vb. kısayollar çalışır, arayüz düğmeleri kullanılabilir | Bekliyor |
| 30 | UIA heading level 1–9 veya UIA ID 80051–80059 | Yalnız gerçek metadata varsa Türkçe başlık seviyesi okunur; metadata yoksa uydurulmaz | Bekliyor |

**Bilinçli sınırlama:** Yalnız görünür erişilebilir öğe etiketleri okunur; hücre veri modeli, satır-sütun koordinatları ve Word/PDF yapı aktarımı henüz yoktur. Tüm senaryolar gerçek Windows kabulü bekler.

## Sprint 05 — tablo satırları, liste öğeleri, yön ve arayüz kabulü

| No | Senaryo | Beklenen davranış | Durum |
|---|---|---|---|
| 31 | Açık ARIA `listitem` veya UIA `ListItem` | Liste öğesi düğmesi ve Ctrl+Alt+Shift+I ile erişilebilir rol seslendirilir | Bekliyor |
| 32 | Açık ARIA `row` | Satır düğmesi ve Ctrl+Alt+Shift+R erişilebilir satıra gider; DataItem'dan otomatik satır tahmini yapılmaz | Bekliyor |
| 33 | Önceki öğeyi bul seçeneği | Altı gezinme düğmesi önceki uygun öğeye gider; klavye kısayolları ileri yönü korur | Bekliyor |
| 34 | Açık ARIA `list` + UIA `Table` gibi rol çelişkisi | Öğe yanlış bir rol ile seslendirilmez; ikisi de desteklense de çelişki güvenli reddedilir | Bekliyor |
| 35 | Açık yapısal rol ancak erişilebilir ad boş | Gizlilik kontrolleri sağlanıyorsa yalnızca `liste`, `tablo` vb. rol duyurulur | Bekliyor |
| 36 | 100% ve 200% ekran ölçeği | Başlık/yardım/durum/yapısal kontroller/ses kontrolleri örtüşmez, Tab erişimi korunur | Bekliyor |
| 37 | Windows yüksek kontrast ve ekran okuyucu ile arayüz | Düğmelerin erişilebilir adları, yön seçeneği ve durum bilgisi anlaşılır | Bekliyor |

**Bu sprintin kod düzeyi incelemeleri gerçek Windows DPI/klavye/işitilebilirlik testi değildir.** Word/PDF ayrıştırma, hücre koordinatları, paragrafların tam semantik algılanması ve serbest metin okuma henüz geliştirilmedi.

## Sprint 06 — UIA GridItem hücre koordinatları

| No | Senaryo | Başarı ölçütü | Durum |
|---|---|---|---|
| 38 | GridItemPattern sunan hücre (row=0, column=1) | Yalnız gerçek UIA metadata üzerinden **hücre, satır 1 sütun 2** duyurulur | Bekliyor |
| 39 | GridItemPattern sunmayan hücre | Hücre rolü mevcutsa duyurulur; satır/sütun konumu **uydurulmaz** | Bekliyor |
| 40 | Negatif ya da 10.000 ve üzeri koordinat | Geçersiz koordinat kullanılmaz | Bekliyor |
| 41 | Edit/parola alanına bağlı hücre | Hücre metni veya koordinatı seslendirilmez | Bekliyor |
| 42 | UIA GridItemPattern sağlayıcısı hata veriyor | Metin veya hata ayrıntısı ifşa edilmeden güvenli biçimde atlanır | Bekliyor |

| 43 | GridItem RowSpan=2, ColumnSpan=3 | Yalnız gerçek UIA bilgisiyle **2 satır ve 3 sütun boyunca** duyurulur | Bekliyor |
| 44 | RowSpan/ColumnSpan negatif, sıfır veya aşırı büyük | Koordinat ve birleşme bağlamı uydurulmaz | Bekliyor |

**Not:** Hücre koordinatları yalnız UIA GridItemPattern tarafından açıkça sağlanıyorsa kullanılır. Kullanıcı testleri ve son C# Windows derlemesi henüz yapılmadı.
