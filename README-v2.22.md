# DOU BEP Sınav Atölyesi v2.22 — Üniversite sınavlarında kod satırı sadakati

**Kapsam:** BAP araştırma prototipi. Önceki sınav koordinasyonu, dönemli Excel listesi, iki yetkili kararı, onaylı sunucu ZIP üretimi ve operasyon paneli korunmuştur. Yeni uygulama yalnızca kaynak sınav içeriğindeki açıkça işaretlenmiş **düz metin kod bloklarına** yöneliktir. Gerçek öğrenci, tanı veya sağlık bilgisi yüklenmez.

## Ne geliştirildi?

- `TXT` veya `DOCX` içine üç ters tırnak (ör. ` ```js `) ile açılıp ` ``` ` ile kapatılmış kod bloğu eklenebilir. Soru metninin içindeki kodun satır sonları, girintileri ve tab karakterleri korunur. Kod içindeki numaralar ve A) gibi metinler yeni soru/seçenek olarak ayrıştırılmaz.
- Word dışa aktarımında her gerçek satır sonu `w:br`, sekme ise `w:tab` olarak üretilir. Yazdırılabilir HTML'deki `white-space:pre-wrap` korunur.
- Kod bloğu kapanmamışsa veya çıplak program satırı algılanırsa **otomatik taslak engellenir**; kaynak düzeltilmelidir. Kod sezgisel tespit olduğu için her dili kapsamaz.
- İçeriğin tamamı öğretmen onayına tabidir; cevap anahtarları, kazanımlar ve puanlar tahmin edilmez. Kaynak dosya sunucuda saklanmaz; yalnızca onaysız soru taslağı kaydedilir.
- Yerel örnek: `ORNEK-ANONIM-KODLU-SINAV-v2.22.txt`. Kaynak `Sınav Dosya Aktar` ekranından test edilir.

## Dürüst kapsam sınırları

**Henüz desteklenmez:** DOCX içindeki gerçek Word tabloları, Office Math (OMML) denklemleri, gömülü şekil/çizimler, taranmış PDF/OCR ve kod renklendirme. Bu içerikler otomatik importta *engellenmeye devam eder*. PDF metin çıkarımı girintileri ve matematiksel düzeni güvenilir biçimde koruyamaz; öğretmen incelemesi gereklidir. Fenced code yalnızca metin içerir, güvenlik amacıyla **çalıştırılmaz**. PDF işleme için isteğe bağlı kurum içi Poppler `pdftotext` aracı gereklidir.

## Kurulum / Windows yerel doğrulama

1. `DOU-BEP-Sinav-Atolyesi-v2.22-BAP.zip` dosyasını eski kurulumdan **farklı** bir klasöre tamamen çıkarın.
2. Node.js 22.13+ bulunmalıdır. PowerShell'de `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\TEK-KOMUT-YEREL-KONTROL.ps1` çalıştırın; çevrimdışı otomatik testler çalışır, önceki `data` klasörü silinmez.
3. `BASLAT.bat`, yerel giriş `http://127.0.0.1:4173/kurum`, aktarım `/sinav-dosya-aktar`. Port 4173'te eski sürüm çalışıyorsa önce onu normal biçimde kapatın.
4. Şifreli yedek almadan var olan veritabanını taşımayın. Üretim güvenliği, KVKK, ekran okuyucu testleri ve gerçek öğrenci pilotu tamamlanmadı.

## BAP sıralaması

Bir sonraki kapsamlı hedef **Word tablo/denklem/şekil ayrıntı denetimi ve öğretmen gözetimli alternatif dönüşüm**, ardından erişilebilir belge testleri ve kurum içi ses teknolojisi Ar-Ge'sidir. Kendi ses motorumuz henüz geliştirilmedi; herhangi bir bulut bağımlılığı şart koşulmamaktadır.
