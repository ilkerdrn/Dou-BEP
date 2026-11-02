## v2.81 — Yerel sınav kapanış denetimi ve PDF/ZIP bütünlük güvenliği

- Onaylı PDF ve ZIP indirilmeden önce gerçek dosya SHA-256, imza, bildirilen boyut ve format kontrolü; bozuk/eksik dosyalar reddedilir.
- `npm run exam:closure`: bağımsız geçici veritabanında kimlik, taslak, revizyon, onay, Word/HTML/PDF, teslim ZIP, CSRF ve tenant izolasyonu gerçek HTTP testi.
- Sınav editöründe yeni fonksiyon sunucuya ek veriyi göndermez, dosya diske yazılmadan önce yerel olarak denetlenir.
- Robotik ses/NVDA gerçek kullanıcı onayı verilmez. Windows güncellemesi son kullanıcıda doğrulanmalıdır.

## v2.80 — Koşul içi eşleşmiş sözcük hedef analizi

- Dört motor ile önceki motor arasında tek tek sözcük hedefi farkları (iki doğru, önceki tek doğru, aday tek doğru, iki yanlış).
- Fonem çiftlerine göre yönlü değişim tablosu, koşul ayrımı ve eski JSON uyumu.
- Bağımsız insan dinleyicisi, istatistiksel anlamlılık veya NVDA onayı iddiası yok.

## v2.79 — Koşul bazlı betimsel araştırma denetimi

- Dört motorlu raporlar yalnız eş deney koşulları içinde, rapor düzeyinde karşılaştırılır (iyileşti/eşit/kötü, ortanca fark).
- Her koşul için hatası çok görülen çiftler betimsel öncelik sırasına konur, akustik neden kanıtı sayılmaz.
- Örneklem hedefi yalnız planlama amaçlıdır; bağımsız insan dinleyici, istatistiksel anlamlılık ve NVDA üretim onayı hiçbir koşulda verilmez.
- Tavan etkisi, eksik koşul ve eş yanıt deseni uyarıları; kullanıcı dosyaları yalnız tarayıcıda okunur.

## v2.78 — Yerel rapor kalite ve koşul denetimi

- Çakışan yanıt desenleri ve karşılaştırılamayan laboratuvar koşulları işaretlenir.
- Motorlar için rapor başına dağılımlar ve betimsel karşılaştırmalar eklendi.
- Otomatik kullanıcı tanımlama, veri aktarımı ve NVDA üretim onayı yoktur.

## v2.77 — Yerel dört motor rapor denetimi (30.10.2026)

- Kimliksiz dört motorlu 48 denemelik raporları tarayıcıda seçerek karşılaştırma; yeni dosya kalıcılığı yok.
- Dışa aktarılan raporların alan ve toplam puan doğrulaması, tutarsız/beklenmeyen alanları reddetme.
- Ses çifti bazında karıştırma tablosu, motor oranı, önceki motorla betimsel fark.
- Gerçek kullanıcı / Windows / NVDA onayı verilmez.

## v2.77 (2026-10-30)
- Dördüncü opt-in yerel akustik prototip (place), 48 denemelik deney ve kimliksiz rapor.
- Daha önceki ses profilleri, kurumsal kayıtlar ve deneyler korunur. Üretim onayı yoktur.

## v2.75 — Deneysel ses kıyaslamasında bloklu örnekleme ve RMS dengesi (30.10.2026)

- 36 deneme altışar sözcük çifti içeren bloklarla planlanır; tekrar eden komşu çift engellenir.
- WAV sesleri yalnız dinleme laboratuvarında güvenli aralıkla RMS seviyelendirmesinden geçer; kaynak üç akustik motor değiştirilmedi.
- Bozuk/sessiz WAV reddi, yeni regresyon testleri, açık metodoloji notu ve düşük ses uyarısı.
- Yerel NVDA köprüsünün davranışı değiştirilmedi; gerçek Windows/NVDA ve insan anlaşılabilirliği doğrulanmadı.

## v2.74 — 30 Ekim 2026
- Üçüncü kontrast fonem adayının bounded offline PCM üretilmesi (insan anlaşılabilirliği henüz doğrulanmadı).
- 36 denemeli üç motorlu dengeli laboratuvar provası; 12 ve 24 denemelik eski protokoller korundu.
- 24 denemelik özet ekranının yanlış 12 denemelik özetleyiciyi çağırması düzeltildi.
- Kimliksiz ve isteğe bağlı JSON/CSV raporu; veritabanı ve NVDA kurulumuna dokunulmaz.

## v2.73 — 30 Ekim 2026
- Dengeli 24 denemelik isteğe bağlı (varsayılan) sözde-kör fonem karşılaştırma protokolü; önceki 12 denemelik yol korunur.
- Her iki Türkçe hedef sözcük her iki sentez motorunda bir kez; yerel sıralama karıştırma, 12/12 raporlama, yalnız açık JSON/CSV indirme.
- Tamamlanmamış veya bozulmuş raporlar kapalı başarısız olur; gerçek erişilebilirlik veya insan anlaşılabilirliği iddiası yok.
- NVDA deneysel Python sürücüsünde cancel/terminate ve gecikmiş index callback güvenliği; izole mock yaşam döngüsü testleri.
- Mevcut kullanıcı hesabı ve SQLite/dosyalar korunarak sürümlü yama.

## v2.72 — 30.10.2026
- Yerel Türkçe minimal çift testinde yanıt sonrasında doğru kelime gösterilmez; motor A/B kör karşılaştırması tamamlanana dek geribildirim maskelenir.
- 12 deneme tamamlanınca fonem çiftine göre karıştırma matrisi ve eski/adayı sayan kimliksiz özet; isteğe bağlı yalnız tarayıcı indirme (JSON/CSV). Otomatik dosya kaydı, mikrofon, sunucu aktarımı yoktur.
- NVDA deneysel ses sürücüsü yalnız geçerli 22050Hz mono 16-bit PCM WAV çerçevesini kabul eder; hatalı başlık ve bozuk boyut güvenli biçimde reddedilir. Temel süreç iptal yarışı ele alınır.
- Kaynak düzeyinde güvenlik testleri; kullanıcı kabulü, fonetik uzman onayı, gerçek NVDA/Windows ses testleri ve bilimsel anlaşılabilirlik henüz YOK.

## v2.71 — 30.10.2026
- Eski davranış sabit: opt-in iki taraflı spektral fonem geçişi ve WAV karşılaştırması.
- 12 denemelik RAM-only sabit sözcük tanıma provası ve erişilebilir Reader bağlantısı.
- Sadece araştırma için NVDA stdout PCM yerel köprü ve manuel sürücü prototipi.
- Kurum/sınav verileri ve eski ses örnekleri korunur, gerçek Windows/NVDA ve insan anlaşılabilirlik kabulü henüz yok.

## v2.70 (2026-10-30)

- DOU Speech Lab: opt-in Türkçe takvim tarihi, 24 saat zaman ve sınırlı kısaltma okunuşu, geçersiz biçim reddi.
- Reader: WAV üretmeden telaffuz planı önizlemesi; önceki ses kolu varsayılan olarak korunur.
- Erişim: yalnız yeni istemci modülü açıkça sunulur; veritabanı / öğrenci bilgisi işlenmez.

## v2.69 · 2026-10-30
- Kendi PCM sentez çekirdeğimizin üstüne, 0–9999 için denetlenebilir Türkçe tam sayı açılımı ve başta sıfırlı dizilerin basamak okunuşunu ayırt eden bağımsız modül eklendi.
- Serbest metin WAV deneyi için cümle/ara duraklamalı yeni karşılaştırma modu; yeni ekranda okunuş planı, iki okuma ve iki ritim seçimi.
- Eski v2.68 varsayılan ses baytları korunur, öğrenci/sınav dosyaları ve NVDA/SAPI etkilenmez. Bu hâlâ robotik ve doğrulanmamış Ar-Ge prototipidir.

## v2.68 · 2026-10-30
- DOU Reader içine deneysel serbest Türkçe metin alanı; doğrudan istemcide Türkçe harf/kısa metin analizi, deterministik WAV üretimi, indirme, hız/perde seçenekleri.
- Uzun metin sözcük sınırında parçalara ayrılır; 360 karakter/60 sn güvenlik sınırı, açık hata mesajları, basit erişilebilir kontrol.
- Mevcut fonem laboratuvarı ve v2.67 premium panel korunmuştur; yeni ses sentezi gerçek doğal TTS, NVDA veya üretim hazır ekran okuyucu değildir.
- Metin sunucuya gönderilmez; mikrofon, kayıt, dış API veya öğrenci dosyaları kullanılmaz.

## v2.67 — 30 Ekim 2026 · Premium kurum paneli ve sınav ekranı güvenilirliği

