# DOU BEP Sınav Atölyesi — v2.18 (sunucuda doğrulamalı anonim toplu sınav ZIP üretimi)

**Durum: Yalnızca sentetik / gerçek kişiyle ilişkilendirilemeyen anonim yerel prototip.** Üniversitenin resmî sınav sistemi değildir, kurum onayı veya KVKK uyum belgesi değildir. **Gerçek öğrenci kodu/numarası, ad-soyad, tanı, engellilik veya sağlık verisi kullanmayın.**

## Ne değişti?

- `/toplu-sinav` içindeki **akademik dönemli CSV/XLSX** listelerinden paket alma artık `POST /api/batch/authorized-package` üzerinden **sunucuda** gerçekleşir.
- Tarayıcı yalnızca `term`, `courseCode`, `examLabel`, `candidateCode` içeren anonim anahtarları gönderir. CSV'deki `onayli`, `onayli_duzenlemeler`, ek süre ve ihtiyaç kategorileri **sunucu kararına yetki vermez**. Gerçek, yetkili kişi tarafından onaylanmış düzenlemeler `accommodation_decisions` veritabanından okunur.
- Yönetici/koordinatör yetkisi, oturum ve CSRF kontrolü zorunludur. Öğretmen/incelemeci/izleyici bu toplu paket endpoint'ini kullanamaz.
- Her ders için koordinasyonun **tek bir onaylı sınav kimliği + sürümü** üzerinde anlaşması zorunludur. Kaynak sınavın güncel olması, `exam_approval_history` içindeki SHA-256 ile kayıt içeriğinin eşleşmesi ve temel kalite denetimi gerekir. Birbirine karışmış dersler/çakışan eşleştirmeler reddedilir.
- İptal edilen, değiştirilen, onaysız ya da parmak izi bozuk uyarlama kararı tüm paketi engeller. Kaynak sınavdaki değişiklik eski koordinasyon eşlemesini geçersiz kılar.
- Yanıt anahtarsız DOCX, yazdırılabilir HTML, uygun durumda çevrimdışı erişilebilir HTML ve görevli planı **sunucu belleğinde** oluşturulur. Sunucu bir ZIP gönderir; arada kalıcı belge dosyası yazmaz.
- Paket içinde `INTEGRITY-MANIFEST.json` bulunur: dosya yolu/boyutu/SHA-256, onaylı kaynak sınav ID-sürüm-parmak izi ve anonim karar sürüm/parmak izleri. Sunucu cevabında ZIP'in SHA-256 değeri ayrıca iletilir. `batch_export_events` tablosunda yalnız paket kimliği, parmak izleri, işlem yapan üye, grup/adet ve tarih kaydı bulunur. ZIP arşivi veritabanına kaydedilmez.
- Dönemsiz eski CSV şablonları **okunabilir ama bu ekranda toplu ZIP üretimi kapalıdır**. Güvenli üretim için onaylı dönemli şablon kullanın.

## İş akışı

1. `BASLAT.bat` ile yalnızca `127.0.0.1:4173` üzerinde çalıştırın. Mevcut `data/institution.sqlite` **silinmez**; kod yükseltmeden önce mevcut şifreli yedeğinizi alın ve doğrulayın.
2. Kurum hesabıyla oturum açın. Her ders için onaylanmış kaynak sınavı hazırlayın, `/sinav-koordinasyon` üzerinde doğru dönem, ders kodu ve sınav etiketine eşleyin.
3. `/uyarlama-kararlari` ekranında yalnız yapay `KOD-001` gibi kodlarla karar taslağı hazırlayın. Kararı hazırlayandan farklı yetkili onaylasın.
4. `/toplu-sinav` alanına **örnek anonim dönemli** Excel/CSV dosyasını yükleyin. Görünen eşleştirmeleri kontrol edip onay kutusunu işaretleyin. Yönetici veya koordinatör olarak **Sunucuda doğrula ve ZIP indir** butonunu kullanın.
5. ZIP'teki `INTEGRITY-MANIFEST.json` ve `GOREVLI-PLANI.csv` dosyalarını kontrol edin. `npm run package:verify -- "paket.zip" "sunucunun-verdiği-SHA-256"` komutuyla yerel doğrulama yapın. Sunucunun hash değerini bağımsız güvenilir bir kanaldan karşılaştırmak önemlidir.

**İşlem sınırları:** En fazla 30 anonim satır, 12 ders-sınav grubu, 16 MB ZIP. Gerekirse birkaç ayrı paket üretilir; eksik karar bir paketi bütünüyle engeller. Bunlar ölçek testleri yapılmadığından bilinçli küçük pilot sınırlarıdır.

## Güvenlik sınırları ve kalan eksikler

- Bu yalnızca yeni **sunucu taraflı dönemli toplu üretim yolunun** doğrulamasıdır. Sınav düzenleme veya bireysel dışa aktarma dahil diğer eski uygulama işlevlerinin tam bir kurumsal güvenlik değerlendirmesi yapılmadı. İstemci taraflı paketleyici kaynak kodları halen projede bulunur; bu tek başına veri denetimini garanti etmez.
- ZIP'deki SHA-256 değerleri **dijital imza değildir** ve belgenin pedagojik eşdeğerliğine kanıt olmaz. Öğretim elemanı/özel eğitim uzmanı soruları ve uyarlamaları onaylamalıdır.
- SQLite veritabanı dinlenim halinde şifreli değildir. HTTPS, SSO/MFA, yetkili kullanıcı yaşam döngüsü, gelişmiş anahtar yönetimi, saklama/silme, erişim gözden geçirme, bağımsız sızma testi ve KVKK hukuki değerlendirmesi tamamlanmadı.
- NVDA, JAWS, VoiceOver, TalkBack ile gerçek kullanıcı erişilebilirlik ve pedagojik pilot testleri tamamlanmadı.
- Windows'ta eski `data` dizinini silmeyin veya ZIP'e eklemeyin; eski sürüm koduna geri dönüş **uygulama migrasyonu bakımından garanti edilmez**. Önce yedek/geri yükleme prosedürünü uygulayın.

## Test komutları

```powershell
npm test
npm run release:check
npm run package:verify -- "C:\\path\\to\\anonim-onayli-uyarlanmis-sinavlar-v2.18.zip" "SHA256_REFERANSI"
```

Bu testler kurumsal güvenlik sertifikasyonu değildir.
