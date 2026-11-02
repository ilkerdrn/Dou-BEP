# DOU BEP v2.39 — Yerel doğrulama ve sınırlar

**Tarih:** 29 Ekim 2026. Yalnız sentetik/anonim araştırma prototipi; üretim veya gerçek öğrenci verisi onayı değildir.

## Uygulanan işlev

- Özgün canlı kaynakta hiçbir DDL/DML çalıştırmadan salt okunur SQLite bütünlüğü ve bütün oturum-dışı tablo satırlarının içerik özeti.
- Kaynak ve tutarlı anlık görüntü üzerinde bağımsız HMAC audit kanıtı doğrulaması; AES-256-GCM şifreli geçici `.bepbak` oluşturma, doğrulama ve izole geri yükleme.
- Eski HTTP oturumlarını silen geri yüklemenin doğrulanması; her tablodaki verinin sıralı, tür-güvenli SHA-256 özetiyle karşılaştırılması.
- Başarılı veya başarısız provada geçici şifreli/düz dosyanın temizlenmesi. Sonuç raporunda kimlik veya veri özeti yok.
- Windows için parolayı gizli alan ayrı PowerShell aracı; dış ağ/haricî bulut zorunlu değil.

## Test matrisi

- **477/477:** Tüm otomatik testler (önceki 471 + 6 yeni test).
- **124/124:** Kaynak/sürüm ve kurallara dayalı dağıtım kontrolleri.
- **10/10:** Mevcut anonim uçtan uca BAP kabul senaryosu.
- **67 dosya, 0 bulgu:** Statik çevrimdışı arayüz taraması. Bu bir firewall testi değildir.
- **Gerçek CLI denemesi:** Sentetik SQLite + bağımsız HMAC + parola ile `storage:drill`, PASS; 22 tablo, 3 satır incelendi. Bozuk kanıt / anahtar eksikliği ve sembolik bağlantı reddi test edildi.

## Sınırlar

Canlı SQLite, WAL/SHM ve uygulama belleği şifrelenmedi. Prova geçici düz SQLite oluşturduğu için gerçek hassas veri kullanımı onaylı değildir. Testler Windows işletim sistemi DPAPI/BitLocker koşullarını fiziksel cihazda doğrulamaz. Audit HMAC yalnız imzalı geçmiş audit kayıtlarını kapsar; veritabanındaki tüm verileri dış saldırgana karşı bağımsız imzalamaz. SSO/OIDC, PDF/UA, kullanıcı erişilebilirlik denemeleri, kurumsal KMS ve bağımsız sızma testleri henüz tamamlanmadı.
