# DOU BEP Sınav Atölyesi v2.55 — Çevrimdışı Reader ses kuyruğu güvenliği

**Yalnız sentetik/anonim üniversite sınavları ile yerel BAP Ar-Ge prototipi.** Gerçek öğrenci, engellilik, tanı veya kişisel bilgilerle kullanım için onaylı değildir.

## İyileştirmeler

- DOU Reader, soruları cihazda kurulu ve tarayıcının **yerel** olduğunu bildirdiği Türkçe ses aracılığıyla okuyabilir. Bu bir kendi geliştirdiğimiz doğal TTS motoru değil; işletim sistemindeki sesin kontrollü kullanımıdır.
- Uzun metnin her ses parçasından önce yerel ses yeniden kontrol edilir. Ses kaldırılır, uzaktan hizmete dönüşür ya da liste okunamazsa oynatma kesilir, otomatik başka bir ses veya bulut servisi seçilmez. Tarayıcının `localService` bilgisi tek başına tüm ağ davranışını kanıtlamaz.
- Gecikmiş/çift konuşma sonu ve hata bildirimleri ses parçalarını atlayamaz. Okuma paneli kapatılırken tarayıcı ses değişiklik dinleyicisi temizlenir.
- Hiçbir veritabanı şeması, kullanıcı hesabı, soru, onay kaydı veya diğer araştırma laboratuvarı değiştirilmedi.

## Windows'ta açma

1. ZIP'i eski sürümün veya `data` klasörünün **üzerine yazmadan** ayrı bir klasöre çıkarın. Node.js >=22.13 gerektirir.
2. `BASLAT.bat` veya PowerShell'de `npm.cmd start`, sonra `http://127.0.0.1:4173/dou-reader-demo`.
3. Cihazda yerel Türkçe ses varsa yalnız sentetik sorularla okuyucuyu deneyin. Kurulu ses yoksa yazılı soru kullanılmaya devam eder.
4. Kaynak testleri: `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot`.

**Sınırlar:** Gerçek Windows, NVDA/JAWS, farklı tarayıcı ve ses cihazı uyumluluğu ile doğal Türkçe TTS anlaşılırlığı henüz doğrulanmadı. Kurumsal KVKK/etik onayı, PDF/UA ve üretim veri koruması tamamlanmadı. GitHub Actions gerekli değildir.
