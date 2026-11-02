# DOU BEP Sınav Atölyesi v2.70 — bağlamsal okunuş deneyi

**30 Ekim 2026 — yalnız yerel araştırma prototipi.** Ses motoru henüz anlaşılır/doğal Türkçe TTS olarak doğrulanmamıştır; NVDA entegrasyonu veya tam Windows ekran okuyucusu değildir. Gerçek sınav, öğrenci, engellilik ya da sağlık verisi girmeyin.

## v2.70 yenilikleri

- `/dou-reader-demo` sayfasında **Tarih, saat ve kısaltmalar** seçeneği: önceki okunuş varsayılan kalır; **Bağlamsal okunuş (deneysel)** yalnız kullanıcı seçerse etkinleşir.
- Açık `gg.aa.yyyy` biçimi için 1900–2099 yıllarında doğru takvim günü ve artık yıl kontrolü. Örneğin `29.10.2026` → `yirmi dokuz ekim iki bin yirmi altı`.
- `SS:DD` 24 saat biçimi için saat 00–23, dakika 00–59 doğrulaması. `saat 09:30` → `saat dokuz otuz`; mükerrer `saat saat` önlenir.
- **Yalnız** `T.C.`, `Prof.`, `Doç.`, `Dr.`, `Sn.` kısaltmaları beyaz listeyle dönüştürülür. Diğer ifadelerde tahmin yoktur.
- **Okunuşu önizle**: WAV hesaplamadan önce planlanan deneysel kelimeleri gösterir. Güncel ayarlar değişirse eski ses bellekten kaldırılır.
- Mevcut v2.68 / v2.69 ses kolları ve eski A/B/C/D örnekleri değişmeden bırakılır; yeni mod opt-in'dir.
- PCM WAV yalnız tarayıcıda oluşturulur; metin ağ üzerinden gönderilmez ve uygulama veritabanına kaydedilmez. Dosya ancak kullanıcı açıkça indirirse cihazına yazılır.

**Sınırlamalar:** Para, ondalık, telefon, belirsiz tarihler ve genel morfoloji için otomatik anlam çıkarımı yok. Tarih/saat dönüşümünü duymak sesin anlaşılır olduğunu kanıtlamaz. Ekran okuyucu motoru / NVDA sürücüsü, saha ve görme engelli kullanıcı kabulü tamamlanmamıştır.

## Kurulum / güvenli yama

1. Çalışan `BASLAT.bat` sürecini sonlandırın. Mevcut proje ve özellikle `data/` dizinini ayrıca yedekleyin.
2. `DOU_BEP_v2_70_GUVENLI_YAMA.zip` paketini **ayrı bir klasöre çıkarın** ve `GUNCELLE.bat` çalıştırın. Varsayılan kurulum `Desktop\New folder (7)`; farklı dizin için `GUNCELLE.ps1 -Target 'D:\Projeler\DOU-BEP'`.
3. Yama yalnız kaynak kodları günceller, değişen dosyaları `_upgrade_backups/` içine alır; `data`, SQLite, hesaplar, anahtarlar ve geçmiş gerçek sınav dosyaları paketlenmez veya değiştirilmez.
4. Önceki 2.67/2.68/2.69 kodları desteklenir; farklı sürümde yama değişiklik yapmadan durur.
5. `BASLAT.bat` ile yeniden başlatın; `/dou-reader-demo` sayfasını açın, `Ctrl+F5` yapın. Anonim örnek `Prof. Dr. 29.10.2026 tarihinde saat 09:30.` ile **Okunuşu önizle**, ardından **WAV üret ve dinle** düğmelerini deneyin.

## Test dürüstlüğü

- Yeni bağlamsal normalizasyon ve eski motor koruma hedefli testleri geçti.
- Kod kalite ve çevrimdışı dağıtım kontrolleri, izolasyonlu HTTP kurum girişi / anonim sınav kaydı başarılıdır.
- Tam 130 dosyalık regresyonu çalıştırma denemesinde ilk ağır test grubu ortam süre sınırında kesildi. Bu nedenle **tam regresyon geçti** iddiası yoktur.
- Gerçek Windows tarayıcı / NVDA denemeleri yapılmadı. BAP/prod güvenlik ve erişilebilirlik onayı yoktur.
