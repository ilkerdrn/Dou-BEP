# DOU BEP Sınav Atölyesi v2.64 — İzole Türkçe vurgu planı

**Kapsam:** BAP sentetik araştırma prototipi. Üretim sistemine, sınav sorularına ve gerçek katılımcı verisine bağlı değildir.

## Teknik değişiklikler

- `dou-speech-exception-plan.mjs`: 18 sabit v2.63 istisna kodunu inceler, yalnız EX13–EX15 için deneysel bir vurgu planı hazırlar. Vurgu varsayımı son heceden orta heceye taşınır.
- `dou-speech-waveform.mjs`: daha önceki üreticinin aynı matematiksel akışını yeniden kullanan iki sabit WAV kolu. Eski kolun bayt kimliği test edilir.
- `dou-reader-demo.html` / `.mjs`: klavye kullanılabilen statik seçim ve “önceki / deneysel” ses kontrolleri.
- `npm run speech:exception-plan-audit`: yalnız anonim kod ve sayısal fark içeren, argüman kabul etmeyen kararlı rapor.

## Kullanım

Windows için ZIP'i mevcut `data` üzerine yazmadan **ayrı klasöre** çıkartın. Node.js >= 22.13 gereklidir. `BASLAT.bat` ile başlatın; `http://127.0.0.1:4173/dou-reader-demo` adresindeki *v2.64 Sabit sözcüklerde deneysel vurgu planı* panelini açın. Sadece EX13/EX14/EX15 seçilebilir. Test için `node --test --test-concurrency=8 *.test.mjs server-foundation/*.test.mjs tools/*.test.mjs` kullanılabilir.

**Uyarı:** Kayıt/anket toplanmaz. Herhangi bir fonetik uzman, gerçek dinleme testi, NVDA/JAWS, PDF/UA veya üretim uygunluğu onayı yoktur. `ğ` bağlamı çözülmüş değildir. Açık kütüphane/harici ses API zorunluluğu eklenmemiştir.
