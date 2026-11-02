> **v2.61 araştırma notu (30.10.2026):** 14 sabit örnekte 15 uygun ünlü–gürültülü ünsüz birleşimi için C sinyal deneyi eklendi. Bu çalışma bağımsız TTS veya doğrulanmış erişilebilirlik motoru anlamına gelmez.

## v2.50 DOU Speech deney protokolü sınırları

- İsteğe bağlı yerel 2×2 fonem tablosu ve en az 10 anonim dosya gerektiren cihaz içi toplu rapor eklendi.
- Daha fazla örnek, etik kurul, bağımsızlık doğrulaması, kör test, fonetik uzman değerlendirmesi, gerçek cihaz/NVDA testleri gereklidir.
- Wilson aralıkları tek başına Türkçe anlaşılırlığı veya üretim uygunluğu kanıtı değildir.

## v2.43 araştırma kilometre taşı — rol tabanlı gezinme ve telaffuz ön işlemcisi

Sınav içi yerel TTS adaptörüne Türkçe matematik okunuş sözlüğü; bağımsız Windows okuyucuya izinli süreç içinde sonraki bağlantı/düğme gezinmesi ve ayarlanabilir hız eklendi. Bu, konuşmanın akustik sentezi değil, konuşma öncesi metin normalleştirmesidir. Gerçek Windows/engelli kullanıcı testi gerekli; NVDA uyumluluğu veya üretim onayı yoktur.

## v2.42 araştırma kilometre taşı — isteğe bağlı Windows UI Automation okuyucusu

DOU Reader, uygulama içi v2.41 okuyucusundan ayrı olarak, Windows PowerShell 5.1 / UI Automation / SAPI üzerinden kullanıcı kısayoluyla izinli uygulamanın erişilebilir adını okuyan **sınırlı Windows masaüstü prototipi** kazandı. Gizlilik için otomatik odak dinleme, ValuePattern ile form içeriği alma, ağ ve dosyaya ses/metin kaydı yapılmıyor. Windows üzerinde bağımsız fonksiyonel ve NVDA birlikte kullanım testleri henüz yok; öğrenci pilotu, kendi Türkçe konuşma sentez modeli, kurumsal güvenlik ve etik onay ile tamamlanmış sayılmaz.

## v2.35 araştırma çıktısı — anonim sınav oturumu güvenliği

Tek kullanımlık anonim erişim kodlarına yönelik hatalı denemeler SQLite içinde kalıcı tutuluyor; revizyonu aynı görünen fakat içerik SHA-256 özeti onay defteriyle uyuşmayan sınavdan pilot kod verme, başlatma, cevap alma ve değerlendirme güvenli biçimde engelleniyor. Bu, tam saldırı testi veya kriptografik imza değil; ortak hız limitinin geçici hizmet aksatma etkisi ve kurumsal kimlik/anahtar yönetimi İP3 kapsamında ayrıca çözülmelidir. Eski veriler silinmez.

## v2.34 araştırma çıktısı — bağımsız erişilebilirlik inceleme kayıtları

Onaylı anonim sınav revizyonuna bağlı öğretmen–koordinatör kontrol beyanları ve yapısal Word/HTML teslim kontrolü eklendi. Değişen sınavın kabul kaydı otomatik geçersizleşir; ancak bu kayıtlar gerçek yardımcı teknoloji, kullanıcı katılımı, pedagojik eşdeğerlik, PDF/UA veya kurumsal veri işleme yetkilerinin kanıtı **değildir**. İP3/İP4/İP6 bağımsız kabul kanıtları hâlâ eksiktir.

## v2.33 iş paketi — öğretmen metin dökümleri (29.10.2026)

Denklem ve görselin yalnız öğretmen tarafından yazılmış ve kaynakla karşılaştırıldığı beyan edilmiş düz metin açıklaması, onaylı sürümün PDF çıktısında taşınabiliyor. Otomatik görsel/formül anlama, bağımsız öğretmen imza kanıtı veya PDF/UA uygunluğu sağlanmaz. Sonraki kurumsal iş paketleri: karmaşık nesne türleri için uzman incelemesi, erişilebilirlik kullanıcı testleri, SSO, uygulama düzeyinde şifreli veri saklama.

