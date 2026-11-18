# DOU BEP — Erişilebilirlik uyum raporu TASLAĞI (VPAT/ACR benzeri)

**Durum: TASLAK. WCAG uyumluluğu iddia edilmez.** Otomatik kurallar yalnızca bir kısmını yakalar; aşağıdaki "Manuel" sütunu gerçek NVDA/JAWS/klavye ve engelli kullanıcı testlerinden sonra doldurulmalıdır. Tarih: 18.11.2026. Ürün: DOU BEP (yerel pilot), `/pilot` öğrenci ekranı ve kurum panelleri.

| Alan | Otomatik (axe-core 4.10, WCAG 2.2 A/AA) | Manuel (NVDA/JAWS/klavye) | Engelli kullanıcı testi |
|---|---|---|---|
| Öğrenci giriş (`/pilot`) | 0 ihlal | BEKLİYOR | BEKLİYOR |
| Öğrenci sınav ekranı (1280 px ve 320 px) | 0 ihlal | BEKLİYOR | BEKLİYOR |
| Kurum girişi ve paneller (11 ekran) | 0 ihlal | BEKLİYOR | BEKLİYOR |
| DOU Reader demo | 0 ihlal | BEKLİYOR | BEKLİYOR |
| Klavyeyle tam sınav (Alt+Shift kısayolları) | Chromium uçtan uca test GEÇTİ | BEKLİYOR | BEKLİYOR |
| Süre uyarıları (görsel) / otomatik teslim | Chromium uçtan uca test GEÇTİ | BEKLİYOR | BEKLİYOR |
| Mola ekranı (Alt+Shift+M) | 0 ihlal; Chromium uçtan uca test GEÇTİ | BEKLİYOR | BEKLİYOR |
| Seslendirme (DOU Speech) | — | — | **Üretime hazır değil** |

## Yöntem
`npm i --no-save axe-core playwright` sonra `npm run a11y:axe`. Geçici SQLite, sentetik hesap. Test edilen: kurum girişi, öğrenci kodu girişi, DOU Reader demosu, atölye, 11 yönetim paneli, öğrenci sınav ekranı (çözünürlük 1280 ve 320 px).

## Bilinen sınırlar
- Otomatik taramalar odak sırası, anlamlı okuma sırası, ekran okuyucu duyuruları, kısayol çakışmaları ve bilişsel erişilebilirliği doğrulayamaz.
- Kısayollar (Alt+Shift+T/D/1…9) NVDA tarama kipiyle çakışabilir; gerçek testte doğrulanmalıdır.
- PDF çıktıları PDF/UA değildir.
- Mola sırasında soru gizleme istemci tarafıdır (sorular tarayıcıya iletilmiştir); güvenli sınav (proctoring) değildir.
