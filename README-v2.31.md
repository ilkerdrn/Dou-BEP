# DOU BEP Sınav Atölyesi v2.31 — Yerel etiketli PDF pilotu

**Kapsam:** Üniversite sınav hazırlama, iki yetkili onayı, bireysel uyarlama, dönemli koordinasyon, yerel MFA ve erişilebilir belge üretimine yönelik **anonim araştırma prototipi**. Gerçek öğrenci, tanı veya engellilik bilgileriyle kullanmayın. Kurumsal SSO/HTTPS, canlı veritabanının uygulama katmanında şifrelenmesi, bağımsız erişilebilirlik ve güvenlik doğrulamaları henüz tamamlanmadı.

## Yenilik: dış servis kullanmadan PDF dosyası üretmek

v2.31, ilk kez **uygulamanın kendi Node.js koduyla etiketli PDF pilotu** üretir. Basit, metin tabanlı üniversite sınavları için:

- Yerel diskteki Unicode TrueType (`.ttf`) fontu kullanır; **font dosyaları kaynak proje paketine eklenmez**. PDF'ye gömme kısıtlaması bulunan fontlar reddedilir. Windows'ta Arial/Segoe UI/Calibri, Linux'ta kurulu DejaVu/Liberation gibi izinli fontlar aranır. Özel yol `BEP_PDF_FONT_PATH` ile verilebilir.
- **Başlık (`H1`), soru başlığı (`H2`) ve paragraf (`P`)** içerik etiketleri, belge dili `tr-TR`, PDF `StructTreeRoot/ParentTree`, `Marked`, `ToUnicode` ve Unicode CID font eşleme yapıları oluşturur.
- Türkçe karakterleri gizlemeyen Unicode metin katmanı ve A4 sayfa yapısı vardır. Büyük punto, satır aralığı ve **odaklanma: her sayfada tek soru** profilleri uygulanır. Soru ve cevap alanının birlikte kalması için sayfa sonu kontrolü yapılır.
- PDF indirme sunucudaki **onaylı sınavdan** oluşturulur. CSRF, Origin/Host, kurum izolasyonu, rol ve onay sürümü özeti doğrulanmadan PDF üretilmez. SHA-256 yanıt başlığıyla dosya bütünlüğü karşılaştırılabilir.
- PDF oluşturma işlemi **hiçbir ağ hizmetine / dış bulut API'sine erişmez**.

### Nasıl kullanılır? (Windows PowerShell)

v2.31'i çalışan eski sürümün üzerine yazmadan **ayrı bir klasöre** çıkarın. `data` klasörünü taşımayın veya silmeyin. Node.js 22.13+ gereklidir.

Önce yerel font uygunluğunu kontrol edin:

```powershell
npm.cmd run pdf:font-check
```

Uygulamayı normal yerel başlatıcınızla açın (`BASLAT.bat`; MFA etkin hesaplar için uygun DPAPI başlatıcısı `BASLAT-MFA.ps1`). Tarayıcıda `http://127.0.0.1:4173/kurumsal-sinav` sayfasına girin, **onaylı sınavı** seçin, erişilebilir sunum profilini belirleyin ve **“Etiketli PDF (pilot) indir”** düğmesini kullanın.

Font bulunamazsa ve BT ekibi tarafından lisansı PDF gömmeye uygun `.ttf` font belirlenmişse:

```powershell
$env:BEP_PDF_FONT_PATH = 'C:\Windows\Fonts\arial.ttf'
npm.cmd run pdf:font-check
```

Bu değişkenin aynı PowerShell oturumundaki sunucunun başlatılmasından önce ayarlanması gerekir. Sırf PDF olsun diye rastgele font indirmeyin; lisans ve karakter kapsamı kontrol edilmelidir.

### Sınırlar ve engelleyici durumlar

- Yalnız **temel metin tabanlı** sorular. Görsel gerektiren sorular, Markdown/HTML görselleri, karmaşık tablolar, Office Math/LaTeX nesneleri, biçime duyarlı kod blokları veya fontta olmayan karakterler otomatik PDF'ye alınmaz. Bu sorular için Word / çevrimdışı HTML öğretmen incelemesiyle kullanılmalıdır.
- PDF pilotunda bütün grafik/matematik anlamsal yapıları, formlar veya cevap alanı doldurma etkileşimleri desteklenmez. Etiketli PDF oluşturulması **PDF/UA uyumu**, WCAG başarısı veya ekran okuyucu kullanışlılığı **kanıtı değildir**.
- PDF şu an mevcut doğrulanabilir ZIP tesliminden **ayrı bir pilot indirme** olarak sunulur; eski ZIP içerikleri ve doğrulayıcısı değişmedi.
- Yerel PDF fontu PDF'ye gömülür; font kaynak proje içinde bulunmaz. Windows cihazında font gömme izinleri bulunmazsa sistem *kapalı başarısızlık* (fail-closed) uygular.
- Yalnız akademik sınav metni, sorular ve öğrenciye gösterilmesi gereken seçenekler yazılır. Öğretmen notları, cevap anahtarı, öğrenci kimliği ve kurum hesabı bilgileri PDF dışa aktarımı için tasarlanan modele eklenmez.

### Doğrulama

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
npm.cmd run pdf:font-check
```

PDF çıktılandıktan sonra isteğe bağlı yerel gösterge ön denetimi:

```powershell
npm.cmd run pdf:preflight -- '.\bep-standard-pdf-pilot.pdf'
```

PDF/UA uygunluk ve ekran okuyucu incelemesi için görme engelli kullanıcılarla **gerçek** NVDA/JAWS/VoiceOver senaryoları, okuma sırası, Türkçe matematik sembolleri, büyük yazı ve kağıt çıktısı testi, ayrıca bağımsız kurumsal erişilebilirlik uzmanı denetimi gerekir. PDF/UA beyanı (`pdfuaid:part`) **eklenmez**; pilot olarak kalır.

## Önceki modüller korunuyor

Word DOCX, yazdırılabilir HTML, seslendirmeli erişilebilir HTML, kaynak Word/PDF önizlemesi, öğretmen incelemesi, uyarlama onayı, toplu ZIP teslimi, şifreli yedek, TOTP MFA, zorunlu MFA politikası, BitLocker güvenlik kapısı ve `acceptance:pilot` değişmeden korunur. Eski `data` klasörünün içeriğine bu sürüm geçişinde müdahale edilmez.

**BAP sınırı:** Bu sürüm hâlâ anonim araştırma prototipidir. Kendi çevrimdışı Türkçe ses/ekran okuyucu motoru ana sınav uygulamasının kurumsal kabulünden sonra ayrı Ar-Ge iş paketinde geliştirilecektir. Haricî bulut API'si zorunlu değildir.
