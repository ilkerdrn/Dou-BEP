# Üniversite Sınav Atölyesi v2.14 — Çok dersli toplu sınav uyarlama

**Yerel anonim prototip.** Doğuş Üniversitesi veya herhangi bir kurum tarafından onaylı bir ürün değildir. **Gerçek öğrenci adı, numarası, kimliği, tanısı, engellilik bilgisi veya gerçek destek kararları yüklenmemelidir.** Gerçek kullanım için ayrı hukuki, erişilebilirlik ve kurumsal güvenlik onayı gerekir.

## Asıl kullanım senaryosu

Sınav birimi aynı sınav döneminde farklı derslerden sınav kâğıtlarını alır (ör. `BLP103 — İşletim Sistemleri`, `BGT1011 — Sunucu İşletim Sistemleri`, `ALG101 — Algoritma ve Programlama`; ders adları/kodları kullanıcı tarafından belirlenir). Her dersin sınavı **önceden hazırlanıp ayrı ayrı onaylanır**. Birleştirilmiş anonim CSV, **hangi kodun hangi ders ve sınava gireceğini** ve hangi düzenlemelerin yetkili birim tarafından onaylandığını belirtir.

1. Kurum hesabıyla `http://127.0.0.1:4173/kurumsal-sinav` adresinden her dersin Vize/Final/Bütünleme vb. sınavını ayrı hazırlayıp onaylayın. Yeni sınav açıldığında *Ders* alanı artık ilkokul Matematik olarak doldurulmuyor; istediğiniz üniversite dersini yazabilirsiniz.
2. `http://127.0.0.1:4173/toplu-sinav` sayfasını açın ve **Çok dersli örnek CSV indir** düğmesinden şablonu alın. CSV, Excel'den UTF-8 CSV olarak dışa aktarılabilir. Bu sürüm `.xlsx` dosyasını **doğrudan içe aktarmıyor**.
3. CSV başlıkları (sıra zorunlu):

   ```csv
   ders_kodu;sinav_etiketi;ogrenci_kodu;gereksinim_alani;onayli_duzenlemeler;ek_sure_dakika;onay_durumu
   BLP103;VIZE;KOD-001;vision;LARGE_PRINT|HIGH_CONTRAST;15;onayli
   BGT1011;VIZE;KOD-001;vision;ACCESSIBLE_HTML|READER;15;onayli
   ALG101;FINAL;KOD-003;motor;WIDE_RESPONSE|SCRIBE;20;onayli
   ```

4. CSV'yi yükleyin. Sistem ders-sınav gruplarını gösterir: **her gruba** doğru *onaylı kaynak sınavı* listeden **elle eşleştirin**. Engellilik alanından ders/sınav/uyarlama otomatik seçilmez. Aynı sınavın farklı ders gruplarına eşlenmesi engellenir.
5. Eksik onay veya eşleştirme varsa paket üretimi kapalıdır. Örnek verilerin onaylarını kontrol ettikten sonra **Derslere ayrılmış ZIP indir** seçeneğini kullanın.

## Çıktılar

```
DERS-SINAV-ENVANTERI.csv
GOREVLI-PLANI.csv
OKU-BENI.txt
dersler/
  BLP103/VIZE/sinavlar/KOD-001.docx
  BLP103/VIZE/sinavlar/KOD-001.html
  BGT1011/VIZE/sinavlar/KOD-001.docx
  BGT1011/VIZE/sinavlar/KOD-001.html
  BGT1011/VIZE/sinavlar/KOD-001-erisilebilir.html
  ALG101/FINAL/sinavlar/KOD-003.docx
  ALG101/FINAL/sinavlar/KOD-003.html
```

- Word düzenlenebilir; HTML tarayıcıdan PDF olarak yazdırılabilir. **Doğrudan toplu PDF henüz bulunmuyor.**
- Ders klasörü, sınav türü ve anonim kodlar karışmaz; aynı anonim kod birden çok ders için kullanılabilir.
- Öğrenci sınavlarında cevap anahtarı bulunmaz; baskı başlığında özel gereksinim/tanı etiketi yer almaz.
- Büyük punto, kontrast, tek soru/sayfa, geniş cevap alanı ve onaylı ek süre uygulanır. Sesli/ekran okuyucu HTML onaylıysa oluşturulur. Okuyucu, yazıcı ve iletişim desteği **personel planına** kaydedilir; personel otomatik sağlanmaz. Braille veya işaret dili çevirisi yapılmaz.
- En çok 100 anonim ders-sınav satırı, 40 farklı ders-sınav grubu, 60 KB CSV.
- Daha önceki `ogrenci_kodu;...` tek-ders CSV formatı da kullanılabilir; o modda tek kaynak sınav seçilir.

## Güvenlik ve dağıtım sınırlamaları

CSV yalnız aktif tarayıcı sekmesinin belleğinde işlenir; dosya içerikleri uygulama sunucusuna kaydedilmez. Çıktı ZIP'i bilgisayara **şifresiz** indirilir. Gerçek kişisel/özel nitelikli öğrenci verisi için uygun değildir. Kurum düzeyinde rol, yetki, MFA, hassas veri saklama/aktarımı, yaşam döngüsü, denetim izi, KVKK hukuk değerlendirmesi, güvenlik testi ve gerçek kullanıcı erişilebilirlik testleri gereklidir. Kullanıcıya göre düzenleme yapmak, soru içeriğini veya başarı ölçme standardını otomatik değiştirmez.

## Güncelleme / kurulum

Node.js 22.13+ kullanılmalı. Yeni kurulumda ZIP'in tamamını yeni klasöre açın, `KURULUM-YONETICI.ps1` ile ilk kurum hesabı oluşturun, `BASLAT.bat` ile başlatın. Önceki sürümden güncellemede `data/institution.sqlite` ve `data` klasörünü **asla** silmeyin. Önce şifreli yedek alıp doğrulayın, mevcut programı kapatın, kodları test ortamında sınayın. ZIP paketi gerçek veritabanı içermez.

## Teknik denetim

`npm test` otomatik testlerin tamamını; `npm run release:check` 13 sınırlı yerel dağıtım/güvenlik kontrolünü çalıştırır. Bunlar bağımsız güvenlik veya gerçek kullanıcı erişilebilirlik onayı değildir. Test ekranında kullanılan üç örnek ders ve sorular **hayalî sınavdır**; resmî ders içeriği veya gerçek öğrenci sınavı değildir.
