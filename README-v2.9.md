# DOU BEP Sınav Atölyesi v2.9 — BEP hedef-soru matrisi

**Yerel ve anonim pilot.** Doğuş Üniversitesi/MEB tarafından resmî olarak onaylanmış bir yazılım değildir. Gerçek öğrenci adını, tanısını, sağlık veya ses bilgisini kaydetmeyin. Otomatik testler erişilebilirlik ve pedagojik uzman incelemesinin yerini tutmaz.

## Yeni: kazanım ve soru kapsam matrisi

1. `http://127.0.0.1:4173/kurumsal-sinav` adresine kurum hesabıyla giriş yapıp sınav taslağını açın.
2. **BEP hedef–soru kapsam matrisi** alanında her hedefin kısa/uzun dönemli tipini, öğretmen doğrulamasını, bağlantılı soruları, geçerli bağlantı sayısını ve bu soruların toplam planlanmış puanını görün.
3. Tutarsız hedef–soru metinleri, silinmiş hedefi işaret eden sorular, hedef seçilmemiş sorular ve hiç soruyla eşleşmeyen hedefler ayrı gösterilir. Hedefleri duruma göre filtreleyebilirsiniz.
4. **Soru–hedef bağlantılarını düzenle** bölümünde soru için hedefi açıkça seçin. Uygulama yeniden sorar; onay verirseniz soru kazanım metni hedef metniyle eşitlenir. **Soru metni, yanıt ve puan değişmez.** Bağlantı kaldırılırsa kazanım metni korunur.
5. Bağlantı değişikliği mevcut sınav onayını düşürür; gerektiğinde alternatif soru metninin ölçme eşdeğerliği öğretmen tarafından yeniden doğrulanmalıdır. Otomatik kaydetme önceki sürümlerdeki kuralları uygular. Metin eşitliği pedagojik yeterlilik kanıtı değildir.
6. **Anonim kapsam CSV indir** dosyası hedef kodu, soru sıra numarası, denetim durumu ve sayısal kapsam bilgileri içerir. **Soru, hedef metni, cevap anahtarı, öğrenci bilgisi veya sınav başlığı içermez.** CSV ayrı yerel dosyadır, veritabanına yeni özel tablo eklenmez.

## Diğer özellikler

v2.8 ve daha eski özellikler korunmuştur: kurum/rol izole sınav kütüphanesi, sınav kopyalama, güvenli otomatik kayıt/sürüm çakışması, öğretmen doğrulamaları, anonim kazanım CSV/JSON içe aktarma, erişilebilir sunum profilleri, DOCX/PDF/HTML çıktıları, güvenlik ve onay kontrolleri.

## Windows'ta açma

- Node.js 22.13+ veya Node.js 24.
- ZIP'i **yeni kurulum** için boş bir klasöre çıkarın; `KURULUM-YONETICI.ps1` ile ilk hesabı oluşturup `BASLAT.bat` dosyasını çalıştırın. Varsayılan kullanıcı/parola yoktur.
- **v2.8'den güncelleme:** Uygulamayı kapatmadan önce `npm run backup` ile şifreli yedek alın ve `npm run backup:verify` akışını kullanarak doğrulayın. Eski uygulamayı kapatın, ZIP'teki yalnızca **kod dosyalarını** mevcut klasöre çıkarın. `data/`, `institution.sqlite` ve şifreli yedekleri **silmeden / üzerine yazmadan** koruyun. Yeni klasöre geçerseniz eski hesap otomatik taşınmaz.
- Yerel uygulama adresi: `http://127.0.0.1:4173/kurum` (yalnızca aynı bilgisayardan).

## Kapsam dışı kalanlar

Gerçek öğrencilerle pilot, gerçek ekran okuyucu ve alternatif iletişim araçları testi, bağımsız sızma testi, HTTPS/SSO/MFA, KVKK/hukuk değerlendirmesi ve resmî kurum onayı bu sürümde tamamlanmış değildir. Önceki v2.x prototiplerin veri saklama güvenliği kapsamı değişmedi. Kişisel / sağlık verisi işlenmez.
