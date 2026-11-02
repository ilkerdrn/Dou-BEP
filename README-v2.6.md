# DOU BEP Sınav Atölyesi v2.6 — Otomatik kayıt ve taslak kurtarma

**Yerel anonim pilot; Doğuş Üniversitesi tarafından onaylı resmî yazılım değildir.**

## Yeni işlevler

- Öğretmen bir alanı düzenlediğinde, yaklaşık **2,4 saniyelik hareketsizlik** sonunda sınav otomatik olarak kurumsal oturumun SQLite veritabanına kaydedilir.
- İlk değişiklikle ilk taslak oluşturulur; ilk açılışta boş sınavlar otomatik kaydedilmez.
- **Şimdi kaydet** veya `Ctrl+S` ile kayıt hemen tetiklenebilir. Sınav onayı ayrı işlemdir; otomatik kayıt onay oluşturmaz.
- Kayıt durumları: bekliyor, kaydediliyor, kaydedildi, kayıt hatası, sürüm çakışması.
- Her kayıtta eski sunucu sürüm numarası (optimistic locking) kullanılır. Başka sekme sınavı kaydetmişse `409 revision_conflict` döner; uygulama **otomatik olarak eski sürümü ezmez**. Düzenleme mevcut sekmede kalır.
- Çakışma/hata durumunda öğretmen **yerel JSON kurtarma kopyasını indirip** tekrar yükleyebilir. İçe aktarılan dosya mevcut sınavı ezmez; **ayrı yeni taslak** oluşturur ve otomatik kaydolur.
- Sınav kütüphanesindeki **Son taslağı aç** seçeneği, oturum sahibinin sunucuda en son kaydettiği taslağı yükler. Sayfa yeniden açıldığında henüz sunucuya kaydedilmemiş son saniyelik düzenlemeler geri getirilemez.
- Sekme kapatılırken değişiklikler varsa tarayıcı uyarısı gösterilir. Tarayıcı bu uyarıyı her durumda göstermeyebilir.

## Mahremiyet / güvenlik

Tarayıcı `localStorage`, `IndexedDB` veya çerezlere sınav taslağının içeriğini yazmaz. Otomatik kayıt mevcut yetkilendirilmiş `/api/exams` yolunu kullanır; oturum ve CSRF denetimi uygulanır. Yerel kurtarma JSON dosyası soru ve cevap anahtarı içerebilir, **şifreli değildir**; güvenli saklanmalıdır. Gerçek öğrenci kimliği, sağlık bilgisi, tanı, ses vb. sisteme veya kurtarma dosyasına girmeyin. İçe aktarmanın alan kontrolleri kişisel verileri eksiksiz tespit eden garanti değildir; sunucu kaydında ek denetimler bulunur.

## Windows başlatma

1. Node.js 22.13+ gerekir.
2. ZIP'i ayrı bir klasöre çıkarın. Eski `data/institution.sqlite` dosyasını kaybetmeyin; taşıma işlemi için önce **şifreli yedek** oluşturun, açık veritabanını kopyalamayın.
3. `BASLAT.bat` çalıştırın. Giriş: `http://127.0.0.1:4173/kurum`.
4. Hesabınız yoksa `KURULUM-YONETICI.ps1`; şifreniz çalışmıyorsa aynı veritabanının bulunduğu klasörde `SIFRE-SIFIRLA.ps1` kullanın. Hiçbir hazır parola yoktur.
5. Kurumsal sınav editöründe bir alanı değiştirin; kayıt durumu mesajını kontrol edin.

Doğrulama: `npm test`, `npm run release:check`. Testlerin geçmesi gerçek ekran okuyucu, kurumsal güvenlik veya pedagojik uygunluk sertifikası anlamına gelmez.
