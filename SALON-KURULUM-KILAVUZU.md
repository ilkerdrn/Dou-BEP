# Salon sınavı kurulum ve uygulama kılavuzu (50 bilgisayar, farklı dersler ve uyarlamalar)

Amaç: Bir bilgisayar salonunda, engel durumları ve dersleri farklı birden çok öğrencinin, her biri **kendi sınavı, süresi, soruları ve onaylı erişilebilirlik ayarlarıyla** sınava girmesi.
**Kapsam sınırı:** Bu bir yerel pilottur; gözetimli/güvenli sınav (sekme kilidi, kamera) değildir. Gerçek NVDA/JAWS ve engelli öğrenci testi yapılmadan "erişilebilir" denmemelidir. Aşağıdaki ölçümler otomatik testlerdir.

## 1. Sunucu bilgisayarı (bir kez)
- Windows, Node.js 22.13+. Salondaki öğrenci bilgisayarlarına **yalnızca tarayıcı** yeterlidir; kurulum gerekmez.
- Sunucu bilgisayarında `BASLAT-SALON.bat` çalıştırın (**salon/LAN modu**). Pencerede "Öğrenci adresi: http://192.168.x.x:4173/pilot" yazar; bu adresi öğrencilere verin (giriş kâğıtlarında da çıkar).
- İlk kurulumda Windows güvenlik duvarında 4173 portuna **özel ağ** için izin verin (yönetici PowerShell, bir kez):
  `netsh advfirewall firewall add rule name="DOU BEP Salon" dir=in action=allow protocol=TCP localport=4173 profile=private`
- **Güvenlik modeli:** LAN modunda diğer bilgisayarlar yalnızca öğrenci sınav ekranına (`/pilot`, ses dosyaları) ve beş öğrenci API çağrısına ulaşır. **Yönetim sayfaları, giriş ve diğer tüm API'ler yalnızca sunucu bilgisayarından (`http://localhost:4173`) açılır**; şifreler ağdan geçmez. Bilinmeyen `Host`/`Origin` başlıkları reddedilir.
- **Trafik şifresizdir (HTTP).** Yalnızca izole bir salon ağında kullanın veya kurumun BT birimiyle HTTPS destekli bir ters vekil kurdurun (kurum kararı; yapılmadı).
- Ayarlar (`BASLAT-SALON.bat` içinde, değiştirilebilir): `BEP_PILOT_MAX_OPEN_SESSIONS=100`, `BEP_PILOT_REDEEM_GLOBAL_LIMIT=200` (yanlış yazılan kodlar tüm salonu kilitlemesin; varsayılan 12), `BEP_PILOT_CODE_VALID_MINUTES=120`, `BEP_TERMINOLOGY=university`. İsteğe bağlı: `BEP_LAN_HOSTS=sunucu-adi,192.168.1.20` (ek ana bilgisayar adı), `BEP_LAN_BIND=192.168.1.20` (tek ağ kartı).

## 2. Sınavları hazırlayın (öğretim elemanı)
1. Soruları Word/PDF/TXT veya **Excel şablonu** (`ORNEK-SORU-SABLONU.xlsx`) ile `/sinav-dosya-aktar` sayfasından yükleyin; her soruyu kaynakla karşılaştırıp onaylayın, eksik görsel betimlemeleri girin.
2. Kurum onayını verin. Her ders ayrı sınavdır (kendi süresi ve soruları).

## 2b. Bilgisayar hazırlığı (sınavdan önce, her öğrenci bilgisayarında)
Tarayıcıda `http://<sunucu-ip>:4173/hazirlik` adresini açıp **"Hepsini sırayla dene"** deyin. Sayfa: sunucu bağlantısı ve gecikme, tarayıcı özellikleri, yerel Türkçe ses (yoksa çevrimdışı ses modelini önbelleğe indirir), ses denemesi ("duydum/duymadım"), Alt+Shift+T kısayolunun yakalanıp yakalanmadığı (ekran okuyucu çakışması) ve ekran boyutunu denetler; sonunda "Bu bilgisayar sınava hazır" ya da eksikleri yazar. Ad, kod veya yanıt istemez. Görme engelli adayların bilgisayarlarında mutlaka yapın.

