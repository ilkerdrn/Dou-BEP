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

**Bilinçli sınırlama:** Yalnız görünür erişilebilir öğe etiketleri okunur; hücrelerin bütün veri modeli, tablo başlık eşlemesi ve Word/PDF yapı aktarımı henüz yoktur. Sprint 06'da yalnız GridItemPattern varsa sınırlı koordinat okuma kodlandı (Windows kabulü bekliyor). Tüm senaryolar gerçek Windows kabulü bekler.

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

**Bu sprintin kod düzeyi incelemeleri gerçek Windows DPI/klavye/işitilebilirlik testi değildir.** Word/PDF ayrıştırma, başlık/koordinat eşleştirme, paragrafların tam semantik algılanması ve serbest metin okuma henüz geliştirilmedi. Sprint 06'da yalnız açık UIA GridItemPattern koordinatı kodlandı (Windows kabulü bekliyor).

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

## Sprint 07 — tarafsız DataItem ve bütünleşik hücre sınırı

| No | Senaryo | Beklenen davranış | Durum |
|---|---|---|---|
| 45 | Açık `DataItem`, ancak `GridItemPattern` yok | Yalnız kontrol türünden hücre sonucu çıkarılmaz | Bekliyor |
| 46 | `DataItem + GridItemPattern` var | `Hücre` gezinmesinde nötr **ızgara öğesi** ve güvenilir satır/sütun bilgisi okunur | Bekliyor |
| 47 | `DataItem` adı düzenlenebilir alandaki metni yansıtıyor | `Name` okunmaz; yalnız güvenli yapısal bağlam duyurulur | Bekliyor |
| 48 | Açık ARIA `cell` + GridItemPattern | Önceki açık hücre rolü korunur, gerçek koordinat açıklanır | Bekliyor |
| 49 | Satır=9999 ve RowSpan=2 veya Sütun=9999 ve ColumnSpan=2 | Hücrenin son sınırı 10000'i geçiyorsa birleşim bağlamı reddedilir | Bekliyor |
| 50 | Geçersiz birleşik hücre ve geçersiz ARIA rolü | Koordinat/semantik çıkarımı uydurulmaz, hata metni sızdırılmaz | Bekliyor |

**Not:** Bu senaryolar kod düzeyi güvenlik amaçlarını anlatır; Microsoft UIA sağlayıcıları arasında davranışlar değişebilir. Windows PowerShell C# derlemesi, ses cihazı ve görme engelli kullanıcı kabulü henüz gerçekleştirilmedi.

## Sprint 08 — açık paragraf rolü ve gerçek tablo başlığı ilişkileri

| No | Senaryo | Beklenen davranış | Durum |
|---|---|---|---|
| 51 | Açık ARIA `paragraph` bulunan izinli sayfa | Paragraf düğmesi veya Ctrl+Alt+Shift+P yalnız bildirilen paragrafları bulur | Bekliyor |
| 52 | Genel UIA `Text` öğesi, `paragraph` rolü yok | Metin kendiliğinden paragraf diye adlandırılmaz | Bekliyor |
| 53 | Paragraf düğmesiyle ters gezinme | Önceki öğeyi bul seçeneği ile gerçek önceki paragraf seçilir | Bekliyor |
| 54 | `TableItemPattern` satır/sütun başlıkları veriyor | Gerçek ilişkili başlık, örn. `satır başlığı: Birinci satır, sütun başlığı: Not`, hücre bağlamına eklenir | Bekliyor |
| 55 | `TableItemPattern` yok veya başlık erişilemiyor | Hücre konumu korunur; başka satır/sütun üzerinden başlık tahmini yapılmaz | Bekliyor |
| 56 | Farklı süreç/kapalı/Edit-parola atalı header | Başlık içeriği atlanır, öğrenci verisi başka süreçten aktarılmaz | Bekliyor |
| 57 | 2'den fazla ilişkili başlık / aşırı uzun veya noktalama-only ad | Okunması desteklenmeyen başlık reddedilir | Bekliyor |
| 58 | `DataItem` üzerindeki TableItemPattern ve Name | Nötr ızgara öğesinin başlık/Name metni ifşa edilmez | Bekliyor |
| 59 | %200 DPI ile yedi yapısal gezinme düğmesi | Dört sütun/iki satır yerleşiminde Tab sırası ve ses kontrolü örtüşmez | Bekliyor |
| 60 | Bir konuşma parçası üretilemediğinde | Kuyruk aktifse bırakılır, kullanıcının özellikle duraklattığı oturum ise korunur | Bekliyor |

