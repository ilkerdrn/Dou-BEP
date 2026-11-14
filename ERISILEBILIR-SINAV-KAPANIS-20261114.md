# DOU BEP — Erişilebilir sınav bitirme/kabul haritası

Tarih: 14 Kasım 2026. Bu belge bir **üretim onayı** değil, BEP V4 öğrenci pilotunun kapatılması için doğrulanabilir gereksinim listesidir.

## Ürünün gerçek amacı

Görme, işitme, konuşma, motor ve diğer erişim gereksinimleri olan öğrenciler, **öğretmen tarafından uygun hale getirilmiş aynı sınav içeriğine** erişebilmeli; bağımsız olarak soruları okuyup/dinleyip yanıtlayabilmeli, cevaplarını doğrulayabilmeli ve güvenli şekilde teslim edebilmelidir. Tercihler öğrenciye tanı sorulmaksızın verilmelidir. Öğrenciye uygun sunum, puanlama/cevap anahtarı veya öğretmen onayını değiştirmemelidir.

## Bu dalda mevcut

- Anonim pilotta tek kullanımlık kod, tek oturum, sunucu kontrollü süre, taslak kayıt, cevap kontrolü, teslim; gerçek öğrenci hesabı yok.
- Çoktan seçmeli, doğru/yanlış, eşleştirme; pilot sınırı 30 soru.
- Görsel betimleme ve yazılı yönerge alanları (kaynağın uygun hazırlanmasına bağlı).
- Yerel Türkçe ses sunuluyorsa uygulama içi soru seslendirme; klavye navigasyonu, soru haritası, tek soru odağı, metin boyutu/kontrast.
- Yeni: oturum içinde standart, sesli/klavye, yazılı, düşük görme ve motor erişim sunum tercihleri. Seçim sınav kodu harcanmadan önce yapılabilir ve **sunucuya gönderilmez**.
- Yeni: tarayıcının ses listesi değiştiğinde soru bazındaki seslendirme izni yeniden kontrol edilir.
- Yeni: kodun oluşturulmasından itibaren sayılan 45 dakika hakkında daha doğru hazırlık bilgilendirmesi.

## Üretimden önce zorunlu kapanış kapıları

| Gereksinim | Kabul kanıtı | Durum |
|---|---|---|
| Görme: sorunun tamamı, seçenekler, eşleştirme ve yönerge okunabilir | NVDA + klavye ile tüm soru türleri, odak ve dinleme testi | **BEKLIYOR** |
| Doğal Türkçe ses: Pocket TTS sınav okuyucusuna güvenli bağlanır | Yerel izinli arayüz, yalnız onaylı soru, ağ izolasyonu, iptal, lisans, veri sızıntısı testi | **BAĞLANMADI** |
| İşitme: sesli yönergelerin yazılı karşılığı ve tüm uyarıların görsel eşdeğeri | Sessiz cihaz ve ekran okuyucu olmadan tam sınav akışı | **SAHA TESTİ BEKLİYOR** |
| Görsel soruların nitelikli betimlemeleri | Öğretmen ön kontrolü, bağımsız onay, kör kullanıcı ile anlam eşitliği | **İÇERİĞE BAĞLI** |
| Konuşma/motor: mikrofonsuz ve fare kullanmadan yanıt | Yalnız klavye + anahtar/switch input testi, büyük hedef kabulü | **SAHA TESTİ BEKLİYOR** |
| Ek süre ve sınav uyarlamaları | Öğretmen/kurum yetkisi, onay, sunucu oturum süresine tutarlı uygulama | **PİLOT 45 DK SINIRI VAR** |
| Kimlik ve kurum güvenliği | Tenant/yetki ayrımı, tek kullanım kod, oturum geri alma, cevap anahtarı gizliliği, audit | **UÇTAN UCA DOĞRULAMA GEREKİR** |
| Yenileme, ağ kesintisi, sürenin dolması | 30 soruluk uçtan uca ve erişilebilir hata kurtarma testi | **YEREL TEST GEREKİR** |
| Kapsamlı erişilebilirlik | WCAG 2.2 AA manuel klavye/ekran okuyucu/kontrast/yeniden boyutlandırma kabulü | **ONAYLANMADI** |

### Kritik ürün ayrımları

- **Görme engeli:** Bir cihazda TTS olması yeterli değildir; sorunun tüm anlamı ve cevap seçenekleri ekrana bağımlı olmadan erişilebilir olmalı. Görsel betimlemesi olmayan görsel/soru üretim sınavında yayınlanmamalıdır.
- **İşitme engeli:** TTS çözüm değildir; sesli tüm içerik, talimat ve durumların doğru yazılı karşılığı gerekir.
- **Konuşma engeli:** Yanıt göndermek için mikrofon/konuşma zorunlu olamaz.
- **Motor erişim:** Doğru etiketli kontrol, büyük hedef, görünür odak, tek elle ve Tab/Enter ile akış gerekir.
- **Ek süre:** Deneme modundaki 45 dakika her öğrencinin resmî sınavına doğrudan uygulanamaz; yetkili uyarlama planıyla sunucuda tutarlı yönetilmelidir.

## Önerilen kapanış sırası

1. Erişilebilir sınav içeriği için *sunucu tarafı* yayımlama ön kontrolü: görsel betimleme ve yazılı/alternatif yönergeleri eksik soru varsa yayımlama engeli.
2. Engelden bağımsız uçtan uca öğrenci kabul senaryoları (görme/işitme/motor); 30 soruluk çoktan seçmeli, doğru-yanlış ve eşleştirme sınavı.
3. Pocket TTS doğal sesin, yalnız izinli soru metnini alabilen **ayrı ve kimliği doğrulanan yerel** köprüyle entegrasyonu; sürüm/lisans/çevrimdışı kontrolü. Bu onay gelene kadar tarayıcıdaki kurulu yerel ses okuyucu kullanılabilir, fakat doğal ses sisteme bağlandı denilmez.
4. Sunucu kontrollü süre uyarlamaları, öğrenci oturumu kurtarma, ekran okuyucuyla sınav teslimi.
5. Gerçek öğrenciler yerine anonim sentetik pilot; daha sonra kurum ve gerekli erişilebilirlik uzmanları onayı.

