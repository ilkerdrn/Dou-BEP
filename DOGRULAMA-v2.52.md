# DOU BEP v2.52 — doğrulama raporu (29 Ekim 2026)

**Yalnız anonim ve sentetik yerel BAP prototipi.** Üretime hazır olma, canlı öğrenci verileri veya erişilebilirlik sertifikası değildir.

- `npm test`: **561/561 PASS**; yeni üç v2.52 yarış durumu regresyon testi dâhil.
- `npm run release:check`: **200/200 PASS**, v2.52 için üç yeni kaynak koruma koşulu.
- `npm run offline:audit`: **86 arayüz dosyası, 0 doğrudan harici kaynak bulgusu**. Bu statik kontroldür; ağ çıkışı engellemesi veya diğer güvenlik testleri yerine geçmez.
- `npm run acceptance:pilot`: **10/10 PASS**, yalnızca sentetik kabul verileri, `productionReady=false`.
- Kaynakta SQLite migrasyonu yok; eski kayıtlar yeniden yazılmadı. ZIP'te `data`, gerçek veritabanı, anahtar, kalıcı kullanıcı bilgisi veya test raporu JSON'u yoktur.

## Temiz kurulum HTTP doğrulaması

- Paket ayrı bir geçici dizine çıkarılıp sunucu bağımsız geçici SQLite ile yalnızca 127.0.0.1 üzerinde başlatıldı.
- **12/12 açık HTTP yolu 200; 8/8 özel yol 404; yetkisiz `/api/audit` 401; `/api/health` 2.52.0.**
- ZIP CRC ve tüm üye dosyalarının açılabilirliği doğrulandı; özel veya işletim sistemi dosyaları dahil edilmedi.

## Kanıt sınırları

Gerçek Windows cihaz/UI Automation, ekran okuyucular (NVDA/JAWS), yerel Türkçe ses cihazı, doğal Türkçe TTS anlaşılabilirliği, canlı SQLite şifreleme, SSO/HTTPS, PDF/UA, etik kurul/KVKK ve gerçek kullanıcı kabulü **henüz doğrulanmadı**. Bu sürüm gecikmiş HTTP isteğini sunucudan geri almaz; yalnız yanlış kullanıcı arayüzü durum güncellemesini önler. Gerçek öğrenci verisi kullanılmamalıdır.
