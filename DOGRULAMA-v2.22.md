# DOU BEP v2.22 — Yerel otomatik doğrulama

- `npm test`: 379/379 başarılı (v2.21 modülleri + kod içerik sadakati için yeni regresyonlar).
- `npm run release:check`: 33/33 başarılı; betik bunun bir sızma veya üretim onayı olmadığını bildirir.
- `npm run offline:audit`: 64 yayımlanan arayüz dosyası / 0 statik doğrudan dış kaynak bulgusu.
- `node --check`: kaynak modülleri için sözdizimi kontrolü.
- `source-code-fidelity.test.mjs`: kod içindeki soru numarası/şık yanıltması, satır/tab üretimi, eksik kapanmış blok, çıplak kodun reddi, DOCX yerel metin ve gerçek Word tablolarının reddi.
- Gerçek Windows/Chromium/NVDA/JAWS/VoiceOver testleri yapılmadı. Gerçek öğrenci verisi kullanılmadı; bağımsız sızma testi/kurumsal onay yapılmadı.
