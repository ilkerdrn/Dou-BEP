# DOU BEP Sınav Atölyesi v2.73 — dengeli fonem kıyaslaması ve deneysel NVDA güvenliği

**Araştırma prototipi — insan anlaşılabilirliği kanıtlanmadı, öğrenci/sağlık/sınav verisi kullanmayın.**

## Yeni test: 24 dengeli deneme

`http://127.0.0.1:4173/dou-speech-intelligibility` adresinde **Dengeli 24 deneme** seçeneği varsayılandır. Sabit altı Türkçe sözcük çiftindeki her sözcük, eski/aday sesin her biriyle bir kez çalınır: 6 × 2 × 2 = 24. Sıralama tarayıcının yerel kriptografik rastgeleliğinden türetilir. Eski 12 denemelik kısa yöntem de korunur. Bu tasarım araştırma protokolü için küçük bir gelişmedir; katılımcı, örneklem, etki gücü veya etik onay sağlamaz.

Sonuç tablosu ancak tüm denemeler tamamlanınca açılır. Eski ve yeni seslerin doğru tanınan sözcük sayısı 12 üzerinden karşılaştırılır; rapor sadece bu sabit örneklerden oluşur. JSON/CSV indirme kullanıcı düğmesiyle gerçekleşir. İsim, oturum ID'si, tarih, gerçek sınav metni, mikrofon, çerez, otomatik kayıt ve uzak API yoktur. `data/` değiştirilmez.

## NVDA (yalnız izole test)

`nvda-experimental/synthDrivers/douBepPilot` içinde sürücü *kaynağı* var. Yeni sürümde `cancel` ile eşzamanlı gecikmiş işaretler, kapatılmış sürücüye `speak` çağrısı ve yinelenen `terminate` daha sıkı kontrol edilir. Mock NVDA oynatıcı ve taklit subprocess kullanan 4 Python birim testi eklendi. **Bu testler gerçek Windows, NVDA, odak, sayfa okuma veya erişilebilirliği kanıtlamaz**. NVDA test profili dışında yüklemeyin, varsayılan NVDA sesini değiştirmeyin.

## Mevcut kurulumu güncelleme

1. Önce projeyi ve `data/` klasörünü ayrı yere yedekleyin, `BASLAT.bat` penceresini kapatın.
2. `DOU_BEP_v2_73_YAMA.zip` dosyasını **ayrı bir klasöre** çıkarın.
3. `GUNCELLE.bat` dosyasını çalıştırın. Varsayılan hedef `Desktop\New folder (7)`; alternatif için `GUNCELLE.ps1 -Target "C:\..."`.
4. `BASLAT.bat` ile yeniden başlatıp `/dou-speech-intelligibility` adresini açın.
5. En az bir 24'lü anonim deneme yapın; doğru/yanlış seçimi ve dışa aktarılan CSV'yi kontrol edin.

Yama yalnız kaynak dosyalarını değiştirir, SQLite ve demo hesaplarını paketlemez. Windows üzerinde son kabul ayrıca gereklidir.
