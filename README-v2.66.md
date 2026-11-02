# DOU BEP Sınav Atölyesi v2.66 — Sınırlı ses sınırı deneyi

**30.10.2026 — sentetik/araştırma prototipi**. Üretime hazır değildir (`productionReady=false`).

## Yeni geliştirme

- `dou-speech-continuity.mjs`: EX13, EX14, EX15 için mevcut C WAV'ını kopyalar ve yalnız tonlu-tonlu segment sınırlarında 44 PCM çerçevelik (~2 ms) sınırlı yumuşatma teklif eder. Girişteki kenar farkı 256 PCM biriminden azsa uygulamaz. Önerilen müdahale PCM 16-bit güvenli sınırı aşıyorsa veya çevresindeki **maksimum örnek adımını artırıyorsa** reddedilir. Kopyalama sayesinde C, baseline ve candidate sesleri değişmez. 
- D kolu **15 sınırın 10'unda** kabul edildi, **5'inde** eski sinyal korundu; toplam değişen PCM örneği programla tekrar hesaplanır. Bu sınır bazlı sayısal güvenlik kontrolü, işitsel kalite garantisi değildir.
- Reader demo: erişilebilir, klavye ile açılan yeni sinyal karşılaştırma tablosu ve “Yeni D sentetik sesini çal” düğmesi. Seçimler sadece üç sabit EX kodundan; gerçek sınav soruları veya öğrenci kayıtları gönderilmez.
- `npm run speech:continuity-audit`: argümansız, deterministik, JSON ve SHA-256 üretir. Dosya yazmaz; raporda metin, gerçek isim, ses örnekleri veya kullanıcı tercihi bulunmaz.

## Yerel çalıştırma

Windows'ta ZIP'i **yeni ve ayrı klasöre** çıkarın; `data` klasörünün üzerine yazmayın. Node.js >= 22.13 gereklidir. `BASLAT.bat` açıp `http://127.0.0.1:4173/dou-reader-demo` adresindeki “Sınır denetimini göster” ve “Yeni D sentetik sesini çal” seçeneklerini inceleyin. CLI için `npm run speech:continuity-audit`.

## Sınırlar

- Ses robotiktir, anlaşılır/doğal Türkçe konuşma veya NVDA seviyesinde ekran okuyucu değildir.
- Yerel kod testleri ve sentetik kabul sonuçları gerçek Windows tarayıcısı, fiziksel cihaz, NVDA/JAWS, PDF/UA, KVKK ve gerçek kullanıcı kabulünün yerini tutmaz.
- En büyük yerel PCM farkının azalmış olması dinleyici algısını doğrulamaz; global örnek farkları kötüleşebilir ve raporda sayısal olarak gösterilir.
- Canlı özel gereksinimli öğrenci verileriyle kullanım için hazır değildir; resmi üniversite dağıtımı olarak değerlendirilmemelidir.
- GitHub Actions ve mevcut Windows bilgisayarına müdahale edilmedi.
