# DOU BEP Sınav Atölyesi v2.20 — Doğrulama raporu

Tarih: 29 Ekim 2026. Çalışma ortamı: Node.js 22.16, yerel TCP/HTTP, Python destekli örnek DOCX/PDF.

## Tamamlanan kontroller
- `npm test`: **365 / 365 PASS**. Önceki v2.19'un 358 testi + 7 yeni kaynak belge/HTTP testi. Sorular ve seçenekler, Word zengin içerikte fail-closed, yanlış belge özetinde ret, kimlik alanı algılama, numara tekrarları, not/altbilgi, onaysız taslak ve role/CSRF/Origin yetkileri doğrulandı.
- `npm run release:check`: **29 / 29 PASS** (24 önceki + 5 yeni kaynak kontrolü). Bu kontroller statik/yerel denetimlerdir; sızma testi değildir.
- Sunucu smoke: `/sinav-dosya-aktar` HTTP 200, `/exam-source-import.mjs` HTTP 200, iç ayrıştırıcı kodu HTTP 404, `/data/institution.sqlite` HTTP 404, API health `2.20.0`, oturumsuz önizleme HTTP 401.
- Örnek gerçek biçimli DOCX ve metin PDF, **3'er soru** ayrıştırdı. Kaynak dosyaların birer sayfalık görselleri renderer çıktısıyla incelendi; görüntüde kesilme yoktu.
- Eski sınavlar ve veritabanı migrasyonu üzerinde kapsamlı gerçek işletim sistemi/kurum testi yapılmadı; mevcut SQLite verileri test sırasında açılmadı. Sentetik ve geçici test veritabanları kullanıldı.

## Sınırlar
- Tam tarayıcı E2E/tıklama testi ve ekran okuyucuyla canlı kullanıcı testi **yapılmadı**. Sunucu/HTTP/birim testleri tarayıcı etkileşimi garantisi değildir.
- Word tablo, formül nesnesi, grafik, görsel, gömülü makro otomatik aktarımı **yok**. Kod bloklarının girinti bütünlüğü ve PDF düzen sadakati garantili değildir. Taranmış PDF/OCR yoktur.
- `pdftotext` sistemde kuruluysa PDF metni çıkarılabilir. Windows ortamında Poppler kullanıcı tarafından ayrıca kurulmalıdır.
- Kural tabanlı hassas alan tespiti eksiksiz değildir. Gerçek kimlik, engellilik, sağlık ve çocuk verisi yüklenmemelidir.
- Dinlenimde veritabanı şifreleme, HTTPS, SSO/MFA, KVKK hukuk incelemesi, bağımsız sızma ve erişilebilirlik kullanıcı testleri tamamlanmadı.

**Sonuç:** Yerel anonim pilot için testlerden geçen v2.20 kod paketi. Gerçek kurumsal kullanıma hazır onay verilmemiştir.
