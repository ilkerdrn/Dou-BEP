# DOU BEP Sınav Atölyesi v2.54 — Onay işlemi bütünlüğü

**Sadece anonim/sentetik üniversite sınavlarıyla BAP araştırma prototipi.** Bu yazılımın kurumsal dağıtım, gerçek öğrenci/sağlık verisi, PDF/UA veya NVDA/JAWS uygunluk onayı yoktur. DOU teması resmî kurum onayı anlamına gelmez.

## Bu sürüm

- Sınav onayı tek bir `sınav kimliği + revizyon` çifti üzerinde işlem görür; açık öğretmen teyidi, düzenleme izni, kaydedilmiş ve çakışmasız taslak kontrol edilir.
- Onay isteği boyunca editör ve temel eylemler kilitlenir. Önceden başlatılmış sınav okuma istekleri geçersizleştirilir; gecikmiş yerel JSON kurtarma seçimi onay sürerken uygulanmaz.
- Sunucu yanıtının kimliği, revizyonu ve `approved` durumu beklentiyle uyuşmuyorsa istemci başarı göstermez. Sunucudaki kayıt için yeniden kontrol gereklidir.
- **Onay sunucuda kabul edildiğinde** liste veya geçmiş yenileme hatası onayı yanlışlıkla başarısız göstermeyecek şekilde ayrıca bildirilir. Okuma ekranı yenilemesi tekrar denenebilir.
- Eski sınav editörü, tekil/toplu onay ve teslim, destek profilleri, yerel SQLite, DOU Reader, Speech Lab ve tüm eski sürüm dosyaları korunur. Veritabanı migrasyonu yok.

## Windows çalıştırma

1. ZIP'i mevcut kurulumdan **ayrı bir klasöre** çıkarın. Özellikle mevcut `data` klasörü, canlı SQLite ve yönetici kayıtlarının üzerine yazmayın. Node.js 22.13+ gereklidir.
2. `BASLAT.bat` veya PowerShell içinden `npm.cmd start` çalıştırın; http://127.0.0.1:4173/kurum adresine gidin.
3. Yalnız anonim örnek sınavla öğretmen editöründen kaydetme ve onay işlemlerini inceleyin. Sürüm numarasını `/api/health` üzerinden doğrulayın.
4. Yerel kaynak kontrolleri: `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot`.

**Sınırlar:** Onay HTTP isteği fiziksel olarak geri alınamaz; farklı bir cihaz/sekmeyle eşzamanlı kayıt varsa son doğrulama sunucunun sürüm/CSRF/tenant kontrolleridir. Gerçek Windows UI Automation, ekran okuyucu ve Türkçe doğal TTS anlaşılırlık testleri henüz yapılmamıştır. Kişisel/sağlık/sınav verisi bu prototipe girilmemelidir.