- 12 yönetim + 4 Reader/laboratuvar ekranında birbiriyle çelişen sol menüler, aynı sırayı/etiketleri kullanan 12 rotalı premium koyu menüyle değiştirildi. Aktif sayfa ve hızlı "Yeni sınav oluştur" bağlantısı tüm sayfalarda tutarlı.
- Sol menü mobilde açılıp kapanabilir, Escape ile kapanır; içerik atlama bağlantısı, klavye odakları, yazdırma ve azaltılmış animasyon erişilebilirlik desteği eklendi.
- Sınav editöründe modül yüklenme/giriş/kayıt hatalarında boş sayfa yerine görünür durum mesajı ve yeniden dene seçeneği; init çıktısına açık durum işareti eklendi.
- Önceden eksik statik JS modülleri için izinli sunucu rotaları korundu. 12 sayfalık gezinme rotaları ve gizli dosya erişimi HTTP düzeyinde test edildi.
- Yerel demo HTTP ile kurum girişi, oturum, sınav listeleme ve anonim sınav kaydı denendi; gerçek Windows tarayıcı görsel kabulü ayrıca yapılmalı.
- Sınav/uyarlama/SQLite/ses motoru mantığı korunmuştur. Gerçek öğrenci verisi, resmî kurum onayı veya doğal ses iddiası yoktur.

## v2.66 — 30 Ekim 2026

- EX13–EX15 sabit sentetik örneklerde, C ses koluna dokunmayan D sınırlı sınır düzeltme deneyi; maksimum yerel PCM adımı büyüyen değişiklikleri reddeder.
- 15 tonlu sınır denemesi: 10 kabul, 5 red. Teknik gösterge, kalite iddiası değil.
- Reader demo klavye kontrollü laboratuvar tablosu ve D WAV dinleme; okuma-yazma yapmayan, SHA-256 etiketli JSON CLI.
- 652/652 otomatik test, 274 dağıtım kontrolü, 10/10 anonim sentetik kabul; gerçek kullanıcı doğrulaması yok.

## v2.65 — 2026-10-30

- Sabit EX13–EX15 örneklerinde eski vurgu planına dokunmadan birleşik hece süresi, kazanç ve komşu tonlu segmentlerde perde sınırı deneysel katmanı eklendi.
- C WAV varyantı ayrı oynatılır, eski baseline/candidate WAV davranışı korunur.
- Reader demo erişilebilir tablo ve yeni dinleme kontrolü, argümansız anonim SHA-256 JSON CLI ve yedi hedefli regresyon testi eklendi.
- Bu çalışma doğal Türkçe TTS, erişilebilirlik sertifikası ya da gerçek öğrenci verisi için üretim onayı değildir.

## v2.64 — Sabit deneysel Türkçe vurgu planı (30.10.2026)

- v2.63'te işaretlenen üç `-yor` vurgu örneği için yalnız sabit sözlükten seçilen bağımsız `planFixedStressException` planı eklendi.
- `ğ` ve baş ünsüz kümeleri, uzman doğrulaması yapılmadığı için otomatik değiştirilmedi.
- Önceki prosodi ses sentezi korunarak sabit EX13/EX14/EX15 örnekleri için eski/yeni WAV kolları üretildi ve karşılaştırma arayüzü eklendi.
- `speech:exception-plan-audit` salt okunur, ham sözcük içermeyen kararlı JSON çıktı üretir; kullanıcı metni kabul edilmez.
- Eski sınav, onay, Reader, SQLite şeması ve sentetik A/B/C deneyleri korunur. Doğal TTS veya NVDA eşdeğerliği iddiası yoktur.

## v2.63 — Türkçe telaffuz istisnaları için kapalı sentetik denetim (BAP Ar-Ge)
- `dou-speech-exception-audit.mjs`: yalnız 18 sabit, önceden yazılmış örneği kabul eden, metin ve kimlik almayan kural denetimi. `ğ` için bağlama duyarlı uzman incelemesini işaretler; Türkçe ilk ünsüz kümelerini görünür kılar; `-yor` biçimleri için 3 sezgisel son-hece vurgu uyuşmazlığı raporlar. Ham sözcükler JSON'a girmez.
- `dou-reader-demo.html` ve `dou-reader-demo.mjs`: klavyeyle erişilebilir, yalnız anonim EX kodları ve teknik durumları gösteren bölüm.
- `tools/dou-speech-exception-audit.mjs`: argümansız, salt-okunur çevrimdışı JSON ve SHA-256; `npm run speech:exception-audit`.
- Sınav kaydı, onay akışı, SQLite şeması ve mevcut A/B/C deneysel PCM WAV jeneratörleri değiştirilmedi.
- Yeni testler gerçek fonetik kaliteyi veya uzman doğrulamasını kanıtlamaz; tespitler bilinçli olarak ses motoruna otomatik uygulanmaz.

## v2.62.0 — 30 Ekim 2026
- Yalnız sabit 14 sentetik örneğin grafem/hece özelliklerini ve bağımsız beklenen hece sınırlarını denetleyen `dou-speech-orthography.mjs` eklendi; gerçek ses/telaffuz yeteneği değil.
- Sekiz Türkçe ünlünün ön/arka, düz/yuvarlak ve açıklık kategorileri, her hecede tek ünlü çekirdeği ve stres işaretleri raporlandı. Rapor sadece anonim örnek kodları ve sınıf/sayı bilgileri içerir.
- Reader demosuna klavye uyumlu iki yazımsal denetim tablosu ve yalnız sabit örnek kabul eden yerel `speech:orthography-audit` komutu eklendi.
- Mevcut A/B/C ses algoritmaları, sınav hazırlama, onay, veritabanı şeması ve sınav Reader ses politikası değişmedi. Geliştirme gerçek doğal TTS veya fonetik doğrulama iddiası taşımıyor.

## v2.61.0 — 30 Ekim 2026
- Mevcut v2.60 A/B deneyi korunarak sabit 14 kodlu korpusa üçüncü C, yaklaşık 4 ms ünlü–gürültülü ünsüz sınır filtresi eklendi. 15 uygun birleşim var; hiçbir gerçek sınav, kullanıcı metni veya DB girdisi senteze bağlanmadı.
- Klavye erişimli, isteğe bağlı C karşılaştırma ve WAV oynatma tablosu eklendi. Sinyal ölçümlerinin artabileceği ve doğal Türkçe ses/kalite kanıtı olmadığı açıkça belirtildi.
- Korpus sınırı, WAV-PCM bütünlüğü, deterministik çıktı, veri toplamama ve A/B geriye uyumluluğu için altı yeni test ve statik dağıtım kontrolleri eklendi. SQLite, kurumsal onay ve Reader politikası değiştirilmedi.

## v2.59.0 — Sabit sentetik Türkçe korpus (29.10.2026)
- 14 adet yalnız gömülü/sabit laboratuvar örneği, 8 ünlü harf sınıfı, 4 eş ünlülü ortografik ünsüz çifti, 2 durak örneği.
- Önceki/yeni WAV süre, RMS, tepe, kırpılma, sınır sayısı ve sıçrama ölçümleri; hiçbir konuşma-kalite puanı yok.
- İsteğe bağlı ve klavye uyumlu Reader demo tablosu; bağımsız argümansız `speech:corpus-audit` JSON ve SHA-256 özeti.
- Öğrenci/sınav/API/SQLite/gerçek Reader'a bağlanmaz; önceki deneysel WAV motorları değiştirilmedi.

## v2.58 — 29 Ekim 2026
- Yalnız sabit sentetik örnekte hizalı PCM segment-sınırı denetimi ve 5 ms RMS/sıçrama ölçümleri. Nesnel, deterministik, gizlilik-minimal çalışma; metin, ses veya kişisel veri dışa aktarılmaz.
- Erişilebilir tablo, opsiyonel sınır analiz düğmesi ve argümansız CLI. Referans ve yeni ses sentezi algoritmaları değiştirilmedi. DOU Reader, kurumsal onay, SQLite şeması korundu.
- Not: Ses kalitesi, Türkçe telaffuz ve erişilebilirlik doğrulaması değildir.

## v2.56.0 — 29 Ekim 2026

- DOU Speech Lab'a `synthesizeTurkishSpectralPreview` adlı iki taraflı spektral yumuşatma deneyi eklendi. Önceki modların algoritmaları değişmedi.
- Sadece sabit anonim ifade kullanan kullanıcı tetiklemeli demo ve güvenli, üzerine yazmayan WAV CLI modu eklendi.
- Sinyal süresi/girdi sınırları, deterministik PCM, klip ve sınır testleri ile yeni regresyon ve statik dağıtım kontrolleri eklendi.
- DOU Reader, Windows UI Automation, çok dersli sınav, kurum/onay yönetimi, kullanıcılar, SQLite şeması ve önceki araştırma araçları korunuyor. Bu deneyin konuşma anlaşılırlığı / TTS niteliği doğrulanmadı.

## v2.55.0 — 29 Ekim 2026

- DOU Reader tarayıcı ses kuyruğunda her parça öncesinde kurulu, `localService===true` Türkçe ses yeniden doğrulanır. Seçilen ses kaybolur, uzak servis olarak raporlanır veya ses listesi okunamazsa kalan parçalar durdurulur; farklı ses otomatik olarak devralmaz.
- Tekrarlanan/gecikmiş `onend` ve `onerror` olayları artık sonraki ses parçasını atlayamaz veya geçersiz okuyucu oturumunu bozamaz.
- Reader paneli kaldırıldığında `voiceschanged` dinleyicisi de kaldırılır.
- Önceki sınav, onay, SQLite, Windows UIA ve sentetik DOU Speech Lab modülleri korunmuştur. Doğal Türkçe TTS veya NVDA eşdeğerliği iddiası yoktur.

