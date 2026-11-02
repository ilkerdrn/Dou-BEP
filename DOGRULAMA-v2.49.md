# DOU BEP v2.49 — doğrulama raporu (29 Ekim 2026)

**Yalnız anonim/sentetik veri. Gerçek Windows, kullanıcı, NVDA/JAWS, fonetik ya da güvenlik sertifikası değildir.**

- `npm test`: **549/549 PASS**; eski bütün sınav, güvenlik ve ses testleri + 10 yeni fonem laboratuvarı testi.
- `npm run release:check`: **186/186 PASS**; izinli statik modüller, yerel çalışma, veri koruma sınırları ve ayrı deney.
- `npm run offline:audit`: **83 arayüz dosyası; 0 doğrudan dış kaynak bulgusu**. Ağ güvenlik duvarı testi değildir.
- `npm run acceptance:pilot`: **10/10 PASS**, sentetik senaryolar. `productionReady=false`.
- Sabit WAV karşıtlıkları için ortalama mutlak PCM farkları (normalize genlik): `s/ş=0.014732`, `m/n=0.023517`, `p/k=0.000965`, `v/z=0.009471`. Karşılaştırılan sekiz WAV çıktısında **0 kırpılma örneği**. Bu değerler seslerin ayrıştığını gösterir ancak **Türkçe anlaşılabilirliği veya telaffuz doğruluğunu ölçmez**.
- Tam dinleme kontrolü, tek yanıt hakkı, sekiz çift-yönlü sabit deneme, kaynak erişim kısıtı ve toplam sonuç raporundan ham yanıt eksikliği otomatik testlerle sınandı.
- ZIP temiz kurulum: **14/14 açık HTTP adresi 200**, **8/8 özel dosya yolu 404**, `/api/health` **2.49.0**, yetkisiz `/api/audit` **401**. Geçici sentetik SQLite ve ayrı klasörde çalıştırıldı.

Kısıtlar: Yerel/Windows UI Automation uygulamasında gerçek cihaz testi, insanda algı/anlaşılırlık değerlendirmesi, KVKK/etik kurul izni, SSO, canlı SQLite şifreleme, PDF/UA ve üretim onayı **yoktur**. `DOU Speech Lab`, mevcut canlı sınav okuyucusuna varsayılan olarak bağlanmaz.
