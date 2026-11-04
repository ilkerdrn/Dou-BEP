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
- Masaüstü düğmesi **Hücre / ızgara** olarak güncellendi ve erişilebilir adı hücre ile ızgara kaydını ayırt edecek şekilde açıklandı. Böylece sağlayıcı semantiğinin belirsizliği arayüzde de gizlenmez.
- Herhangi bir ARIA/UIA rol uyuşmazlığında açık destek kanıtı yoksa rol atlanır. Parola/Edit ataları, süreç sınırı ve 350 adımlık tarama sınırı devam eder.
- Sınıflandırma/konum/mahremiyet regresyon testleri ve sekiz Türkçe seslendirilebilir sentetik cümle test kapsamına alındı. İzole eski arşivde **GitHub sürümüyle SHA'sı eşleşen** `dou-speech-free-text.mjs` motoruyla 8/8 sentetik WAV üretimi yerel olarak doğrulandı; güncel Windows C# sürümünün derlemesi veya hoparlör sesi henüz doğrulanmadı.

**Sınır:** UIA GridItemPattern koordinatı tablonun anlamını, sütun başlıklarını veya öğrenci verisinin okunabilirliğini tek başına kanıtlamaz. DataItem altındaki tam metin ya da Word/PDF belge içeriği hâlâ desteklenmiyor. PR #8 Windows kabulü olmadan birleştirilmez.

## Sprint 08 — paragraf gezinmesi ve tablo başlığı ilişkileri (kodlandı, Windows kabulü bekliyor)

- `ReaderStructureContract` açık ARIA `paragraph` rolünü ayrı `Paragraph` türüne ayırır. Tek başına UIA `Text` kontrolü paragraf sayılmaz. `Ctrl+Alt+Shift+P` ve arayüzde **Paragraf** düğmesi ile ileri gezinilir; arayüzdeki `Önceki öğeyi bul` seçeneği paragrafta da kullanılabilir.
- Yedi yapısal gezinme düğmesi masaüstünde **dört sütun / iki satır** düzenine geçti; kontrol alanı ve ses düğmeleri birbirinden ayrıldı.
- Yeni saf `ReaderTableHeaderContract` satır/sütun başlıklarını sınırlı karakter kümesi, uzunluk ve içerik sözleşmesiyle denetler; `-Check` içinde öz test çalıştırılması için derlemeye bağlandı.
- Gerçek UIA `TableItemPattern.Current.GetRowHeaderItems()` ve `GetColumnHeaderItems()` çağrılarıyla hücreyle **açıkça ilişkilendirilmiş** başlıklar bulunursa okunur. En fazla iki başlık öğesi / eksen; UIA `HeaderItem`, aynı süreç, görünürlük ve Edit/parola ata kontrolleri zorunludur. Çok uzun/özel karakterli etiketler atlanır.
- `DataItem` kayıtlarının kendisi gizlilik nedeniyle hiçbir ad veya tablo başlığı açıklamaz; yalnız doğrulanmış ızgara konumu ve nötr rolü kullanır.
- Başlık ilişkisi sağlayıcı tarafından sunulmuyorsa hücreye sahte başlık üretilmez. Paragrafın metin içeriği `ValuePattern/TextPattern` ile çıkarılmaz; yalnız güvenli erişilebilir `Name` üzerinden sınırlı okuma sürer.

**Açık kabul:** Yeni sürümün gerçek Windows PowerShell 5.1 C# derlemesi, UI Automation sağlayıcı davranışı, anlamlı Türkçe ses, %200 DPI ve ekran okuyucu kullanıcı testi bekliyor. Microsoft UIA sağlayıcı çağrıları kendi içlerinde yavaş veya kilitli olabilir; tarama bütçemiz tek çağrıya kesin zaman aşımı garanti etmez. Bu sprint Word/PDF belge ayrıştırma veya tam metin ekran okuyucu desteği değildir.

## Sprint 09 — seçili statik metinde cümle gezinmesi (kodlandı, Windows kabulü bekliyor)