## v2.32 ek araştırma notu — PDF kod ve tablo metni

Çevrimdışı etiketli PDF pilotuna açık kod blokları için lisans izinli monospace font, kayıpsız satır/girinti koruması ve çok basit metin tabloları için sütun adlarıyla doğrusal açıklama dönüşümü eklendi. **Bu gerçek semantik PDF tablo yapısı veya PDF/UA uyumu değildir.** Karmaşık Word/Math, görsel, form ve grafik semantiği için uzman denetimi ve kullanıcı testleri gerekir. Kendi Türkçe ses ve ekran erişimi araştırması, sınav sisteminin kabul önkoşulları tamamlandıktan sonra yürütülecek.

## v2.23 kapsamında tamamlanan prototip adımı
Karmaşık Word öğelerinin tür ve sıra bazlı raporu, öğretmen kontrolündeki anonim metin dökümü, özgün belge ve döküm hash eşleştirmesi, onaysız taslak. Bu bir otomatik semantik dönüştürücü değildir. Eşdeğerlik için disiplin uzmanı ve erişilebilirlik kullanıcısı değerlendirmesi gerekir.

# Üniversiteler için Erişilebilir Sınav Yönetimi ve Yerli Sesli Erişim Platformu

**BAP ölçeğinde Ar-Ge ve ürünleştirme taslağı — güncellenen prototip v2.35, 29 Ekim 2026**

> Bu belge bir BAP başvurusunun kabul edildiği veya herhangi bir üniversite tarafından onaylandığı anlamına gelmez. İnsan katılımcı, veri ve etik izinleri kurumun yetkili birimlerince değerlendirilmelidir.

## 1. Problemin tanımı

Üniversitede birden fazla fakülte/program, farklı vize/final/bütünleme sınavlarını hazırlar. Özel gereksinimli öğrenciler için uygun düzenlemeler ayrı kararlarla onaylanır. Mevcut işlem çoğu yerde dağınık belge, manuel çıktı ve personel koordinasyonuna dayanır. Hedef, sınavın akademik içeriğini öğretim elemanının onayı olmadan değiştirmeden; ders/oturum/öğrenci düzenlemesi eşleşmesine göre erişilebilir çıktı ve görevli planını güvenli biçimde oluşturmaktır.

## 2. Ar-Ge hedefleri

1. **İçerik bütünlüğü:** Orijinal sınav, uyarlanmış kâğıt ve öğretmen onayı arasında sürüm/özet zinciri.
2. **Bireysel uyarlama:** Engel/sağlık kategorisinden otomatik çıkarım *yapmadan* kurum tarafından onaylı düzenlemeleri uygulama.
3. **Çok dersli koordinasyon:** Akademik dönem, ders kodu, oturum, görevli ve salon kayıtlarını izleme.
4. **Ölçme eşdeğerliği:** Farklı sunum biçimlerinin ölçülen kazanımı değiştirip değiştirmediğine ilişkin uzman denetim iş akışı.
5. **Çevrimdışı çalışabilirlik:** Üretim sınavları ve özel veri için haricî SaaS/AI/TTS/API çağrısının zorunlu olmaması.
6. **Özgün seslendirme Ar-Ge:** İkinci fazda kurum içinde geliştirilen, Türkçe akademik terim ve matematik/kod anlatım katmanı. Tam işletim sistemi ekran okuyucusu ayrı araştırma konusu olup projenin ilk fazının teslimi değildir.

## 3. Mimari ilkeler

