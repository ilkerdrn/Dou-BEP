# DOU BEP Sınav Atölyesi v2.10 — öğretmen kontrollü soru şablonları

**Kullanım sınırı:** Bu sürüm yalnızca anonim ve yerel pilot içindir. Doğuş Üniversitesi, MEB veya herhangi bir kurum adına onaylı bir ürün değildir. Gerçek öğrenci adı, tanı, sağlık bilgisi, ses kaydı ve kişisel BEP belgesi yüklemeyin.

## v2.10 yenilikleri

- Kurumsal sınav editöründe **Hızlı soru iskeletleri** paneli. Öğretmen yedi şablondan birini seçer:
  1. Üç seçenekli çoktan seçmeli
  2. Büyük seçim alanlı iki seçenekli soru
  3. Tek adımlı kısa yanıt
  4. Doğru / Yanlış
  5. İki satırlı eşleştirme
  6. Nesne gruplarıyla çoktan seçmeli
  7. Sayı doğrusu içeren kısa yanıt
- Şablon, sınavın genel BEP hedefinden veya öğretmenin **açıkça seçtiği** mevcut BEP hedefinden boş soru oluşturur. Soru/hedef eşleştirmesi otomatik tahmin edilmez.
- Şablonlar **soru metni, seçenek içeriği, cevap anahtarı, sadeleştirilmiş metin ve görsel alternatifini boş bırakır**. Otomatik yanıt veya pedagojik eşdeğerlik onayı yoktur; eksik içerik mevcut kalite kuralları nedeniyle onaylanamaz.
- İki seçenekli şablonda yalnızca büyük seçim alanı ön seçilir. İki seçenekli sorunun tahmin etkisi için öğretmen uyarılır.
- Görsel şablonlar sayı doğrusu/nesne biçimini hazırlar. **Görsel açıklamalar** seçeneği sınav düzeyinde öğretmen tarafından ayrıca açılmalı, sayılar ve metin alternatifi doldurulmalıdır.
- Bir sorudan sonra metin alanına odaklanılır; ekran daralınca seçiciler tek sütuna geçer.
- Soru sınırı 100; kontrol düğmesi yetkisiz rolde veya hedef geçersizse kapalıdır.
- v2.9'un hedef–soru kapsam matrisi, otomatik kayıt, yetki izolasyonu ve onay mekanizması korunmuştur. Yeni veritabanı tablosu veya veri migrasyonu yoktur.

## Windows kullanımı

1. Node.js 22.13+ gerekir (Node.js 24 de desteklenir).
2. Yeni kurulumda ZIP'i boş klasöre çıkarın. `KURULUM-YONETICI.ps1` ile varsayılan olmayan yönetici hesabını oluşturun; `BASLAT.bat` ile `http://127.0.0.1:4173/kurum` adresinde açın.
3. v2.9'dan güncellemede öncelikle eski kurulumun şifreli yedeğini alın, doğrulayın ve uygulamayı kapatın. Yeni ZIP'ten yalnızca **kod dosyalarını** eski klasöre aktarın. **`data/`, `institution.sqlite` ve şifreli yedeklerin üzerine yazmayın; silmeyin.**
4. Oturum açın, kurumsal sınav editörüne girin. Genel BEP hedefini (8–400 karakter) yazın veya önceden kaydettiğiniz BEP hedeflerinden birini seçin. **Hızlı soru iskeletleri** alanından şablon seçip **boş soru ekle** düğmesine tıklayın. Soru, seçenekler, doğru yanıt, varsa görsel betimlemeyi tamamlayın.
5. Kalite kontrolleri ve öğretmen incelemeleri sonrası kaydetme/onay aşamalarını tamamlayın. Boş soruyu onaylamak mümkün değildir.

## Doğrulama

- `npm test`: **280/280 PASS** (v2.9 temel testleri ve yeni modül + HTTP entegrasyon testleri).
- `npm run release:check`: **13/13 PASS**. Yerel dağıtım kontrolleri güvenlik sertifikası veya sızma testi değildir.
- `node --check` ile yeni modül, editör, sunucu JS söz dizimi denetlendi.
- Chromium uçtan uca görsel/test etkileşimi **yapılamadı**: test ortamındaki tarayıcı yerel ağ adresini yönetici kuralıyla engelledi (`ERR_BLOCKED_BY_ADMINISTRATOR`). Unit/HTTP testleri geçti ancak tam tarayıcı pilotu yerine geçmez.

**Yapılmayanlar:** Gerçek ekran okuyucu testleri (NVDA, JAWS, VoiceOver, TalkBack), gerçek uzman pedagojik değerlendirme, çocuk kullanıcı pilotu, KVKK değerlendirmesi, kurum onayı, HTTPS/SSO/MFA, bağımsız sızma testi. Gerçek öğrenci veya sağlık verisi girmeyin.
