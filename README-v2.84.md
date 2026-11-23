# DOU BEP v2.84 — Sunucu denetimli ek süre, tek giriş, ortak tasarım, axe denetimi

- **Ek süre:** `POST /api/pilot` artık `extraMinutes` (0–120) kabul eder; `pilot_sessions.extra_minutes` sütunu eklenir (idempotent, veri kaybı yok). Süre kod girilince başlar; `expires_at = başlangıç + (süre + ek süre) + 2 dk`; süre sonrası teslim 401 döner. Öğrenci sayfası sunucunun verdiği `remainingSeconds` ile sayar ve süre bitince yanıtları otomatik teslim eder (kilitlenmeden önce toplanır). Öğretmen arayüzü: Pilot yönetimi → "Kurum onaylı ek süre".
- **Tek giriş:** oturumsuz yönetim paneli istekleri 302 ile `/kurum?next=…` adresine yönlenir; giriş öncesi menü gizlidir. `next` yalnızca kısa panel yollarını kabul eder.
- **Ortak tasarım:** `dou-theme.css` (tüm sayfalar).
- **Erişilebilirlik:** `npm run a11y:axe` (isteğe bağlı `axe-core`+`playwright`); 17 ekran 0 ihlal. Düzeltilenler: açık gri yardımcı metinler, 24 px hedef boyutu, `role="img"` ilerleme çubuğu.
- **Belgeler:** `RAKIP-ANALIZI-v2.84.md`, `ERISILEBILIRLIK-UYUM-RAPORU-TASLAK.md`, `UZMAN-TEST-SENARYOLARI-NVDA.md`, `TEST-SONUC-FORMU.csv`.
- **Testler:** `npm test` 784/784; `release-check` temiz; `exam:closure` PASS.

## Sınırlar
Gerçek NVDA/JAWS ve engelli öğrenci testi, DOU Speech dinleme değerlendirmesi, mola özelliği, KVKK/sızma testi/SSO/HTTPS yapılmadı. Otomatik axe taraması sertifika değildir.

## v2.85 ek: Mola
`pilot_sessions` yeni sütunlar: `break_minutes`, `break_used_ms`, `break_started_at`, `break_count` (idempotent). `POST /api/pilot` → `breakMinutes` (0–60). `POST /api/pilot/break/start` ve `/break/end` (Bearer belirteç). Pilot yönetimi arayüzünde "Kurum onaylı mola hakkı". Testler: `pilot-time.e2e.test.mjs` (786/786).

## v2.86 ek: Öğrenci ekranı düzeni
`/pilot`: soru haritası (sağda sabit, geniş ekranda), ilerleme çubuğu, zaman halkası, "Soruyu işaretle" (Alt+Shift+F), ayrı gözden geçirme ekranı (soru–durum–işaret tablosu, "Soruya git", teslim), DOU Reader paneli sayfa sonuna taşındı (soru ilk ekranda). Karşılaştırma ve ölçüm: `TASARIM-DEGERLENDIRME-v2.86.md`. Testler: 789/789.

## v2.87: DOU Speech · sinir ağı sesi (çevrimdışı)
- Model: **Okur v1.0** (kod Apache-2.0, ağırlıklar **CC BY 4.0, atıf gerekli**; eğitim verisi CC0/MIT/CC BY). Piper dfki (CC BY-NC-SA) ve Meta MMS (CC BY-NC) ticari olmadığı için seçilmedi. Lisans ve atıf: `okur/LICENSE-NOTICE.txt`; bütünlük: `okur/SHA256SUMS`.
- Dosyalar `okur/` altında (~38 MB): 3 ONNX modeli, metin ön işleyici (WebAssembly), ONNX Runtime Web 1.30.0 (MIT), uyarlanmış çalıştırıcı. Tarayıcı yalnızca bu sunucudan yükler; metin cihazdan çıkmaz.
- DOU Reader'da ses listesine **"DOU Speech · sinir ağı (çevrimdışı, deneysel)"** eklendi. Windows'ta Türkçe ses yoksa otomatik bu seçilir. İlk okumada model yüklenir (birkaç saniye).
- Matematik okuması: model sayıları, `+`, `=`, `%` işaretlerini okur; `-`, `x`, `/`, `²` için sayılar arasında "eksi, çarpı, bölü, kare" ön işleyicisi eklendi.
- CSP: `'wasm-unsafe-eval'` yalnızca `/pilot`, `/dou-reader-demo` ve çalıştırıcı dosyasında; başka sayfalarda yok.
- Testler: `dou-speech-neural.test.mjs`, `dou-speech-neural.e2e.test.mjs` (gerçek model ve gerçek Chromium). 799/799.
- Sınırlar: tek ses; model kartına göre stüdyo kayıtlı modellerden daha az doğal; yabancı sözcükler/kısaltmalar Türkçe harf sesleriyle okunur. **Sesin doğal ve anlaşılır olduğu insan dinlemesiyle doğrulanmadı.** Tek iş parçacığı çalışır (cross-origin isolation kapalı).