- Yerel modüller: kurum/yetki, soru & kazanım, kaynak belge dönüşümü, sınav ve uyarlama onayı, oturum koordinasyon, toplu çıktı, denetim/geri yükleme.
- Ayrı veri alanları ve asgari yetki: kimlik, sınav, sınav kararı ve sağlık belgesi birbirine karıştırılmamalı. Mevcut pilot yalnız sentetik kodları kabul ediyor.
- Dış bağlantı sıfır ilkesi: sunucu yalnız `127.0.0.1` dinler; kullanıcıya ait hiçbir içerik buluta gönderilmez. Üretim ortamında ayrıca çıkış bağlantısı güvenlik duvarıyla kapatılıp doğrulanmalıdır.
- Ses motorunun yazılım, lisans, konuşma derlemi ve model hakları ayrı incelenecek. "Tamamı bizim" hedefi, başkasının sesinin veya lisanslı modelinin izinsiz kullanıldığı anlamına gelmemelidir.
- İnsan onayı: otomatik dönüştürme asla kendiliğinden pedagojik onay anlamına gelmez.

## 4. İş paketleri ve teslim kapıları

| İş paketi | Hedef teslim | Zorunlu kabul kanıtı |
|---|---|---|
| İP1 Sınav çekirdeği | Çok dersli kaynak, Word/PDF aktarma, A4 çıktı, onay tarihi ve revizyon | Doğru kaynak/sürüm; farklı ders ve sınavın karışmaması; PDF/Word çıktı incelemesi |
| İP2 Uyarlama / koordinasyon | İkinci yetkili onayı, dönemli liste, görevli/oturum planı | 2 kişi kuralı, kurum ayrımı, eksik kararda üretimin engellenmesi |
| İP3 Kurumsal güvenlik | HTTPS, kimlik sağlayıcı, MFA, şifreli depolama, rol/kayıt tutma, geri yükleme | Bağımsız sızma testi; hukuk/KVKK değerlendirmesi; kurtarma tatbikatı |
| İP4 Erişilebilir belge | Erişilebilir PDF, tablo/matematik/şekil alternatifleri, baskı biçimi | Gerçek yardımcı teknoloji ve basılı kâğıt uzman değerlendirmesi |
| İP5 Özgün ses erişimi | Çevrimdışı Türkçe konuşma sentezi, sözlük, soru bazlı sesli gezinme | Lisans kontrollü derlem, anlaşılırlık/latans/gerçek kullanıcı testleri |
| İP6 Pilot / yaygınlaştırma | Çok bölümlü kurum pilotu, destek ve izleme | Etik izin, gönüllü test planı, sistem kullanılabilirliği raporu |

## 5. BAP için ölçülebilir araştırma soruları

- Bir sınavın onaylı uyarlanmış çıktısını üretmek için harcanan işlem sayısı ve dakika ne kadar azalıyor?
- Soru kaynak metni ile uyarlanmış çıktı arasındaki hata oranı nedir? Kör çift uzman kontrolüyle ölçülecek.
- Farklı erişim profillerinde hata, görev tamamlama ve kullanıcı memnuniyeti sonuçları nasıl değişiyor?
- Bağımsız değerlendirmede içerik eşdeğerliği, akademik zorluk, gizlilik ve erişilebilirlik ölçütleri nasıl sonuç veriyor?
- Gelecekte geliştirilecek yerli Türkçe ses motoru akademik terimlerde hangi anlaşılırlık ve gecikme düzeyine ulaşıyor?

**Başarı eşikleri** proje komisyonu ve erişilebilirlik uzmanlarıyla pilot öncesi yazılı olarak sabitlenecek; verilere bakarak sonradan uydurulmayacak.

## 6. Veri ve etik sınır

- Bu paket yalnız sentetik/anonim örnekler içindir; gerçek öğrenci verilerini yüklemek yasak kabul edilmiştir.
- Özel nitelikli veriler, veri sorumlusu ve mevzuat değerlendirmesi tamamlanmadan kullanılmamalıdır.
- Gerçek öğrencilerle test için erişilebilir rıza/aydınlatma, gönüllülük, erişim kontrolü, veri minimizasyonu, silme ve saklama politikası ile etik izin gereklilikleri ayrıca değerlendirilir.
- Genişletilmiş pilotta bile tanı yerine **onaylı sınav düzenlemesi** üzerinden çalışmak tercih edilir.