**Sınırlar:** Bunlar manuel Windows kabul koşullarıdır; belge metninin tamamı, Word/PDF importu, gerçek sınav uyarlamaları ve doğal Türkçe TTS kalitesi henüz doğrulanmadı. Sağlayıcı kilitlenirse tek UIA çağrısında kesin zaman aşımı garanti edilmez.

## Sprint 09 — cümle, odak ve çevrimdışı UIA testleri

| No | Senaryo | Başarı ölçütü | Durum |
|---|---|---|---|
| 61 | İzinli uygulamada statik Text seçili; üç cümle | Sonraki cümle düğmesi sırayla üç güvenli cümleyi okur, dördüncüde durur | Bekliyor |
| 62 | Önceki cümle düğmesi | İlk cümleden geriye gitmez, sonraki cümleden önceki cümleye döner | Bekliyor |
| 63 | Ctrl+Alt+Shift+←/→ kısayol çakışması | Temel Ctrl+Alt+R/X vb. kısayollar çalışır; düğmelerle gezinme sürer | Bekliyor |
| 64 | Arka plandaki Reader düğmesi / hedef uygulamada kısayol | Her çağrıda izinli süreç veya kaynak odağı yeniden doğrulanır | Bekliyor |
| 65 | Aynı UIA Text içeriğinin değişmesi | Eski cümle indeksi yeni metne uygulanmaz; baştan başlar | Bekliyor |
| 66 | Uzun, özel karakterli, salt noktalama veya 16'dan fazla cümle | Güvenli sınırı aşan metin reddedilir; gerçek içerik kaydedilmez | Bekliyor |
| 67 | Edit/parola alanı ve alt UIA Text düğümleri | İçerik cümle gezinmesinden okunamaz | Bekliyor |
| 68 | 1366×768 ve %200 DPI Windows masaüstü | Kaydırma ve Tab ile tüm cümle, yapı ve ses kontrollerine erişilebilir | Bekliyor |
| 69 | `tools/dou-reader-uia-fixture.html` dosyasını yerel tarayıcıda açma | Harici ağ olmadan başlık, paragraf, liste, tablo ve sentetik gizlilik alanları görülür | Bekliyor |
| 70 | Ses durdurma / konuşma sırasında cümle değiştirme | Eski ses iptal edilir, sıradaki cümleye geçerken kuyruk karışmaz | Bekliyor |

**Not:** Bu senaryoların tümü Windows kullanıcı kabulünü bekliyor. Sentetik sayfadaki sahte parola kontrolü gerçek hesap bilgisi içermez. Metin okuma yalnız açıkça seçilmiş statik erişilebilir düğümle sınırlıdır; PDF/Word belgesinin gövde metnini veya düzenlenebilir Not Defteri içeriğini okumaz.

## Sprint 10 — çevrimdışı TXT ve DOCX belge okuma