- Saf `ReaderSentenceContract` C# bileşeni, `ReaderSpeechContract` ile aynı güvenli karakter/kelime sınırlarını kullanarak en fazla **850 karakteri ve 16 cümleyi** planlar. `.`, `!`, `?` noktalama sınırları yaklaşık olarak tanınır; `2.5` gibi bitişik sayılar bölünmez. Kısaltmaların tam Türkçe dilbilgisel çözümlemesi **henüz yoktur**.
- Yalnız kullanıcı tarafından seçilen, izinli süreçteki `ControlType.Text` veya açık `paragraph` rolüne sahip öğelerin erişilebilir `Name` alanı üzerinden okunur. Gizli, parola/Edit atalı, uygunsuz karakterli, çok uzun veya sadece noktalama olan metinler reddedilir. `TextPattern`/`ValuePattern`, clipboard, klavye girişi veya arka plan taraması kullanılmaz.
- **Önceki cümle** ve **Sonraki cümle** düğmeleri, isteğe bağlı **Ctrl+Alt+Shift+← / →** kısayollarıyla aynı güvenli gezintiyi kullanır. Kısayol çakışırsa mevcut temel kısayollar korunur.
- Uygulama odağı (kısayol) ya da kaynak sürecin izin durumu (Reader düğmesi) her çağrıda yeniden denetlenir. Metin aynı UIA öğesinde değişirse önceki cümle indeksi kullanılmaz. Başlatma/durdurma iptal kuralları ve kendi Türkçe ses motoru geçerlidir.
- Küçük ekranlarda alt düğmelerin örtüşmesini engellemek için pencere **kaydırılabilir** hale getirildi: varsayılan 800×740, minimum 760×540, sanal içerik 760×855. Ses kontrolleri pencerenin altına sabitlenmek yerine içeriğin kendi yerinde kalır.
- `tools/dou-reader-uia-fixture.html` tamamen çevrimdışı, sentetik başlık/paragraf/liste/tablo/gizlilik senaryoları içerir. Dış ağ çağrısı, JavaScript veya gerçek öğrenci verisi yoktur; Windows kabulü için başlatılması isteğe bağlıdır.
- Node regresyon kaynak denetimleri ve Windows `-Check` C# sözleşme öz testi eklendi.

**Önemli doğrulama ayrımı:** Kaynak düzeyi kontroller ve arşivde SHA eşleşen ses çekirdeğinin 9/9 Node testi, güncel C# Windows derlemesi, gerçek erişilebilirlik hizmeti veya duyulur/doğal Türkçe sesi kanıtlamaz. Son derleme, kullanıcı odağı, küçük ekran, metin değişimi, durdurma ve geri gezinme kabulü hâlâ beklemektedir. Bu özellik tam Word/PDF metin okuması değildir.

## Sprint 10 — çevrimdışı TXT / Word DOCX içe aktarma (kodlandı, Windows kabulü bekliyor)

- `ReaderOfflineDocument`, kullanıcı Windows dosya seçicisinden **açıkça** yerel bir `.txt` veya `.docx` seçtiğinde çalışır. Ağ paylaşımı ve ağ sürücüsü reddedilir. `.txt` yalnız **UTF-8** kabul eder; DOCX ZIP paketinin yalnız `word/document.xml` metin düğümleri ayrıştırılır.
- `System.IO.Compression.ZipArchive` ve güvenli `System.Xml.XmlReader` ile ek paket indirmeden çalışması hedeflenir. XML DTD ve harici çözücü kapalıdır; belge içindeki makro, JavaScript, gömülü nesne, görsel, ilişki ve uzaktaki kaynağa erişilmez.
- Dosya sınırları: DOCX paketinde en çok **8 MiB**, TXT'de en çok **128 KiB**, açılan `word/document.xml` en çok **1 MiB**, XML sıkıştırma oranı en çok **100×**, en çok **1.000 ZIP öğesi**, en çok **200 okunabilir paragraf / 32.000 karakter**, her paragraf en çok **850 karakter**. Sınırı aşan belge sessizce kesilmez; reddedilir.
- Yeni Windows kontrolleri: **Belge seç ve aç**, **Belgeyi kapat**, **Önceki / sonraki paragraf**, **Önceki / sonraki belge cümlesi**. İçerik yalnız işlem belleğinde tutulur; konuşma hâlâ mevcut yerel DOU ses yolu/SAPI tercihiyle, açık kullanıcı komutuyla başlar. Kapatıldığında uygulamadaki belge referansları bırakılır. İşletim sistemi veya çöp toplayıcının belleği anında sıfırladığı iddia edilmez.
- `ReaderOfflineDocument.SelfTest()` sahte verilerle bellekte DOCX ZIP üretip okur; bozuk UTF-8, geçersiz karakter, aşırı uzun paragraf, UNC ağ yolu ve DTD içeren XML gibi reddetme senaryolarını kapsar. Başlatıcı `-Check`, `System.IO.Compression` ve `System.Xml` referanslarını ekler.
- `tools/dou-reader-offline-fixture.txt` tamamen anonim Türkçe örnek metindir; gerçek öğrencinin verileriyle test yapılmaz. Ana Reader UIA odak/gezinme katmanı ve mevcut kısayollar korunmuştur.
- Arayüz, alt kısımdaki yeni belge kontrollerinin kaydırılarak erişilmesi için `AutoScrollMinSize = 760×1130` olarak genişletildi.