## 7. Durum (v2.21)

**Kodlanmış:** v2.20 çekirdeği + yalnız yetkili yönetici/koordinatörün eriştiği, sentetik sınav/oturum/uyarlama onay eksiklerini gösteren Operasyon Merkezi. Sunucudan aday kodu veya tanı listesi döndürülmez.

**Bilinçli olarak tamamlanmış sayılmayanlar:** gerçek öğrenci pilotu, kurumsal HTTPS/SSO/MFA, dinlenimde şifreli veritabanı, güvenlik sızma testi, sertifikalı erişilebilir belge, özgün Türkçe TTS ve tam ekran okuyucu motoru.

Bu maddeler kapanmadan "üretime/satışa hazır" veya "BAP başarıyla tamamlandı" denmemelidir.

## v2.24 kilometre taşı: teslimde kaynak sürüm ve belge bütünlüğü

Onay geçmişindeki sürüm SHA-256 özeti doğrulanmadan hiçbir tekil sınav belge dışa aktarımı yapılmaz. Sunucu Word/HTML/erişilebilir HTML dosyalarını tek ZIP'de üretir, manifest ve kurum sınırlı denetim kaydı sağlar. Bu teknik bütünlük kontrolü bağımsız erişilebilirlik, bilimsel uygunluk, güvenli veri işleme ve saha kullanıcı kabul testlerinin yerine geçmez. Ses motorunun tamamının kuruma ait olması hedefi sonraki ayrı Ar-Ge iş paketidir; dış API zorunlu hale getirilmedi.


## v2.25 çalışma notu
Yerel pilot için kalıcı giriş sınırı ve salt okunur `security:check` eklendi. Bu adımlar dinlenimde şifreleme ve kurumsal MFA yerine geçmez. Bir sonraki kabul kapıları: anahtar yönetimi ve şifreli DB kararı, kurtarma tatbikatı, erişilebilir belge testleri, bağımsız güvenlik/etik-KVKK değerlendirmesi. Kendi çevrimdışı Türkçe ses teknolojisi, ana sistem kabulünden sonra ayrı Ar-Ge iş paketi olarak planlandı.

## v2.26 çalışma notu — güvenli yerel depolama

- BAP ana sisteminde kurum içi/çevrimdışı hedef korunur. Windows BitLocker tam-disk koruma doğrulaması, isteğe bağlı kapalı-başlatma kapısı olarak eklenmiştir; bu **uygulama seviyesi veritabanı şifreleme değildir**.
- Şifreli yedeklerin parolalarını eski arşivi bozmadan ve yeni arşivi doğrulamadan yayınlamadan döndürme iş akışı eklendi. Kurtarma anahtarı yönetimi BT ekibine aittir.
- Araştırma kabul kapısı: Windows Home/Pro/Enterprise farklılıkları, sürücü erişim izinleri, ayrı güvenli geçici alan, veritabanı/WAL tam-disk koruması ve yedekten geri dönüş, kurumsal pilot başlamadan önce yerinde sınanmalıdır.
- Gerçek kullanıcı/sağlık verisi, semantik PDF, MFA/SSO, bağımsız erişilebilirlik ve KVKK çalışmaları henüz tamamlanmamıştır. Yerel ses motoru bu iş paketlerinden sonra geliştirilecektir.


## v2.27 Çevrimdışı hesap güvenliği ilerlemesi
- Tamamen yerel RFC 6238 TOTP doğrulaması ve bir kullanımlık kurtarma kodları; sunucu MFA etkin hesabı yalnız parolayla oturum açtıramaz.
- Üye bazında AES-256-GCM ile şifreli gizli anahtar, kalıcı kilit ve tekrar kullanılmayan TOTP sayaçları.
- Windows DPAPI CurrentUser ile ayrı disk dosyasında anahtar saklama; sırrın kaybında başarısız kapatma ve sunucuya anahtar üretiminin otomatik olmaması.
- **Araştırma eksikleri**: kurumsal SSO/MFA zorunluluk politikası, çok cihazlı kimlik yaşam döngüsü, anahtar kurtarma, platformlar arası kimlik çözümü, HTTPS, bağımsız sızma testi ve gerçek öğrencilerle erişilebilirlik pilotu. Sesli sınav motoru sonraki ayrı Ar-Ge paketinde geliştirilecektir.

