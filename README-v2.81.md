# DOU BEP v2.81 — Sınav iş akışı kapanışı ve doğrulanmış indirme

## Değişiklikler
- `npm run exam:closure`: yalnız geçici SQLite kullanan, 25 aşamalı gerçek yerel HTTP kapanış denetimi.
- Kurum girişi/oturumu, sınav oluşturma, yeniden açma, düzenleme, eski revizyonu reddetme, CSRF, bağımsız kurum erişimi, onay ve kaynak ihracı kontrolü.
- Word DOCX ZIP imzası, Türkçe yazdırma HTML'si, onaylı teslim ön kontrolü ve sunucu imzalı teslim ZIP dosyası doğrulaması.
- PDF yapısal pilotu mevcutsa gerçek SHA-256 kontrolü; font veya destek kısıtı nedeniyle sunucu reddederse yalnız açık **422** hata kabul edilir, PDF başarı olarak raporlanmaz.
- Tarayıcıda **PDF ve onaylı ZIP indirmeden önce** gerçek dosya baytlarından SHA-256, `Content-Length`, MIME ve dosya imzası kontrolü; başarısızlıkta diske kaydetme iptal.
- Tüm işlemler yerel; yeni uzak API veya dış bağlantı yok.

## Yerel kontrol
Projeyi çalıştırmadan, yalnız kaynak klasöründe:

```powershell
npm run exam:closure
npm run release:check
```

Kontrol **gerçek `data/` veya kurum hesaplarına dokunmaz**; `os.tmpdir()` altında farklı kurumlara ait yapay hesaplar ve anonim bir sınav oluşturarak geçici SQLite dosyasını siler. Test için kullanılan şifre gerçek kurum şifresi değildir. Windows Node.js 22.13+ gerekli.

## Sınırlamalar
- Bu, kurumsal/öğretmen uçtan uca otomatik kontrolüdür, **gerçek Windows tarayıcı** ve klavye/screen-reader son kullanıcı kabulü değildir.
- PDF pilotu **etiketli yapısal denemedir, PDF/UA sertifikası değildir**. PDF çıktısı ayrıca öğretmen ve erişilebilirlik uzmanı tarafından incelenmelidir.
- Robotik Türkçe ses, Windows NVDA sürücüsü ve BAP etik/gerçek katılımcı pilotu ayrı kalır. Gerçek öğrenci ve özel nitelikli veri kullanılmamalıdır.
- Kurulumdan önce proje ve `data` klasörü ayrıca yedeklenmeli; Windows PowerShell güncellemesi gerçek hedef bilgisayarda henüz sınanmadı.
