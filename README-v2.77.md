# DOU BEP v2.77 — Yerel fonem raporu denetimi

Bu sürüm kendi dört robotik ses modelini değiştirmez. `dou-speech-intelligibility` laboratuvarına, önceki 48 denemelik testten elle indirilen JSON raporlarını toplu **betimsel** inceleme ekranı ekler.

- En fazla 16 JSON dosyası, her biri en fazla 32 KB; istemci tarafında yalnız elle seçim ve okuma.
- Şema, ses koşulu, dört motor, hedef sözcükler, alt puanlar ve üst puanlar karşılaştırılarak doğrulanır.
- Beklenmeyen kişisel alanlar, bozuk JSON, tutarsız skor veya farklı protokol reddedilir.
- Motor bazında doğru/yanlış ve altı ses çifti için karıştırma dağılımı gösterilir.
- Aynı dinleyiciye ait birden fazla dosya ayırt edilemediği için sonuçlar bilimsel örneklem sayısı, WER/CER veya erişilebilirlik kabulü değildir.
- Otomatik dosya yazma, sunucu API isteği, bulut, uzak telemetri yoktur.
- NVDA sürücüsü değiştirilmemiştir; gerçek Windows testi hâlâ şarttır.

Kurulumdan sonra: http://127.0.0.1:4173/dou-speech-intelligibility, sayfa altındaki **Yerel rapor karşılaştırması**.

Veri koruma: mevcut kurulumdaki `data/` klasörünü koruyun. Bu proje araştırma prototipidir, gerçek sınavlarda kullanıma hazır değildir.
