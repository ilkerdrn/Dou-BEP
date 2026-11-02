# DOU BEP Sınav Atölyesi v2.14 — doğrulama

Tarih: 29 Ekim 2026. Node.js 22.16.0 (yerel pilot).

- `npm test`: **322/322 PASS** — çok dersli CSV, sınav-ders eşleştirmesi, grup bazlı onay, tekrar kontrolü, CSV enjeksiyonu/kod kontrolü, derslere ayrılmış ZIP, DOCX/HTML ve önceki özellikler.
- `npm run release:check`: **13/13 PASS** — sınırlı yerel kontroller (bağımsız sızma testi değildir).
- Sentetik üç üniversite sınavından oluşturulan `ORNEK-COK-DERSLI-UYARLANMIS-SINAVLAR-v2.14.zip` içindeki kaynak ders başlıkları ve Word/XML yapıları kontrol edildi.
- HTTP düzeyinde toplu sınav rotası, CSV/JS/CSS ve sürüm kontrolü otomatik testten geçti.
- **Canlı Chromium etkileşim testi BAŞARILI OLARAK TAMAMLANMADI**: otomasyon tarayıcısı `http://127.0.0.1:4173/toplu-sinav` sayfasını `ERR_BLOCKED_BY_ADMINISTRATOR` ile engelledi. API oturum açma başarılı olsa da sayfa tıklama/doğrulama tamamlanamadı.
- Gerçek ekran okuyucu, Braille, işaret dili, erişilebilir baskı, gerçek öğrencilerle pilot, bağımsız güvenlik/KVKK ve kurumsal dağıtım onayı **yapılmadı**.
- **Gerçek öğrenci kimliği, tanı, sağlık veya engellilik verisiyle kullanmayın.** Sadece anonim/hayalî test kayıtları. ZIP şifresizdir.
