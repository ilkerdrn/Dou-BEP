# DOU BEP Sınav Atölyesi v2.15 — Üniversite Sınav Koordinasyon Merkezi

**Amaç:** farklı bölüm ve programlardan gelen çok sayıda dersin sınavını, özel gereksinimli öğrenciler için hazırlanacak **onaylı, bireysel uyarlanmış çıktılardan önce** tek merkezde planlamak.

**Sınır:** Bu yazılım gerçek kullanım izni verilmiş bir sistem değildir. Tamamen yerel, yalnızca anonim/sentetik pilot verileri içindir; Doğuş Üniversitesi veya başka kurum tarafından onaylı/resmî yazılım değildir. Öğrenci adı, numarası, TCKN, tanı, sağlık ve özel gereksinim listesi yüklenmemelidir. Öğretim elemanı alanında gerçek isim veya e-posta yerine anonim kod kullanılır. Bu kısıtlar gerçek hayattaki kişisel verileri otomatik ve kusursuz biçimde tanıyan bir güvenlik sistemi değildir.

## Ne eklendi?

1. **Sınav koordinasyon paneli:** `http://127.0.0.1:4173/sinav-koordinasyon`. Kurum yöneticisi veya koordinatör hesabıyla açılır.
2. **Sınav oturumu planlama:** dönem (örn. `2026-GUZ`), bölüm kodu, program kodu, ders kodu ve adı, sınav etiketi (`VIZE`, `FINAL`, `BUTUNLEME` vb.), tarih/saat, süre, anonim öğretim elemanı kodu ve salon kodu. Ders sayısı/alanı sabit bir öğretim programına bağlı değildir.
3. **Onaylı sınav bağlama:** Öğretmen tarafından hazırlanmış ve hâlen onaylı kaynak sınav seçilebilir. Sürüm numarası kayıt altına alınır. Kaynak sınav değişirse oturum **yeniden kontrol gerekli** durumuna döner. Ders/sınav türü doğrulaması otomatik tahmin edilmez; koordinatörün açık onayı gereklidir.
4. **Çakışma önleme:** aynı akademik dönemde salon veya öğretim elemanı kodu için çakışan sınav saatleri sunucu tarafından reddedilir.
5. **Yetki, veri izolasyonu ve revizyon kontrolü:** kurum bazlı SQLite kayıtları, yalnız admin/koordinatör erişimi, yazmada oturum + CSRF zorunluluğu, başka sekmede güncellenen kayda eski sürümün yazılmaması, audit kayıtları.
6. **Durum ve takvim:** hazır/onay bekliyor/yeniden kontrol göstergeleri; dönem filtresi, arama, anonim CSV takvim dışa aktarma (Excel formül çalıştırma riskini azaltan hücre korumasıyla).
7. **Çok dersli toplu uyarlama bağlantısı:** `/toplu-sinav` ekranında koordinasyona kayıtlı ders/sınav grubu varsa yalnız bilgi amaçlı gösterilir. Kaynak sınav **otomatik atanmaz**; kullanıcı her grup için mevcut onaylı sınavı ayrıca seçmeye devam eder.

## Nasıl kullanılır?

1. Windows için Node.js 22.13+ kurun; projeyi tamamen çıkarın. Yeni kurulumda `KURULUM-YONETICI.ps1` ile ilk kurum yöneticisini oluşturun. `BASLAT.bat` ile uygulamayı başlatın.
2. `/kurum` üzerinden yetkili yönetici veya koordinatör oturumunu açın.
3. `/sinav-koordinasyon` ekranında her dersin vize/final/bütünleme oturumunu kaydedin; farklı akademik dönemleri ayrı tutun.
4. `/kurumsal-sinav` üzerinden her derse ait sınavı hazırlayıp öğretmen onayını tamamlayın. Koordinasyon oturumunda doğru onaylı sınavı **elle bağlayın**.
5. `/toplu-sinav` ekranında anonim çok dersli CSV listesini yükleyin, her ders/sınav için uygun onaylı kaynağı ayrıca eşleştirip bireysel düzenlemeleri doğrulayın; onaysız kayıtlar çıktıyı engeller.
6. Word ve yazdırılabilir HTML dosyalarını derslere ayrılmış ZIP şeklinde alın. Bu sürümde doğrudan PDF ve `.xlsx` dosya içe aktarımı yoktur; Excel'den **UTF-8 CSV** kaydetmek gerekir.

## Veri bütünlüğü ve yükseltme

- `data/institution.sqlite` ve `data` klasörünü **silmeden**, önce mevcut programda `npm run backup` ile şifreli yedek alın ve `npm run backup:verify` ile doğrulayın. Eski sunucuyu kapatın. Yeni kodları yedeklenmiş bir test kopyasında kontrol edip sonra yükseltin.
- Yeni `exam_coordination` tablosu mevcut SQLite veritabanına ilk açılışta eklenir; önceki sınav, kütüphane ve kullanıcı tabloları korunur. Veritabanı paket içinde bulunmaz.
- Koordinasyonda öğrenci/engellilik bilgisi tutulmaz; v2.14'teki anonim toplu CSV yalnız yükleyen kişinin tarayıcı belleğinde işlenir. İndirilen ZIP/CSV dosyaları **şifreli değildir**.

## Sınırlamalar

- Bu sürüm sınav oturumlarının **koordinasyon ve doğrulama MVP'sidir**; resmi OBS entegrasyonu, gerçek öğrenci listeleri, doğrudan Excel `.xlsx` içe aktarma, sınav takviminden otomatik öğrenci eşleştirmesi, SMS/e-posta bildirimleri, resmi salon rezervasyonu, kurumsal SSO/MFA bulunmaz.
- Aynı dersin birden çok dönemdeki kaydı tutulabilir, fakat anonim toplu CSV'nin dönem sütunu yoktur. Bu nedenle dönem seçimi ve kaynak sınav eşleşmesini koordinatör ayrıca kontrol etmelidir.
- `npm test` otomatik kod ve yerel HTTP kontrollerini, `npm run release:check` 13 sınırlı yerel dağıtım/safety denetimini gerçekleştirir. Bunlar gerçek tarayıcı E2E, ekran okuyucu, bağımsız sızma testi, KVKK değerlendirmesi veya gerçek öğrenci pilotunun yerine geçmez. Chromium'un yerel adrese erişimi bu çalışmada `ERR_BLOCKED_BY_ADMINISTRATOR` ile engellendi; gerçek GUI testi tamamlanmadı.