## v2.89: Excel ile soru yükleme
- `/sinav-dosya-aktar` artık `.xlsx` kabul eder. Şablon: `ORNEK-SORU-SABLONU.xlsx` (sütunlar: `soru_no, soru, secenek_a…e, dogru_cevap, puan, gorsel_betimleme, kazanim`). Doğru cevap harfle verilir (A–E) ve seçenek metnine çevrilir; puan, görsel betimlemesi ve kazanım taslağa taşınır.
- Güvenlik/kalite kuralları aynıdır: tek sayfa, formül/makro/dış bağlantı yok, en çok 60 soru ve 512 KB, kişisel veri taraması, yalnız şablon başlıkları (ad/numara/tanı sütunu eklenemez). Taslak **onaysız** oluşur; öğretmen her soruyu kaynakla karşılaştırıp onaylamadan kurumsal onaya geçemez (kalite kapısı, 422).
- Modül: `question-sheet-import.mjs`; `xlsx-import.mjs` sütun/uzunluk sınırları parametrik yapıldı (mevcut dönemli liste içe aktarması aynı kalır). Testler: `question-sheet-import.test.mjs`, `question-sheet-import.http.test.mjs` (808/808).
- Sınır: Word içindeki tablo/denklem/görsel hâlâ otomatik çevrilmez; Excel'de görsel için yalnız metin betimlemesi girilir.

## v2.90: Word tablo/denklem/görsel önerileri ve düzenleme rehberi
- **Word içe aktarma önerileri** (`docx-rich-suggest.mjs`): DOCX'teki tablo, denklem ve görsel için öğretmenin manuel dökümüne yardımcı **öneri metni** çıkarılır. Tablo "Tablo, 2 satır 2 sütun. Satır 1: …", denklem Türkçe doğrusal okunuş (kesir "bölü", üs "kare/üssü", kök "karekök"), görsel yalnızca Word'deki alternatif metin (yoksa öneri uydurulmaz). Arayüzde her öğenin altında "öneri, doğrulanmadı" notu ve "önerisini metin kutusuna ekle" düğmesi vardır.
  **Kapı korunur:** dosya yine otomatik taslağa dönüşmez (engelli); manuel yolda her öğe öğretmence kaynakla karşılaştırılıp işaretlenmeli, taslak onaysız kalır, eşdeğerlik onayı verilmez.
- **Düzenleme rehberi** (`adjustment-guide.mjs`, Uyarlama kararları sayfası): erişim alanı seçilince kurumların yaygın değerlendirdiği düzenlemeler listelenir; "otomatik" olanlar (büyük punto, yüksek kontrast, tek soru, geniş alan, sesli/erişilebilir sınav) işaretlenebilir, görevli gerektirenler (okuyucu, yazıcı, işaret dili vb.) yalnızca bilgi olarak gösterilir. Rehber tanı koymaz, seçilen alan kaydedilmez ve öğrenciyle ilişkilendirilmez; karar yine onay gerektirir.
- Testler: `docx-rich-suggest.test.mjs`, `adjustment-guide.test.mjs`, `adjustment-guide.e2e.test.mjs` (818/818).