## v2.54.0 — 29 Ekim 2026
- Sınav onayı sunucuya gönderilmeden önce mevcut sınav kimliği, sürümü, yetki, teyit ve bekleyen/kaydedilmemiş kayıtlar kontrol edilir.
- Onay sürerken öğretmen editörü kilitlenir ve daha önce başlayan sınav açma isteklerinin editörü değiştirmesi engellenir. Kurtarma dosyası okuma asenkron tamamlanırsa kilit sırasında uygulanmaz.
- Sunucu onay yanıtı aynı sınav ID + revizyon ve onaylı statü taşımıyorsa istemci onay kaydı olarak kabul etmez.
- Sunucuda başarılı onay, liste/onay geçmişi yenileme hatasından ayrı raporlanır; yanlışlıkla "onay başarısız" denmez.
- Yeni sınav onay koordinatörü için 7 regresyon testi ve 5 dağıtım kontrolü. Veritabanı şeması, eski modüller, Reader, Speech Lab ve önceki ZIP sürümleri korunur.
- Hâlâ anonim sentetik BAP prototipidir; gerçek cihaz/erişilebilirlik ve KVKK onayı değildir.

## v2.53.0 — 29 Ekim 2026
- İki sınav peş peşe açıldığında geç tamamlanan önceki `/api/exams/:id` okuma yanıtı, son seçilen sınavın üzerine yazamaz. Geç gelen hatalar da yeni taslağı yanıltmaz.
- Yeni taslak oluşturma, kurtarma dosyası açma veya aktif taslak üzerinde düzenleme yapma sırasında bekleyen eski sınav seçimleri geçersizleşir.
- Manuel kaydetme bildirimi, taslak seçimi değiştiyse eski sonuçla yeni sınavı yeniden çizmeyi veya yanlışlıkla kaydedildi demeyi bırakır.
- Onay geçmişi HTTP yanıtı hem sınav ID'si hem sürüm üzerinden kontrol edilir. Ek modül statik yerel sunucu izin listesine eklendi.
- İzin, sunucu veri şeması, yedekleme, Reader ve deneysel ses motoru korunmuştur. Bu bir Windows/NVDA erişilebilirlik onayı değildir.

## v2.52.0 — 29 Ekim 2026
- Geçmiş taslağa ait otomatik kayıt yanıtı, taslak değiştiğinde yeni açık sınava uygulanmaz.
- Otomatik kayıt yönetiminde eski işlem ayrılır; geç kalan hata yeni taslağa taşınmaz.
- Hazırlık aşaması atlama düğmesi klavye odağını hedefe taşır.
- Yerel sağlık API ve paket sürümü 2.52.0; veritabanı migrasyonu yok.

## v2.51 — Sınav hazırlık ve onay durumunun doğru gösterimi (29.10.2026)

- Sınav hazırlık kontrolünde sadece `saved/approved` bayraklarının son aşamayı tamamlaması engellendi. Kaydetme/onay adımı artık sınav bilgisi, hedef–soru ilişkisi, sorular ve erişilebilirlik kontrollerinin tamamlanmasını gerektirir.
- Boş soru listesi bulunan sınavda kazanım aşaması yanlışlıkla tamamlanmış görünmez; sınırsız süre değeri temel bilgi aşamasını geçemez.
- Kayıt sunucuda onaylı olsa bile hazırlık eksikse arayüzde özellikle uyarılır. Sunucu onayı değiştirilmez/iptal edilmez, veritabanı şeması değişmez.
- Anonim hazırlık CSV'si yeni doğru aşama durumunu gösterir; soru, yanıt ve özel veri eklenmez.
- Yeni regresyon ve dağıtım kontrolleri eklendi. Bu bir WCAG veya kurumun resmî erişilebilirlik onayı değildir.

## v2.50 — Cihaz içi fonem matrisi ve gizlilik kontrollü toplam rapor analizi (2026-10-29)

- Sekiz sabit sentetik uyaran tamamlandığında her çift için hedef/duyulan 2×2 matrisi yalnız geçici tarayıcı belleğinde gösterilir; dışa aktarılmaz.
- Yeni `/dou-speech-pool` ekranı: 10–100 önceden anonimleştirilmiş, tamamlanmış sayısal sonuç dosyası; sıkı şema ve toplam doğrulaması; tümü çevrimdışı.
- Yalnız toplu hata oranları, koşullu Wilson aralıkları ve örneklem bağımsızlığı/girdi tekrarını doğrulayamama uyarısı dışa aktarılır. Eski raporlardan yönlü matris hesaplanmaz.
- Eski BEP, PDF, Reader, ses, onay ve veri API'leri korunur. Bu prototip konuşma anlaşılırlığı veya klinik test değildir.

## v2.49 — Sentetik fonem tanıma laboratuvarı (2026-10-29)

- Yalnız sabit sentetik sekiz kısa sesle, dört Türkçe ünsüz karşıtlığını iki yönlü deneyen çevrimdışı ve klavye erişimli `dou-speech-phoneme` ekranı eklendi.
- Tam dinleme gerektiren tek yanıt, tarayıcı CSPRNG ile sırayı değiştirme, soruya ait cevapları sunucuya göndermeme ve yalnız kimliksiz toplam sayıları JSON indirme.
- Aynı ses çiftleri için teknik mutlak PCM farkı, süre ve kırpılma ölçümü yapan çevrimdışı CLI ve toplam on yeni otomatik test.
- Kurum, sınav, DOU Reader, PDF, yedek ve önceki ses modelleri değiştirilmedi. Gerçek insan telaffuz doğruluğu veya üretim kullanımı onaylanmış değildir.

## v2.48 — DOU Speech Lab Türkçe ünsüz sınıfları ve örnek karşılaştırmaları (2026-10-29)

- Dördüncü offline/deneysel PCM-WAV ünsüz profili sentezi: ayrı `s/ş`, `m/n`, `p/t/k`, `z/v` vb. harf sınıfları ve sınırlı spektral şekillendirme; eski ses sürümleri korunur.
- Anonim Reader demosunda tamamen sabit “Sasa” / “Şaşa” ses karşılaştırma düğmeleri ve ayrı ünsüz modeli sesi. Gerçek sınav seslendiricisine bağlanmaz.
- `--mode articulation` ile yalnız “Merhaba dünya” için yeni WAV, mevcut dosyayı ezmeme ve serbest metin almama kuralı.
- Deterministik, sınırlı uzunluklu, klipsiz akustik karşılaştırma testleri; insan anlaşılabilirliği/fonetik doğruluğu kanıtı değildir.

## v2.47 — DOU Speech Lab fonem geçişi ve kör A/B dinleme prototipi (2026-10-29)

- Üçüncü offline PCM WAV yöntemi: ötümlü segmentler arasında devamlı faz ve harmoni ağırlığı geçişi; önceki dalga biçimleri korunur.
- Üç sabit sentetik cümleyle rastgele A/B sıralaması; her iki sesi dinleme ön koşulu, tek oy, sürüm açıklaması.
- Herhangi bir yanıtı sunucuya veya disk depolamaya yazmayan statik çalışma; isteğe bağlı, yalnız tercih toplamları içeren kimliksiz JSON.
- Ses laboratuvarı demosuna üçüncü örnek, CLI'ye `--mode coarticulation`; gerçek sınav okuma politikası ve veri şeması değişmedi.
- Teknik PCM ve fonem-süre testleri; gerçek Türkçe anlaşılırlığı/MOS/ekran okuyucu uygunluğu iddiası yoktur.

## v2.46.0 — DOU Speech Lab prozodi ve WAV ölçüm prototipi (29 Ekim 2026)

- Türkçe ortografik heceleme, son hece vurgusu, ünlü süresi ve soru/ifade perde eğrisi; sınırlı araştırma hedefi.
- İkinci robotik PCM/WAV varyantı ve yalnız sentetik karşılaştırma; eski ses çekirdeği ve kurumsal sınav akışına dokunulmadı.
- Objektif WAV ölçümü (RMS, tepe, kırpılma vb.); doğal ses veya anlaşılabilirlik iddiası yok.
- Anonim Reader demo ve CLI iki ayrı sabit cümle modu; çevrimdışı, kimlik/veri kaydı yok, mevcut dosyanın üzerine yazmıyor.

## v2.45 (29 Ekim 2026) — DOU Speech Lab: özgün robotik WAV sentezi

- Windows SAPI veya tarayıcı Web Speech kullanmadan Türkçe karakterlerin yaklaşık formant dalga biçimlerini hesaplayan `dou-speech-waveform.mjs` eklendi.
- 22.050 Hz, mono PCM WAV, deterministik matematiksel ses üretimi; sınırlandırılmış 100 karakter, sabit örnek, çevrimdışı çalışma.
- `tools/dou-speech-preview.mjs`: sadece sentetik “Merhaba dünya” için dosya oluşturma (var olan dosyayı asla ezmez); web sunucusunun özel dosya alanından ayrı.
- `/dou-reader-demo` sayfasına kullanıcı tetiklemeli, bellek içi ses deneyi ve durdurma kontrolü eklendi; gerçek sınav metni, öğrenci yanıtı, kimlik ve session token'ı deneysel motora aktarılmaz.
- **Bu ses fonetik-akustik araştırma denemesidir, doğal ve anlaşılır Türkçe TTS değildir; kurumsal sınav seslendirmesinde varsayılan motor olarak kullanılmaz.**
- Sınav/Reader/SAPI, özel veritabanı, çoklu onay, güvenlik ve JSON/API sözleşmelerinde yıkıcı değişiklik yok.