## Kodu koruma ve kontrol

Bu dal: `feature/bep-v4-unified-institutional-design-20261108`.
DOU Speech bağımsız Ar-Ge dalı: `feature/dou-reader-speech-independent-safety-20261109`. İki dal rastgele birleştirilmez.

Kontroller:
```powershell
node --test student-access-profiles.test.mjs pilot-student-ux.test.mjs dou-reader-panel.test.mjs pilot-teacher-flow.test.mjs
```

Mevcut yerel klasör kirliyse dosyaların üzerine yazmayın. Temiz `git worktree` ile ayrı bir test kopyası açın. Testlerin geçmesi **otomatik üretim onayı** değildir; Windows/NVDA gerçek kullanıcı kabulü gerekir.

## 14 Kasım — Windows Edge doğrulama durumu

Kullanıcının gerçek Windows 11 / Node 24 / Edge denemesindeki standart tarayıcı kabul çıktısı: **226 otomatik Edge kontrolü PASS**. Klavye kaynak testleri: **5/5 PASS**. Bu sonuç gerçek NVDA ve doğal Türkçe ses dinleme kabulü değildir.

Öğrenci için ayrıca **opt-in** sentetik Edge kabulü tanımlandı:
```powershell
npm run ui:browser:student
```
Bu komut mevcut `ui:browser` kontrollerini de çalıştırır, sonra **geçici SQLite veritabanında** bağımsız onaylı sentetik sınav oluşturur. Tek kullanımlık kod ile öğrenci ekranını açar; yazılı/görsel/motor sunumunu, klavyede Space/Enter ile yanıtı, tekrar bak işaretini, teslim özetini, tek onayı, anonim teslim makbuzunu ve sunucu teslim durumunu doğrular. Tanı, gerçek sınav/öğrenci verisi, Pocket TTS ses modeli veya kişisel ses kaydı kullanılmaz. Öğrenci tarayıcı kabulünün Windows sonucu henüz **BEKLENİYOR**.

Korumalar: `npm run ui:browser` komutu değişmedi; öğrenci aşaması yalnız `--student` ile çalışır. Yeni kaynak sözleşmesi `node --test tools/v4-student-browser-acceptance.test.mjs` ile kontrol edilebilir. Bu kontrol manuel NVDA/işitme/motor cihaz kabulünün yerini tutmaz.

## Öğrenci Edge kabulü — 14 Kasım 2026

Windows üzerinden alınan ikinci gerçek Edge sonucunda `npm run ui:browser:student` **241/241 kontrolle PASS** verdi. Önceki standart 226 denetime ek olarak, anonim öğrencinin erişim düzeni, tek kullanım kodu, hazırlık onayı, motor erişim, Space/Enter ile radyo yanıtı, tekrar bak işareti ve tek seferlik teslimi tarayıcı + sunucu üzerinde doğrulandı. Bu sonuç yalnız sentetik, geçici SQLite veritabanına dayanır.

Bu başarılı koşumdan **sonra**, öğrenci tarayıcı senaryosu sessiz/yazılı erişim düzenini ve eşleştirme sorularında **native ArrowDown seçimini** sınamak üzere genişletildi. Genişletilmiş sürümün kaynak kontrolleri 3/3 başarılı, gerçek Windows/Edge kabulü **BEKLENİYOR**. Test tekrarı: `node --test tools/v4-student-browser-acceptance.test.mjs` ve `npm run ui:browser:student`.

NVDA ile insan gözlemi, yerel TTS ses kalitesi dinleme, tam uçtan uca engelli öğrenci kabulü, üretim güvenlik incelemesi ve resmî kurumsal yetkilendirme ayrı **BEKLEYEN** aşamalardır; hiçbir otomatik PASS bunların yerine geçmez.

## 245 Edge PASS + manuel NVDA laboratuvarı

Kullanıcıdan gelen 14 Kasım Windows/Edge çıktısı: **245/245** otomatik kontrol PASS, öğrenci kaynak kontrolleri **3/3** PASS. Yazılı/sessiz soru kullanımı ve eşleştirme için doğal klavye seçimi yeni kabul senaryosunda çalıştı.

İnsan kabulü için **yeni** yerel sentetik laboratuvar:
```powershell
npm run reader:nvda:manual
```
Komut mevcut veritabanına dokunmadan yeni temp SQLite ile **bağımsız onaylı dört soruluk** (2 çoktan seçmeli, 1 doğru/yanlış, 1 eşleştirme) öğrenci sınavı üretir. Yalnız `127.0.0.1` arayüzünde çalışır, tek kullanımlık sentetik kodu kullanıcıya konsolda gösterir; Ctrl+C ile geçici veri silinir. Gerçek öğrenci sınavı veya başka bir tarayıcı profili kullanılmaz.

Manuel gözlem rehberi: `NVDA-OGRENCI-MANUEL-KABUL.md`. Kapsam: NVDA odak/okunabilirlik, ayrı DOU Reader ses testi, eşleştirme, sessiz kullanım, motor klavye, teslim. **Bu laboratuvarın Windows'ta başlatılması ve NVDA insan kabulü henüz yapılmadı.** Otomatik 245/245 PASS ile karıştırılmamalıdır.
