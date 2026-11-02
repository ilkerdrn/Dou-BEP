# DOU BEP Sınav Atölyesi — v2.21

## Yeni: Sınav Operasyon Merkezi

Kurum yöneticileri ve koordinatörler için `http://127.0.0.1:4173/sinav-operasyon`.

- Aynı panelde ders/oturum ve akademik dönem filtreleme.
- Onaylı sınav kaynaklarının güncelliği (`unmapped`, `recheck`, `ready`).
- Aynı ders ve dönem için kaydedilmiş onaylı anonim uyarlama kararlarının sayısı.
- En az bir kayıt bekliyorsa veya kaynağın sürümü değiştiyse "hazır" yerine nedenli blokaj.
- **Özet API'si bireysel aday kodu veya uyarlama türlerini döndürmez**; yalnız yönetici ve koordinatör rolü kullanabilir.

Bu hesaplama otomatik yetkilendirilmiş sınav paketini dağıtmaz, sadece hazırlık durumunu gösterir. Son kurumsal onay/sürüm doğrulaması yine sunucu tarafındaki `authorizedBatchProduce` kapısında yapılır.

## Dış ağa bağlantı ilkesi

`npm run offline:audit`: yayımlanan HTML/CSS/JS dosyalarında doğrudan uzaktaki kaynaklara işaret eden script, CSS, fetch, WebSocket vb. kullanımını tarar. v2.21’de dış ağ sağlayıcısı yok. Bazı ses özellikleri tarayıcı/işletim sisteminin konuşma sentezini, MP3 özelliği ise isteğe bağlı **yerel** espeak/ffmpeg komutlarını kullanır; bunlar kendi geliştirdiğimiz motorlar değildir. İleride ayrı BAP iş paketi olarak geliştirilecek.

Bu statik tarama; dinamik üretilen ağ çağrılarını, işletim sisteminin ses sürücüsü davranışını ya da kötü amaçlı kodu kesin olarak dışlamaz. Gerçek kurum bilgisayarı için varsayılan-kapalı çıkış güvenlik duvarı ve paket yakalama testi gereklidir.

## Kurulum

1. Yeni ZIP'i mevcut `data` klasörünü silmeden **ayrı** klasöre tamamen çıkarın.
2. Eski kurulumun verileriyle çalışılacaksa şifreli yedek/restore sürecini doğrulayın. Canlı SQLite veritabanını taşımayın.
3. Windows PowerShell: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\TEK-KOMUT-YEREL-KONTROL.ps1`.
4. Testler başarılı olursa `BASLAT.bat`, `/kurum` oturum açma ve ardından `/sinav-operasyon`.
5. Gerçek öğrenci/sağlık verisi kullanmayın. Çevrimdışı çalışabilen *pilot* olmak, kurumsal KVKK ve güvenlik onayı demek değildir.

## Sürüm koruma

Kaynak v2.20 Windows test düzeltmeli sürümdür. Mevcut sınav, aday kararı, koordinasyon, toplu üretim ve belge aktarım modülleri korunur. Yeni panel yalnızca okuma amaçlıdır; yeni veritabanı tablosu oluşturmaz. v2.21 oturum/uyarlama kararlarını düzenlemez.

## BAP ve kapanış kriterleri

Ayrıntılar: `BAP-URUN-VE-ARASTIRMA-PLANI.md`. Özellikle üretim güvenliği, mevzuat, uzman/yardımcı teknoloji pilotu ve kendi ses motoru henüz tamamlanmamıştır.