**Henüz yok / dürüst ürün sınırı:** Eski `.doc` biçimi, PDF ayrıştırma, taranmış PDF OCR, DOCX tablo satır-sütun semantiği, görsel açıklamaları, dipnotlar, değişiklik takibi, denklem nesnelerinin tam anlamlı konuşması ve her belgede doğal Türkçe telaffuz bu sprintte **yapılmadı**. Kullanıcı yalnız metin parçalarını okutur. PDF için doğrulanmış çevrimdışı metin çıkarma kütüphanesi ve ayrılmış güvenli işlem gerekecek. Son C# sürümü gerçek Windows 11 üzerinde henüz derlenmedi veya kabul edilmedi; PR #8 ana dala alınmaz.

## Sprint 11 — isteğe bağlı çevrimdışı PDF metin çıkarma (kodlandı, Windows kabulü bekliyor)

Bu sprint, Sprint 10'da desteklenmeyen PDF biçimi için **koşullu** bir düz metin çıkarma yolu ekler. **Varsayılan kurulum PDF açamaz.** PDF özelliğinin kullanılabilmesi için kullanıcı ayrıca güvenilir, kendi bilgisayarındaki `pdftotext.exe` dosyasının tam yolunu başlangıçta `-PdfTextExecutable` ile sağlamalıdır. DOU Reader bunu indirmez, PATH'te aramaz veya uzak API'ye belge göndermez. Bağımsız yerel Poppler aracı bir üçüncü taraf işlemidir; uygulama onun güvenliğini kanıtlamaz veya sandbox'lamaz.

- `ReaderOfflinePdf`: yalnız `.pdf` uzantısı, **ilk 5 baytta `%PDF-` imzası**, yerel sabit/çıkarılabilir sürücü, bağlantı/junction reddi, en çok **8 MiB** dosya ve **12 sayfa**.
- Kendi metin ayrıştırıcımız yok. Yerel `pdftotext.exe` `-f 1 -l 12 -enc UTF-8 -eol unix -nopgbrk -q <yerel-pdf> -` seçenekleriyle çalışır; çıktı **dosyaya yazılmaz, yalnız stdout→RAM** üzerinden en çok **128 KiB** alınır. Alt sürecin **10 sn** watchdog zaman aşımı ve başarısız çıkış kodu durumlarında genel hata döner. Dönüştürücü aracı kendisi işlem sırasında ayrı güvenlik sınırları/yerel geçici veri uygulayabilir; DOU bunu garanti edemez.
- PDF'den çıkarılan metin `ReaderOfflineDocument.FromPdfText` üzerinden **32.000 karakter / 200 paragraf / paragraf başına 850 karakter** gibi aynı sıkı Türkçe ses filtrelerinden geçer. PDF'deki görseller, tablo geometrisi, form alanları, ekler, OCR ve gerçek semantik sıra korunmuş sayılmaz. Metin yoksa veya filtreye uymuyorsa PDF tamamen reddedilir.
- Dosya seçme işlemi tüm TXT/DOCX/PDF biçimleri için artık UI iş parçacığı dışında yürütülür. Bir belge açma girişiminden sonra yeni belge seçilirse veya açık belge kapatılırsa **eski arka plan sonucunun arayüze yazılması engellenir**. Başlatılmış dönüştürücü işlemi eski sonuç bırakılmış olsa da kendi **10 sn** zaman aşımına kadar çalışabilir; gerçek iptal token'ı henüz yoktur.
- `tools/dou-reader-windows.ps1` yeni PDF sözleşmesini derleme/öz teste dahil eder. İsteğe bağlı parametre `-PdfTextExecutable` ve `tools/dou-reader-acceptance.ps1` parametresi eklendi. PDF aracı yapılandırılmadan `-Check` C# sözleşme testini yürütür; gerçek PDF dönüşümü çalıştırılmaz.
- PDF programı herhangi bir kaynaktan otomatik kurulmuyor. Araç adı ve yerel dosya sınırı kontrol edilse de çalıştırılabilir dosyanın tedarik zinciri bütünlüğü veya zararlı PDF karşısındaki dayanıklılığı bu sprintte bağımsız olarak denetlenmedi.