## 3. Salon planı (görevli, sınavdan önce)
`/salon-oturumu` sayfasında tek tablo yazın (noktalı virgülle):
```
aday_kodu;koltuk;sinav_no;uyarlamalar;ek_sure_dakika;mola_dakika
KOD-001;PC-01;1;LARGE_PRINT|HIGH_CONTRAST|ACCESSIBLE_HTML;15;10
KOD-002;PC-02;2;ONE_PER_PAGE|LARGE_TARGETS|WIDE_RESPONSE;30;15
KOD-003;PC-03;3;ACCESSIBLE_HTML|SIGN_SUPPORT;0;0
```
- `aday_kodu` yapay koddur (`KOD-`, `ORNEK-`, `TEST-`, `DEMO-`, `ANON-` ile başlar); **gerçek ad/numara yazılmaz**. Adı koda bağlama listesini görevli kendi (sistem dışı) kaydında tutar.
- Uyarlama kodları kuruma onaylı düzenlemelerdir. Sistem şunları ekranda uygular: `LARGE_PRINT` (çok büyük yazı), `HIGH_CONTRAST`, `SIMPLE_SCREEN`/`ACCESSIBLE_HTML` (basit ekran), `LARGE_TARGETS`/`WIDE_RESPONSE` (büyük tıklama alanları), `ONE_PER_PAGE` (tek soru, kapatılamaz). Görevli gerektirenler (`READER`, `SCRIBE`, `SIGN_SUPPORT`, `QUIET_ROOM`, `BREAKS`, `ASSISTIVE_TECH`) **sistem tarafından uygulanmaz**; giriş kâğıdında ve canlı tabloda görevliye hatırlatılır.
- "Planı doğrula ve kodları üret": hatalı satır varsa **hiç kod üretilmez**, hata satır numarasıyla gösterilir. Başarılıysa her aday için ayrı kod çıkar. Kodlar **yalnızca bu ekranda** görünür: "Giriş kâğıtlarını yazdır" ve CSV indirme ile alın.

## 4. Sınav günü
1. Her öğrenci kendi koltuğundaki bilgisayarda tarayıcıyı açıp giriş kâğıtlarındaki adrese (`http://<sunucu-ip>:4173/pilot`) gider, **kendi kodunu** yazar. Süre bu anda başlar. Sayfa kendi ders, süre ve erişilebilirlik ayarlarıyla açılır.
2. Yanıtlar her 10 saniyede sunucuya otomatik kaydedilir. Tarayıcı çökerse veya sayfa yenilenirse aynı kodla **en çok 5 kez** devam edilir; süre durmaz, mola açıksa biter. Devam sayısı canlı tabloda görünür.
3. Süre bitince yanıtlar otomatik teslim edilir. Yazılı yanıt 4000 karakter/soru.
4. Görevli `/salon-oturumu` canlı tablosunda herkesin durumunu (girmedi/sınavda/teslim, kalan süre, molada, devam sayısı, son kayıt, görevli notları) görür; tablo her 10 saniyede yenilenir.
5. Salon sayfasındaki **"Sonuç tablosunu indir (CSV)"** her aday için durum, teslim zamanı, harcanan süre, devam/mola sayısı, nesnel sorular için **cevap anahtarından puan önerisi** ve yazılı yanıt sayısını verir (anonim kodlarla; öneri kesin puan değildir).
6. Teslimden sonra öğretim elemanı `/pilot-yonetim` sayfasında yanıtları inceler (nesnel sorular için puan **önerisi** vardır; yazılı yanıtlar elle puanlanır).

## 5. Ölçümler (otomatik, bu geliştirme ortamında)
- `salon-50.e2e.test.mjs`: 50 aday, 4 farklı ders, süre 20/30/45/60 dk, 5 farklı uyarlama profili, eşzamanlı giriş, 40 taslak kaydı, 10 çökme sonrası devam, devam sınırı, mola, teslim ve canlı izleme; gerçek tarayıcıda üç farklı profil ve çökme sonrası yazılı yanıtın geri gelmesi.
- 20 gerçek tarayıcı penceresi aynı anda giriş+yanıt+teslim: 0 hata, ~1,4 sn.
- `npm run pilot:load -- 1000 100`: 1000 öğrenci, 0 hata. **Kapasite garantisi değildir**; kendi donanımınızda ve ağınızda ölçün.

