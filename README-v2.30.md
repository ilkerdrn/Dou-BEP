# DOU BEP Sınav Atölyesi v2.30 — Anonim uçtan uca BAP kabul kontrolü

**Kapsam:** Üniversite genelinde sınav hazırlama/koordinasyon/uyarlama/teslim akışı için yerel araştırma prototipi. **Gerçek öğrenci, tanı veya engellilik verileriyle kullanılmaz.** Kurumsal SSO, yerleşik etiketli PDF üretimi, dinlenimde uygulama katmanı şifrelemesi ve bağımsız erişilebilirlik testleri henüz tamamlanmadı.

## Çevrimdışı PDF erişilebilirlik ön denetimi (PDF/UA sertifikası değil)

v2.30, yerel bir **PDF yapısal gösterge tarayıcısı** da içerir. PDF dosyasını hiçbir bulut, API veya üçüncü tarafa göndermez; dosyayı **değiştirmez**, yalnız 24 MiB ile sınırlandırılmış olarak yerel diskten okur.

```powershell
npm.cmd run pdf:preflight -- ".\ORNEK-ANONIM-KAYNAK-SINAV-v2.20.pdf"
```

Yalnız kontrol kimliklerini ve sonuçlarını içeren JSON raporunu ayrı dosyaya almak için:

```powershell
npm.cmd run pdf:preflight -- ".\ornek.pdf" --report ".\PDF-ON-DENETIM.json"
```

Kontroller: PDF başlığı/son işareti; PDF katalogundan çözümlenmiş `StructTreeRoot` etiket ağacı; `MarkInfo/Marked`; `tr` veya `tr-TR` belge dili; en az bir `/ToUnicode` işareti; şifreleme işareti; varsa doğrulanmamış PDF/UA metadata beyanı. **Bu tam bir PDF parser'ı değildir**: sıkıştırılmış nesne akışlarını ya da tüm fontların/etiketlerin gerçekliğini denetleyemez. İlgili yapı bulunsa bile raporda daima `pdfUaVerified:false`, `manualExpertReviewRequired:true` ve `readyForCertification:false` yazılır. PDF kaynak yolu, belge metni, kimlik bilgileri ve metadata değerleri rapora alınmaz. Rapor mevcut dosyayı **ezmez**.

**Kritik sınır:** Bu sürüm etiketli PDF üretmiyor; Word'den kurumun onaylı yerel aracıyla *belge yapısı etiketlerini etkinleştirerek* PDF oluşturmak ve ardından bağımsız PDF/UA denetimi, görsel kontrol, ekran okuyucu ve akademik eşdeğerlik testi yapmak gerekir. Yapısal taramanın işaret bulması uygunluk belgesi değildir. PDF üretimini/etiketlemesini uygulamanın kendi motoruyla gerçekleştirme işi hâlâ açık bir BAP mühendislik işidir.

## Yeni özellik: Gerçek akışla tek komutlu kabul testi

Aşağıdaki komut Windows PowerShell dahil Node.js >=22.13 üzerinde çalışır:

```powershell
npm.cmd run acceptance:pilot
```

Komut **kendi kendine** işletim sisteminin geçici klasöründe iki sentetik kurum ve rol hesapları olan bağımsız bir SQLite dosyası oluşturur. Mevcut `BEP_DB_PATH`, `data` dizini, gerçek kurum hesapları veya öğrenci dosyalarını okumaz/değiştirmez. İşlemler bitince geçici veritabanını kapatıp siler. Çıktı olarak komutun çalıştırıldığı klasörde benzersiz isimli `BAP-KABUL-RAPORU-<zaman>.json` dosyası oluşturur; önceden mevcut raporu ezmez.

Kabul zinciri 10 basamak içerir:

1. Anonim sınav taslağı, bağımsız onay ve onaysız teslimin engellenmesi.
2. Onaylı sınava sürüm sabitlenerek sınav oturumu eşleştirilmesi.
3. Ayrı yetkili tarafından bireysel düzenleme kararının onaylanması; onaysız kararda paket engeli.
4. Kurumsal operasyon özetinin hazır olması; aday kodu içermemesi.
5. İmzalanmamış ama SHA-256 ile **bütünlüğü doğrulanabilir** anonim toplu ZIP paketi.
6. Onaylı kaynaktan erişilebilir Word/HTML teslim ZIP'i ve yapısal denetim raporu.
7. Farklı kurum ve yetkisiz roller için veri/işlem izolasyonu.
8. Tarayıcıdan gönderilen sahte onay ve tanı alanlarının reddi.
9. Gerçek yerel HTTP API ile giriş, CSRF/Origin ve yetki kontrolü.
10. Onaydan sonra içerik değiştirilirse yeniden teslimin ve kaydın engellenmesi.

Raporda yalnız **kontrol kimliği, başarılı/başarısız durumu, sürüm ve sınırlar** bulunur; aday kodu, parola, oturum çerezi, sınav soruları, çalışma klasörü veya öğrenci bilgisi yazılmaz. `productionReady:false`, `humanAccessibilityTestingComplete:false` ve `independentSecurityReviewComplete:false` kasıtlı olarak korunur. Testlerden biri başarısızsa komut sıfırdan farklı çıkış kodu döndürür.

İsteğe bağlı dosya yolu:

```powershell
npm.cmd run acceptance:pilot -- --report .\BAP-KONTROL-SONUCU.json
```

Mevcut bir dosyanın üzerine yazılmaz. Her çalıştırma için farklı bir isim kullanın.

## Ayrı yetkiliyle sınav onayı

Eski yerel pilotlarda yöneticinin kendi sınavını onaylama davranışı korunur; bu davranış **kurumsal kullanım için önerilmez**. v2.30'da şu ortam değişkeni **etkinleştirilirse** sınav taslağını oluşturan hesabın aynı sınavı onaylaması reddedilir:

```powershell
$env:BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL = '1'
node server.mjs
```

Bu ayar **işlem bazlıdır**, bütün kurum hesaplarına aynı süreçte uygulanır. Veritabanı şemasını değiştirmez ve eski onayların tarihçesini geriye dönük iptal etmez. Farklı, `exam.approve` yetkisine sahip yetkili (örneğin `reviewer`) sınavı inceleyip onaylayabilir. Uçtan uca kabul testinin kendi geçici veritabanında bu şart **daima açıktır**. Kurum testinde **başlatıcı** ve bütün sistem süreçleri için aynı ayar sağlanmalıdır; dağıtım politikası/anahtar saklama ayrıca kurumsal denetim gerektirir.

## Aynı sürümün diğer kontrolleri

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run security:check
```

`security:check`, bağımsız sınav onayı kapalıysa açık uyarı verir. Çalışan Windows kurulumunu yükseltmeden önce şifreli yedek alın; v2.30'u **ayrı klasörde** test edin. Daha önce açık olan SQLite oturumlarının güvenlik davranışları korunmuştur.

## Kabul sınırı

Bu araç yalnız **sentetik uçtan uca mühendislik senaryosunu** doğrular. Gerçek kullanıcılarla NVDA/JAWS/VoiceOver ve klavye testi, erişilebilir etiketli PDF, akademik eşdeğerlik incelemesi, kurumsal HTTPS/SSO, yedekten geri yükleme tatbikatı, KVKK/etik izinler ve bağımsız güvenlik incelemesi yapılmış gibi gösterilmez. Kendi çevrimdışı Türkçe ses/ekran erişim motorunun geliştirilmesi ayrı BAP Ar-Ge iş paketidir. Zorunlu haricî bulut bağlantısı eklenmedi.