## 10. v2.28 kimlik güvenliği aşaması

Kurum bazında isteğe bağlıdan zorunluya geçirilebilen MFA politikası, otomatik kısıtlı kurulum oturumu ve yönetim işlemlerine parola yeniden doğrulaması eklendi. Bu prototipteki politikaya rağmen tam kurum SSO/OIDC, zorunlu sistem politikası denetimi, canlı veritabanı şifrelemesi, anahtar kurtarma tatbikatı, HTTPS, KVKK/etik ve gerçek kullanıcı kabul testleri ayrı İP3-İP6 teslim koşulları olmaya devam ediyor. Ses ve ekran erişim motoru İP5'te, ana sınav sisteminin olgunlaşmasının ardından geliştirilecek; dış ağ API'sine zorunlu bağımlılık kurulmayacak.


## v2.29 — Semantik çıktı ve denetlenebilir teslim kilometre taşı

- Word'de akademik başlık/soru hiyerarşisini yalnız görsel kalınlıkla değil gerçek OOXML `Heading1/Heading2` stilleriyle temsil etme ve yazdırılabilir HTML soru `h2` kullanımı.
- Sunucu teslim sırasında 7 makine tarafından doğrulanabilen yapısal gereksinimi denetleyip sonucu hash manifestine bağlar, CLI paketi yeniden değerlendirir. Başarısız denetim yeni onay/teslim olayı üretmez.
- **Kabul için halen eksik:** Gerçek cihazda NVDA/VoiceOver, Türkçe matematik/tabloların anlam eşdeğerliği, %400 yeniden akış, etiketli PDF, görme engelli öğrencilerle tekrarlanabilir pilot, etik/KVKK ve bağımsız güvenlik testi. Yapısal rapor kurum veya WCAG sertifikası değildir.
- Kurum içi Türkçe ses/ekran erişim motoru ana sistemin bu kabul kapıları tamamlandıktan sonra ayrı BAP Ar-Ge iş paketi olarak geliştirilecektir; haricî bulut bağlantısı zorunlu olmayacaktır.

## v2.30 — Uçtan uca kabul kanıtları ve sınırlar

Ana sınav yönetimi iş paketi için sentetik, veri izolasyonlu **10 kontrol içeren** yeniden üretilebilir senaryo `npm run acceptance:pilot` komutuyla sağlandı. Denetim girdileri gerçek öğrenci veya kurum verisi içermez; bağımsız ikinci yetkili onayı, kurum ayrımı, değişen onaylı sınavın yeniden dışa aktarılamaması ve anonim paket SHA-256 doğrulaması kayda girer. Rapor **ürün sertifikası değildir**.

Kurumsal pilot ön şartları: onayda görev ayrılığı (`BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL=1`), MFA politikası ve güvenli anahtar yönetimi, HTTPS/SSO, uygulama seviyesinde veri şifreleme, KVKK/etik izinleri, bağımsız güvenlik taraması, gerçek görme/işitme/motor gereksinimli üniversite katılımcılarıyla kullanılabilirlik ve ekran okuyucu incelemesi, PDF/UA belgelendirme süreci. Ses/ekran okuyucu Ar-Ge modülü bu ana uygulama kabulünden sonra tamamen kurum içi geliştirme hedefiyle ele alınacaktır.

## v2.31 — PDF üretim Ar-Ge pilotu ve kabul boşlukları