## v2.91: Üniversite sınavı için eksiklerin kapatılması
- **Yazılı (kısa/açık uçlu) yanıt** `/pilot` öğrenci ekranında: çok satırlı alan, karakter sayacı (yanıt başına 4000, toplam 60.000), soru haritası/ilerleme ile bütünleşik; süre bitiminde kilitlenmeden önce toplanıp otomatik teslim edilir. Sunucu: metin, sınır ve denetim karakteri doğrulanır. Öğretmen incelemesinde yanıt çok satırlı görünür; olası kişisel veri (e-posta, TC no vb.) için **uyarı bayrağı** çıkar (kayıt reddedilmez: süre sonu teslimi kaybolmasın). Yazılı yanıt otomatik puanlanmaz.
- **Puan önerisi (yalnız öğretmen görür, kaydedilmez):** çoktan seçmeli, doğru/yanlış ve eşleştirmede cevap anahtarına göre önerilen puan; kesin puanı öğretmen girer.
- **Limitler yapılandırılabilir:** `BEP_PILOT_MAX_QUESTIONS` (varsayılan 60, en çok 100), `BEP_PILOT_MAX_OPEN_SESSIONS` (varsayılan 100, en çok 2000). Eski sınırlar 30/30 idi.
- **Yük ölçümü:** `npm run pilot:load -- 1000 100` (1000 öğrenci, 100 eşzamanlı; tek makine, geçici SQLite). Bu ortamda 0 hata, teslim süresi p95 yaklaşık 60 ms, kodu kullanma p95 yaklaşık 430 ms. **Kapasite garantisi değildir**; gerçek donanımda ve ağda kurumunuz ayrıca ölçmelidir.
- **Terim profili:** `BEP_TERMINOLOGY=university` ile yönetim sayfalarında "BEP kazanımı → ders öğrenme çıktısı", "2. Sınıf → Lisans / Önlisans", "Öğretmen onayı → Öğretim elemanı onayı" gibi elle yazılmış kalıplar gösterilir (varsayılan `school` değişmez). Yalnız görünüm: veri ve API aynı kalır. Belirsiz ek almış biçimler ("kazanımını" gibi) tahmin edilmez.
- Testler: `pilot-written-answers.e2e.test.mjs`, `terminology.test.mjs` (826/826).
- **Yapılmayanlar (kod işi değil ya da güvenlik kararı):** gözetimli/güvenli sınav (sekme kilidi, kamera), HTTPS/SSO ve çok sunuculu ölçek, sayfa yenilenince oturum kurtarma, gerçek NVDA/JAWS testi.

## v2.92: Salon sınavı (aday başına farklı sınav, süre ve engel durumuna göre uyarlama)
- **Salon planı** (`/salon-oturumu`): tek tablo ile en çok 100 aday; her satır aday kodu, koltuk, sınav, uyarlama kodları, ek süre ve mola. Toplu üretim **atomiktir** (hatalı satırda hiç kod üretilmez). Yazdırılabilir giriş kâğıtları (ad yok) ve CSV. Canlı izleme tablosu (durum, kalan süre, mola, devam sayısı, son kayıt, görevli notları).
- **Aday başına profil:** giriş kodu o adayın sınavını, süresini ve uyarlamasını getirir; ekran otomatik ayarlanır (çok büyük yazı, yüksek kontrast, basit ekran, büyük tıklama alanları, tek soru). Görevli gerektiren düzenlemeler yalnızca hatırlatılır.
- **Otomatik kayıt ve devam:** yanıtlar 10 sn'de sunucuya kaydedilir; aynı kodla en çok 5 kez devam edilebilir (eski belirteç geçersiz olur; süre durmaz; devam sayısı görevliye görünür). Teslimde taslak silinir.
- Yeni ortam değişkenleri: `BEP_PILOT_REDEEM_GLOBAL_LIMIT`, `BEP_PILOT_REDEEM_LOCK_MINUTES`, `BEP_PILOT_CODE_VALID_MINUTES`. Yeni uyarlama kodları: `LARGE_TARGETS`, `SIMPLE_SCREEN`.
- Kılavuz: `SALON-KURULUM-KILAVUZU.md`. Testler: `salon-50.e2e.test.mjs` (832/832).

