# DOU BEP v2.25 — Yerel doğrulama raporu

- Test komutu: `npm test` — **401/401 PASS** (Linux/Node.js 22 ortamı).
- Dağıtım denetimi: `npm run release:check` — **48/48 PASS**.
- Çevrimdışı statik denetim: `npm run offline:audit` — **64 statik dosya, 0 bulgu** (ağ trafiğinin bütünüyle engellendiğini kanıtlamaz).
- Kalıcı 15 dakikalık login kilidi, yeniden açılan SQLite ile doğrulandı; tenant ayrımı, generik hata, HTML/API 429, sınırlı süreli kayıt ve e-posta yerine hash saklama testleri geçti.
- `security:check` salt okunur SQLite kontrolüyle yapı/özet bütünlüğünü denetledi; kayıp DB ve sonradan değiştirilmiş onaylı sınav/uyarlama bulguları test edildi. Rapor hiçbir öğrenci kodu, e-posta, parola veya sınav metni yazmaz.
- **Sınır:** Windows uygulama/tarayıcı ve gerçek kullanıcı/ekran okuyucu doğrulaması bu ortamda yürütülmedi. Canlı DB uygulama seviyesinde şifreli değil; SSO/MFA, resmi KVKK uyumu, bağımsız sızma testi eksik. Bu rapor gerçek öğrenci verisiyle kullanım onayı değildir.