BAP ana uygulamasında dış ağ servisleri olmadan basit metin sınavı için **yerel fontla PDF/Unicode/etiket ağacı üretim prototipi** tamamlandı. İnceleme kapıları ayrı tutulur: (1) öğretmen/sınav editörü akademik eşdeğerlik kontrolü, (2) PDF/UA teknik standardı ve PDF okuyucu uyumluluğu için bağımsız kontrol, (3) Türkçe NVDA/JAWS/VoiceOver kullanıcı değerlendirmesi ve (4) görsel/matematik/tablo/kod temsilinin kayıpsızlığı. `pdf:font-check` font gömme iznini ve Unicode pilotunu kontrol eder, uygunluk sertifikası değildir. Karmaşık içerik otomatik eksiltilmez. Yerel, dış bulut bağlantısız işleme hedefi korunur; canlı DB şifreleme/SSO/HTTPS ve gerçek veri izinleri açık eksiklerdir. Bağımsız in-house Türkçe ses okuyucu, bu ana sistem kabulünden sonra ayrı Ar-Ge modülüdür.

## v2.36 — Haricî denetim bütünlük kanıtı (araştırma kilometre taşı)

- Yerel audit tablosunun seçilen ana kadarki tüm kayıtlarına ilişkin dışarıda saklanan HMAC-SHA256 doğrulama özeti, anahtar dosyası ve sınırlı kapsamlı read-only denetim aracı.
- BAP kurumsal kabul için gerekli olmayan bu **isteğe bağlı** başlangıç koruması açılırsa eski kanıta uymayan veritabanında sunucu açılmaz. Eski anonim pilot varsayılan olarak etkilenmez.
- **Açık kalan işler:** Kurumsal KMS/TPM/DPAPI saklama ve rotasyon, WORM/SIEM bağımsız log, audit satırlarının atomik kayıt garantisi, veri geri dönüşü/rollback savunması, SQLCipher veya eşdeğer canlı şifreleme, SSO/OIDC, TLS, pentest, KVKK/etik, gerçek ekran okuyucu ve PDF/UA kabulü. HMAC anahtarı ya da kanıt dosyası veritabanıyla aynı erişim sınırında tutulursa bağımsızlık zayıflar.
- Üretilen JSON'daki özetler denetim girdisinin kendisi değildir; yalnızca kaydedilen **önceki** olay aralığını doğrular. Sonradan eklenen audit satırları yeniden mühürlenmelidir. Kendi çevrimdışı ses/ekran erişim motoru ayrı Ar-Ge hedefi olmaya devam ediyor.

## v2.37 — İki nesil denetim anahtarı değişim kanıtı

v2.36'nın bağımsız audit kanıtı üzerine, mevcut anahtarı/veriyi silmeden ikinci anahtara geçişi kanıtlayan yerel bir akış eklendi. Eski ve yeni HMAC dosyalarının SHA-256 bağı, yeni audit öneği ve güvenli açılış denetimi yalnız anonim verilerle sınandı. Kurumsal KMS/DPAPI, çok nesilli zincir, WORM arşiv, canlı SQLite şifreleme, OIDC/SSO, PDF/UA, erişilebilirlik kullanıcısı testi ve KVKK/etik kabul halen araştırma için eksik kalemlerdir. Kendi çevrimdışı Türkçe ses/ekran erişim motoru sonraki ayrı BAP iş paketi olarak korunmuştur.

## v2.38 — Haricî denetim kanıtına bağlı şifreli yedek ve geri yükleme

- Kaynak ve SQLite anlık görüntüsü bağımsız HMAC kanıtıyla doğrulanır; eski audit kayıtları değiştirilmişse yedek yayımlanmaz.
- Yedek AES-256-GCM ile şifrelenir, parolalı doğrulaması yapıldıktan sonra yeni `.bepbak` hedefe yazılır.
- Geri yükleme, geçici SQLite üstünde audit kanıtını kontrol eder ve yeni bir dosya yayımlar; eski oturumlar silinir.
- Mevcut canlı SQLite hâlâ uygulama seviyesinde şifreli değildir; gerçek öğrenci verileri ve kurumsal kullanım için yeterli değildir.

## v2.39 — İzole kurtarma provası / canlı şifrelemeye geçiş ön koşulu