## v2.93: Salon (LAN) modu
`BEP_LAN_MODE=1` (veya `BASLAT-SALON.bat`) ile sunucu salon ağında dinler; **diğer bilgisayarlardan yalnızca öğrenci sınav ekranı ve beş öğrenci API'si** erişilebilir, yönetim/giriş/diğer API'ler yalnızca sunucu bilgisayarından (loopback). Ana bilgisayar adı/`Origin` listesi (sunucunun IP'leri + `BEP_LAN_HOSTS`) dışındakiler reddedilir (DNS rebinding koruması). Salon planı sayfası öğrenci adresini giriş kâğıtlarına yazar. Varsayılan (kapalı) davranış değişmez. Testler: `server-foundation/network-policy.test.mjs`, `lan-mode.e2e.test.mjs` (gerçek ağ adresi üzerinden tarayıcı dahil).

## v2.94: Görme engelli aday akışı
`AUTO_READ` uyarlama kodu: sınav açılınca kısa yönerge + ilk soru, her soru geçişinde o sorunun metni kendiliğinden okunur (yerel Türkçe ses, yoksa çevrimdışı sinir ağı sesi; model oturum açılırken önceden yüklenir). Okunan metin düzeltildi ("..", yazılı yanıt ve eşleştirme yönergeleri). Salon sayfasında "Kodu sesli oku" (yalnız yerel Türkçe ses). Giriş alanı otomatik odaklı. Testler: `pilot-auto-read.e2e.test.mjs`, `salon-50.e2e.test.mjs` (844).

## v2.95: Hazırlık kontrolü, matematik okuması, sonuç tablosu
- **`/hazirlik`** (öğrenci yüzeyinde, oturumsuz): sunucu bağlantısı/gecikme (`GET /api/ping`), tarayıcı özellikleri, yerel Türkçe ses, çevrimdışı model önbelleğe alma, ses denemesi, Alt+Shift+T kısayol algılama, ekran boyutu; genel "hazır/eksik" özeti.
- **Matematik okuması:** kesirler (½ ¾), derece (°, °C), orta nokta, alt/üst simge, `x^n`, `<` `>` ve sayılar arası eksi, hem işletim sistemi sesi hem sinir ağı sesi için ortak ve temkinli kurallarla okunur; belirsiz örüntüler (tarih, `Ali-Veli`, `<b>`) değişmez.
- **Salon sonuç tablosu:** `GET /api/pilot/results.csv` (öğretmen) ve salon sayfasında indirme düğmesi: aday başına durum, süre, devam/mola, nesnel puan önerisi, yazılı yanıt sayısı, öğretmen puanı.
- Testler: `hazirlik.e2e.test.mjs`, genişletilmiş `salon-50.e2e.test.mjs`, ses metni testleri (848).

## v2.96: Veri saklama süresi
Teslim edilen yanıtlar ve öğretmen puanları sınav bitiminden **24 saat sonra** otomatik siliniyordu (sabit). Artık `BEP_PILOT_RETENTION_HOURS` (1–2160, varsayılan 24; `BASLAT-SALON.bat` 168) ile ayarlanır ve salon sayfasında görünür. Süre dolunca veri geri getirilemez; sonuç tablosunu önceden indirin. Saklama süresi KVKK/kurum kararıdır.

## v2.97: Tüm uygulama taraması ve iki gerçek tarayıcı hatası
21 sayfa ve 13 menü bağlantısı gerçek tarayıcıda açıldı (konsol/sayfa hatası, 4xx/5xx yok); yönetim sayfalarında 204 düğme tıklaması yapıldı. Bulunan ve düzeltilen hatalar (ikisi de birim testlerinin göremediği, yalnız tarayıcıda çıkan hatalar):
1. **Sınav editörü otomatik kaydı hiç çalışmıyordu:** `autosave-manager.mjs` varsayılan saati `{set:setTimeout}` olarak tutuyordu; nesne üzerinden çağrılınca tarayıcıda "Illegal invocation" oluyordu. Düzeltildi; `editor-autosave.e2e.test.mjs` taslağın sunucuda oluştuğunu doğrular.
2. **Sunucu CSP'si `blob:` ses dosyalarını engelliyordu** (DOU Reader laboratuvarı, fonem deneyleri, ses inceleme): `media-src 'self' blob:` eklendi, dış medya yine engelli. `csp-media.e2e.test.mjs` dört sayfada doğrular.
Testler: 852/852.

## v2.98 — DOU Reader laboratuvarı: sinir ağı sesi
`/dou-reader-demo` altındaki "serbest metin" laboratuvarına **Ses motoru** seçimi eklendi. Varsayılan artık sinir ağı sesi (Okur v1.0, CC BY 4.0; tarayıcı destekliyorsa). Eski kural tabanlı ses "robotik, deneysel" etiketiyle seçenek olarak durur; sinir ağı seçiliyken fonem/perde/ritim ayarları devre dışıdır. Gerçek tarayıcı testi iki motoru da doğrular. Sesin doğallığına insan kulağı karar verir.

## v2.99 — Sunum hazırlığı
`DEMO-HAZIRLA.bat` / `tools/demo-hazirla.mjs`: sentetik kurum, 4 ders sınavı (çoktan seçmeli, doğru/yanlış, eşleştirme ve klasik yazılı sorular karışık) ve 8 engel profilli aday kodu. Düzeltmeler: yüksek kontrastta şık okunurluğu, oturumlar arası ayar taşıması, giriş kâğıtlarının yazdırılması, yönetim üst çubuğu hizası, kod kopyalama, hazırlık sayfası çift numaralandırma, bildirim kutusu iç boşluğu. Pilot soru tipleri: çoktan seçmeli, doğru/yanlış, eşleştirme, yazılı (klasik, 4000 karakter). Boşluk doldurma ayrı tip değildir; yazılı soru olarak hazırlanır.

## v2.100 — Sınav kaydı (evrak) ve çıktı
`/sinav-kaydi` (kurum girişi gerekir): teslim edilen her sınav için soru metni, şıklar, öğrencinin yanıtı, doğru yanıt, önerilen/öğretmen puanı, süre-mola-devam bilgisi, uyarlamalar, imza alanları ve SHA-256 kayıt özetiyle yazdırılabilir kayıt üretir (Yazdır → PDF). `?id=` tek oturum, parametresiz hepsi. Bağlantılar: pilot yönetimi (oturum ve toplu), salon sayfası. API: `GET /api/pilot/{id}/record`. Veri saklama süresi dolmadan çıktı alınmalıdır.

## v2.101 — Canlı salon izleme
`/salon-oturumu` → "Salon durumu": özet kartları (henüz girmedi, sınavda, molada, az süre <5 dk, hareketsiz >5 dk, teslim), aday başına "ne yapıyor" (yanıtlıyor, düşünüyor, molada, hareketsiz, teslim etti), kalan süre ve süre çubuğu, cevaplanan/toplam soru, son hareket (son otomatik kayıt), Türkçe uyarlama adları. "Yalnız dikkat gerekenler" süzgeci. Her 10 sn yenilenir. Not: "son hareket" yanıt değişikliğine dayanır; ekran/kamera izleme yoktur.

## v2.102 — Okuma eşzamanı (vurgu) ve soru kartı uyumu
Okuyucu artık okunan bölümü ekranda vurgular: soru numarası, soru metni, yönerge, görsel betimleme, her şık ve eşleştirme satırı sırayla işaretlenir; okuma bitince ya da durdurulunca vurgu kalkar. Yerel (Windows) seslerde sözcük sınırı olaylarıyla, sinir ağı sesinde ses saatiyle eşlenir; sınır olayı üretmeyen seslerde karakter payına göre tahmin edilir (yaklaşık). "Okunan bölümü vurgula" kutusuyla kapatılabilir. Soru kartında rozet ile "Soruyu sesli oku" aynı satırda, şık yazı boyutu soru metniyle uyumlu. Test portları sabit yerine boş porttan alınır.

## v2.103 — Sesli yanıt (görme engelli adaylar için, kayıt öğretmene dinletilir)
`VOICE_ANSWER` uyarlama kodu verilen adaylar yazılı yanıt sorularında mikrofonla yanıt verebilir (Kaydı başlat/durdur/dinle/sil, Alt+Shift+K, sesli ve ekranda duyurular, açık rıza kutusu, en çok 3 dk/3 MB). Ses metne ÇEVRİLMEZ ve puanlanmaz; sunucuda SQLite'ta saklanır, yalnız yetkili öğretmen/kurum dinler (inceleme ekranı), oturumla birlikte (saklama süresi sonunda veya kayıt silinince) silinir. Sınav kaydı PDF'ine ses eklenmez, "sesli yanıt var" notu düşer. **Kurum anahtarı:** sunucu `BEP_VOICE_ANSWERS=1` ile başlamadıkça kod üretilemez ve ses kabul edilmez (`BASLAT-SALON.bat` varsayılan olarak 1 yapar; KVKK onayınız yoksa kapatın). **Sınırlar:** mikrofon yalnız güvenli bağlamda (https veya localhost) çalışır; salon LAN'ında düz HTTP ile öğrenci bilgisayarında mikrofon kullanılamaz (sayfa bunu söyler; HTTPS ya da yazılı/yazıcı desteği gerekir). Ses kaydı kişisel/biyometrik veri sayılabilir: aydınlatma, saklama süresi ve erişim kurum kararıdır. Gerçek mikrofonla/NVDA ile insan testi yapılmadı (otomatik test sahte mikrofonla).

## v2.104 — Canlı müdahale ve şık karıştırma (rakip boşlukları)
**Canlı müdahale** (`/salon-oturumu` → Salon durumu): adaya sınav sırasında **+5/+10 dk ek süre** (tek tek veya "Sınavdakilere ek süre ver"; aday başına en çok 120 dk), **adaya mesaj** ve **tüm adaylara duyuru** (300 karakter). Aday ekranı her 6 sn'de sunucudan durum çeker; süre uzayınca "Gözetmen sürenizi uzattı", mesajda "Gözetmen mesajı" (role=alert, ekran okuyucuya duyurulur, "Okudum" düğmesi) çıkar. Verilen ek süre sınav kaydında ayrıca yazılır. API: `POST /api/pilot/{id}/extend`, `POST /api/pilot/message`, `GET /api/pilot/state`.
**Şık karıştırma:** editörde "Şıkları her aday için karıştır" seçeneği. Sıra adaya özeldir, tekrarlanabilir (devamda aynı), puanlama etiket metniyle yapıldığı için doğru kalır; "Hepsi/A ve B" gibi şıklar doğrulamada hata verir. Soru sırası karıştırılmaz (inceleme eşlemesi için). **Bu turda rakip sayfaları okunamadı** (ağ izin listesi); karşılaştırma önceki inceleme ve genel bilgiye dayanır.

## v2.105 — Soru dili (İngilizce) ve ses tercihi (kadın/erkek)
Editörde her soru için **Soru dili** (Türkçe/İngilizce). İngilizce soru; ekranda `lang="en"` olarak işaretlenir (ekran okuyucu doğru telaffuz eder), okuyucu **İngilizce etiketlerle** ("Question 1", "Option A") ve cihazdaki **yerel İngilizce sesle** okur, Türkçe matematik okunuşu uygulanmaz. Okuyucu panelinde **Ses tercihi** (Fark etmez / Kadın / Erkek) ve İngilizce ses seçimi var. Tarayıcılar ses cinsiyetini bildirmez: tercih, bilinen ses adlarına (Emel, Zira, Tolga, David…) dayalı **en iyi tahmindir**; ad listesinden elle seçilebilir. Sinir ağı sesi (Okur) yalnız Türkçe ve tek sestir; İngilizce soru için cihazda yerel İngilizce ses yoksa okuma başlamaz ve bu söylenir. Windows'ta İngilizce/Türkçe kadın sesleri (Zira, Emel) için ilgili dil sesleri kurulu olmalıdır. Demo: PC-07 İngilizce sınavı (ENG101) alır.