## v2.44 (29 Ekim 2026) — DOU Reader başlık ve belge metni gezinmesi

- Windows UI Automation `AriaRole` / `HeadingLevel` meta verisine dayalı, kullanıcı tetiklemeli ileri/geri başlık gezinmesi ve normal belge metni navigasyonu.
- Yeni Ctrl+Alt+H, Ctrl+Alt+Shift+H ve Ctrl+Alt+D kısayolları; izinli süreç, denetlenebilir sınır, gizli giriş yasağı korunur.
- Yerel Türkçe matematik sözlüğüne küme, analiz ve Yunan harfi sembolleri eklendi; anonim demo güncellendi.
- Windows'ta gerçek cihaz çalıştırma/derleme doğrulaması, bağımsız akustik TTS, NVDA eşdeğerliği ve kullanıcı kabulü **henüz yoktur**.

## v2.43 (29 Ekim 2026) — DOU Reader rol gezinmesi ve Türkçe matematik okunuşu

- Windows on-demand okuyucuda sonraki bağlantı/düğme kısayolları ve sınırlı SAPI hızı.
- Çevrimdışı matematik metin dönüştürücüsü, sınav içi yerel seslendirmeyle entegrasyon.
- Anonim demo, özel güvenlik/sınır testleri ve sürüm kontrolleri.
- Akustik model, NVDA eşdeğerliği ve gerçek Windows ses testi tamamlanmadı.

## v2.42 (29 Ekim 2026) — Windows DOU Reader ilk yerel prototipi

- `tools/dou-reader-windows.ps1` Windows PowerShell 5.1 + STA üzerinde in-memory C# derlemesi ile isteğe bağlı masaüstü okuyucu başlatıyor; Node/sunucu veya ağ gerektirmiyor.
- `tools/dou-reader-windows-host.cs`: Windows UI Automation odak öğesi, aynı uygulama ağacında sonraki/önceki okunabilir öğe, kullanıcı kısayolları ve durdurma; `System.Speech` kurulu Türkçe ses yoksa güvenli şekilde susar.
- Varsayılan `msedge, chrome, firefox, notepad` işlem izin listesi; UIA `IsPassword`, `Edit`, `IsOffscreen` öğeleri atlanıyor. Değer kalıpları, ekran kayıtları ve otomatik odak dinleyicileri kullanılmıyor.
- Yeni çevrimdışı güvenlik kaynak testleri ve dağıtım kontrolleri; eski sınav/editör/SQLite/veri/API sözleşmeleri değişmedi.
- Windows UI Automation ve SAPI bileşenlerini Linux ortamında **çalıştırma/derleme doğrulaması yapılamadı**; Windows `-Check`, gerçek ses ve kullanıcı kabul testleri gerekli. Tam NVDA eşdeğeri veya özgün Türkçe TTS modeli değildir.

## v2.41 (29 Ekim 2026) — DOU Reader + DOU Speech yerel pilotu

- Anonim öğrenci ekranına DOU Reader paneli: çevrimdışı ses seçimi, soru geçişi, hız, duraklat/sürdür/durdur, ARIA durum bildirimi ve erişilebilir kısayollar.
- `dou-reader-core.mjs`: soru ses izni fail-closed, yalnız öğrenciye görünen metin, Türkçe yerel ses filtreleme; yanıt anahtarı, öğretmen notları ve oturum kodları seslendirilmez.
- `dou-speech.mjs`: `SpeechSynthesis` OS kurulu ses adaptörü; `localService=true` olmayan sesin reddi, kuyruktaki eski ses callbacks iptali, uzun metin bölme.
- Çevrimdışı tek dosya erişilebilir HTML'de yerel olduğu doğrulanmayan Web Speech sesine otomatik fallback kapatıldı.
- `dou-reader-demo` sentetik, herkese açık, sınav kodu gerektirmeyen yerel örnek; `tools/dou-speech-windows.ps1` salt okunur Windows SAPI envanteri.
- Yeni testler ve yayın allowlist kontrolleri; mevcut sınav, SQLite ve eski onay akışında migration değişikliği yok.
- Açık sınırlar: Bu bir NVDA/Windows-geneli ekran okuyucusu veya özgün akustik TTS motoru değildir; Windows gerçek ses ve tarayıcı QA gereklidir.

## v2.40 — Canlı SQLite ana ve yan dosyaları için salt okunur geçiş güvenliği (2026-10-29)

- SQLite ana dosyası, `-wal`, `-shm` ve `-journal` dosyalarının erişim izinleri, yol üzerindeki sembolik bağlantılar ve yerel depolama hacimleri için çevrimdışı ön denetim: `npm run storage:preflight`.
- Güvenlik durum raporuna `sqlite_storage_footprint` ve `temporary_volume` eklendi; sonuçlar kişisel veri veya veritabanı içeriği raporlamaz.
- `BEP_REQUIRE_PRIVATE_SQLITE_FILES=1` isteğe bağlı güvenli başlangıç kapısı: POSIX'te özel dosya izni ve doğru dosya türü zorunlu; Windows ACL teyit edilemiyorsa güvenli şekilde durur.
- DB şeması, önceki öğrenci/sınav verileri ve uygulama arayüzleri değiştirilmedi. Canlı SQLite hâlâ **uygulama seviyesinde şifreli değildir**; bu araç üretim güvenliği onayı veya SQLCipher entegrasyonu sağlamaz.

## v2.38 — Bağımsız kanıtla doğrulanan şifreli SQLite yedekleme (2026-10-29)

- Canlı ve snapshot audit HMAC kanıtı üzerinden doğrulanarak ancak sonra şifreli yedek yayımlanır.
- Şifreli yedek doğrulaması yayımlamadan önce yapılır; mevcut hedef üzerine yazılmaz.
- Yeni SQLite geri yüklemesi, temp çözülmüş kopyanın audit kanıtı doğrulanmadığında yayımlanmaz.
- Single ve rotation audit kanıt modları; Windows gizli parola girişi.
- Veritabanı şeması ve canlı uygulama verisi değiştirilmez. Canlı DB uygulama seviyesinde şifreli değildir.

## v2.37 — İki nesilli çevrimdışı denetim anahtarı yenileme (2026-10-29)

- Ayrı eski/yeni 256 bit anahtarlar ve ayrı kanıt dosyalarıyla audit HMAC **anahtar değişimi** eklendi. `audit:rotate` eski HMAC kanıtını ve kapsadığı SQLite önekini doğrular, yeni `HMAC-SHA256` kanıtını eski dosyanın SHA-256 özetine bağlar ve `wx` ile eski kanıtları asla ezmez.
- `audit:verify-rotation` eski ve yeni kanıtı, anahtarları ve iki audit önekini birlikte doğrular; yanlış anahtar, eski kanıtta değişiklik, yeni kanıtta oynama ve önceki audit satırlarında tahrifatı reddeder.
- `BEP_REQUIRE_AUDIT_ROTATION=1` isteğe bağlı uygulama açılış kapısı ve `security:check` kontrolü eklendi. Geriye dönük v2.36 kanıt ve API sözleşmeleri korunur.
- Yeni sürüm gerçek kurumsal KMS, WORM, N nesilli rotasyon, rollback savunması, SQLite şifreleme, SSO veya erişilebilirlik sertifikasyonu **değildir**. Anahtarlar ve kanıtlar veritabanından ayrı kurum BT sorumluluğunda korunmalıdır.

## v2.36 — Veritabanından ayrı doğrulanabilir denetim kanıtı (2026-10-29)

- Anonim yerel SQLite `audit` kayıtları için her satırı kimlik/zaman/olay alanlarıyla birlikte sırayla kapsayan SHA-256 ve **ayrı 32 bayt rastgele anahtarla HMAC-SHA256 kanıt dosyası** eklendi. Dosyada ham audit satırları, e-posta veya sınav içerikleri yoktur.
- `audit:key`, `audit:seal`, `audit:verify` yerel komutları; eski kanıt dosyasını ezmeyen tekil checkpoint ve **okuma amaçlı** doğrulama. Anahtar ve kanıtın `data/` dışında, birbirinden farklı klasörlerde olması zorunludur.
- Güvenlik denetimi (`security:check`) kanıtı yoksa uyarı, geçerli kanıtta başarı, anahtar/kanıt/veritabanı uyuşmazlığında hata raporlar; gerçek öğrenci/hesap kimliği raporlanmaz.
- `BEP_REQUIRE_AUDIT_EVIDENCE=1` isteğe bağlı başlangıç kapısı açıldığında doğrulama başarısızsa SQLite göçü/oturum açma öncesinde **fail-closed**.
- Yeni kayıtlar, son kanıttan sonraki dönemde yalnız SQLite içinde kalır; her kayıt sonrası otomatik WORM olay defteri, asimetrik dijital imza veya veri şifrelemesi **yapılmış değildir**. Kanıt + anahtarın birlikte ele geçirilmesi veya eski bir çiftle geri dönüş ayrı tehditlerdir.
- Mevcut veri, sınav, onay, API ve ses sistemi etkilenmez. Zorunlu bulut servisleri eklenmedi; gerçek öğrenci verisi için üretim onayı yoktur.

