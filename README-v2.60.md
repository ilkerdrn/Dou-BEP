# DOU BEP Sınav Atölyesi v2.60 — Sentetik A/B teknik dinleme provası

**Yalnız yerel, anonim ve sentetik prototip.** Gerçek öğrenci/sağlık/engellilik verilerini, gerçek sınav sorularını veya insan araştırma kayıtlarını içeri aktarmayın. Bu bir klinik, fonetik veya bilimsel körleme sistemi değildir. DOU adı resmî üniversite yazılımı onayı anlamına gelmez.

## Yeni işlev

- `/dou-reader-demo` altında **Teknik A/B provasını aç** düğmesi, v2.59'daki 14 sabit sentetik örneğin her biri için iki WAV çalma kontrolü oluşturur (28 kontrollü ses yolu).
- A/B karşılaştırması önceki spektral ve v2.57 zamanlamalı WAV çekirdeğini **değiştirmeden** kullanır. Yalnız ses oynatma yapılır; yanıt, puan, tercih, kimlik, zaman, mikrofon veya serbest metin kaydı tutulmaz. Ne rapor dışa aktarılır ne de uzak API çağrılır.
- Atamalar **sabit, dengeli ve kaynak koddan incelenebilir**, dolayısıyla gerçek rastgeleleştirme veya bilimsel körleme sağlamaz. Etik kurul/kurum onayı olmadan gerçek katılımcı deneyinde kullanılmaz.
- Ses denemeleri normal Reader'dan ve sınav içeriğinden ayrıdır. Sayfa kapanırken ses durdurulur. Tek bir WAV çalınır; başka bir denemeye geçince eskisi kapatılır.
- Beş yeni kontrollü test ve yeni HTTP regresyon testi eklendi. SQLite/şema, soru bankası, kurumsal onay, mevcut sınav ve DOU Reader iş akışları korunur.

## Windows'ta kontrol

1. ZIP'i önceki kurulumun veya **`data`** klasörünün üzerine yazmadan ayrı bir klasöre çıkarın.
2. Node.js 22.13+ ile `BASLAT.bat` veya `npm.cmd start` başlatın.
3. `http://127.0.0.1:4173/dou-reader-demo` adresine gidin; **Teknik A/B provasını aç** düğmesini seçin. A ve B düğmeleri, yalnız sentetik kodlu örnekleri ayrı ayrı çalar.
4. `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot` komutlarıyla yerel regresyonları çalıştırın.

## Güvenilirlik ve araştırma sınırları

- Bu modül henüz bağımsız doğal Türkçe TTS değildir; cihazda kurulu yerel seslere bağlı Reader'dan ayrı deneysel WAV üreticisidir.
- Gerçek Windows/UI Automation, NVDA, JAWS, fonetik uzman incelemesi, etik süreçler, KVKK ve bağımsız erişilebilirlik kullanıcı testi **tamamlanmamıştır**.
- İnsan verisi toplamayı veya üretimde öğrenciye sunulmayı **desteklemez**. Sesleri beğenmek veya WAV ölçülerini karşılaştırmak anlaşılabilirlik, kalite ya da erişilebilirlik kanıtı değildir.
