# DOU BEP Sınav Atölyesi v2.52 — otomatik kayıt yarış kontrolü ve klavye odağı

**Yalnız anonim ve sentetik BAP/Ar-Ge prototipi.** Gerçek öğrenci, sağlık veya sınav verisiyle kullanım için henüz onaylanmadı. DOU, resmî kurumsal ürün ya da erişilebilirlik sertifikası iddiası değildir.

## Yenilikler

- Otomatik kayıt gönderildikten sonra kullanıcı başka sınava veya taslağa geçerse, **eski HTTP yanıtı artık yeni açık sınavın `current` durumunu ve onay geçmişini değiştiremez**. İstek sunucuda tamamlanmış olabilir; bu kontrol yalnızca geç gelen tarayıcı yanıtının karışmasını önler. Sunucudaki olası kaydı geri almaz.
- Yeni taslağa geçişte eski uçuş hâlindeki kayıt mantıksal olarak ayrılır: yeni taslak, eski ağ isteğinin bitmesini beklemek zorunda kalmaz. Eski isteğin geç gelen hatası yeni taslakta yanlış hata olarak gösterilmez. Mevcut sürüm uyuşmazlığı/CSRF ve sunucu onay korumaları değişmedi.
- Öğretmen panelindeki **Sınav hazırlık kontrolü → Bu adıma git** artık yalnız sayfayı kaydırmaz, hedef başlığa klavye odağını da taşır. Bu, otomatik WCAG veya NVDA uygunluğu belgesi değildir.
- `core.mjs`, `/api/health`, örnek okuyucu sürüm etiketi ve başlatıcı başlığı `2.52.0` ile eşitlendi. Testlerdeki sürüm beklentileri güncellendi. Veritabanı şeması, eski sınavlar, kurulu `data` ve deneysel akustik modüller değiştirilmedi.

## Yerel Windows kullanım

1. ZIP'i **eski sürümün veya `data` klasörünün üzerine yazmadan** ayrı bir klasöre çıkarın. Node.js >=22.13 gerekir.
2. `BASLAT.bat` veya PowerShell'de `npm.cmd start` ile açın; `http://127.0.0.1:4173/kurum` adresine gidin.
3. Kurum sınav editöründe taslak kaydı ve hazırlık kontrolü aşamalarını deneyin. Sadece anonim/sentetik veri kullanın.
4. İsterseniz `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot` komutlarını çalıştırın.

## Kısıtlar

Gerçek Windows/NVDA ve yerel ses cihazı testleri, doğal ve anlaşılır Türkçe TTS, canlı SQLite şifreleme, kurumsal SSO/HTTPS, PDF/UA, etik/KVKK onayı ve gerçek kullanıcı kabulü yoktur. Uzaktaki kayıt isteğini fiziksel olarak iptal etme garantisi verilmez. Yeni sınava geçerken kaydedilmemiş değişiklikleri bırakma konusunda mevcut kullanıcı uyarısı geçerlidir.