## v2.35 — Anonim pilot kodu güvenliği ve tam revizyon bütünlüğü (2026-10-29)

- HTTP çalışma belleğindeki öğrenci pilot kodu hatalı deneme koruması, SQLite kalıcı `pilot_redeem_throttle` tablosuna taşındı. Global 12/60sn ve aynı kodda 5/15dk kilit ile yeniden başlatma veya rastgele kod denemesi üzerinden sınır aşılması engellendi.
- Ham kod, IP, kişisel veri, sınav metni ve öğrenci kimliği yeni tabloda saklanmaz; sadece SHA-256 kimlik özetleri, sayaçlar ve zaman bilgisi tutulur.
- Kod verme, sınava başlama, yanıt gönderme, değerlendirme ve kazanım özetinde onay geçmişi ile güncel sınav gövdesi karşılaştırılır; revizyon eşit ama içerik bozulmuşsa işlem durur.
- `security:check` yalnız geçici kilit sayımını raporlar; mevcut SQLite kayıtları ve API yolları korunur. Yeni testlerde farklı kodlarla saldırı, yeniden başlatma ve onay bozma senaryoları var.
- Global hız limiti geçici hizmet aksamasına neden olabilir; tam üretim güvenlik, disk şifreleme, SSO, gerçek erişilebilirlik testleri henüz tamamlanmamıştır.

## v2.34 — Erişilebilirlik Kabul Merkezi (29.10.2026)

- Öğretim sorumlusu ve bağımsız koordinatör için **iki aşamalı, anonim ve sınav revizyonuna bağlı** erişilebilirlik inceleme beyanı. Öğretmen sınavın kayıtlı sahibi olmalı; koordinatör/yönetici aynı hesap olamaz.
- SQLite üzerinde ayrı `exam_accessibility_acceptance` tablosu: kurum, sınav, revizyon, onaylı içerik SHA-256, kontrol maddelerinin boolean kayıtları, aktör kimliği ve zaman. Eski sınav/uyarlama tabloları değişmedi; göç `CREATE TABLE IF NOT EXISTS` ile yıkıcı değil.
- Onaysız, onay özeti değişmiş ve yeni revizyonlu sınavın önceki kabulü **geçerli sayılmaz**. Önceki beyan silinmez; denetim amaçlı korunur. Tekrar onay için yeniden iki aşama gerekir.
- `/erisilebilirlik-kabul` ekranı, `/api/acceptance/exams` ve iki aşamalı sunucu API'si, kurum ve sahiplik kontrolü, CSRF ve origin koruması, teslimin yapısal hazır olma özeti.
- Güvenlik: dış servise bağımlılık eklenmedi; kayıt formunda serbest metin/öğrenci/sağlık alanları yok; gerçek erişilebilirlik testi ve PDF/UA/KVKK onayı **verildiği iddia edilmiyor**. Bu kabul kaydı mevcut dışa aktarma yetkilerini otomatik değiştirmiyor.

## v2.33 — İnsan denetimli denklem ve görsel metni (2026-10-29)

- Sınav sorusuna kaynak gösterimi, öğretmen açıklaması ve karşılaştırma beyanı içeren `:::denklem` / `:::gorsel` blokları eklenebilir; eksik veya riskli bloklar PDF çıktısını durdurur.
- PDF motoru açıklamayı kaynak metninden ayrı etiketli paragraflarda taşır; gerçek Office denklemleri/gömülü resimleri otomatik çözmez.
- Kurumsal sınav editörüne şablon düğmeleri ve API yanıtına anonim açıklama sayısı eklendi; onay SHA-256, CSRF ve kurum izolasyonu korundu.
- Yeni birim/HTTP testleri, PDF görüntüsü ve çevrimdışı kabul raporları. Üretim/PDF/UA uygunluğu iddia edilmez.

## v2.32 — Kodlu ve basit tablolu etiketli PDF pilotu (2026-10-29)

- PDF sorularındaki açık kod bloklarını kapanma/satır boyu denetimiyle okuma sırasını koruyan etiketli metne dönüştürme; yerel lisanslı monospace TrueType, `/ActualText` ve Unicode eşlemeleri.
- Basit Markdown sütun ayırıcılı tabloların tüm hücrelerini adlandırılmış, doğrusal satırlara aktarma. Bu, semantik PDF `/Table` veya PDF/UA uyumu değildir.
- Kapanmamış kod, taşan satır, uyumsuz tablo sütunları, desteklenmeyen matematik veya görseller için kapalı başarısızlık; içerik eksiltilmez.
- `npm run pdf:code-font-check`, bağımsız ayrıştırıcı ve PDF uçtan uca doğrulama testleri. Özel font dosyası dağıtılmaz, onay/tenant/MFA sözleşmeleri ve `data` korunur.

## v2.30 — İzole BAP kabul senaryosu ve çevrimdışı PDF ön denetimi (29.10.2026)

- `npm run pdf:preflight -- <dosya.pdf>`: yalnız yerel, belge içeriğini rapora koymayan etiket/dil/Unicode/şifreleme gösterge taraması. PDF/UA doğrulaması veya etiketli PDF üretimi değildir.

- `npm run acceptance:pilot`: gerçek depoya ve öğrenci kayıtlarına dokunmadan geçici SQLite üzerinde iki sentetik kurum, onay, koordinasyon, uyarlama, teslim, ZIP SHA-256 ve HTTP CSRF/Origin kontrolleri.
- 10 kontrolü birleştiren, yalnız denetim durumlarını içeren ve `productionReady:false` işaretli JSON rapor; eski dosyayı asla ezmez.
- Sınavı oluşturan hesabın aynı sınavı onaylamasını engelleyen isteğe bağlı `BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL=1` güvenlik kapısı; eski yerel pilotta varsayılan davranış korunur.
- Salt-okunur güvenlik denetimine bağımsız onay politikası uyarısı eklendi. Mevcut MFA, uyarlama, sınav, Word/HTML ve şifreli yedek altyapısı korundu. Yeni şema yok.
- Kabul testleri ile uygulama testleri farklıdır; gerçek cihaz, engelli katılımcı, erişilebilir PDF, SSO/KVKK ve bağımsız güvenlik onayı tamamlanmamıştır.

## v2.29 — Semantik Word ve HTML teslimi, yapısal erişilebilirlik denetimi (29.10.2026)

- Word başlığı gerçek `Heading1` ve sorular gerçek `Heading2` OOXML paragraf stilleriyle üretiliyor; Word gezinme bölmesinde semantik soru yapısı var.
- Yazdırılabilir HTML'de sorular başlık düzeyi `h2` olarak işaretleniyor.
- Onaylı teslimde 7 yapısal yerel erişilebilirlik/çevrimdışı/cevap anahtarı sızıntısı kontrolü; hata varsa teslim başarısız ve denetim olayı yazılmıyor.
- ZIP'e öğrenci verisi içermeyen `ERISILEBILIRLIK-DENETIM.json` ekleniyor; paket manifesti ve çevrimdışı doğrulayıcı raporu ve çıktıyı karşılaştırıyor. v2.28 paket geriye dönük uyumluluğu korundu.
- Otomatik denetim gerçek ekran okuyucu kullanımı, WCAG/PDF-UA veya akademik/etik onay değildir; erişilebilir PDF ayrı aşamadır.

## v2.28 — Kurumsal zorunlu MFA politikası ve sınırlı kurulum oturumu (29.10.2026)

- Kurum bazında, SQLite üzerinde kalıcı MFA zorunluluğu; yöneticinin kendi MFA hesabını açması ve parolasını yeniden doğrulaması zorunlu.
- Önceden aktif oturumlar dahil, MFA kurmamış çalışanın sınav/koordinasyon/veri API erişimini otomatik engelleyen dinamik oturum kapsamı.
- Sadece MFA kurulum/etkinleştirme, durum ve çıkış yolları açık bırakılır; yeni hesap kurtarma işlemi sunucuda yapılır ve iki aşamalı giriş tamamlanmadan tam oturum verilmez.
- Zorunlu politika altında MFA devre dışı bırakılması engellenir, kullanıcı oluşturma/deaktive işleminde güncel parola yeniden doğrulanır.
- Yönetici politikası ve kurulum-only alanı için kurumsal portal arayüzü; kurumlar arası izolasyon, CSRF, Origin, yeniden başlatma, eski oturum ve tüm regresyon testleri.
- Bu sürüm SSO/HTTPS/şifreli canlı veritabanı, tüm yüksek riskli işlemlerde ikinci faktörlü step-up veya üretim onayı değildir.

## v2.27 — Çevrimdışı MFA ve güvenli oturum geçişi
- RFC 6238 TOTP: parola sonrası sunucu çerezi verilmeden kısa süreli ikinci aşama, 30 saniyelik kod, kod tekrar kullanımını engelleme.
- AES-256-GCM ile üye kimliğine bağlı MFA sır saklama; anahtar eksik/yanlışsa fail-closed.
- 8 tek kullanımlık kurtarma kodu, kalıcı MFA denemesi kilidi, kurulumda oturumların iptali; tenant+CSRF+origin kontrolleri.
- Windows CurrentUser DPAPI korumalı, isteğe bağlı `BASLAT-MFA.ps1` ve veritabanını değiştirmeden eski hesap koruması.
- Zorunlu MFA/SSO ve canlı SQLite şifreleme hâlâ kurumsal kabul öncesi eksik.

