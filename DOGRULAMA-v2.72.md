# DOU BEP Sınav Atölyesi v2.72 — teknik doğrulama

30 Ekim 2026. **Araştırma prototipi; klinik/akademik/erişilebilirlik üretim onayı DEĞİLDİR.**

## Kanıtlanmış otomatik denetimler

- Hedefli JS birim testleri: **19/19** (`dou-speech-intelligibility`, `dou-speech-recognition-report`, `dou-speech-nvda-bridge`).
- Bağımsız Python PCM WAV sözleşme testi: **8/8** (`test_wave_contract.py`).
- Gerçek Node köprüsü WAV çıktısı bağımsız Python doğrulama fonksiyonundan geçirildi: 22.05 kHz tek kanal / 16-bit; üretim çıktı örneğinde 29.657 PCM çerçevesi.
- `node release-check.mjs`: **304/304** statik/dağıtım kontrolü geçti; çevrimdışı tarama doğrudan dış bağımlılık göstermedi.
- Geniş otomatik testlerde ilk 6 grup: **341/341 başarılı**. Ayrı bir sürüm-metadata düzeltmesinden sonra ilgili tekrar testleri: **33/33 başarılı**. Geniş regresyonun tamamı uzun süren yedekleme/denetim testleri nedeniyle süre sınırında kesildi. **Bütün testler geçti veya tüm Windows kabulü tamamlandı denmiyor.**

## Güvenlik ve tasarım

- Dinleme provası doğru yanıtı her deneme sonrasında açıklamaz; finalde yalnız anonim sabit çiftlerden hesaplanan özet verilir.
- JSON/CSV indirme yalnız kullanıcı düğmeye basarsa çalışır. Her iki çıktı raporla sınırlıdır; katılımcı kimliği, tarih/saat, kullanıcı e-postası, sınav metni, IP veya mikrofon kaydı yoktur.
- NVDA sürücüsü sistemde kurulmaz. WAV başlığındaki RIFF veri boyutu, PCM biçimi, örnek hızı, kanal sayısı ve 60 saniye üst sınırı doğrulanmadan oynatıcıya PCM verilmez.
- Güncelleme `data/`/SQLite/özel anahtarları ZIP'e eklemez; yama önce kaynak hash'i doğrular, değiştireceği kaynakları yedekler ve kod kontrolü başarısız olursa geri yükler. Gerçek Windows kullanıcı kurulumu henüz uygulanmadı.

## Açık konular

- NVDA 2026.x için gerçek Windows/sanal makine `cancel`, `pause`, odak, `say all`, özel karakter, cihaz kaybı ve kullanıcı kabul testleri yapılmadı.
- Fonetik uzman ve etik/izin kapsamında, gerçek katılımcıların anlaşılabilirliği değerlendirilmedi. 6 ikili karşılaştırma (her motor için 6 yanıt) istatistiksel başarı kanıtı değildir.
- Güncelleme yamasının kullanıcının bilgisayarında uygulanması ve güncel tarayıcı görünümü ayrıca doğrulanmalıdır.
