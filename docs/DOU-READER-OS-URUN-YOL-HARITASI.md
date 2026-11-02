# DOU Reader OS — bağımsız, çevrimdışı Windows ekran okuyucu

## Ürün hedefi
NVDA kurulumu, bulut servisi ve üçüncü taraf zorunlu TTS olmadan çalışan, Windows UI Automation üzerinden erişilebilir öğeleri kullanıcı izniyle seslendiren, Türkçe odaklı erişilebilir masaüstü ürün. İleri aşamada Braille, web belgesi, Office/PDF ve DOU BEP entegrasyonları; bunların tamamı şu anda tamamlanmış değildir.

## Tasarım ilkeleri
- **Erişilebilirlik önce:** ekran okuyucunun kendisi de klavye ile tamamen kullanılabilir; görsel renk tek iletişim kanalı olamaz.
- **İki arayüz:** kolay "Başlat/Durdur" modu ve gelişmiş gezinme/ayarlar.
- **Gizlilik:** yalnız izinli uygulamalar; parola ve hassas alanların içeriğini okumama; metni ağ üzerinden göndermeme; mümkünse ses dosyasını bellekte tutma.
- **Geri dönüş:** kurulum/başlatma hiçbir zaman var olan Windows ses veya erişilebilirlik yapılandırmasını bozmaz.
- **Görsel sistem:** koyu grafit (#141A24), kırık beyaz (#F6F7F9), turkuaz (#26C6B4) durum/odak, sıcak mercan (#F58072) uyarı, yüksek kontrast modu; minimum 44px etkileşim alanları; odak halkası görünür.
- **Bilimsel kabul:** anlaşılabilirlik, görev tamamlama, klavye kullanım, ses kesme gecikmesi ve kullanıcı testleri ayrı ölçülmeli; otomatik testler erişilebilirlik kanıtı yerine geçmez.

## Geliştirme sırası ve kabul kapıları
### 0. Kararlı temel — mevcut durum
- [x] Node ses köprüsü 8/8 Windows test.
- [x] Python NVDA taklit/lifecycle 14/14 test (bağımsız Reader değil).
- [x] Windows UIA C# prototipinin PowerShell derlemesi ve başlangıç logu.
- [ ] Gerçek Windows'ta DOU kendi TTS modunun ses çıktısı / iptalinin manuel doğrulaması.
- [ ] Arayüzün erişilebilir uygulama dışına çıkmaması ve tüm hotkey kombinasyonlarının gerçek testi.

### 1. Ses çekirdeği / dayanıklılık
- [ ] C# -> yerel Node konuşma entegrasyonu uçtan uca manuel kabul; geçerli Türkçe sentetik metin.
- [ ] Ses sürecinin iptal yarışları, oynatma tamponu, ses aygıtı kaybı testleri.
- [ ] UTF-8 metin, uzun metin parçalama, bellek/süre/boyut sınırlarının C#/Node uçlarında karşılıklı korunması.
- [ ] Önizleme için güvenli ses hızı, sessiz mod ve okunabilir hatalar.
- [ ] Ses kalitesi: harf/kelime/sayı/matematik; anlaşılabilirlik ölçümü (gerçek katılımcılarla etik/onay dahilinde).

### 2. Windows erişilebilirlik motoru
- [ ] Odak takibi ve olay dinleyicileri (kullanıcı tarafından açıkça etkinleştirilir).
- [ ] Düğme, başlık, bağlantı, tablo, form rolü/durumu; gizli ve parola alanlarını atlama.
- [ ] Gezinti modeli: önce/sonra, başlık, link, form, liste, okuma imleci, pencere değiştirme.
- [ ] Kısayol çakışması, hız ayarı, sıraya alma, sonlandırma ve güvenli geri dönüş.
- [ ] Not Defteri, Chrome/Edge, yerel Windows uygulamaları için senaryo testleri.

### 3. Masaüstü ürün ve arayüz
- [ ] Ana panel: Başlat / Duraklat / Durdur, ses testi, durum, son izinli uygulama.
- [ ] Okuma paneli: yapı gezinmesi, odak kartı, konuşma kuyruğu, rol açıklamaları.
- [ ] Ayarlar: ses hızı, ses rengi, kısayollar, uygulama izinleri, gizlilik; yüksek kontrast.
- [ ] Klavyeyle eksiksiz kullanım ve erişilebilir isimler, açıklamalar, durum duyuruları.
- [ ] Kurulabilir, imzalı sürüm ve kolay kaldırma (pilot sonrası).

### 4. DOU BEP ve akademik içerikler
- [ ] BEP Sınav Atölyesi onaylı, sentetik sınav içeriğiyle yerel entegrasyon.
- [ ] PDF/Word/HTML erişilebilir metin aktarımında kaynak ve sıra doğrulaması.
- [ ] Matematik ve tabloların Türkçe seslendirilmesi, denklem okuma tercihleri.
- [ ] Asgari veri erişimi, öğrenci uyarlamalarında insan onayı.

### 5. Kabul ve yaygınlaştırma
- [ ] Otomatik birim/entegrasyon/regresyon testleri ve erişilebilirlik kontrol listesi.
- [ ] Görme engelli kullanıcılarla gerçek görev testleri ve etik onay prosedürü.
- [ ] Kurum içi pilot, güvenlik incelemesi, paketleme, kullanıcı dokümanı.
- [ ] MVP tamamlandı kararı ancak ses + gezinti + geri dönüş + insan testi başarılı ise.

## Tanımlı ilk teslim
**MVP-1:** Not Defteri/izinli tarayıcıda odaklanan kontrolü veya tanımlı salt-okunur metin düğümünü kendi Türkçe motoruyla okumak, durdurmak, kullanıcıya mevcut durumu duyurmak; hiçbir harici hesap/NVDA gerekmez. Mevcut C# UIA test uygulamasını koruyarak geliştirilir.

## Şu anki riskler
Windows SAPI 0 Türkçe ses bildirilmiş; OwnVoice bunu kullanmıyor ama ses oynatımının gerçekten duyulması henüz kullanıcı tarafından doğrulanmadı. UIA isimleri yerel fonem motorunun desteklemediği karakterler içerebilir; boş edit alanları güvenlik nedeniyle atlanıyor. C# pilot henüz üretim güvenilirliğinde değildir.
## Sprint 01 — uygulanmış fakat Windows kabulü bekleyen değişiklikler
- Yerel ses oynatma veri yolu **stdout → sınırlandırılmış RAM tamponu → WAV sözleşmesi → SoundPlayer(Stream)** olarak değiştirildi. WAV artık geçici diske yazılmıyor.
- C# ses sözleşmesi `tools/dou-reader-speech-contract.cs` dosyasına ayrıldı: en çok 850 karakter, en çok 8 parça, parça başına 180 karakter, WAV için 3 MB / 22.050 Hz / tek kanal / 16-bit PCM.
- `-Check` C# kaynaklarını derleyip sözleşme öz testlerini çalıştıracak şekilde genişletildi. **Yeni sürümün Windows -Check testi henüz yapılmadı.**
- OwnVoice modunda `SpeechSynthesizer` oluşturulmaz, otomatik SAPI veya bulut geri dönüşü yoktur. Var olan SAPI modu ayrı kalır.
- Ses hızı ayarı OwnVoice için 0,76–1,24 aralığında yerel köprüye aktarılır. 15 saniyelik alt süreç bekleme ve ses boyut sınırı korunur.
- Windows Forms paneli büyük butonlar, açık durum metinleri, klavye sekme sırası, koyu grafik yüzeyler ve Windows yüksek kontrast tercihine saygı ile yenilendi.
- `dou-reader-own-voice.test.mjs` kendi motorunun geçerli/bozuk isteklerini ve güvenlik özelliklerini kontrol eder; **Windows C# arayüzünün veya kullanıcı deneyiminin kabulü değildir**.
- Bağımsız platform denemesinde aynı ses köprüsü kaynağının Node WAV testi 8/8 ve hız/karakter varyasyonları için 3/3 geçti; bunlar son C# derlemesinin geçtiği anlamına gelmez.

**Açık kapılar:** gerçek Windows PowerShell C# derleme, cihazdan duyulur ses, 8 parçalı okuma, Ctrl+Alt+X ile anlık durdurma, büyük yazı/Windows yüksek kontrast, UIA izin sınırlarının gerçek kullanıcı testleri. Bu kontroller tamamlanmadan kullanıma hazır etiketi verilmez.

- Son revizyon: asenkron ses başlatma ve durdurma yarışına karşı kilitli kontrol; Windows kabulü bekliyor.

## Sprint 02 — duraklatma, kısayol ve güvenli erişim (kodlandı, Windows kabulü bekliyor)

- Kullanıcı isteğiyle **Ctrl+Alt+P** ve erişilebilir **Duraklat / devam** düğmesi eklendi.
- Ses oturumu yalnız bellekte ve sınırlı süre/uzunlukta tutulur; durdurma, yeni okuma ve kapatmada temizlenir. Devam edilirse son yarım kalan ses parçası baştan başlar; örneklem hassasiyetinde devam henüz yoktur.
- Duraklatma kısayolu başka uygulamayla çakışırsa **mevcut okuma kısayolları korunur**; buton kullanılabilir.
- Devam ettirmede önce izinli süreç yeniden doğrulanır; global kısayolla devamda hedef uygulamanın odağı da doğrulanır.
- İzin dışı odak veya okunamayan öğe geldiğinde eski konuşma kesilir; parola / düzenlenebilir alanın alt UIA metin düğümleri de atlanır.
- Ses sözleşmesi bozuk RIFF/WAVE alanları için 12 ek olumsuz sınır denemesi içerir.
- **`tools/dou-reader-acceptance.ps1`** adında üretim verisine dokunmayan otomatik test başlatıcısı ve **`docs/DOU-READER-OS-KABUL-MATRISI.md`** kabul senaryoları eklendi.

**Kalan kritik kapı:** Son C# kaynaklarının gerçek Windows PowerShell 5.1 ortamında derlenmesi ve kullanıcı tarafından ses, iptal, klavye, kontrast ve ses aygıtı davranışlarının doğrulanması. PR ana dala aktarılmamalıdır.

## Sprint 03 — sınırlı statik belge bölümü okuma (kodlandı, Windows kabulü bekliyor)

- Yeni `ReaderDocumentContract`: **16 statik metin düğümü**, **850 karakter**, **350 gezinme adımı**, **1,5 saniye adımlar-arası tarama bütçesi**; tamamen bellekte ve yalnız kullanıcı komutuyla.
- `Ctrl+Alt+Shift+D` isteğe bağlı kısayol ve **Kısa bölümü oku** kontrolü, seçilmiş izinli UIA noktası çevresindeki `ControlType.Text` öğelerinin `Name` alanını toplar.
- Alt süreç/uygulama odağı ve izinler tekrar doğrulanır. Parola ve düzenlenebilir alanların *alt öğeleri* de reddedilir; 20'den derin aynı-süreç atalarında okunabilirlik kanıtlanamazsa güvenli şekilde atlanır.
- Uygun olmayan metinler, desteklenmeyen karakterler, aşırı uzun tek düğümler ve art arda yinelenen öğeler ses kuyruğuna alınmaz. Çıktı yalnız yerel ses köprüsüne gider.
- Art arda gönderilen kısa bölüm komutları, son okunan statik metnin **sonrasından** ilerler; Ctrl+Alt+R veya rol/yapı gezinmesi yeni okuma noktası oluşturur.
- Saf C# sözleşme öz testleri `-Check` adımına eklendi; Node regresyon kaynak testlerine gezinme sınırı ve izin/şifre kontrolleri eklendi.
- `docs/DOU-READER-OS-KABUL-MATRISI.md` belge okuma için sekiz ek manuel senaryo içerir.

**Bilinçli sınırlar:** Bu aşama *tam belge metni* ya da *düzenlenebilir Not Defteri içeriği* okuması değildir; görünür UIA statik metin düğümlerine dayalı kısa bir bölümdür. UIA sağlayıcısının tek tek yavaş veya takılmış çağrıları için 1,5 saniye kesin zaman aşımı garantisi yoktur. Word/PDF, erişilebilir sınav akışı ve tam metin okuma sonraki aşamalardır. Son değişiklikler Windows'ta henüz derlenip cihazda doğrulanmadı.

## Sprint 04 — yapısal belge gezinmesi (kodlandı, Windows kabulü bekliyor)

- Ayrı saf C# `ReaderStructureContract` sınıfında **başlık, liste, liste öğesi, tablo, satır, hücre** rolleri yalnız açık **ARIA rolü / UIA kontrol türü / heading-level** bilgisiyle belirlenir. Stil veya yazı biçimi üzerinden anlam tahmin edilmez; çelişen ARIA/UIA tanımları güvenli biçimde reddedilir.
- DOU Reader arayüzüne **Başlık, Liste, Tablo, Hücre** için ayrı, erişilebilir gezinme düğmeleri eklendi. `Ctrl+Alt+Shift+L/T/C` isteğe bağlı kısayolları tanımlandı; başka uygulamayla çakışmaları ana okuma kısayollarını kapatmaz.
- Erişilebilirlik sağlayıcısı açıkça bildiriyorsa gerçek başlık seviyesi **başlık seviye 1…9** olarak Türkçe duyurulur. Başlık seviyesi görsel stillerden tahmin edilmez.
- Her gezinme yalnız önceden seçilen izinli uygulama içinde, en fazla 350 UIA adımı ve adımlar arasında en fazla 1,5 saniyelik *best-effort* tarama bütçesiyle çalışır. Tek tek UIA sağlayıcısı çağrılarının bu süreye tabi olduğu garanti edilemez.
- Gizli/parola/edit denetimleri, uzun erişilebilir etiket sınırı, durdurma/izin kontrolü ve manuel gezinme ile bölüm noktasının sıfırlanması korunur.
- `tools/dou-reader-windows.ps1 -Check` saf yapı sözleşmesinin derlenmesini ve `SelfTest()` testlerini çalıştıracak şekilde genişletildi. Node kaynak regresyonlarında sınıflandırma ve kısayol sınırları denetlenir.

**Açık sorunlar:** Bazı UIA sağlayıcıları listelere, tablolara veya hücrelere açık rol/erişilebilir isim sağlamaz; böyle öğeler seslendirilmez. Gerçek tablo içeriği, tablo başlıkları ile hücrelerin ilişkisi, Word/PDF ve akademik belge hiyerarşisi henüz tamamlanmadı. Sınırlı UIA GridItemPattern koordinat okuma Sprint 06'da kodlandı ancak Windows kabulü bekliyor. Sprint 04 için Windows gerçek derleme, ses ve klavye kabulü henüz yapılmadı.

## Sprint 05 — liste öğeleri / tablo satırları / ters gezinme / arayüz yerleşimi (kodlandı, Windows kabulü bekliyor)

- Önceki grafit/turkuaz Windows panelindeki **yapısal gezinme ve ses kontrolü çakışması** giderildi. Altı öğe türü (Başlık, Liste, Liste öğesi, Tablo, Satır, Hücre) için iki sıralı kontrol alanı eklendi.
- `Önceki öğeyi bul` seçeneği yapısal gezinme düğmelerini geriye yönlendirir; klavye kısayolları ileri yönü kullanmaya devam eder.
- İsteğe bağlı `Ctrl+Alt+Shift+I` liste öğesi ve `Ctrl+Alt+Shift+R` satır gezinmesi eklendi.
- Açık ARIA ve UIA rol bilgileri bilinen iki farklı türü işaretliyorsa `ReaderStructureContract` öğeyi yanlış etiketlemek yerine reddeder. Gerçek UIA `DataItem` öğelerinden satır/k hücre rolü tahmin edilmez.
- İsimsiz ancak **açık yapısal role** sahip izinli öğeler için, parola / düzenlenebilir alan ve ata denetimleri başarılıysa yalnız rolün adı seslendirilir. Görünür ama desteklenmeyen/uzun etiket güvenli biçimde atlanır.
- Statik kaynak kontrolleri, otomatik C# sözleşme öz testleri ve `docs/DOU-READER-OS-KABUL-MATRISI.md` senaryoları genişletildi.

**Kritik kabul kapıları:** Yeni UI'nın Windows derlemesi, özellikle %200 DPI ve yüksek kontrastta düğme düzeni, kendi Türkçe ses cihazı ve komutlar arası iptal/geri gezinme testleri tamamlanmadı. Ürünün genel erişilebilirliği onaylanmış değildir.

## Sprint 06 — gerçek UIA hücre koordinatı ve birleşik hücre okuma (kodlandı, Windows kabulü bekliyor)

- Salt-okunur `GridItemPattern` bulunan izinli hücre için gerçek sıfır tabanlı koordinatlar bir tabanlı Türkçe anlatıma çevrilir: `hücre, satır 1 sütun 2`. Sağlayıcıda veri yoksa hücre koordinatı **uydurulmaz**.
- Gerçek `RowSpan` ve `ColumnSpan` bilgisi 1×1 değilse birleşik hücre açıklaması eklenir: `2 satır ve 3 sütun boyunca`. Geçersiz/negatif/sıfır/aşırı büyük hücre span ve koordinatları reddedilir.
- Ayrı saf C# `ReaderTableContextContract` dosyası `-Check` içindeki öz testlere bağlandı; Node kaynak regresyonları ve manuel kabul matrisi genişletildi.
- Koordinat ve rol okuma yalnız açıkça izinli, güvenli UIA öğe ve ataları üzerinde çalışır; `TextPattern`/`ValuePattern`, düzenleme, kullanıcı tuşları veya tablo içeriği çıkarımı yapılmaz.

**Açık:** Tablo başlıkları ve satır/sütun başlık eşleşmesi, PDF/Word içeriği ve gerçek NVDA düzeyinde gezinme henüz mevcut değildir. Son C# sürümünün Windows PowerShell derlemesi, hoparlör sesi ve UIA sağlayıcı karşılaştırması bekliyor.

## Sprint 07 — doğrulanabilir tablo bağlamı ve DataItem gizliliği (kodlandı, Windows kabulü bekliyor)

- `ReaderTableContextContract.DescribeGridItem(row, column, rowSpan, columnSpan)` koordinat ve birleşik hücre span bilgisini **birlikte** doğrular; 10.000 sınırını aşan son hücre koordinatları reddedilir.
- UI Automation `DataItem`, yalnız `GridItemPattern` gerçekten sunulduğunda **nötr “ızgara öğesi”** olarak sınıflandırılır. `DataItem` tüm satır veya tek hücre olabileceğinden otomatik **“hücre”** diye adlandırılmaz. Açık ARIA `cell` varsa normal hücre sınıflandırması korunur.
- `DataItem` öğesinin erişilebilir `Name` değeri altta bulunan düzenlenebilir metinden türetilmiş olabileceği için bu nötr gezinmede **okunmaz**; yalnız izinli konum ve rol bilgisi seslendirilir.
- Herhangi bir ARIA/UIA rol uyuşmazlığında açık destek kanıtı yoksa rol atlanır. Parola/Edit ataları, süreç sınırı ve 350 adımlık tarama sınırı devam eder.
- Sınıflandırma/konum/mahremiyet regresyon testleri ve sekiz Türkçe seslendirilebilir sentetik cümle test kapsamına alındı. İzole eski arşivde **GitHub sürümüyle SHA'sı eşleşen** `dou-speech-free-text.mjs` motoruyla 8/8 sentetik WAV üretimi yerel olarak doğrulandı; güncel Windows C# sürümünün derlemesi veya hoparlör sesi henüz doğrulanmadı.

**Sınır:** UIA GridItemPattern koordinatı tablonun anlamını, sütun başlıklarını veya öğrenci verisinin okunabilirliğini tek başına kanıtlamaz. DataItem altındaki tam metin ya da Word/PDF belge içeriği hâlâ desteklenmiyor. PR #8 Windows kabulü olmadan birleştirilmez.