| No | Windows kabul senaryosu | Beklenen davranış | Durum |
|---|---|---|---|
| 71 | Yerel `tools/dou-reader-offline-fixture.txt` dosyasını seçmek | İçeriği önizleme/log olmadan belleğe alır, paragraf sayısını bildirir | Bekliyor |
| 72 | Yerel Türkçe UTF-8 TXT'de ileri/geri paragraf | Cümleler yerine doğru paragraf sırasını seslendirir, baş ve son sınırında durur | Bekliyor |
| 73 | Seçili belge paragrafında ileri/geri cümle | Mevcut `ReaderSentenceContract` kurallarını uygular, ses kuyruğu karışmaz | Bekliyor |
| 74 | DOCX içinde iki paragraf, Türkçe karakter ve tablo hücresi metni | `word/document.xml` içindeki `w:t` metinlerini kullanıcı komutuyla okur | Bekliyor |
| 75 | DOCX içinde resim, harici ilişki, makro veya bağlantı | Harici kaynağa erişmez, makro çalıştırmaz; yalnız desteklenen metni alır | Bekliyor |
| 76 | DOCX XML'de DTD / varlık kullanımı | XML ayrıştırma güvenle reddedilir; harici varlık çözümleme yapılmaz | Bekliyor |
| 77 | Aşırı büyük DOCX/TXT, sıkıştırma bombası veya 200 üzeri paragraf | Belge tam olarak reddedilir; sessiz kesme olmaz | Bekliyor |
| 78 | Ağ paylaşımı veya eşlenmiş ağ sürücüsündeki belge | Çevrimdışı dosya modu okumayı reddeder | Bekliyor |
| 79 | Geçersiz UTF-8, destek dışı karakter veya 850 karakter üzeri paragraf | Genel hata gösterilir, dosya yolu veya gizli metin durum alanına yazılmaz | Bekliyor |
| 80 | Dosya seçme penceresinde iptal veya hatalı belge | Önceki belge seçimi ve okuma konumu gereksiz yere değiştirilmez | Bekliyor |
| 81 | Belgeyi kapat ve ardından önceki/sonraki düğmeleri | Önceki metne erişilemez, ses kesilir, bellekteki uygulama referansları bırakılır | Bekliyor |
| 82 | PDF veya eski `.doc` dosyası | Destekleniyormuş gibi açılmaz; biçimin desteklenmediği açıkça anlaşılır | Bekliyor |
| 83 | DOU yerel Türkçe sesi olmayan SAPI seçeneği | Uzaktaki konuşma servisine kendiliğinden geçmez | Bekliyor |
| 84 | Küçük dizüstü / yüksek kontrast / klavye ile Tab gezinmesi | Kaydırılabilir panel üzerinden tüm belge komutları erişilebilir | Bekliyor |
| 85 | DOCX yükleme sırasında bozuk ZIP veya erişim hatası | Uygulama kapanmadan genel hata gösterir, dosya yolunu ifşa etmez | Bekliyor |

**Ürün kabulü:** Bu 15 manuel Windows senaryosu henüz tamamlanmadı. DOCX metin çıkarma, tam Word erişilebilirlik nesne modeli veya PDF desteği olarak sunulmaz. Gerçek kullanıcı/cihaz kabulü tamamlanmadan PR #8 birleştirilmez.

## Sprint 11 — isteğe bağlı, yerel PDF metni çıkarma

