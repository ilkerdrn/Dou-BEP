# v2.32 — Kod ve temel tablo içeren yerel PDF pilotu doğrulaması

**Tarih:** 2026-10-29. **Sürüm:** `2.32.0`. Gerçek öğrenci verisi kullanılmadı.

- `npm test`: **439/439 başarılı** (v2.31 temel 433 test + 6 yeni güvenli parser/PDF regresyon testi).
- `npm run release:check`: **88/88 başarılı**; bu yalnız yerel statik dağıtım kontrolüdür, sızma testi değildir.
- `npm run offline:audit`: **64 arayüz dosyası / 0 doğrudan haricî kaynak bulgusu**. Statik tarama, firewall testinin yerini tutmaz.
- `npm run acceptance:pilot`: **10/10** anonim uçtan uca BAP senaryosu; izole geçici veritabanı, `productionReady=false`.
- `npm run pdf:font-check` ve `npm run pdf:code-font-check`: bu Linux ortamında **başarılı**; gerçek Windows'ta font ve DPAPI testi henüz yapılmadı.
- Anonim PDF: iki sayfa, Türkçe Unicode, kodda girintiler ve boş satırlar, sütun başlıklı tabloda satır etiketleri; `pdftotext -layout`, `pdfinfo` ve sayfa görüntüsüyle incelendi. `Tagged: yes`, **PDF/UA sertifikası değildir**.
- Eş aralıklı kod fontu için lisansı izin veren yerel TTF kullanılır. Font dosyası kaynak pakete konulmaz.
- Kapanmamış kod, uzun kod satırı, bozuk tablo, eksik glif, desteklenmeyen görsel ve matematik nesneleri reddedilir.
- Eski sistemdeki CSRF/tenant/onay SHA kontrolleri ve `data` veritabanı değişmedi. Bağımsız ekran okuyucu testi yapılmadı.

**Açık riskler:** gerçek PDF/UA tablo etiketleme, görsel/denklem semantiği, NVDA/JAWS/VoiceOver kullanıcı denemeleri; HTTPS/SSO, canlı DB şifreleme, KVKK kurumsal izinler. Bu sürüm anonim BAP araştırma prototipidir.
