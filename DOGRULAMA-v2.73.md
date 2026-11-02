# DOU BEP Sınav Atölyesi v2.73 — doğrulama notu

30 Ekim 2026 — yalnız araştırma prototipi. **İnsan anlaşılabilirliği, klinik uygunluk, erişilebilirlik kabulü veya gerçek Windows/NVDA entegrasyonu kanıtlanmadı.**

## Doğrulananlar

- Otomatik regresyon: **709/709 başarılı**, 14 test grubunda 134 test dosyası. İlk koşuda eski `2.72.0` bekleyen 10 sürüm-metadata testi hata verdi; ilgili 9 test dosyası güncellendi ve başarısız altı grup tekrar çalıştırılarak geçti.
- 24 dengeli deneme: altı çift × iki sözcük × iki ses motoru; izin verilen tüm kombinasyonlardan biri, sabit hedefler ve yeni rastgele sıra.
- Bu protokol yalnız sekme belleğini kullanır; sonuçlar bitmeden doğruluk veya motor bilgisi açıklanmaz; isteğe bağlı rapor JSON/CSV'dir.
- 12 denemelik eski rapor ve test yolu korunmuştur. Dengeli 24 raporunda her ses motoru **12 yanıt** kullanır; fonem tablosunda her çift için **iki yanıt** vardır. Katılımcı sayısı, anlamlılık ve insan doğrulaması **yoktur**.
- Python NVDA mock testleri: **12/12** (`test_wave_contract.py`: 8; `test_driver_lifecycle.py`: 4). Gerçek NVDA veya Windows üzerinde koşulmadı.
- `node release-check.mjs`: **308/308** dağıtım ve sınırlama kontrolü geçti. Denetim gerçek kullanım/pen-test kabulü değildir.
- Tam proje ZIP ayrı klasöre çıkarılıp geçici demo kurumla **28/28 HTTP kontrolü** tamamlandı: giriş, oturum, anonim sınav taslağı HTTP 201, dengeli protokol modülleri, özel kaynakların 404 engeli.

## Verilerin korunması

`data/`, SQLite, oturum çerezleri, gerçek katılımcı ses kayıtları, loglar ve gizli anahtarlar ZIP'lerde yoktur. Yama yalnız kaynakları SHA-256 ile doğrulayarak yedekler ve hata halinde geri yüklemeye çalışır. Kullanıcının mevcut Windows kurulumuna bu ortamdan erişilemedi.

## Açık işler

- Gerçek Windows/Chrome ekran testi ve kullanıcı hesabı ile açılış testi bilgisayar üzerinde ayrıca yapılmalı.
- Gerçek NVDA 2026.x `WavePlayer`, `cancel`, duraklatma ve odak sinyalleri izole test profilinde denenmeli.
- Fonem ses kalitesi karşılaştırması için fonetik uzmanı ve uygun etik/izin süreçli, katılımcı temelli değerlendirme gerekir. 24 tekil örnek kalite artışını kanıtlamaz.
