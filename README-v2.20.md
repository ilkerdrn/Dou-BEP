# DOU BEP Sınav Atölyesi — v2.20: Öğretmen kontrollü Word/PDF sınav aktarımı

**Yalnız anonim/sentetik yerel pilot.** Doğuş Üniversitesi veya başka kurumun resmî/onaylı ürünü değildir. Gerçek öğrenci adı, öğrenci numarası, sağlık, tanı ve engellilik verisi **kullanmayın**. Gerçek sınav materyalleri de yetkisiz kişilerle paylaşılmamalıdır; bu sürüm anonim örneklerle test edilmiştir.

## Yeni akış

1. `BASLAT.bat` → `http://127.0.0.1:4173/kurum` → kurumsal kullanıcıyla giriş.
2. `http://127.0.0.1:4173/sinav-dosya-aktar` ekranından 1 MB altı **DOCX**, metin tabanlı **PDF** veya TXT dosyası seçin. `.doc` desteklenmez.
3. Ders adı, sınav başlığı ve süreyi yazın. **Dosyayı incele** butonu, metni yalnız geçici bellekte ayrıştırıp numaralı soru iskeletlerini ve şıkları gösterir. Anahtar/puan/kazanım otomatik tahmin edilmez.
4. Öğretmen asıl dosya ile karşılaştırır, soruları işaretler, açık onay verir. Sunucu **aynı kaynak dosyayı tekrar ayrıştırır**, SHA-256 eşleşmesini doğrular, yalnız seçilen sorulardan yeni **onaysız taslak** oluşturur. Kaynak belge sunucuda dosya veya SQLite alanı olarak saklanmaz.
5. **Sınav editörünü aç** bağlantısından soruların doğru yanıtlarını, puanlarını, kazanımlarını, tablo/formül/grafik ve erişilebilirlik düzenlerini tamamlayın. Her aktarılan sorunun **kaynak karşılaştırma** onayını son adımda işaretleyin; herhangi bir soru alanı değişirse bu işaret sıfırlanır. Kaydedilmiş taslak kurumsal onaylı sınav değildir.

## Ne destekleniyor / ne desteklenmiyor?

- **Çalışan otomatik aktarım:** Numaralandırılmış düz metin soruları (`1.`, `2)` veya `Soru 3:`) ve ayrı satırda `A)`, `B)` vb. seçenekleri. Tanınmayan başlık ve altbilgiler uyarıya düşer; cevap anahtarı bölümü aktarılmaz.
- **Fail-closed:** Word belgesinde XML tabloları, Office matematik nesneleri, görseller, şekiller, gömülü nesneler ve makro parçaları varsa otomatik taslak oluşturma engellenir; uzman/öğretmen asıl belgeden elle uyarlamalıdır.
- **PDF sınırı:** Yalnız PDF metni Poppler **`pdftotext`** yerelde yüklüyse çıkarılır. Windows için ayrıca Poppler yüklenmelidir. Taranmış PDF/OCR, sayfa sadakati, karmaşık tablo/matematik, kod girintisi ve görsel açıklamalar **desteklenmez**. PDF'den çıkarılan metin özgün PDF ile karşılaştırılmalıdır.
- **Mahremiyet:** Öğrenci alanlarına benzeyen metinler için kural tabanlı tarama vardır; **bu tam anonimleştirme garantisi değildir**. Dosya başına 1 MB, çıkarılan metin için sınırlama, en çok 60 aday soru; işlem oturum + rol + CSRF + Origin ile korunur.
- İçe aktarma mevcut sınav sürümünü değiştirmez, başka kurumun sınavını açmaz, herhangi bir onayı devralmaz. Oluşturulan taslağın doğru cevapları boştur ve kaynağa ilişkin bireysel sorular öğretmen tarafından doğrulanmadan kurumsal onay geçemez.

## Örnek dosyalar

- `ORNEK-ANONIM-KAYNAK-SINAV-v2.20.docx`
- `ORNEK-ANONIM-KAYNAK-SINAV-v2.20.pdf`

İki örnek de tamamen kurgusal İşletim Sistemleri soruları içerir ve herhangi bir öğrenci bilgisi içermez.

## Güvenli güncelleme

Eski sürümü durdurun. **`data` klasörünü silmeyin.** Önce şifreli yedek alıp `npm run backup:verify` ile doğrulayın. Yeni sürüm dosyalarını var olan uygulama klasörüne çıkarın; sunucu kapalıyken mevcut `data/institution.sqlite` ve SQLite WAL/SHM bağlamını koruyun. Veri sıfırlama gerekmez. Eski sürüme geri dönüş şema açısından garantili değildir.

## Kısıtlar ve doğrulama

Veritabanı dinlenim halinde şifreli değil; HTTPS/SSO/MFA, bağımsız sızma testi, gerçek ekran okuyucu ve özel gereksinimli kullanıcı kabul testleri, KVKK ve kurumsal hukuk değerlendirmesi **tamamlanmadı**. Bu paket gerçek öğrencilerin dosyalarını kabul eden üretim sistemi değildir.

`npm test` ve `npm run release:check` komutlarıyla yerel otomatik kontroller uygulanır. Geçerli rapor `DOGRULAMA-v2.20.md` içindedir.