### İsteğe bağlı manuel çalıştırma örneği

```powershell
# Yalnız önceden güvenilir bir yerel Poppler kurulumu varsa:
$reader = 'D:\Projects\DOU-READER-WINDOWS-TEST\tools\dou-reader-windows.ps1'
$pdfTool = 'C:\Poppler\Library\bin\pdftotext.exe'
powershell.exe -NoProfile -STA -File $reader -OwnVoice -PdfTextExecutable $pdfTool
```

**Kesin açık kapılar:** Son kaynak Windows 11/Windows PowerShell 5.1 altında henüz derlenmedi ve gerçek PDF dönüşüm testi yapılmadı. Parola korumalı, taranmış veya karmaşık düzenli PDF'ler; büyük belgeler; PDF ekleri/etiketleri; ekran okuyucu kullanıcısının doğrulaması ayrıca ele alınmalı. Untrusted PDF'nin bir üçüncü taraf dönüştürücüde işlenmesi yeni bir saldırı yüzeyi oluşturur. Öğrenci verisi ve gerçek sınav içerikleriyle pilot kabul öncesi test yapılmaz; PR #8 bu koşullar sağlanmadan birleştirilmez.

## Sprint 12 — gerçek belge iptali ve PDF işlem yaşam döngüsü (kodlandı, Windows kabulü bekliyor)

- `CancelPendingDocumentImport()` artık yalnız eski asenkron sonucu yok saymakla kalmıyor. Önceki ithalat işine ait `CancellationTokenSource` iptal ediliyor; kullanıcı başka belge seçtiğinde, **Belgeyi kapat** kullandığında ve Reader penceresi kapandığında aynı kural uygulanıyor.
- PDF modülü `ReaderOfflinePdf.Import(path, converter, CancellationToken)` çağrısını destekler. Alt süreç başladıktan sonra token iptal edilirse kayıtlı iptal geri çağrısı `pdftotext.exe` işlemini öldürmeye çalışır. Okuma döngüsü ve dönüşüm sonucu, iptal edilmiş bir isteği kabul etmez. **Bu, Windows'ta %100 garantili zorla sonlandırma veya sandbox değildir:** işletim sistemi/uygulama hatası altında kaynak/işlem davranışını gerçek Windows testi belirleyecek.
- TXT ve DOCX okuyucuları da aynı token'ı kabul eder. TXT parça okuması, DOCX paragraf ve metin öğesi döngüleri ile sonuç derlemesi iptali kontrol eder. Tek seferlik sınırlı XML yükleme işlemi sırasında anında kesme garantisi yoktur; sonraki kontrol noktasında durur.
- Daha önceki kuşak/sıra numarası kontrolü korunmuştur: eski sonuç yeni belgeyi veya kapatılan belgeyi yeniden etkinleştiremez. Token'ın sahibi olan arka plan işi kendi `CancellationTokenSource` nesnesini işler bitince bırakır; iptal çağrısındaki `ObjectDisposedException` güvenli biçimde ele alınır.
- C# `SelfTest()` içinde önceden iptal edilmiş TXT/DOCX/PDF istekleri gerçek bir kullanıcı dosyasına bakmadan reddedilir. Node kaynak regresyonu güncellendi.
- Erişilebilir durum mesajı PDF içe aktarmada açıkça **“yalnız ilk en fazla 12 sayfanın metni”** der; belge tamamı okunmuş izlenimi verilmez.

