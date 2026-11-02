# DOU BEP Sınav Atölyesi v2.8 — Sınav kopyalama ve akıllı sınav listesi

**Kapsam:** Yalnızca yerel, anonim öğretmen pilotu. Doğuş Üniversitesi, MEB veya başka bir kuruluş tarafından onaylanmış/resmî sistem değildir. Gerçek öğrencilerin adını, kimliğini, tanısını, sağlık ve ses verisini kullanmayın. Otomatik testler özel eğitim uzmanı değerlendirmesinin yerini tutmaz.

## v2.8 yenilikleri

1. **Sınavı yeni taslak olarak kopyala:** Kurumsal oturumda `/kurumsal-sinav` > **Sınav taslakları** > **Kopyala**. Kullanıcıdan onay alınır; kaynak sınav değiştirilmez. Yeni kopya, ayrı bir UUID ve sahip, revizyon 1 ve `draft` statüsüyle sunucuya kaydedilir. Kopyalanan sınav başlığına `— Kopya` eklenir; sınav editöründen değiştirilebilir.
2. **Öğretmen kontrolünü zorunlu tutar:** Soru metinleri, yanıtlar, kazanım eşlemeleri ve yazı tipi/kontrast/erişilebilirlik destekleri korunur. Önceki sınavın onayı, onay geçmişi, BEP hedefi doğrulaması, alternatif metin eşdeğerlik onayları ve kaynak gözden geçirme bayrakları **aktarılmaz**. Kopyaya `guided` (öğretmen kontrollü) politika uygulanır. İçerik yeniden incelenip ayrı onay verilmeden onaylı dışa aktarma yapılamaz.
3. **Sınav arama/filtre:** Sınav başlığına göre Türkçe harf duyarlı yerel arama; tümü/taslak/onaylı filtreleri ve sonuç sayacı. Arama yalnızca o kurumun kullanıcının görmeye yetkili olduğu kayıt listesi üzerinde çalışır. İstemci depolamasına sınav içerikleri yazılmaz.
4. **Güvenli kopyalama denetimi:** Yetki ve kurum ayrımı, CSRF, kaynak revizyonu (eski listeyle kopyalama engellenir) ve kurumun 200 sınav sınırı uygulanır. `exam.duplicated` olayı kurum denetim günlüğüne eklenir. Mevcut sınavlar ve onaylar yerinde kalır.
5. **Windows başlangıç sürüm denetimi:** 4173 portunda eski v2.7 çalışırken yeni v2.8 başlatıcısı artık yanlışlıkla eski uygulamayı açmaz; kapatılması gerektiğini bildirir. Başka programların portlarına/dosyalarına müdahale etmez.

## Kurulum veya güncelleme (Windows)

**Yeni kurulum:** Node.js 22.13+ (Node.js 24 desteklenir). ZIP'i yeni klasöre tamamen çıkarın. İlk kurulum için `KURULUM-YONETICI.ps1` ile hesap oluşturun; varsayılan kullanıcı/parola bulunmaz. `BASLAT.bat` çalıştırın; `http://127.0.0.1:4173/kurum` sayfasını açın.

**v2.7'den mevcut hesap ve sınavları koruyarak güncelleme:**

1. Eski uygulamada `npm run backup` ile **şifreli yedek** oluşturun ve yedeğin doğruluğunu kontrol edin (`npm run backup:verify` komutunun yönergelerini izleyin). Yedek anahtarını güvenli yerde saklayın.
2. `BASLAT.bat` konsolunda `Ctrl+C` ile eski uygulamayı tamamen durdurun. Arka planda SQLite'a yazan işlem kalmadığından emin olun.
3. v2.8 ZIP içindeki uygulama dosyalarını mevcut proje klasöründeki kod dosyalarının üstüne çıkarın. **`data/` dizinini, `institution.sqlite` dosyasını ve yedeklerinizi silmeyin, üzerine yazmayın veya ZIP'e eklemeyin.** v2.8 arşivinde `data/` yoktur.
4. `BASLAT.bat` ile açın, aynı kurum hesabıyla giriş yapın; mevcut sınavları doğrulayın. Yeni boş klasöre geçerseniz eski hesabınız kendiliğinden taşınmaz.

**Güvenlik:** Mevcut sürüm yalnızca `127.0.0.1` üzerinde dinler. Gerçek öğrenci verisiyle kullanım, kurumsal internet yayını, HTTPS/SSO/MFA, dış güvenlik incelemesi, yardımcı teknoloji ve uzman/kullanıcı pilotu bu paketle doğrulanmamıştır.

## Teknik doğrulama

- `npm test` — 260/260 otomatik test başarılı (v2.8 tam paket için son kontrol).
- `npm run release:check` — 13/13 yerel yapılandırma ve güvenlik kontrolü başarılı; sızma testi değildir.
- Yeni `server-foundation/exam-duplicate.test.mjs`: kurum/rol yalıtımı, kopya revizyonu, kopyalanmayan onaylar, HTTP/CSRF, kota ve arayüz işaretlemeleri.
- `launcher-check.test.mjs`: sürüm ayırt etme ve port güvenliği.

## Sonraki araştırma ve ürün adımı

Kurumsal kaynak/kazanım kodlarının provenance ve yayım denetimi; farklı erişilebilirlik profilleri için uzman eşdeğerlik değerlendirmesi; gerçek ekran okuyucu testleri; anonim pilot kabul kriterleri. Otomatik tanı, düzey değiştirme veya pedagojik onay kararı yoktur.