## v2.26 — Yerel depolama doğrulaması ve şifreli yedek parola yenileme (29.10.2026)

- Windows BitLocker korumasının durumunu yalnızca yerelde denetleyen `tools/protected-storage.mjs` eklendi. Koruma açık, disk tamamen şifreli ve durum net değilse sonuç **başarısız**; hiçbir dış bağlantı veya kurtarma anahtarı talebi yok.
- `BEP_REQUIRE_PROTECTED_VOLUME=1` etkinse `server.mjs` SQLite dosyasını açmadan önce korumayı doğruluyor, güvenlik belirsizliğinde kapalı kalıyor. Varsayılan anonim geliştirme akışı değişmedi.
- `npm run storage:check` kontrol aracı ve `security:check` içinde ayrı `volume_protection` uyarısı eklendi. Bu OS disk şifrelemesidir, uygulama-sütun şifrelemesi değildir.
- `npm run backup:rotate -- <ESKI.bepbak> <YENI.bepbak>` komutu yeni parola ile bütünlüğü doğrulanmış bağımsız yeni arşiv üretiyor; eskisini asla üzerine yazmıyor. Yeni parola `BEP_BACKUP_NEW_PASSPHRASE` değişkeninden geliyor.
- Windows için parolaları görünmez şekilde isteyen ve işlem sonunda ortam değişkenlerini temizleyen `tools/backup-rotate-windows.ps1` eklendi.
- Yetki/konfigürasyon belirsizliği, yanlış parola, bozuk eski yedek, aynı parola veya var olan hedef için olumsuz testler eklendi. Testler ve Windows uygulama açıklaması güncellendi.
- Çalışan SQLite veritabanını uygulama düzeyinde şifreleme, MFA/SSO ve kurumsal üretim onayı kapsamda **değil**.

## v2.25 — Kurumsal güvenlik pilotu: kalıcı giriş koruması ve salt okunur denetim
- Başarısız kimlik doğrulamaları anonim SHA-256 anahtarla SQLite'da sınırlı süre tutulur; 5 yanlış deneme/15 dakika için 15 dakika kilit uygulanır, yeniden başlatma bypass değildir. Eski tablolar ve oturumlar korunur.
- `npm run security:check`: yerel, salt okunur veritabanı bütünlüğü, onaylı sınav/uyarlama SHA-256, temel şema, oturum ve şifreli yedek varlık kontrolleri; kişisel alanlar çıktı verilmez. Üretim onayı veya şifreleme iddiası yoktur.
- Önceki v2.24 onaylı teslim ve diğer tüm modüller korunur; anonim BAP araştırma prototipi.

## v2.23 — Word tablo, denklem, görsel inceleme ve manuel metin eşleştirme
- DOCX yapı envanteri; tablo/denklem/görseller numaralı, en çok 40 öğe. Mevcut otomatik aktarım bu dosyalarda engelli kalır.
- Kaynakla ayrı ayrı karşılaştırılan her öğe için açık öğretmen işaretleme; eksik denetimde işlem reddi.
- Manuel anonim soru metni için yeni `manual-preview` ve `create-manual-draft` API yolları; her adımda sunucuda tekrar ayrıştırma, iki SHA-256 kontrolü, yetki/CSRF.
- Onaysız taslak; doğru yanıt, puan, kazanım veya pedagojik eşdeğerlik uydurulmaz. İki SHA-256 provenance içinde saklanır.
- Makro, OLE ve dış belge bağlantısı manuel aktarıma da kapalı. Hiçbir dış API bağımlılığı eklenmedi.

## v2.22 — 29 Ekim 2026

- Kod ve algoritma sınavlarında açıkça işaretlenen çok satırlı kaynak kodu girinti/tab bilgisiyle koruyan ayrıştırıcı.
- Word DOCX çıktı: metin içi gerçek satır sonu ve tab OOXML serileştirmesi.
- Eksik kapanmış kod veya açıkça işaretlenmemiş kod satırında güvenli aktarım engeli.
- Kod için öğretmen kaynak karşılaştırma uyarısı; öğrenci sonuçları ve onay akışları değiştirilmedi.
- Yeni otomatik regresyonlar ve anonim TXT örneği; önceki v2.21 sınav/karar/veri modülleri korunur.

## v2.20 — Word/PDF sınavdan onaysız taslağa (29 Ekim 2026)

- Kimlik doğrulamalı `/sinav-dosya-aktar` sayfası ve sadece sunucu erişimli `/api/exam-source/preview`, `/api/exam-source/create-draft` uç noktaları.
- Kaynak dosyayı kaydetmeden soru/şık ayrıştırma, risk/belge yapısı kontrolleri; aktarım sırasında tekrar ayrıştırma ve SHA-256 eşleştirmesi.
- Word tablo, denklem, gömülü medya, makro/ActiveX benzeri içerikte otomatik aktarımı engelleme; PDF text-only ve manuel kontrol uyarıları; öğrenci alanı algılandığında engelleme.
- Kaynak soruları için ayrı öğretmen karşılaştırma işareti, içerik değişince yeniden onay; cevaplar otomatik doldurulmaz, taslak onay almaz.
- Gerçek biçimde kurgusal kaynak DOCX ve PDF test örnekleri, HTTP ve birim testleri.

## v2.19 — Oturum yaşam döngüsü ve kurumsal hesap güvenliği (29 Ekim 2026)

- 30 dakika hareketsizlik / 2 saat mutlak oturum süresi, hesap başına en fazla üç açık oturum.
- Hesabın yalnız kendi oturumlarını listemesi; tek tek veya diğer tüm oturumları kapatma; rol, CSRF, Origin ve kurum kapsamı doğrulaması.
- `sessions` şemasında veri kaybı olmadan zaman damgası yükseltmesi; eski oturumların tek seferlik kapatılması.
- Kullanıcı giriş/çıkış/iptal olaylarının sır saklamadan denetim geçmişine alınması.
- Kurumsal portalda yeni oturum güvenliği paneli ve güçlendirilmiş API yanıt başlıkları.
- 358 otomatik test ve 24 yerel dağıtım kontrolü başarılı; gerçek öğrenci verisi ve canlı tarayıcı E2E halen onaylı değil.

## v2.17 — Kurumsal düzenleme kararları (29 Ekim 2026)

- Sadece yapay kimlikli ders/dönem/sınav düzenlemelerinin sunucu tarafında sürümlü kaydı ve çift yetkili onayı.
- Creator/approver separation, CSRF, rol ve tenant yalıtımı, SQLite karar geçmişi, SHA-256 içerik parmak izi ve iptal.
- Dönemli toplu Excel/CSV çıktıları için ayrı kayıtla sunucu kontrolü: liste hücresinde `onayli` yazması artık yeterli değil.
- Yeni panel `/uyarlama-kararlari`; öğretmen, koordinatör ve incelemeci iş akışı.
- Sınırlamalar: yerel sentetik prototip; gerçek öğrenci verisi, resmî onay, sunucuda ZIP üretimi, KVKK/SSO/HTTPS, canlı tarayıcı ve kullanıcı kabul testleri yok.

## v2.15 — Üniversite sınav koordinasyon merkezi (29 Ekim 2026)

- Yeni `/sinav-koordinasyon` sayfası; farklı bölümlerin ve programların sınav oturumlarını anonim ders/görevli/salon kodlarıyla planlama, düzenleme, silme ve filtreleme.
- `exam_coordination` adlı yeni tenant scoped SQLite tablosu; rol/CSRF/çakışma/sürüm izolasyonu ve denetim izi.
- Onaylı sınav sürümüne bağlama ve kaynak sınav değiştiğinde `recheck` durumunu gösterme. Kaynak sınavlar otomatik eşleştirilmez.
- Anonim CSV takvim çıktısı, bağlantılı `/toplu-sinav` panelinde koordinasyon grubu ipuçları.
- 328/328 otomatik test PASS; 13/13 yerel paket kontrolü PASS; gerçek Chromium E2E testine ortam yöneticisi engeli (`ERR_BLOCKED_BY_ADMINISTRATOR`).
- Gerçek öğrenci/kadro kimliği verisi, doğrudan XLSX, üretim erişilebilirlik ve güvenlik onayı **yok**.

## v2.14 — Çok dersli üniversite sınavları

- Tek sınav üzerinden toplu uyarlamadan **birden fazla ders ve sınav türünün** toplu işlenmesine geçildi.
- `ders_kodu;sinav_etiketi;ogrenci_kodu;gereksinim_alani;...` CSV içe aktarma ve 40 ders-sınav grubu desteği; önceki tek ders CSV biçimi de korunuyor.
- Her ders-sınav grubu için **kullanıcının elle seçtiği** onaylı kaynak sınav; kaynak sınavın iki farklı gruba yanlış eşlenmesine engel.
- Dosyalar `dersler/DERS/SINAV/sinavlar/` klasöründe, görevli planı ve ders envanteri ZIP kökünde.
- Üniversite dersleri için yeni sınavın varsayılanı belirli ilkokul dersi değil. Öğrenci baskısı başlığı nötr `SINAV KAĞIDI`.
- Anonim CSV, toplu çıktı, onay/eşleştirme/tekrar/CSV enjeksiyonu testleri.
- Gerçek sağlık/engellilik verisi, `.xlsx` doğrudan yükleme, otomatik Braille/işaret dili ve gerçek kullanıcı E2E **yok**.