**Durum:** Değişiklikler PR #8 geliştirme dalında; Windows PowerShell 5.1 ile son C# derlemesi, converter iptal senaryosu ve gerçek klavye/ses erişilebilirliği henüz test edilmedi. Gerçek öğrenci veya sınav verilerinde kullanılmamalıdır. Bu sprint yeni özellik eklemekten çok daha önceki iptal/gizlilik açıklarını daraltmaya yöneliktir.

## Sprint 13 — ses, PDF zaman aşımı ve DOCX gizli içerik sağlamlaştırması (kodlandı; Windows kabulü bekliyor)

- **Eski oynatıcının yeni sesi kesmesi engellendi:** `PlayOwnVoice` sonlandırma yolu artık `SoundPlayer.Stop()` çağrısını sadece aynı oynatıcı hâlâ aktifse ve `_audioLock` altında gerçekleştiriyor. Böylece daha sonra başlayan oynatıcının eski üretim temizliğiyle durdurulması riski azaltılıyor.
- **PDF bekleme durumu atomik:** `ReaderOfflinePdf` alt süreç zaman aşımı bilgisi iki iş parçacığı arasında `Interlocked.Exchange/CompareExchange` ile paylaşılıyor; düz `bool` alanındaki görünürlük yarışı kaldırıldı.
- **Belge iptal nesnesi yaşam döngüsü:** tamamlanan asenkron belge yüklemesinin `CancellationTokenSource` referansı, ancak doğru yükleme kuşağı eşleşiyorsa UI iş parçacığında temizleniyor. Kapatma, yeni seçim ve eski sonuçları reddetme hâlâ kuşak kontrolüyle çalışıyor.
- **Sınav güvenliği için DOCX reddetme:** DOCX içinde açık `w:vanish`, `w:webHidden`, `w:specVanish`, `w:del`, `w:ins`, `w:moveFrom`, `w:moveTo`, `w:altChunk` işaretleri görüldüğünde belge **sessizce kısaltılmıyor veya gizli metin seslendirilmiyor**, tüm belge reddediliyor. Öz test, bellekte oluşturulmuş izlenen-değişiklik DOCX örneğini reddetmeyi kapsıyor. **Haricî stil dosyasıyla tanımlanmış her türlü gizli içerik bu pilot tarafından tespit edilemeyebilir; sınav içerikleri için tam garanti verilmez.**
- **Ham ses baytları temizliği:** Node JSON giriş baytları yazımdan sonra, WAV dizisi ve `MemoryStream` içindeki tampon başarı/hata sonunda mümkün olduğunca sıfırlanıyor. Değiştirilemeyen .NET `string` örneklerinin, işletim sistemi bellek sayfalarının veya disk takasının sıfırlandığı iddia edilmez.
- Node regresyonları; aktif oynatıcı kimliği, atomik PDF watchdog, DOCX korumalı işaretleri, iptal referansı ve ses tamponu temizliğini içeriyor.

**Hâlâ açık zorunlu doğrulamalar:** Windows PowerShell 5.1 altında son C# derlemesi, gerçek `pdftotext.exe` iptalinde process-list gözlemi, birkaç hızlı cümle/Stop/Play komutunda ses bütünlüğü, yüksek kontrast ve ekran okuyucu kullanıcı kabulü. Yerel Poppler süreci sandbox değildir. Bu paket üretim/gizli öğrenci verileriyle denenmemeli ve PR #8 kabul olmadan `main` dalına birleştirilmemelidir.

## Sprint 14 — gerçek Node doğrulaması ve Windows derleme hazırlığı (kodlandı, Windows kabulü bekliyor)

Bu çalışma, Sprint 13'te belirlenen **derleme ve çalışma güvenilirliği** engellerini küçültmeye odaklandı. Yeni kullanıcı özelliği eklenmedi.