| No | Senaryo | Beklenen davranış | Durum |
|---|---|---|---|
| 86 | Güvenilir `pdftotext.exe` yapılandırılmadan PDF seçimi | PDF destekleniyormuş gibi gösterilmez; genel ve erişilebilir açıklama verilir | Bekliyor |
| 87 | Başlangıçta `-PdfTextExecutable` ile yerel araç yolu | PATH'ten otomatik araç çağrılmaz; yalnız belirtilen `pdftotext.exe` kullanılır | Bekliyor |
| 88 | UNC, eşlenmiş ağ sürücüsü veya reparse/junction dosyası | PDF ve dönüştürücü yolunun yerel sürücü sınırı doğrulanır, uygunsuz yol reddedilir | Bekliyor |
| 89 | Dosya uzantısı `.pdf` ancak başlığı `%PDF-` değil | Alt süreç başlatılmadan reddedilir | Bekliyor |
| 90 | Sentetik, metin katmanlı 1 sayfalık PDF | Yalnız bellek içi çıkarım ile uygun paragraflar ve cümleler ileri/geri okunabilir | Bekliyor |
| 91 | PDF 12 sayfadan uzun | En fazla ilk 12 sayfa ele alınır; tüm belge okunmuş gibi gösterilmez | Bekliyor |
| 92 | 8 MiB üstü PDF veya 128 KiB üstü düz metin | Dönüşüm ve belge yükleme sınır dışıysa genel hata döner | Bekliyor |
| 93 | Çok yavaş veya yanıt vermeyen dönüştürücü | 10 saniye watchdog ile alt süreç öldürülür; arayüz serbest kalır | Bekliyor |
| 94 | PDF aracı başarısız çıkış kodu veya bozuk UTF-8 üretir | Çıktı seslendirilmez, dosya yolu ve hata ayrıntıları gösterilmez | Bekliyor |
| 95 | Yeni belge açma sırasında eski PDF işlemi bitiyor | Eski sonuç yeni belgeyi değiştiremez; arka plan işlemi sınırlı süre içinde kapanır | Bekliyor |
| 96 | Açık belgeyi kapatıp gecikmiş PDF sonucunu bekleme | Kapatılan belge eski sonuç tarafından yeniden açılmaz | Bekliyor |
| 97 | Taranmış PDF veya parola korumalı PDF | OCR veya kısıt bypass uygulanmaz; okunabilir metin yoksa reddedilir | Bekliyor |
| 98 | Gerçek PDF sağlayıcısı güvenlik/erişilebilirlik değerlendirmesi | Yerel üçüncü taraf dönüştürücünün kurulum ve çalışma güvenliği ayrı doğrulanır | Bekliyor |

**İzin sınırı:** Bunlar manuel Windows kabul senaryolarıdır; kod düzeyinde tanımlanmaları tamamlandıkları anlamına gelmez. Yeni PDF yolu yalnız isteğe bağlıdır; güvenilir araç ve gerçek kullanıcı testi yapılana kadar öğrenci/sınav belgelerinde kullanılmamalıdır.

## Sprint 12 — asenkron belge iptali ve açıklanan PDF kapsamı

| No | Senaryo | Beklenen davranış | Durum |
|---|---|---|---|
| 99 | Büyük PDF işlenirken **Belgeyi kapat** | Aktif PDF alt sürecine iptal sinyali iletilir ve kapanması doğrulanır; sonuç eski belgeyi yeniden açmaz | Bekliyor |
| 100 | PDF çıkarımı bitmeden yeni TXT/DOCX/PDF seçimi | Önceki iş iptal olur; yalnız en yeni açık seçim ekrana yansır | Bekliyor |
| 101 | DOCX XML okuması sürerken Reader'ı kapatma | İşlem, iptal noktalarında sonlanır; kapanmış forma durum güncellemesi yapılamaz | Bekliyor |
| 102 | Önceden iptal edilmiş dosya işi | Dosya veya PDF dönüştürücüsüne erişim başlamadan işlem sonlanır | Bekliyor |
| 103 | 12 sayfadan uzun PDF'nin içe aktarımı | Durum metni tüm PDF'nin değil **yalnız ilk en fazla 12 sayfanın metninin** hazırlandığını açıkça söyler | Bekliyor |

**Not:** Önceki kaynak ve statik kontrollerin geçmesi, Windows'ta süreçlerin gerçekten kapandığı anlamına gelmez. Gerçek cihazda işlem listesi, klavye, duyulur ses ve kaynak tüketimi ayrıca incelenmelidir.

## Sprint 13 — sürüm öncesi kritik kapılar (mevcut 103 senaryoya ek kontrol)