## v2.13 — Toplu sınav uyarlama (29.10.2026)

- Yeni `/toplu-sinav` paneli: yalnız onaylı sınav, anonim CSV, kayıt denetimi, toplu çıktılar.
- Onaylı destek kodlarıyla büyük punto, kontrast, tek soru/sayfa, geniş yanıt ve ek süre; personel görev planı.
- Word + A4 HTML; onaylı `ACCESSIBLE_HTML` için çevrimdışı seslendirmeli erişilebilir HTML; ZIP ve CSV görevlendirme listesi.
- Kaynak onayı ve tüm satırların düzenleme onayı zorunlu; gerçek tanı, kimlik, öğrenci numarası yasak.
- Roster yalnız tarayıcı belleğinde; sunucuya kaydedilmez; indirmeler şifresizdir ve yalnız anonim pilot içindir.
- Testler ve sürüm eşlemeleri güncellendi; kurumsal üretim için uygunluk iddiası yok.

# v2.12 — Görsel materyal kütüphanesi (29 Ekim 2026)

- 11 bağımsız ve yerel geometrik materyal; sayı doğrusu ve dört şekil türü.
- Arama, tür filtresi, klavye ile seçilebilir kartlar, erişilebilir betimleme ve hedef soru seçimi.
- Onaylı sınavı doğrudan değiştirmeden yeni taslağa geçiş; görsel uygulamada öğretmen kontrollerinin geçersizleşmesi.
- Görsel şekil türünün doğrulama parmak izine eklenmesi, ancak mevcut varsayılan daire/sayı doğrusu doğrulamalarının korunması.
- 302 otomatik test, 13 yerel dağıtım kontrolü. Chromium canlı testinde yerel adres engeli; gerçek ekran okuyucu/uzman pilotu yapılmadı.

## v2.11.0 — 29 Ekim 2026

- Kurumsal sınav editörüne salt okunur **Öğrenci görünümü / öğretmen karşılaştırması** eklendi; beş erişilebilirlik profilinde soru önizleme.
- Önizleme `core.questionHtml(..., false)` fonksiyonunu yeniden kullanarak cevap anahtarı ve öğretmen notunu dışarıda tutar.
- Öğretmen uyarıları: eksik metin ve seçenekler, görsel betimlemesi, görünürlük ve desteklenmeyen sayı doğrusu aralığı.
- Eşleştirme ve sade metin kontrolleri; profil seçimi kalıcı sınavı veya eski onayı değiştirmez.
- 14 yeni test (11 iş mantığı + 3 HTTP); toplam 294/294. 13/13 release kontrolü. Tarayıcı engeli nedeniyle GUI testi tamamlanmadı.

## v2.10 — Öğretmen kontrollü erişilebilir soru iskeletleri (28 Ekim 2026)

- Yedi yeni düzenlenebilir soru şablonu (seçmeli 3/2, kısa yanıt, D/Y, eşleştirme, nesne, sayı doğrusu).
- BEP genel hedefi veya öğretmenin seçtiği kayıtlı hedef ile yalnızca boş soru üretimi; cevap anahtarı ve pedagojik onay üretilmez.
- Arayüzde şablon seçicileri, açıklama alanı, soru sınırlaması ve erişilebilir klavye odağı.
- Kurumsal yetki, otomatik kayıt, hedef matrisi, onay/eski sürüm güvenlik akışları korunmuştur.
- Sürüm v2.10.0; yerel launcher fark denetimi ve statik module allowlist güncellendi.
- 280 otomatik test PASS, 13 yerel release kontrolü PASS. Gerçek tarayıcı e2e kısıt nedeniyle yapılmadı.

## v2.9 · 28 Ekim 2026

- Öğretmen panelinde BEP hedef–soru kapsam matrisi: geçerli/eksik/kopmuş bağlantılar, hedef doğrulaması, soru sıra numaraları ve planlanan puan toplamları.
- Öğretmen onayıyla soru–hedef yeniden eşleme: soru metni, yanıt ve puan korunurken hedef eşlemeleri/soru kazanımı güncellenir; mevcut onay durumu geçersizleşir ve yeni eşdeğerlik kontrolü gerekir.
- Hedef durum filtreleri, soruya odaklanma kısayolları ve soru/yanıt metni içermeyen anonim CSV.
- Yeni saf hesaplama modülü ve birim+yerel HTTP entegrasyon testleri. Kişisel bilgi, tanı/sağlık bilgisi veya öğrenci sesi kaydı eklenmedi.

## v2.8 — 28 Ekim 2026

- Kurum içindeki görülebilir sınavı bağımsız **yeni taslak** olarak kopyalama; kaynak onayı ve onay geçmişi korunur, yeni taslağa aktarılmaz.
- Kopyada BEP ve alternatif metin doğrulamalarını sıfırlayıp öğretmen onay kapısını yeniden uygulama.
- Başlık araması, taslak/onaylı filtresi, ekran okuyucuya bildirilen sonuç sayacı ve klavye erişilebilir kopyalama eylemi.
- Kurum/rol/CSRF/revizyon/kota kısıtlarını denetleyen HTTP ve depo testleri; portta eski sürüm varsa doğru uyarı veren Windows başlatıcı.
- Anonim yerel pilot sınırları ve mevcut SQLite hesap/sınavlarını koruyarak sürüm yükseltme rehberi.

## v2.7 — 28 Ekim 2026

- Windows `BASLAT.bat` artık port 4173 doluysa mevcut DOU BEP uygulamasını ayırt ediyor; başka uygulamayı durdurmuyor ve EADDRINUSE yığınına düşmüyor. Yerel sunucu hata mesajı sadeleştirildi.
- Öğretmen tarafından sağlanan anonim CSV/JSON dosyalarından en fazla 40 BEP kazanımını atomik olarak kuruma **taslak** alma; istemci önizlemesi, 256 KB dosya sınırı, tekrarlanan kod/kota/alan denetimleri, CSRF/yetki izolasyonu.
- Ders/kademe filtreleri; kazanım kaynağı bir **kullanıcı beyanı** olarak görünür, hiçbir amaç otomatik onaylanmaz veya resmî müfredat olarak sunulmaz.
- Mevcut SQLite kataloglarına kaynak alanını veri kaybetmeden ekleyen sürüm geçişi; taslak içe aktarma ve port sınıflandırma testleri.

## v2.6 (28.10.2026)
- Öğretmen editöründe duraklamalı, **sunucu kaynaklı otomatik kayıt**; tarayıcı depolamasına sınav yazılmaz.
- Tek seferde bir yazma, düzenleme sırasında yeni değişiklikleri koruyup sonraki kayıtla eşitleme.
- Sürüm çakışmasında otomatik üzerine yazma engeli, sekmede korunan taslak, manuel JSON kurtarma/kopyalama.
- En son sunucu taslağına dönme; JSON dosyasını yeni anonim sınav olarak içe aktarma.
- Kaydetme durumu görünümü, mobil stiller, eksik varlıklar için sunucu izin listesi.
- Otomatik kayıt ve kurtarma testleri; eski BEP/soru bankası/erişilebilirlik işlevleri korunur.

## v2.5 (28.10.2026)
- Öğretmen hazırlık masası: 5 adım ve ilgili alana geçiş.
- Tüm durumlar canlı taslaktan ve mevcut kalite kurallarından türetiliyor; otomatik onay yok.
- İçerik/cevap/kimlik taşımayan anonim CSV hazır.
- Sunucu JavaScript dosyası allowlist ve HTTP MIME doğrulaması.
- Bağımsız preflight mantığı için 7, arayüz/HTTP için 2 yeni test.
- Güncel rakip analizi, kabul kapıları ve ürün stratejisi eklendi.

## v2.3 — Tasarım yenileme (28 Ekim 2026)
- Kurum giriş ekranında iki sütunlu modern görsel düzen, parola göster/gizle ve yerel kurulum yardım alanı.
- Sınav editörü, BEP aktarma, yerel tasarımcı ve anonim pilotta tutarlı DOU teması.
- Daha yüksek kontrastlı butonlar, düzenli kart/form hiyerarşisi ve mobil duyarlılık.
- Mevcut sunucu, roller, sınav kayıtları ve API mantığı değiştirilmedi.

## v2.3 — 27.10.2026
- SQLite tabanlı kuruma özel kazanım kataloğu ve soru bankası: taslak/yayımlanmış, revizyon ve rol denetimi.
- Öğretmen taslağı, incelemeci/yönetici yayımlaması ve yayımlanmış hedeften soru üretme akışı.
- Sınavdan kütüphaneye soru ekleme, yayımlanmış soruyu kopyalama; soru/kazanım denetiminin atlanmaması.
- Yayınlı kazanım düzenlenince ilişkili soru yayımlarını geçersizleştirme.
- Yeni API'ler için yetki/tenant/CSRF/kalite testleri ve Chromium sahte API arayüz kontrolü.
- 205 otomatik test, 13+ yerel güvenlik/dağıtım kontrolü.