- **OwnVoice C# ön denetimi artık SAPI kurulumundan bağımsız:** `-Check -OwnVoice` yolunda `SpeechSynthesizer` oluşturulmaz; Node.js ve yerel `tools/dou-speech-nvda-stdio.mjs` köprüsünün varlığı kontrol edilir. Normal SAPI modu değişmeden korunur. Windows PowerShell `Add-Type` derlemesine `System` ve `System.Core` referansları açıkça eklendi.
- **Ses watchdog yarışını düzelttik:** ses üretim alt süreci için `timedOut` artık `Interlocked` ile eşzamanlanıyor. Önceden eklenen oynatıcı kilidi ve kuyruk iptali korunuyor.
- **Belge byte dizisi kopyaları azaltıldı:** TXT çözümlenirken `MemoryStream.GetBuffer` doğrudan kullanılıyor; PDF stdout metni de geçici `ToArray` kopyası oluşturmadan çözülüyor. Kullanılan değiştirilebilir geçici byte dizileri `finally` içinde sıfırlanmaya çalışılıyor. `string` örnekleri, üçüncü taraf PDF süreci ve işletim sistemi belleği için sıfırlama garantisi **yok**.
- **Windows kabul betiği genişledi:** `tools/dou-reader-acceptance.ps1` artık `dou-speech-free-text.test.mjs`, `dou-speech-nvda-bridge.test.mjs` ve `dou-reader-own-voice.test.mjs` paketlerini koşulsuz çalıştırır; ardından `-Check -OwnVoice` ile gerçek C# derlemesi ve sözleşme öz testlerini denetleyecek şekilde hazırlandı.

### Bu turda gerçekten çalıştırılan testler

- Linux Node.js 22 ortamında, GitHub dosyalarının SHA-1 Git blob kimliğiyle birebir eşleştiği doğrulanan `dou-speech-free-text.mjs` ve `dou-speech-free-text.test.mjs` ile **9/9 gerçek Node testi PASS**.
- SHA doğrulanmış güncel `tools/dou-speech-nvda-stdio.mjs` köprüsü ve aynı yerel ses motoruyla **2 ayrı Türkçe WAV üretimi + 1 mahremiyet/red kontrolü PASS**. Bu üç kontrol tam `dou-speech-nvda-bridge.test.mjs` paketinin çalıştırılması değildir.
- C# ve PowerShell kaynak dosyalarına karşı güncellenmiş statik regresyon kontrolleri denetlendi. **Statik eşleşmeler C# derleyicisi veya gerçek Windows testinin yerine geçmez.**

### Kalan bloklayıcılar

Windows 11 / Windows PowerShell 5.1 üzerinde `tools/dou-reader-acceptance.ps1` gerçek çalıştırma sonucu, `Add-Type` derlemesi, `pdftotext.exe` alt süreç iptali, kendi Türkçe sesinin hoparlörde duyulması, yüksek DPI ve erişilebilirlik kullanıcı kabulü **henüz yoktur**. Daha önceki pilot kaynaklara, DOU BEP `main` dalına, öğrenci verilerine veya üretim veritabanına dokunulmadı. PR #8 bu şartlar tamamlanmadan birleştirilmemelidir.

## Sprint 15 — OwnVoice çalıştırılabilir dosyasını sabitleme ve gerçek Windows ön-deneme kapısı (kodlandı, Windows kabulü bekliyor)

Bu turdaki odak, **Windows'ta gerçek ses bağlantısının kurulma güvenilirliği** ve ön kontrolün yalnız dosya varlığını değil, çalışabilirliğini doğrulamasıdır.

