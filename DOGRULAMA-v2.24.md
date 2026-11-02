# DOU BEP v2.24 — doğrulama raporu

- Tam otomatik testler: **392/392 PASS**, Node.js 22.16; bu sonucun Linux üzerinde alındığı, Windows kurulumunda ayrıca test edilmesi gerektiği not edilir.
- Yerel dağıtım kontrolleri: **43/43 PASS**.
- Statik çevrimdışı varlık taraması: 64 yayımlanan arayüz dosyasında doğrudan haricî kaynak/API çağrısı saptanmadı; ağ yalıtımının garantisi değildir.
- Sunucu tarafında güncel onay hash'i doğrulaması, çoklu kurum ayrımı, rol denetimi, CSRF, geçersiz profil, paketin iç dosya hash'leri, sonradan değiştirilmiş dosyanın doğrulayıcı tarafından reddi test edildi.
- `GET /api/exams/:id/delivery-readiness` ve `POST /api/exams/:id/delivery-package` için yetkisiz HTTP davranışları test edildi.
- ZIP üretiminin cevap anahtarı olmadan DOCX + basılabilir HTML + erişilebilir HTML ürettiği, manifestte her dosya için doğru bayt/hash bilgisi bulunduğu doğrulandı.
- Kaynak soru/yanıt içeriğinin seçilen sunum profiliyle değişmemesi için sunucuda karşılaştırma var. Tam metin ve görsel/işitsel eşdeğerlik insan denetimi gerektirir.
- BAP kabul testleri, gerçek Windows tarayıcı tıklama, NVDA ve gerçek kullanıcı testi, güvenlik sızma testi, SSO/MFA ve hassas veri koruması **henüz yapılmadı**; kurumsal üretim onayı verilmez.