## v2.2 — 27.10.2026
- Öğretmen tarafından BEP amaçları için metin/düzey doğrulama ve değişiklik sonrası kontrol iptali.
- Etkin sadeleştirilmiş soru sunumunda 4 ayrı ölçme eşdeğerliği kontrolü; server-side kalite kapısı (yeni guided taslaklar).
- Soru/sunum/cevap/kazanım/erişilebilirlik değişince işaretleme eskir; onay geçersizleşir.
- Anonim öğretmen durum CSV raporu; kişisel veri, soru metni ve cevap anahtarı yok.
- 196 otomatik test ve 13 yerel güvenlik/dağıtım kontrolü başarılı; gerçek kullanıcı erişilebilirlik testi yapılmadı.

# v2.1 (27.10.2026)

- Şifreli, kimliği doğrulanan SQLite yedeği ve yalnızca yeni dosyaya geri yükleme.
- Onay sürümü/hash geçmişi, yetkili API ve öğretmen arayüzü.
- Yardımcı teknoloji pilotu: 12 teknik kontrolün durumu, anonim cihaz/ekran okuyucu seçimi, CSV/JSON raporu.
- Gerçek çocuk/sağlık verisi kullanılmadan otomatik test ve tarayıcı kontrolleri.

# Değişiklikler

## v2.0 — BEP planından sınava akış (27.10.2026)

- Yeni `/bep-import` öğretmen çalışma ekranı; TXT/DOCX/metin-PDF (Poppler) içe aktarma, kişisel alan kontrolü, yerel geçici önizleme.
- KDA/UDA başlıklarından kural tabanlı hedef adayları; düzenleme, eleme, açık öğretmen onayı, hedeflere bağlı boş soru taslağı.
- `bepGoals` ve `goalId` ilişkisinin kaydı; hedef ve soru kazanımı uyuşmazsa kalite kontrolü sınav onayını engeller.
- Kurumsal sınav editöründe beş biçim profili: standart, büyük yazı, odaklanma, yüksek kontrast, motor erişim. Onaylı sınavdan Word profili dışa aktarımı.
- SQLite tutarlılık denetimli, üzerine yazmayan yerel yedekleme (`npm run backup`); yedekler şifresizdir.
- Öğretmen güvenlik uyarıları, anonim TXT/DOCX/PDF örnekleri, ürün fazları ve kabul koşulları.
- Mevcut v1.9 özellikleri ve testleri korunmuştur; gerçek öğrencilerle canlı kullanım değildir.

## v2.16 — 29 Ekim 2026
- Tarayıcı içinde doğrudan tek sayfalı, sınırlı, anonim XLSX dosyası okuma; formül, makro, harici link ve fazla sütun reddi.
- Sekiz sütunlu dönemli liste, akademik dönem/ders/sınav için kayıpsız gruplayıcı; örnek `.xlsx` ve `.csv` şablonları.
- Güncel koordinasyon kayıtlarıyla kaynak sınav doğrulaması; eksik, yeniden kontrol gerektiren, onaysız ve dönem uyuşmazlığı olan paketler engellenir.
- Ders klasörleri dönem bazında ayrılır, görevli ve envanter CSV'lerinde dönem sütunu eklenir.
- 5/7 sütunlu önceki CSV akışları korunur. CSV hücrelerinde formül enjeksiyonunu azaltan önlem güçlendirildi.

## v2.18 — Sunucu tarafında onay denetimli toplu üretim
- Akademik dönemli anonim listelerden yalnızca dört eşleştirme anahtarı sunucuya gönderilir.
- Onaylı ders sınavları ve bağımsız uyarlama kararları server-side depodan doğrulanır; istemci girdisiyle onay veya içerik taklit edilemez.
- Yöneticiler/koordinatörler için CSRF/rol/tenant kontrollü `POST /api/batch/authorized-package` endpoint'i.
- Yanıt anahtarsız ZIP, iç dosya SHA-256 manifesti, yanıt SHA-256 header'ı ve tenant-scope üretim denetim kaydı.
- Öğretmen, incelemeci, diğer kurum, değişen sınav ve kararı iptal edilmiş kayıtlar için olumsuz testler.
- `npm run package:verify -- <zip> [sha256]` salt okunur yerel paket doğrulama.
- Güvenli dönemli mod dışındaki eski liste türleri toplu ZIP üretim ekranından devre dışı; anonim eski aktarım biçimleri okunabilir.
- Hâlâ yalnız anonim yerel pilot; güvenlik/erişilebilirlik sertifikasyonu değildir.

## v2.21 — Sınav Operasyon Merkezi ve BAP araştırma planı (2026-10-29)

- Yalnız admin/koordinatör tarafından erişilebilen `sinav-operasyon` modülü ve salt-okunur API.
- Dönem/ders/sınav oturumu eksiklikleri ile onaylı uyarlama kararlarını ayrı statülerde özetleyen kontrol katmanı; aday kodu veya tanı aktarımı yapılmaz.
- Statik çevrimdışı kaynak denetimi (`npm run offline:audit`). Haricî CDN/API/uzak font bağlantısı olmadan arayüz çalışması kontrol edilir.
- BAP iş paketleri, ölçülebilir araştırma soruları, açık eksik listesi ve kendi çevrimdışı Türkçe ses motoru hedefi belgelendi.
- Windows local kontrol scripti; test dışında veri silme/yükleme içermez.
- v2.20 bütün önceki modülleri ve Windows test temizleme düzeltmesi korunur.

## v2.24 — Onaylı tekil sınav için doğrulanabilir teslim (2026-10-29)

- Tekil sınav dosyalarının dışa aktarımı için onay defteri ve kaynak içerik SHA-256 eşleşmesi zorunlu hale getirildi.
- Onaylı sürümden sunucu tarafında Word + HTML yazdırma + çevrimdışı erişilebilir HTML üreten, dosya hash'leri içeren ZIP teslimi eklendi.
- Sunucu ön kontrolü ve sınav editöründe teslim paketi butonları.
- Kurum ayrımı, CSRF, profil doğrulama ve sınav revizyonu denetimleri korunur.
- Paket bütünlük kontrol aracı tekil teslim ZIP'lerini de doğrular; eski toplu ZIP'leri destekler.
- Bağımsız erişilebilirlik ve üretim güvenliği onayı yoktur; yalnız anonim pilot.

## v2.31 — Yerel etiketli PDF pilot üretimi (2026-10-29)

- Yalnız yerel/izinli TrueType fontlardan, üçüncü taraf bulut kütüphanesi olmadan PDF 1.7 metin dosyası üreten `server-foundation/tagged-pdf.mjs`; kaynak ZIP'inde font bulunmaz.
- `H1/H2/P`, `/StructTreeRoot`, `/ParentTree`, `/Lang (tr-TR)` ve `/ToUnicode` işaretleri; Türkçe Unicode eşleme. Büyük yazı ve tek-soru-sayfa düzeni.
- Onaylı sınavı, kurumu, rolü, CSRF'yi ve içerik özeti doğrulamasını zorunlu tutan `POST /api/exams/:id/pdf-pilot` ve öğretmen arayüzünden PDF indirme.
- Yerel font lisansı ve karakter kapsamı koruması; görsel/tablo/kod gibi desteklenmeyen öğeler PDF üretimini engeller. PDF/UA veya WCAG sertifikası değildir.
- `npm run pdf:font-check` ve beş yeni test; eski ZIP teslim sözleşmesi ve `data` veritabanı korunur.

## v2.39 — Anonim yedekten izole kurtarma provası (2026-10-29)

- Yeni `tools/storage-recovery-drill.mjs`: kaynak SQLite salt-okunur tablo içerik özeti, bağımsız denetim kanıtına bağlı şifreli yedek, özel geçici klasöre geri yükleme ve tüm oturum-dışı tabloların karşılaştırılması.
- Prova sonrası tüm geçici şifreli ve düz dosyalar temizlenir. Hata durumunda başarılı rapor üretilmez; normal canlı uygulama veritabanı değiştirilmez.
- Windows için parolayı gizli alan `tools/storage-drill-windows.ps1` ve `storage:drill` komutu eklendi.
- Gerçek hassas veriler, canlı SQLite şifreleme ve kurumsal işletim onayları halen kapsam dışıdır.

## v2.57 — Yerel fonem zamanlama deneyi ve nesnel WAV karşılaştırması (29 Ekim 2026)
- Mevcut spektral sentez korunarak ayrı, opt-in sentetik zamanlama planı; komşu tonal seslerde perde sınırı eşleme, 16 sn sınırı.
- Karşılaştırma yalnız WAV ölçümleri; kalite/anlaşılabilirlik iddiası yok; gerçek öğrenci verisi yok.
- CLI sabit sentetik ifade, üzerine yazma reddi; DOU Reader, sınav ve SQLite değiştirilmedi.

## v2.60 — sabit sentetik A/B teknik provası
- Sadece 14 kayıtlı sentetik korpus koduna izin veren 28 A/B yerel WAV denemesi.
- Deney yanıtı veya kişisel veri tutulmaz; sabit dengeli atama bilimsel körleme değildir.
- Reader ve sınav çekirdeğine dokunulmadı; mevcut veri şeması değiştirilmedi.
- Rehearsal birim, HTTP ve release kontrolü eklendi.
