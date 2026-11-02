# DOU BEP Sınav Atölyesi v2.13 — Doğrulama

29 Ekim 2026 / Node.js 22.16; yalnız yerel anonim pilot.

- `node --test --test-concurrency=2 *.test.mjs server-foundation/*.test.mjs tools/*.test.mjs`: **316/316 PASS** (tam test). Önceki sınırsız paralel denemede, HTTP ses dışa aktarma testi ağır kaynak kullanımı nedeniyle zaman aşımına uğramıştı; iki eşzamanlı testle temiz tekrarda tüm testler başarılıdır.
- `npm run release:check`: **13/13 PASS**. Kaynak/hijyen kontrolleridir; sızma testi değildir.
- Toplu sınav: CSV şablonu, tekrarlı kod, hassas sütun reddi, onay eksiklerinde çıktı engeli, soruların değişmezliği, Word/HTML/erişilebilir HTML/ZIP, server statik yolları ve auth kapıları otomatik test edildi.
- Gerçek kullanıcı tarayıcısı ve gerçek NVDA/JAWS/VoiceOver/TalkBack/Braille/işaret dili sınav uygulaması **test edilmedi**.
- Kurum onayı, kişisel veri işleme hukuki dayanak, güvenlik testi, şifreli aktarma/saklama, operasyonel dağıtım kontrolleri **tamamlanmadı**.
- Gerçek öğrenci adı, numarası, tanı veya sağlık verileriyle kullanmayın. Bu prototip resmî Doğuş Üniversitesi ürünü değildir.
