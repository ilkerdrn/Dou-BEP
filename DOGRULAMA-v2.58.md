# DOU BEP Sınav Atölyesi v2.58 — Yerel doğrulama (29 Ekim 2026)

**Kapsam:** Yalnız anonim/sentetik, çevrimdışı BAP Ar-Ge prototipi. **Gerçek öğrenci, sağlık, engellilik veya sınav verisi kullanmayın. Bu bir kurumsal erişilebilirlik, doğal TTS veya bilimsel ses kalitesi onayı değildir.**

## Yeni modül ve sınırlar
- v2.57 kaynak ZIP'i korunarak `dou-speech-boundary.mjs` ve `tools/dou-speech-boundary-audit.mjs` eklendi. Kullanıcının yalnızca açıkça bastığı buton ile sabit “Merhaba dünya” sentetik laboratuvar örneği incelenir; üretim Reader'a bağlanmaz.
- 22.050 Hz PCM16 örnekleri, segment sayısı ve sırası zorunlu olarak doğrulanır; ses sınırında tek örnek sıçraması ve 5 ms ön/son RMS farkı ölçülür. Yalnız sınıf ve sayılar gösterilir, kaynak metin veya ses kaydı rapora alınmaz.
- Sabit örnekte **13 segment, 12 hizalı sınır** tespit edildi. Bunların 8'i tonlu-tonlu, 2'si durak-sınırı, 2'si diğer sınıf. Referans WAV süresi **1,3450 s**, kırpılmış örnek **0**. Bunlar ses kalitesi veya fonetik doğruluk değerlendirmesi değildir.
- Önceki spektral çıktı SHA-256: `efdfc09b5cb967d02aa20382ce08a16ca221f0ce2b55a9ba86e355bab513b0c2`; eski algoritmalar değiştirilmedi.

## Test sonuçları
- `npm test`: **596/596 PASS** (v2.57'de 591). Son sıkı segment-türü doğrulama güncellemesi ayrıca yeni test dosyasında **5/5 PASS** tekrar doğrulandı.
- `npm run release:check`: **231/231 PASS**, önceki 225 + 6 yeni kaynak sözleşmesi.
- `npm run offline:audit`: **91 yayımlanan arayüz dosyası, 0 doğrudan harici kaynak bulgusu** (statik tarama; gerçek ağ engelleme testi değil).
- `npm run acceptance:pilot`: **10/10 PASS**; yalnız anonim/sentetik, `productionReady=false`.
- Temiz ZIP açılışında geçici 0700 SQLite klasörü ve rastgele `127.0.0.1` portu ile **21/21 açık HTTP adresi 200**, **12/12 özel adres 404**, yetkisiz `/api/audit` **401**; `/api/health` sürümü `2.58.0`.
- Kaynak ZIP CRC ve tekil dosya adları doğrulandı; `data`, canlı SQLite, WAL/SHM, sırlar, `.env`, kabul çalıştırma raporu ve loglar ZIP dışında bırakıldı. GitHub Actions çalıştırılmadı.

## Bilinçli kalan riskler
- Gerçek tarayıcı/Windows GUI ses aygıtı testi, NVDA/JAWS/UI Automation yok; sentetik sesin doğal Türkçe veya anlaşılır olduğu gösterilmedi.
- Fonetik uzmanlı anotasyon, dinleyici protokolü ve etik izin; veri koruma/KVKK, üretim depolama şifrelemesi ve PDF/UA kurumsal onayı henüz tamamlanmadı.
- Yeni ses sınırı denetimi *sinyal ölçer*; iyileştirme, anlaşılırlık, konuşma kalitesi veya erişilebilirlik skoru **üretmez**.
