# DOU BEP v2.47 — doğrulama ve sınırlar (2026-10-29)

**Yalnız sentetik testler; üretim güvenliği, erişilebilirlik sertifikası veya Türkçe TTS anlaşılabilirliği onayı değildir.**

- `npm test`: **533 / 533 PASS**, sıfır başarısız. v2.46 sınav ve güvenlik regresyonları ile yeni fonem/geçiş ve anonim dinleme testleri dahil.
- `npm run release:check`: **172 / 172 PASS**; sürüm, dışa açılan kaynaklar, sunucu allowlist ve yeni dinleme prototipinin gizliliği kontrol edildi.
- `npm run offline:audit`: yayımlanan **80 arayüz dosyasında doğrudan haricî kaynak bulgusu 0**. Ağ bağlantısı olmadığına dair işletim sistemi seviyesi garanti değildir.
- `npm run acceptance:pilot`: **10 / 10 PASS**; anonim sentetik BAP senaryoları. `productionReady=false`.
- WAV: hece-vurgu ve fonem-geçiş sürümleri ayrı üretilmiştir. İkisi de 22.050 Hz mono 16-bit PCM; 1,34 sn; **0 kırpılma**. RMS sırasıyla **0,1456** ve **0,1470**. RMS anlaşılabilirlik değildir.
- Cihaz ve erişilebilirlik: gerçek Windows UI Automation, NVDA, JAWS, doğal Türkçe ses, görme engelli kullanıcı, bağımsız PDF/UA, kurumsal SSO/KVKK testleri **yapılmadı**.

- ZIP temiz kurulum: **12/12 yerel HTTP 200 ekran/modül**, **6/6 özel yol HTTP 404**, `/api/health` sürüm **2.47.0**. Yalnız geçici sentetik veritabanı kullanıldı.
- ZIP kaynağı: **354 dosya**, gizli anahtar, yerel veritabanı veya geçici kabul raporu yok.
