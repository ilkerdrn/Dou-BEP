# DOU BEP Sınav Atölyesi v2.16 — Doğrudan Excel ve dönemli koordinasyon

**Kapsam:** Yerel ve yalnızca anonim/sentetik sınav hazırlama pilotu. Bu uygulama üniversite tarafından resmen onaylanmış değildir. Gerçek öğrenci listeleri, öğrenci numaraları, adlar, sağlık verileri ve engellilik/tanı bilgileri **yüklenmemelidir**. Sınav düzenlemeleri öğrencinin kategorisinden otomatik belirlenmez; kurumsal olarak onaylı düzenleme kodları ayrı girilmelidir.

## Neler eklendi?

- `.xlsx` dosyası doğrudan tarayıcıda açılır; başlık ve tablo sınırları doğrulanır. Örnek dosya `ORNEK-ANONIM-DONEMLI-SINAV-LISTESI.xlsx`.
- Sekiz sütun: `donem, ders_kodu, sinav_etiketi, ogrenci_kodu, gereksinim_alani, onayli_duzenlemeler, ek_sure_dakika, onay_durumu`.
- Dönem biçimi `2026-GUZ`, `2026-BAHAR`, `2026-YAZ`; aynı anonim kodun farklı ders/dönemlerde kullanılması mümkün, bir dönem/ders/sınavda kopya kod yasak.
- `SINAV_LISTESI` adlı tek Excel çalışma sayfası beklenir (başka adda tek sayfa da kabul edilir). Formüllü, çok sayfalı, makrolu, dış bağlantılı, ek sütunlu veya büyük dosyalar reddedilir. Güncel Chrome/Edge'de yerel ZIP açma (`DecompressionStream`) gereklidir; desteklenmeyen tarayıcılar için dönemli CSV yükleme seçeneği vardır.
- Dönemli importta paket üretmeden önce `sinav-koordinasyon` kaydı bulunmalı ve **o dönem, ders ve sınav türündeki tüm eşleşen oturumlar hazır/onaylı olmalıdır**. Seçilen kaynak sınav ID'si koordinasyondaki onaylı kaynakla aynı olmalıdır; farklı dönem/yanlış kaynak/onaysız sürüm engellenir. İhracat öncesinde oturumlar sunucudan tekrar okunur.
- Çıktı klasörü dönemli listelerde `donemler/2026-GUZ/dersler/BLP103/VIZE/sinavlar/KOD-001.docx` şeklindedir; görevli planı ve ders-sınav envanteri dönem sütunu içerir.
- Eski dönem içermeyen 5 ve 7 sütunlu CSV şablonları **geriye dönük desteklenir**; koordinasyon kaydı zorunlu olmadığı eski manuel davranış korunur.

## Kullanım

1. Windows'ta Node.js 22.13+ ile yerel uygulamayı `BASLAT.bat` üzerinden başlatın; kurum yöneticisi veya koordinatör hesabıyla oturum açın.
2. `/kurumsal-sinav` üzerinde her dersin kaynak sınavını hazırlayıp onaylayın.
3. `/sinav-koordinasyon` ekranında her dönem, ders ve sınav türü için sınav oturumu oluşturun; doğru **onaylı kaynak sınavı** elle bağlayın.
4. `/toplu-sinav` ekranında örnek `.xlsx` dosyasını açın (en fazla 512 KB, 100 satır, 40 grup). Listede kasten `bekliyor` durumundaki bir kayıt vardır; çıktıyı denemek için bu sentetik satırı `onayli` yapmanız ve ilgili koordinasyon oturumunu hazırlamanız gerekir.
5. Her dönem-ders-sınav grubunda koordinasyona bağlı kaynağı seçin, listede onayı eksik satır olmadığından emin olun, doğrulama kutusunu işaretleyin ve ZIP'i indirin.

## Mahremiyet ve sınırlamalar

- Excel verisi **yükleme aşamasında bu tarayıcı sekmesinin belleğinde** okunur, sunucuya dosyanın kendisi gönderilmez. Sınav kaynakları ise sunucudan yetkili oturumla getirilir. İndirilen ZIP, CSV, DOCX ve HTML **şifrelenmemiştir**; yalnız sentetik veriler kullanılmalıdır.
- XLSX içe aktarma yalnız liste şablonunu destekler; `.xls` ve `.xlsm` desteklenmez. Bu bir genel Excel görüntüleyici/antivirüs değildir. Dosya içerisindeki tüm kişisel bilgileri algılama garantisi yoktur.
- Koordinasyon eşleştirmesi tarayıcıda son kontrolü yapılan **yerel prototip** mantığıdır; gerçek sistem için sunucu tarafında yetkilendirilmiş, imzalı toplu üretim, değişmez onay kaydı ve revizyon denetimi geliştirilmelidir.
- Gerçek erişilebilirlik ve pedagojik eşdeğerlik testleri, uzman onayı, KVKK hukuki incelemesi, kurumsal SSO/MFA, HTTPS, sızma testi, gerçek üniversite entegrasyonu ve gerçek öğrenci pilotu **henüz yoktur**.
- Kurulumda mevcut `data/` dizinini silmeyin. Önce eski kurulumdaki şifreli yedek aracını kullanın, yedeği doğrulayın, uygulamayı kapatın ve yeni dosyaları yedeklenmiş kopyada deneyin.

## Teknik doğrulama

`npm test` / `npm run release:check`; ayrıntılar `DOGRULAMA-v2.16.md`. Otomatik test sonucu gerçek GUI/ekran okuyucu kullanımını belgelemez.
