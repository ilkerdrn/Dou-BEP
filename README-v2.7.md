# DOU BEP Sınav Atölyesi v2.7 — kazanım kataloğu ve akıllı Windows başlangıcı

**Bu ürün anonim yerel eğitim pilotudur. Doğuş Üniversitesi veya MEB adına onaylı/resmî bir yazılım değildir. Gerçek öğrenci kimliği, sağlık, tanı veya ses verisi kullanmayın.**

## Kurulum ve veri güvenliği

1. Node.js 22.13 veya üzerini yükleyin (Node.js 24 de desteklenir).
2. ZIP'i yeni bir klasöre **tamamen** çıkarın, `BASLAT.bat` başlatın.
3. `4173` boşsa yerel sunucu başlar. Aynı portta **v2.7** açıksa başlatıcı mevcut pencereyi açar; ikinci bir kopya başlatmaz. Eski v2.x DOU sürümü açıksa kapatılmasını ister. Portta başka program varsa kullanıcıyı uyarır, o işlemi sonlandırmaz.
4. Giriş: `http://127.0.0.1:4173/kurum`. Varsayılan parola yoktur. Mevcut yönetici ve sınavlar `data/institution.sqlite` dosyasındadır. **Bu klasörü silmeyin veya pakete eklemeyin.** Taşıma öncesinde mevcut kurulumun şifreli yedek araçlarını kullanın; canlı SQLite veritabanını elle kopyalamayın.
5. Kurulumu ilk kez yapıyorsanız `KURULUM-YONETICI.ps1`; hesapta parola sorunu varsa **aynı veritabanına karşı** `SIFRE-SIFIRLA.ps1` kullanın.

## Kazanım dosyası

- Kurumsal sınav editöründeki **BEP kazanım kataloğu ve soru bankası** bölümünde **CSV / JSON dosyasından kazanım aktar** panelini genişletin.
- **Örnek CSV indir** ile sütunları görün. Paketteki `ORNEK-ANONIM-KAZANIMLAR.csv` ise 12 kurgusal örnek içerir; **resmî MEB kodu değildir**. UTF-8 CSV: `id;subject;grade;domain;title;description;source` (`kod;ders;sinif;...` başlıkları da tanınır). JSON: bu alanları taşıyan nesne dizisi veya `{ "objectives": [...] }`.
- `id` kurumsal kütüphane kodu olarak kullanılır (en fazla 32 karakter). `description` saklanan hedef metnidir (8–400 karakter); `source` belirtilen fakat **sistemce doğrulanmamış** kullanıcı/kaynak bilgisidir. `title` ve `domain` dosyayı düzenlemek içindir; kurumsal kayıtta ayrı alanlar olarak saklanmaz.
- Dosya en fazla 256 KB, tek işlemde 1–40 kazanım. Kontrol ekranı yalnızca alan/biçim kurallarını doğrular, öğretim uygunluğunu veya resmî kaynak doğruluğunu **garanti etmez**. İçerikler haricî sunucuya gönderilmez; aynı bilgisayardaki yerel sunucuya aktarılır.
- **Kontrol edilen taslakları aktar** işlemi sunucuya geçer. Bir satır hatalı, yinelenmiş veya kota aşılmışsa işlemin tümü iptal edilir. Başarılı kayıtların tümü `draft` durumundadır; kurum incelemecisi/yöneticisi denetimden sonra yayımlar. Başka kurum kayıtlarına erişilemez.
- Öğretmen soru önerileri ve BEP uyarlamalarını mutlaka değerlendirir; otomatik karar/pedagojik onay yoktur. Arama, ders ve kademe filtrelerini kullanın.

## Sınırlar ve sonraki adım

Kurumsal kaynaklar için yayımlanmış resmî kazanım veri tabanı **pakette yoktur**. Telif, doğruluk, sürüm ve öğretmen onayı olmadan MEB kazanımıymış gibi örnekleri sunmuyoruz. Bir sonraki uygun aşama, kurumsal yetkiyle sağlanan kaynaklara bağlantı ve gözden geçiren kişi/sürüm kanıtlarının genişletilmesidir.

## Doğrulama

`npm test` ve `npm run release:check`. Kod ve yerel birim/integrasyon testleri gerçek cihaz, ekran okuyucu ve gerçek öğrenci kullanım onayı yerine geçmez.
