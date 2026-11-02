# v2.31 — Yerel PDF pilotu, sınırlamalar ve doğrulama

**Tarih:** 2026-10-29. **Sürüm:** `2.31.0`.

## Yerel test sonuçları

- `npm test`: **433 test / 433 başarılı / 0 başarısız**; `tagged-pdf.test.mjs` içindeki 5 yeni PDF/HTTP kontrolü dahil.
- `npm run release:check`: **84/84 kontrol geçti**. Statik sürüm ve güvenlik kontrolüdür, bağımsız güvenlik denetimi değildir.
- `npm run offline:audit`: yayımlanabilen **64 arayüz dosyasında 0 doğrudan uzak kaynak bulgusu**; ağ iletişiminin tüm olasılıklarda imkânsız olduğunu ispatlamaz.
- `npm run acceptance:pilot`: anonim ve bağımsız SQLite senaryosunda **10/10 kabul kontrolü geçti**; gerçek kurumsal kullanıcı kabulü değildir.
- `npm run pdf:font-check`: yerel kurulu bir Unicode TrueType fontuyla PDF üretimi olumlu. Test makinesinde başarı, başka Windows cihazında font lisansı/kurulumunun doğrulandığı anlamına gelmez.
- Üretilen örnek PDF `pdfinfo` ile **Tagged: yes**, çok sayfalı ve `pdftotext` ile Türkçe karakter çıkarımı kontrol edildi. PDF sayfaları görsel olarak incelendi. Bu kontroller PDF/UA uygunluğunu **kanıtlamaz**.
- PDF uç noktası: anonim 401; CSRF yoksa 403; uyumsuz Origin 403; onaysız sınav 409; başka kurumda 404; onay geçmişi bozuksa 409; uygun onaylı kaynakta 200 (`application/pdf`) ve SHA-256 header.

## Tamamlanmayan/gerçek cihazda doğrulanmayanlar

1. Windows işletim sistemindeki yerel TTF yerleşimi ve gömme izinleri (bu ortam Windows değil).
2. Gerçek NVDA/JAWS/VoiceOver ekran okuyucu ve klavye navigasyon denemeleri.
3. PDF/UA ve PAC/benzeri bağımsız PDF denetimi; mevcut etiket ağacı tek başına standart uyumu değildir.
4. Gerçek derslerde matematiksel nesneler, resimler, tablolar, kodlar için kayıpsız alternatif metin ve çıktı.
5. Kurumsal HTTPS/SSO, veri tabanının uygulama seviyesinde şifrelenmesi, bağımsız güvenlik incelemesi ve KVKK/etik izinler.

**Sonuç:** Yalnızca anonim araştırma prototipi. Eski `data` klasörüne dokunmayın. Öğrenci/engellilik verilerini bu sürümde kullanmayın. Kendi çevrimdışı Türkçe ses/ekran erişim motoru sonraki Ar-Ge iş paketidir.