Sentetik yerel araştırma pilotunda kanıtlı şifreli yedek -> özel geçici dizine geri yükleme -> oturum-dışı tüm tablo satırlarının özgün kaynakla tutarlı olduğunun kontrolü tek komutta uygulanır. Rapor; öğrenci, hesap, sınav metni veya tablo içerik özetini içermez. Kaynağın prova sırasında değişmesi veya bağımsız kanıtın uyumsuzluğu başarısız kabul edilir. Geçici düz SQLite dosyası test sırasında oluşur ve sonunda kaldırılır. Bu adım canlı SQLite şifrelemesi, kurumsal KMS, etik/KVKK, SSO veya erişilebilirlik testlerinin yerine geçmez. Üretimde kullanılacak şifreleme sürücüsü ve kesintisiz geri dönüş planı ayrıca seçilip bağımsız test edilmelidir.

## v2.40 — SQLite depolama yüzeylerinin güvenlik ön denetimi

Ana SQLite dosyası dışındaki WAL/SHM/rollback journal, klasör izinleri, sembolik bağlantılar ve geçici çalışma hacminin potansiyel düz veri sızıntıları artık salt okunur raporlanır. Yalnızca açıkça etkinleştirilen POSIX yerel koruma kuralı başlangıçta olumsuz izinlerle çalışmayı engeller; Windows NTFS ACL otomatik doğrulanmadığından bu yeni kapı Windows'ta güvenli şekilde durur. Bu iş paketi **gerçek şifreli canlı SQLite değildir**. Kurumsal KMS/SQLCipher veya eşdeğeri, audit key yönetimi, gerçek cihaz denemesi, etik/KVKK, OIDC, erişilebilir PDF doğrulaması ve ekran okuyucu testleri beklemektedir. Üretim verisi taşımayın; önceki dosyaları silmeyin.


## v2.41 Ar-Ge çıktısı — DOU Reader / Speech pilotu
Anonim öğrenci sınavında ekrana gömülü, klavye odaklı soru navigasyonu ve yalnız tarayıcının yerel Türkçe olarak işaretlediği işletim sistemi TTS seslerini kullanan adaptör geliştirildi. NVDA düzeyinde Windows sistem erişimi ve kendi Türkçe akustik TTS modeli yapılmadı; bunlar ayrı BAP iş paketleridir. Gerçek NVDA kullanıcılarıyla karma yöntemli erişilebilirlik testleri, Windows UI Automation prototipi ve dil verisi/lisans etik değerlendirmesi sonraki akademik aşamadır.

## v2.44 DOU Reader araştırma çıktısı

İsteğe bağlı Windows UI Automation okuyucusuna `AriaRole` ve `HeadingLevel` özelliklerini kullanarak ileri/geri başlık, erişilebilir düz metin öğeleri navigasyonu eklendi. Sınav ekranının `audioAllowed` politikası ve yerel Türkçe ses koşulu değişmedi. Küme/analiz sembollerinin telaffuzu yerel metin dönüştürme kuralıdır; özgün ses sentezi modelinin eğitildiği anlamına gelmez. Windows gerçek cihaz testi, NVDA çatışma analizi, çoklu tarayıcı karşılaştırması, görme engelli gönüllülerle etik izinli kabul testi hâlen gereklidir.


## v2.45 ek not — DOU Speech özgün ses çekirdeği

Yalnız sentetik kısa örnek için matematiksel formant/gürültü modeliyle PCM WAV üreten, model eğitimi/dış ses paketi gerektirmeyen akustik araştırma çekirdeği geliştirildi. Kayıtlı TTS sistemi değildir, anlaşılır konuşma doğrulanmadı. Sonraki aşama: fonem süreleri ve prozodi analizi; gerçek Windows/ekran okuyucu entegrasyon testleri; lisanslı/etik Türkçe veri seti ve insan değerlendirmesi. Gerçek öğrencilerin özel nitelikli bilgileri veya sınav içerikleri bu laboratuvarda kullanılmaz.

## v2.46 ek araştırma — DOU Speech prozodi

