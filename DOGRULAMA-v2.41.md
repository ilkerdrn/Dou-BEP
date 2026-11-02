# DOU BEP v2.41 — Doğrulama raporu

**Tarih:** 29.10.2026. **Kapsam:** yalnız sentetik / anonim verilerle geliştirilen sınav okuyucusu. Üretim, bağımsız ekran okuyucu, PDF/UA ve bağımsız Türkçe TTS uygunluğu onayı değildir.

- Tam regresyon: **498/498** (0 başarısız).
- Kaynak ve sürüm statik denetimleri: **138/138** (0 başarısız).
- Yayınlanan arayüz kaynakları için yerel/ağ-asset taraması: **73 dosya**, **0 statik bulgu**. Bu test tarayıcının işletim sistemi düzeyindeki dış iletişimini kanıtlamaz.
- Anonim BAP uçtan uca kabul senaryosu: **10/10**; `productionReady=false`.
- Yeni DOU Reader testleri: uzak sesin reddi, Türkçe yerel ses gerekliliği, konuşmanın iptali, gecikmiş olayların yok sayılması, ses izni kapalı soru, öğretmen cevap ve notlarının okunmaması, uzun metnin kesilmemesi, klavye kısayollarının form alanlarında devre dışı kalması, anonim demo ve statik kaynak allowlist.
- Windows SAPI envanteri yalnız kaynak/statik sözleşme açısından kontrol edildi; gerçek Windows ses örneği burada çalıştırılmadı.
- Başsız Chromium ile dinamik ekran testi bu Linux çalışma ortamında tamamlanamadı. Çalışan Windows/Microsoft Edge ortamında görsel, klavye, sistem TTS ses kalitesi ve NVDA ile beraber çalışma testleri gerekli.

Kullanım: `npm test`, `npm run release:check`, `npm run offline:audit`, `npm run acceptance:pilot`; ardından `npm start` ve `/dou-reader-demo`.

**Açık alanlar:** canlı veritabanı şifrelemesi, kurumsal SSO, gerçek ekran okuyucu erişilebilirlik denemeleri, Windows UI Automation, bağımsız/acoustically trained Türkçe TTS, etik ve KVKK denetimi. `data` klasörünü sürümler arasında otomatik taşımayın.