Bu kontrol listesi yeni özellik kapsamı açmak yerine ürün kapanışındaki **engelleyici** hataları hedefler. Aşağıdaki koşullar sağlanmadan PR birleştirilmez.

- [ ] Windows PowerShell 5.1 `-Check` gerçek C# derlemesi ve sekiz sözleşmenin öz testleri hatasız tamamlandı.
- [ ] Peş peşe gelen DOU ses taleplerinde eski parçanın temizlenmesi yeni parçayı kesmedi; durdur/duraklat/devam davranışı işitsel olarak denetlendi.
- [ ] PDF dönüştürücüsü 10 saniyelik zaman aşımında, belge kapatıldığında ve yeni dosya seçildiğinde gerçekten kapandı; geride `pdftotext.exe` alt süreci kalmadı.
- [ ] DOCX `w:ins`, `w:del`, `w:vanish` ve `w:altChunk` ile sentetik güvenlik örnekleri reddedildi; desteklenmeyen gizli stil senaryoları belgelendi.
- [ ] Belgede gerçek öğrenci/sınav verisi olmadan anonim TXT/DOCX/PDF üzerinde klavye, Tab sırası, yüksek kontrast, %200 DPI ve duyulur Türkçe ses testleri geçti.

**Kaynak kontrolü cihaz kabulü değildir.** Gerçek Windows ve engelli kullanıcı senaryoları hâlâ bekliyor.

## Sprint 15 — derleme ve sessiz WAV ön-deneme kapısı

Bu bölüm mevcut 103 Windows senaryosunun yerine geçmez; ürün yayınını engelleyen iki doğrulamayı netleştirir.

- [ ] Windows 11 üzerinde `powershell.exe -NoProfile -STA -File tools\dou-reader-windows.ps1 -Check -OwnVoice` çalıştırıldığında C# derlemesi ve **gerçek Node.exe → yerel köprü → geçerli PCM WAV** denemesi hata vermeden tamamlanır; test WAV'ı RAM dışında bırakılmaz ve hoparlöre gönderilmez.
- [ ] Windows'ta kurulu Node.js birden fazla sürüm/PATH girdisiyle kullanıldığında ön kontrolde belirlenen **aynı tam `node.exe` yolu** bütün ses parçalarında kullanılır; başarısız, UNC/ağ yolu veya uygun olmayan çalıştırılabilir dosyada anlaşılır hata alınır.

**Not:** Bu iki test henüz çalıştırılmadı. Sentetik ses üretimi başarılı olsa da ses cihazı, yüksek DPI, ekran okuyucu uyumu, kullanıcı görüşmeleri ve PDF alt süreç kabulü hâlâ zorunludur.

## Sprint 16 — uzun sesli okumada yayın engelleyici kontroller

- [ ] 850 karaktere kadar, 2–8 ses parçasına bölünen anonim metin, kendi yerel motorumuzda sırasını koruyarak okunur ve son parça tamamlanınca kuyruk boşalır.
- [ ] UIA kaynak uygulaması ilk parça sürerken kapatılır veya yerine aynı PID'yi kullanan yeni bir süreç açılırsa sonraki parça **okunmaz**; daha yeni bağımsız okuma oturumu etkilenmez.
- [ ] İzinli kaynak değişmişken duraklatılmış ses devam ettirilmeye çalışıldığında oturum reddedilir; kullanıcıya özel içerik gösterilmez.
- [ ] Türkçe SAPI sesi bulunmadığında cümle ve kısa bölüm düğmeleri okuma konumunu ilerletmez; sonraki başarılı seslendirmede aynı noktadan başlanır.
- [ ] Sentetik bir ses işçisi istisnası, eski nesil veya duraklatılmış oturumu yeni sesin üzerine yazmadan temizlenir.

**Bu senaryolar kodlanmış regresyon ve Windows kabul hedefleridir; henüz Windows'ta fiilen geçilmiş senaryolar değildir.**
