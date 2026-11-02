# DOU BEP Sınav Atölyesi v2.13 — Toplu sınav uyarlama

> **Yerel, anonim pilot. Resmî Doğuş Üniversitesi / MEB / YÖK yazılımı değildir.** Gerçek öğrenci adı, numarası, T.C. kimlik numarası, engellilik/tanı/sağlık bilgisi veya kişisel BEP dosyalarını **BU SÜRÜME YÜKLEMEYİN**. Bu prototip KVKK, kurumsal güvenlik, erişilebilirlik ve pedagojik uygunluk incelemelerinden geçmedi.

## Asıl hedef ve yeni iş akışı

Bir okulun sınav birimi, **tek bir kurumca onaylanmış ana sınav** üzerinden, onaylı bireysel sınav düzenlemelerini esas alarak farklı öğrenci sürümleri ve gözetmen planları hazırlar. Engel/sağlık kategorisi *tek başına* otomatik düzenleme kararı oluşturmaz. Bir görme kaybı olan öğrencinin Braille, büyük punto veya ekran okuyucu ihtiyacı aynı olmayabilir. Öğretmenin/engelli öğrenci biriminin kurumsal onayı ve eşdeğerlik kontrolü gerekir.

**Yeni menü:** `http://127.0.0.1:4173/toplu-sinav` (kurum hesabıyla giriş yaptıktan sonra).

1. Kurumsal editörde sınavı tamamlayıp onaylayın. Toplu uyarlamada sadece onaylı sınavlar listelenir. Kaydedilmemiş veya onaysız sınavdan çıktı alınamaz.
2. **Örnek CSV indir** ile başlıkları ve sentetik örnekleri alın. Excel ile düzenleyip UTF-8 CSV olarak kaydedin. Başlıklar: `ogrenci_kodu;gereksinim_alani;onayli_duzenlemeler;ek_sure_dakika;onay_durumu`.
3. Dosyayı tarayıcıya yükleyin. Dosya **sunucu API'sine gönderilmez**, SQLite'a veya tarayıcı kalıcı depolamasına yazılmaz, bu sekmenin belleğinde geçici tutulur. Gerçek verilerin yüklenmesi güvenli değildir.
4. Sistem her kodun onaylı düzenlemelerini ve eksiklerini gösterir. `bekliyor` ya da düzenlemesi belirtilmemiş kayıt varsa **toplu çıktı kapalıdır**.
5. Yetkili öğretmen/koordinatör örnek veriyi ve onayı doğrulayan kutuyu işaretler, **Toplu sınav ZIP indir** düğmesine basar.
6. Her anonim kod için **`sinavlar/<kod>.docx`** ve **`sinavlar/<kod>.html`** üretilir. `ACCESSIBLE_HTML` düzenlemesinde ek olarak ekran okuyucu ve çevrimdışı tarayıcı seslendirme kontrollü `sinavlar/<kod>-erisilebilir.html` hazırlanır. **`GOREVLI-PLANI.csv`**, ek süre ve personel desteklerini içerir. HTML'yi tarayıcıda açıp yazdırma menüsünden PDF'ye kaydedebilirsiniz. **Bu aşama tüm adaylar için doğrudan PDF üretmez.**

## Desteklenen onaylı düzenleme kodları

- `LARGE_PRINT`: En az 24 punto; geniş satır aralığı
- `HIGH_CONTRAST`: Siyah/beyaz yüksek kontrast
- `ONE_PER_PAGE`: Sayfa başına tek soru
- `WIDE_RESPONSE`: Geniş cevap alanı
- `ACCESSIBLE_HTML`: Çevrimdışı ekran okuyucu / Türkçe tarayıcı seslendirmeli erişilebilir HTML
- `READER`: Okuyucu görevli planı (otomatik ses dosyası değil)
- `SCRIBE`: Yazıcı/işaretleyici görevli planı
- `SIGN_SUPPORT`: İşaret dili/iletişim desteği planı (otomatik çeviri değil)
- `QUIET_ROOM`: Ayrı/sessiz salon planı
- `BREAKS`: Onaylı ara planı
- `ASSISTIVE_TECH`: Onaylı yardımcı teknoloji planı
- Ek süre: `ek_sure_dakika` sütununda **onaylı dakika** olarak 0–120. Sistem engel durumundan süre yüzdesi uydurmaz.

İhtiyaç alanları yalnız bilgilendirme içindir: `vision`, `hearing`, `speech`, `motor`, `reading`, `other`. `onay_durumu` yalnız `onayli` veya `bekliyor` olabilir.

## Doğrulama, adalet ve kapsam sınırlamaları

- Temel sorular, cevaplar, kazanımlar ve doğru cevap anahtarı değişmez. Önceki kurumsal sınav onayı korunur; ancak öğretmen düzenlemelerin ölçme eşdeğerliğini her aday için ayrıca değerlendirmelidir.
- Herhangi bir kimlik/tanı alanı içeren CSV başlığı reddedilir. Şablona uyulmadığı için otomatik kişisel veri temizliği iddiası yoktur; kullanıcı kodu olarak gerçek öğrenci numarası girmek de **yasaktır**.
- Listeler sunucuya gönderilmese de bu prototip gerçek veri için güvenli değildir. ZIP dosyaları **şifreli değildir**. İndirilen dosyalar tarayıcı sekmesinin belleğinden temizlenmez; cihazda saklanır. Kurumsal güvenli silme ve yetkilendirme gerekli.
- Braille transkripsiyonu, profesyonel işaret dili çevirisi, yardımcı personel temini ve tam otomatik PDF paketi **henüz yok**. İşitme veya konuşma güçlüğü olan öğrenci için soru metninin otomatik sadeleştirilmesi uygulanmaz.
- Ekran okuyucu, mobil, baskı, Braille uzmanı ve gerçek erişilebilirlik pilotları yapılmadı. WCAG/EN 301 549 uyumluluğu iddia edilmez.
- Kurumsal kullanım için hukukî dayanak, rol bazlı hassas veri erişimi, kayıt/yok etme politikaları, şifreli depolama ve aktarım, SSO/MFA, denetim, test ve üniversite yönetimi onayı gerekir.

## Windows güncelleme

1. Mevcut v2.12 kurulumunu **şifreli yedekle** ve doğrula. Yedek parolasını güvenli sakla.
2. Uygulamayı kapat. Önce yeni ZIP'i ayrı bir test klasöründe dene.
3. Yeni sürümün **yalnız kaynak dosyalarını** eski proje klasörüne aktar. `data` klasörünü ve `data/institution.sqlite` dosyasını silme, üzerine yazma; şifreli yedekleri koru.
4. `BASLAT.bat` çalıştır, `http://127.0.0.1:4173/kurum` adresinden giriş yap, menüden **Toplu sınav uyarlama** aç.

## Resmî bilgi kaynakları

- KVKK özel nitelikli kişisel veri rehberi: https://www.kvkk.gov.tr/Icerik/8184/Ozel-Nitelikli-Kisisel-Verilerin-Islenmesine-Iliskin-Rehber
- Bir üniversitenin yayımlanmış sınav düzenlemeleri örneği (kurumumuza otomatik uygulanmaz): https://eob.marmara.edu.tr/ust-menu/idari/yonerge

## Testlerin anlamı

`npm test`: bu sürümde otomatik testler. `npm run release:check`: sınırlı yerel test/sürüm/dağıtım denetimi. Testler kurumsal üretim onayı veya gerçek kullanıcı erişilebilirlik testi değildir.
