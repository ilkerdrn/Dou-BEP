# DOU BEP v2.29 — Yerel doğrulama

- Tarih: 29 Ekim 2026. Kapsam: anonim/sentetik yerel araştırma prototipi.
- `npm test`: **421/421 PASS**, Node.js 22.16.0 Linux.
- `npm run release:check`: **71/71 PASS**, bu kontrol güvenlik/erişilebilirlik sertifikası değildir.
- `npm run offline:audit`: **64 arayüz dosyası, 0 statik dış bağlantı bulgusu**.
- Üretilen DOCX: ZIP CRC ve Word XML doğrulandı. Örnek beş soruda 1 `Heading1` ve 5 `Heading2` paragrafı var.
- Yapısal erişilebilirlik denetimi, bozuk soru başlığı, CSP zayıflaması, dışa istek, veri modelinde cevap sızıntısı, Word başlık stili bozukluğu testlerinde başarısız oluyor.
- Yeni teslim paketi `ERISILEBILIRLIK-DENETIM.json` içerir; paket doğrulayıcı raporu içerikten tekrar hesaplıyor; v2.28 eski teslim paketini de reddetmeden doğruluyor.
- **Gerçek ekran okuyucu, Windows uygulaması, etiketli PDF, bağımsız güvenlik, KVKK/etik testi ve gerçek üniversite saha kabulü tamamlanmadı.**
