# Salon sınavı kurulum ve uygulama kılavuzu (50 bilgisayar, farklı dersler ve uyarlamalar)

Amaç: Bir bilgisayar salonunda, engel durumları ve dersleri farklı birden çok öğrencinin, her biri **kendi sınavı, süresi, soruları ve onaylı erişilebilirlik ayarlarıyla** sınava girmesi.
**Kapsam sınırı:** Bu bir yerel pilottur; gözetimli/güvenli sınav (sekme kilidi, kamera) değildir. Gerçek NVDA/JAWS ve engelli öğrenci testi yapılmadan "erişilebilir" denmemelidir. Aşağıdaki ölçümler otomatik testlerdir.

## 1. Sunucu bilgisayarı (bir kez)
- Windows, Node.js 22.13+. Salondaki bilgisayarlara **yalnızca tarayıcı** yeterlidir; kurulum gerekmez.
- Salon ağında erişilebilir olması için sunucu `127.0.0.1` yerine salon ağı adresinde çalışmalıdır. **Mevcut sürüm yalnızca `127.0.0.1` ve `localhost` ana bilgisayar adlarını kabul eder** (bilinçli güvenlik kısıtı). Bu yüzden iki güvenli seçenek vardır:
  1. Sınavı sunucu bilgisayarın kendisinde ve ek tarayıcı pencereleriyle yürütmek (küçük gruplar).
  2. Salon için kurumun BT birimiyle HTTPS destekli bir ters vekil (reverse proxy) kurmak; istek `Host` başlığını `127.0.0.1:<port>` olarak ilettirmek. **Bu adım kurumun BT/güvenlik kararıdır ve bu yazılımda yapılmamıştır.**
- Önerilen ortam değişkenleri (salon için):
  - `BEP_PILOT_MAX_OPEN_SESSIONS=100` (en çok 2000)
  - `BEP_PILOT_REDEEM_GLOBAL_LIMIT=200` (varsayılan 12; yanlış yazılan kodlar tüm salonu kilitlemesin)
  - `BEP_PILOT_CODE_VALID_MINUTES=120` (kodların kullanılabileceği süre; varsayılan 45, en çok 480)
  - `BEP_TERMINOLOGY=university` (üniversite terimleri)

## 2. Sınavları hazırlayın (öğretim elemanı)
1. Soruları Word/PDF/TXT veya **Excel şablonu** (`ORNEK-SORU-SABLONU.xlsx`) ile `/sinav-dosya-aktar` sayfasından yükleyin; her soruyu kaynakla karşılaştırıp onaylayın, eksik görsel betimlemeleri girin.
2. Kurum onayını verin. Her ders ayrı sınavdır (kendi süresi ve soruları).

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
1. Her öğrenci kendi koltuğundaki bilgisayarda tarayıcıyı açıp sunucu adresindeki `/pilot` sayfasına gider, **kendi kodunu** yazar. Süre bu anda başlar. Sayfa kendi ders, süre ve erişilebilirlik ayarlarıyla açılır.
2. Yanıtlar her 10 saniyede sunucuya otomatik kaydedilir. Tarayıcı çökerse veya sayfa yenilenirse aynı kodla **en çok 5 kez** devam edilir; süre durmaz, mola açıksa biter. Devam sayısı canlı tabloda görünür.
3. Süre bitince yanıtlar otomatik teslim edilir. Yazılı yanıt 4000 karakter/soru.
4. Görevli `/salon-oturumu` canlı tablosunda herkesin durumunu (girmedi/sınavda/teslim, kalan süre, molada, devam sayısı, son kayıt, görevli notları) görür; tablo her 10 saniyede yenilenir.
5. Teslimden sonra öğretim elemanı `/pilot-yonetim` sayfasında yanıtları inceler (nesnel sorular için puan **önerisi** vardır; yazılı yanıtlar elle puanlanır).

## 5. Ölçümler (otomatik, bu geliştirme ortamında)
- `salon-50.e2e.test.mjs`: 50 aday, 4 farklı ders, süre 20/30/45/60 dk, 5 farklı uyarlama profili, eşzamanlı giriş, 40 taslak kaydı, 10 çökme sonrası devam, devam sınırı, mola, teslim ve canlı izleme; gerçek tarayıcıda üç farklı profil ve çökme sonrası yazılı yanıtın geri gelmesi.
- 20 gerçek tarayıcı penceresi aynı anda giriş+yanıt+teslim: 0 hata, ~1,4 sn.
- `npm run pilot:load -- 1000 100`: 1000 öğrenci, 0 hata. **Kapasite garantisi değildir**; kendi donanımınızda ve ağınızda ölçün.

## 6. Yapılmayanlar / dikkat
- Gözetim, kopya önleme, ekran kilidi, kamera: yok (kurum kararı).
- HTTPS, ağ erişimi ve çok sunuculu ölçek: kurum BT işi (Bölüm 1).
- Sistem dışı kimlik eşleştirmesi (aday kodu ↔ kişi) görevlinin sorumluluğundadır.
- Görevli gerektiren düzenlemeler (okuyucu, yazıcı, işaret dili) insan tarafından sağlanır.
- Gerçek NVDA/JAWS ve engelli öğrenci kullanım testi **yapılmadı**; salonda canlı sınavdan önce `UZMAN-TEST-SENARYOLARI-NVDA.md` ile deneme yapılmalıdır.
