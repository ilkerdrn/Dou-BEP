# DOU BEP v2.50 — doğrulama raporu (29 Ekim 2026)

**Yalnız anonim/sentetik çalışma; üretim erişilebilirliği veya TTS doğruluğu onayı değildir.**

- `npm test`: **555/555 PASS**. Altı yeni v2.50 senaryo testi dâhil; eskiden kalan sınav, erişilebilirlik, yetki, yedek ve DOU Reader modülleri.
- `npm run release:check`: **194/194 PASS**. Yeni analiz için sekiz sabit koruma kontrolü.
- `npm run offline:audit`: **86 yayımlanan arayüz dosyası, 0 doğrudan harici kaynak bulgusu**. Bu bir güvenlik duvarı testi değildir.
- `npm run acceptance:pilot`: **10/10 PASS**, yalnız anonim/sentetik senaryolar. `productionReady=false`.
- v2.50 `dou-speech-phoneme-analysis.test.mjs` ve önceki fonem çalışması: **14/14 PASS**.
- Sıkı şema doğrulama; kişisel alan, tarih/ham yanıt, bozuk toplam, eksik veya 10'dan az raporu reddetme; yerel yönlü matrisin JSON raporuna alınmaması otomatik test edildi.
- En az 10 rapor eşiği, farklı kişilerden gelindiğini veya tekrar eden girdilerin bulunmadığını **garanti etmez**. Wilson %95 aralıkları yalnız varsayımsal bağımsız gözlemler için matematiksel aralıklardır; bilimsel geçerlilik sağlamaz.

Kalan riskler: Gerçek Windows UI Automation/kurulu ses cihaz testi, NVDA/JAWS, doğal Türkçe TTS anlaşılırlığı, fonetik uzman/etik kurul, gerçek kullanıcı kabulü, üretim SQLite şifreleme ve PDF/UA henüz onaylanmadı. Gerçek öğrenci verisi kullanılmamalıdır.

## Temiz ZIP kurulumu

- Yalnız kaynaklardan oluşan ZIP bağımsız geçici klasöre çıkarıldı. Sunucu başka bir geçici 0700 klasörde sentetik SQLite ile ve `127.0.0.1` üzerinde başlatıldı.
- **12/12 açık yerel HTTP adresi 200**; buna yeni toplu fonem sayfası ve JavaScript modülü de dahildir.
- **8/8 özel HTTP yolu 404**, yetkisiz `/api/audit` isteği **401**; `/api/health` sürümü **2.50.0**.
- ZIP içinde özel `data`, SQLite, WAL, anahtar ve üretilmiş kabul raporları bulunmuyor. ZIP CRC/bütünlük denetimi başarılı.
- Tarayıcı ve Windows gerçek cihaz otomasyon testi yapılmadı; yalnız HTTP/senaryo/kaynak doğrulaması.
