# DOU BEP Sınav Atölyesi v2.5 — Öğretmen hazırlık masası

v2.4'ün üzerine geliştirilmiş, DOU'dan görsel olarak esinlenen, **resmî olmayan** anonim yerel pilot sürümüdür.

## Geliştirme

- Sınav editöründe 5 adımlı **hazırlık durumu**: sınav bilgileri, BEP hedefleri, sorular, erişilebilirlik/öğretmen kontrolleri, kaydetme/onay.
- Her adım gerçek taslaktan hesaplanır; doğrulama metni, puan, doğru yanıt veya kişisel veri dışa aktarılmaz.
- Öğretmen tek tıklamayla ilgili alana gider; kontrol CSV raporu sınıflandırma ve durumdan oluşur.
- Metin, kazanım, alternatif soru veya sürüm değişirse görünür durum yeniden hesaplanır.
- Bu **iş akışı kontrolü**, pedagojik yeterlilik, tıbbî değerlendirme, WCAG onayı veya kurumsal sertifika değildir.

## Çalıştırma

1. Node.js 22.13+ kurun.
2. ZIP'i tam olarak ayrı bir klasöre çıkarın. Mevcut `data` klasörünü yeni sürüme taşıyacak veya yedekleyecekseniz önce şifreli yedek oluşturun; veri tabanı dosyasını çalışan sunucu açıkken kopyalamayın.
3. İlk kullanım: `KURULUM-YONETICI.ps1`. Mevcut hesap parolası: `SIFRE-SIFIRLA.ps1`; yalnızca seçili klasörün aynı SQLite veritabanını açar.
4. `BASLAT.bat`; panel `http://127.0.0.1:4173/kurum`.
5. Sınavlar → **Sınav hazırlık kontrolü** → eksik aşamaya git.

Komutlar: `npm test` ve `npm run release:check`.

## Sınırlar

Sistem yerel `127.0.0.1` üzerinde kalır. Gerçek öğrenci adı, tanı, sağlık veya çocuk ses verisi girmeyin. HTTPS, kurum SSO/MFA, güvenlik denetimi ve gerçek yardımcı teknoloji kullanıcı testleri tamamlanmadı.

Rakip analizi ve sonraki sürüm kabul ölçütleri: `RAKIP-ANALIZI-v2.5.md`.
