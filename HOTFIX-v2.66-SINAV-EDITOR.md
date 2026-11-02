# DOU BEP v2.66 — Kurumsal sınav editörü boş ekran düzeltmesi

## Bulgu
`/kurumsal-sinav` sayfası ve `/institutional-exams.mjs` HTTP 200 verirken bu JavaScript modülünün tarayıcıda ihtiyaç duyduğu `question-access.mjs` ve `presentation-variants.mjs` dosyaları `server.mjs` izin listesinde yoktu (HTTP 404). Ayrıca pilot yönetim ekranının kullandığı `objective-observations.mjs` de yayın listesinde yoktu. Tarayıcıda ES Module içe aktarımı başarısız olunca sınav editörünün `init()` fonksiyonu çalışmıyor, giriş uyarısı ve çalışma alanı başlangıçta `hidden` durumda kaldığı için ekran boş görünüyordu.

## Uygulanan düzeltme
`server.mjs` statik dosya listesine yalnız üç doğrulanmış tarayıcı modülünün `text/javascript; charset=utf-8` içerik türüyle eklenmesi. Yetkilendirme, SQLite şeması, kimlik doğrulama, oturumlar, veriler veya sınav/onay akışları değiştirilmedi. Genel dosya sunucusu açılmadı.

`editor-static-deps.http.test.mjs` dosyasında HTML sayfalarından başlayan tüm erişilebilir ES module import zincirini izin listesine göre denetleyen regresyon testi eklendi.

## Doğrulama
- Yeni ve ilişkili entegrasyon testleri: 12/12 başarılı.
- Dağıtım denetimi: 274 PASS.
- Çevrimdışı statik kaynak kontrolü: 101 dosya, 0 doğrudan haricî kaynak bulgusu.
- Özel dosya erişimi: HTTP 404 beklenen yollar doğrulandı.
- Gerçek tarayıcı otomasyonu bu çalışma ortamındaki yerel ağ yöneticisi kısıtlamasına takıldı; kullanıcının Windows tarayıcısında son ekran doğrulaması gereklidir.

## Windows düzeltme
`DUZELT-SINAV-EKRANI.ps1` komutunu Windows PowerShell ile çalıştırın. Betik yalnızca `C:\Users\<kullanıcı>\Desktop\New folder (7)\server.mjs` dosyasına üç izin satırı ekler; önce zaman damgalı yedek alır, idempotent çalışır, `node --check` başarısız olursa geri yükler. Sunucuyu `Ctrl+C` ile durdurup `BASLAT.bat` ile yeniden başlatın, tarayıcıda `Ctrl+F5` ile `http://127.0.0.1:4173/kurumsal-sinav` açın.

**Not:** Var olan proje `data/` klasörünü veya SQLite dosyasını silmeyin, yeniden kurmayın. Paket yalnızca anonim test örnekleri ve kaynaklar içerir.