Yalnız sentetik cümleler üzerinde yaklaşık hece, son hece vurgusu, fonem süreleri ve basit soru tonlaması üretildi. PCM-WAV kalite ölçümleri sesin güvenli teknik aralıklarını sınar; Türkçe anlaşılabilirlik, doğal prosodi, ekran okuyucu ile kullanılabilirlik ve üniversite düzeyi değerlendirme sınavlarındaki uygunluğu **kanıtlamaz**. Kurumsal pilot öncesi etik/KVKK, görme engelli kullanıcı kabulü, bağımsız NVDA değerlendirmesi ve yerel teknik doğrulama gerekir.

## v2.47 ses araştırması — ölçülebilir geçiş ve kör öznel karşılaştırma

Etik izin ve bağımsız insan deneyleri öncesinde yalnız sentetik metinlerden üçüncü WAV varyantı üretildi. Ötümlü harf sınırlarında enerjinin sıfıra düşmesini azaltan otomatik regresyon testi, klipsiz 16-bit PCM ölçümü ve kaynak/yanıt toplamı sınırlaması eklendi. Üç örneklik tarayıcı içi kör tercihler **insan deneyinden elde edilmiş veri değildir**; gerçek konuşmayı anlama başarısı veya akustik kalite için istatistiksel kanıt sayılamaz. Sonraki Ar-Ge: fonem karşılaştırma veri kümesi (izinli/lisanslı), kontrollü dinleme ve transkripsiyon protokolü, akademik/etik izne dayalı erişilebilirlik testi, Windows Reader cihaz doğrulaması; üretim sınavına otomatik geçiş yoktur.


## v2.48 — deneysel Türkçe ünsüz profilleri ve sentetik kontrol çiftleri

İnternetsiz PCM-WAV ses üretimine bağımsız sesli/sürtünmeli/patlamalı/genizsil/akıcı sınıfları eklendi; Türkçe **harflerden** yaklaşık akustik profil atanır. Bütün örnekler anonim, sabit ve sentetiktir. Sasa/Şaşa gibi çiftlerin farklı dalga biçimleri vermesi, gerçek Türkçe fonem tanıma doğruluğunu veya öğrenci tarafından anlaşılabilirliği göstermez. Sonraki iş paketleri: lisanslı/etik kaynaklı Türkçe fonetik temel gerçeklik, profesyonel fonetik uzman değerlendirmesi, insan transkripsiyon protokolü, akustik kalibrasyon ve gerçek Windows Reader cihaz testleri. Bu deneysel modül kurumsal sınav okuyucusu yerine konulmaz; canlı DB şifreleme, OIDC ve gerçek erişilebilirlik onayı ayrı eksikler olarak kalır.


## v2.49 araştırma adımı — sentetik fonem seçim alıştırması

Dört sabit ses çiftinin (s/ş, m/n, p/k, v/z) iki yönde sekiz örneği için tarayıcı içinde rastgele sıra ve iki seçenekli tanıma alıştırması geliştirildi. Bu, yalnız bir pilot araştırma aracı; öznel insan sonuçları bu sürümde toplanmadı. Katılımcı kimliği yoktur, ses kaydı yoktur, sonuçlar sunucuya gönderilmez. Yalnız isteğe bağlı toplu sayılar indirilebilir. PCM fark ölçümü mekanik/sayısaldır; Türkçe telaffuz doğruluğunu belirlemez. Etik izinli ve fonetik uzman denetimli bağımsız kör dinleme protokolü, anlaşılabilirlik istatistikleri, ortam kalibrasyonu ve gerçek erişilebilirlik testleri gerekir.


### v2.62 — Türkçe ortografik hece referansı (30.10.2026)
Sabit 14 sentetik laboratuvar örneğinde beklenen yazımsal hecelerin, deneysel hece planlayıcısı ve sekiz ünlü özelliğiyle çapraz kontrolü; anonim ve çevrimdışı rapor. Bu bir fonetik kalite ölçümü değil. Sonraki araştırma adımlarında dilbilim uzmanı ile yeni sözcük kümesi ve NVDA/Windows yerel cihaz sınamalarının ayrı validasyonu gereklidir.
