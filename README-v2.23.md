# DOU BEP Sınav Atölyesi v2.23 — Karmaşık Word kaynakları için öğretmen denetimli aktarım

**Kapsam:** Üniversite sınavları için kurum içi, anonim yerel BAP araştırma prototipi. Önceki v2.22 işlevleri korunur. Bu sürüm gerçek öğrenci, tanı, sağlık ve çocuk ses verisi için onaylı değildir.

## Yeni işlev: karmaşık kaynak denetimi ve açık manuel metin dökümü

1. `/sinav-dosya-aktar` sayfasında anonim bir DOCX sınavı seçin. `Dosyayı incele` ile başlatın.
2. Gerçek Word tablosu, Office Math denklemi ve gömülü görsel/çizim ayrı öğeler olarak **belge sırasına yakın** numaralandırılır. Bu öğeler hiçbir zaman otomatik metin aktarımının başarı sayılmasına yol açmaz. Basit düz metin/kod aktarımı eski yöntemle çalışmaya devam eder.
3. Öğretim elemanı orijinal Word'ü kendi bilgisayarında açıp tüm soruları ve karmaşık öğeleri **tam ve anlamı değiştirmeyen, ekran okuyucuyla değerlendirilebilir metin** olarak yeniden yazar; her öğeyi kaynakla karşılaştırdığını tek tek işaretler.
4. `Elle düzenlenmiş metni incele` ile metin sunucuda tekrar ayrıştırılır. Sorular gösterilir; öğretmen içerik, soru numarası ve şıkları gözden geçirir.
5. `Seçili sorulardan taslak oluştur` yalnızca açık onaydan sonra çalışır. Oluşan sınav **onaysız** taslaktır. Cevap anahtarı, puan, kazanım, pedagojik eşdeğerlik ve erişilebilirlik öğretmen/uzman tarafından ayrıca incelenmelidir.
6. Hem özgün DOCX hem de öğretmenin metin dökümü için SHA-256 kayıtlı soru provenance alanlarında saklanır; **kaynak DOCX dosyasının tamamı veya kaynak görüntü sunucuda kalıcı olarak saklanmaz**. Metin dökümü ise yeni sınav taslağının parçası olarak saklanır.

## Yerel örnekler

- `ORNEK-ANONIM-ZENGIN-SINAV-v2.23.docx`: bir gerçek Word tablosu, bir Office Math nesnesi ve bir yerel resim içeren üç sorulu anonim örnek.
- `ORNEK-OGRETMEN-MANUEL-METIN-v2.23.txt`: örneğin **öğretmen tarafından hazırlanmış** metin karşılıkları. Otomatik dönüştürme sonucu değildir.
- Örnek testi: DOCX yükle → 3 öğeyi kaynakla tek tek karşılaştır → TXT içeriğini metin alanına yapıştır → manuel önizleme → soru seç → taslak oluştur.

## Güvenlik ve sınırlar

- DOCX en çok 1 MB; özel/şüpheli içerik, makro, haricî bağlantı, OLE gömülü dosya, kişisel bilgi sinyali, 40'tan fazla karmaşık öğe manuel aktarımı engeller. Heuristik tespitler tüm tehditleri veya kişisel verileri bulma garantisi değildir.
- API her iki belgeyi tekrar işler; yetki, oturum, CSRF/Origin kontrolü, özgün dosya ve manuel döküm SHA-256 eşleşmesi, eksiksiz öğe işaretleme gerekir.
- Tablolar doğrudan Word tablosu olarak, formüller matematik semantiği olarak, görseller erişilebilir grafik olarak **otomatik aktarılmaz**. Öğretmen bunların anlamlı alternatif metinlerini üretir. Sistem bunların doğruluğunu ve eşdeğerliğini garanti etmez. Kayıtlar onaysızdır.
- Taranmış PDF/OCR, Braille, tam ekran okuyucu, kendi Türkçe TTS motoru, dinlenimde veritabanı şifrelemesi, SSO/MFA, gerçek öğrenci ve ekran okuyucu pilotu henüz tamamlanmadı. Haricî/bulut API bağımlılığı eklenmedi.

## Windows kullanımı

1. ZIP'i eski çalışan kurulumdan **ayrı** klasöre çıkarın; eski `data` dizinine dokunmayın.
2. Node.js 22.13+ gerekir. PowerShell: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\TEK-KOMUT-YEREL-KONTROL.ps1`.
3. `BASLAT.bat` ile `http://127.0.0.1:4173/kurum` açın; dosya aktarımı `http://127.0.0.1:4173/sinav-dosya-aktar`.
4. Mevcut gerçek kurulum verilerini taşımadan önce şifreli ve geri açılarak doğrulanmış yedek alın. Port 4173 üzerinde önceki sürüm çalışıyorsa o sunucuyu normal biçimde durdurun.

## BAP projesinde sonraki aşama

Sunucu taraflı güvenli dosya saklama/erişim yetkileri, semantik tablo ve formül düzenleyici, erişilebilir PDF/Word, uzman ölçme eşdeğerliği incelemesi, kurumsal saha pilotu ve ardından tamamen kurum içinde geliştirilecek ses/ekran erişim Ar-Ge modülü. Sistemin üretim kullanımı halen onaylı değildir.