## 6. Yapılmayanlar / dikkat
- Gözetim, kopya önleme, ekran kilidi, kamera: yok (kurum kararı).
- HTTPS ve çok sunuculu ölçek: kurum BT işi (Bölüm 1). Salon ağı erişimi (LAN modu) test edildi: ağ adresi üzerinden öğrenci sayfası, kod girişi, otomatik kayıt ve teslim çalışır.
- Sistem dışı kimlik eşleştirmesi (aday kodu ↔ kişi) görevlinin sorumluluğundadır.
- Görevli gerektiren düzenlemeler (okuyucu, yazıcı, işaret dili) insan tarafından sağlanır.
- Gerçek NVDA/JAWS ve engelli öğrenci kullanım testi **yapılmadı**; salonda canlı sınavdan önce `UZMAN-TEST-SENARYOLARI-NVDA.md` ile deneme yapılmalıdır.

## 7. Görme engelli aday için sınav akışı
**Sorular nasıl seslendirilir?** Ses önceden kaydedilmez. Soru metni sınav anında, öğrencinin bilgisayarında okunur: önce Windows'taki yerel Türkçe ses, yoksa uygulamadaki çevrimdışı sinir ağı sesi (ilk kullanımda ~38 MB yüklenir). Soru değiştiğinde (yeni sınav, yeni soru) okunan metin de değişir; ek bir hazırlık gerekmez.
**Planda:** görme engelli aday satırına `AUTO_READ` (otomatik okuma) ve gerekirse `ACCESSIBLE_HTML` (basit ekran), `ONE_PER_PAGE`, `LARGE_PRINT`/`HIGH_CONTRAST` (az gören), ek süre ve `READER` (görevli okuyucu isteniyorsa) yazılır.
**Aday tarafında:**
1. Kod kâğıdını okuyamaz: görevli salon sayfasında **"Kodu sesli oku"** düğmesiyle kodu dinletir veya kodu kendisi girer (yerel Türkçe ses yoksa düğme bunu söyler). Giriş alanı sayfa açılınca odaktadır.
2. Kod girilince sınav başlar; sistem kısa bir yönerge okur ("Alt Shift R yeniden okur, S durdurur, N sonraki soru, T kalan süre") ve ilk soruyu **kendiliğinden** okur. Her soruya geçişte o sorunun metni okunur: soru, ek yönerge, görsel için öğretmenin doğruladığı betimleme, seçenekler (veya eşleştirme listeleri) ve yazılı yanıt sorusunda "Bu bir yazılı yanıt sorusudur".
3. Cevap vermek: Alt+Shift+1…9 ile seçenek, eşleştirmede satır satır liste, yazılı yanıtta yazı alanı. Alt+Shift+F soruyu işaretler, Alt+Shift+D durumu, Alt+Shift+T süreyi, Alt+Shift+M molayı söyler/başlatır. Okuma hızı ayarlanabilir (0,65–1,5). "Soruları otomatik oku" kutusu kapatılabilir (kendi NVDA/JAWS'ını kullanan aday için çift okumayı önler).
4. Bütün sınav yalnızca klavyeyle yapılabilir; yanıtlar her 10 saniyede kaydedilir.
**Sınırlar (bilinen):** Grafik, şekil ve tablo seslendirilemez; öğretmenin yazdığı betimleme ve metin karşılığı okunur (yoksa sınav erişilebilir sürüm olarak yayımlanamaz). Matematik okuması temel işlemler, kesir ve yüzde için denenmiştir; karmaşık ifadeler öğretmen tarafından sözcüklerle yazılmalıdır. Sinir ağı sesi robotik/yapay olabilir, insan okuyucunun yerini tutmaz. **Bütün bunlar otomatik testlerle doğrulandı; gerçek bir görme engelli öğrenci ve NVDA/JAWS ile deneme yapılmadı.**
**Salon hazırlığı:** Yerel Türkçe sesi olmayan bilgisayarlarda sinir ağı sesi gerekir. Sınavdan önce o bilgisayarlarda `/dou-reader-demo` sayfasında bir kez "Soruyu oku" deyin: model tarayıcı önbelleğine iner, sınav anında beklenmez.