- Windows PowerShell 5.1 başlatıcısı, `-OwnVoice` modunda `Get-Command node.exe -CommandType Application` ile yürütülebilir dosyayı **bir kez** çözümler; yalnız mevcut, yerel sabit/çıkarılabilir sürücüdeki `node.exe` yoluna izin verir. Bu tam yol `ReaderWindow` ve `Program.Run` üzerinden ses üretimine iletilir. Ses parçası başına tekrar `PATH` üzerinden farklı bir `node` aranmaz. Bu, kurulan Node ikilisinin bütünlüğünün kriptografik olarak kanıtlandığı veya sistemde başka hiçbir Node sürümü bulunmadığı anlamına gelmez.
- Yeni `tools/dou-reader-ownvoice-probe.cs`, **yalnız sentetik `Merhaba dünya` metnini** yerel Node köprüsüne JSON/stdin ile verir ve **WAV çıktısını stdout üzerinden RAM'de** toplar. C# `ReaderSpeechContract.IsPcmWav` ile 22.050 Hz / tek kanal / 16-bit biçimini, 3 MB çıktı sınırını, çıkış kodunu ve 15 saniyelik süreç zaman aşımını denetler. Ses aygıtında oynatma, kullanıcı belgesi, dosya yazımı veya internet isteği yapmaz.
- `tools/dou-reader-windows.ps1 -Check -OwnVoice`, tüm C# kaynaklarını derleyip öz testlerden sonra bu **sentetik Node→WAV uçtan uca sessiz ön-denemeyi** çalıştıracak şekilde güncellendi. `tools/dou-reader-acceptance.ps1` zaten `-Check -OwnVoice` çağırır; dolayısıyla bu kontrolü kapsar. DOU SAPI modu ayrı kalır.
- Reader Node regresyon testine sabit Node yolu ve sessiz WAV ön-deneme sözleşmesinin kaynak kontrolleri eklendi.

**Doğrulama sınırı:** Bu sprintte GitHub kaynakları üzerinde statik kaynak kontrolleri eşleşti, ancak **yeni `ReaderOwnVoiceProbe` henüz Windows PowerShell 5.1 altında çalıştırılmadı**. Bu nedenle C# derlemesinin ve gerçek cihazda Node→WAV üretiminin başarılı olduğunu iddia etmiyoruz. Başarılı bir sessiz WAV ön-denemesi bile hoparlör çıkışı, ses anlaşılırlığı, NVDA sürücü entegrasyonu, gizlilik sınırları ve görme engelli kullanıcı kabulünün yerine geçmez. PR #8 bu kapılar tamamlanmadan birleştirilmeyecektir.

## Sprint 16 — uzun konuşmada kaynak kimliği, işçi hata izolasyonu ve okuma konumunun korunması

**Kodlandı; Windows'ta çalıştırma kabulü hâlâ bekliyor.**

- Uzun ses oturumlarında yalnız süreç PID'si artık yeterli sayılmıyor. İlk ses talebinde kaynak uygulamanın **PID + süreç başlama zamanı (UTC ticks)** kaydediliyor; kaynak adı izin listesinde doğrulanıyor. Her bir sonraki WAV parçasından önce uygulamanın hâlâ aynı süreç olduğu denetleniyor. Uygulama kapanmışsa, izin dışına çıkmışsa veya Windows PID'yi başka işleme vermişse yalnız **o oturumun bekleyen parçaları** temizleniyor; yeni başlatılmış ses oturumu etkilenmiyor.
- Duraklatılmış uygulama kaynaklı sesi devam ettirmeden önce de aynı başlama zamanı tekrar denetleniyor. Kullanıcının açıkça açtığı TXT/DOCX/PDF belge okuması, uygulama odağına bağlı olmadığı için **SourceProcessId=0** yoluyla ayrı kalıyor.
- Beklenmedik `RunSession` işçi istisnaları artık aktif üretim/oturum eşleşmesiyle korunmuş genel hata yoluna giriyor. Eskimiş veya bilinçli duraklatılmış oturum yüzünden daha yeni bir okuma isteği iptal edilmiyor.
- Yerel Türkçe SAPI sesi yoksa cümle gezinmesi ve kısa bölüm okuması **duyulmayan metni okunmuş sayıp konum ilerletmiyor**. Kullanıcı sonraki denemesinde aynı metinden başlıyor.
- `dou-reader-own-voice.test.mjs` içindeki yeni kaynak regresyonları; süreç kimliğinin yeniden doğrulanması, ses işçisi hata temizliği ve ses yokken konumun korunması davranışlarını izliyor.

**Test sınırı:** Kod ve statik kaynak kontrolleri olumlu. Bu turda gerçek Windows/.NET derlemesi, işlem PID yeniden kullanım simülasyonu, ses cihazı ve ekran okuyucu kabulü yapılmadı. Bireysel Windows UIA sağlayıcı çağrıları veya `Process.StartTime` bilgisine erişim başarısız olursa sistem güvenli biçimde okumayı reddeder. `main` ve BEP üretim verileri değiştirilmez.
