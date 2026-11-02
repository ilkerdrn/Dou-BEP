# DOU BEP v2.59 — Yerel doğrulama (29 Ekim 2026)

**Yalnız anonim ve sabit sentetik Ar-Ge prototipi. Gerçek öğrenci/sağlık/engel veya sınav verisi kullanılmadı.** Bu, doğal Türkçe TTS, fonetik doğruluk, NVDA eşdeğerliği veya kurumsal üretim onayı değildir.

## Kod ve ölçüm

- v2.58 kaynak ZIP'i üzerine yeni `dou-speech-corpus.mjs`, CLI ve 7 yeni test eklendi; eski ses üretim algoritmaları, onay akışları, kurumsal Reader ve SQLite şeması değiştirilmedi.
- Sabit deney sayısı: **14**; dört ünlü sınıfı örneği, dört eş ünlülü karşıtlık çifti (8 örnek), iki durak örneği. **8/8 Türkçe yazılı ünlü sınıfı** en az bir kez bulunuyor. Bu, fonetik kapsam/doğruluk onayı değildir.
- Toplam hizalı ses sınırı **55**; kırpılmış PCM örnek toplamı **0**. Değişkenlerin bütünlük SHA-256 özeti (CLI raporu): `c505ec0fd3884bbd976ec310a37da5dbefa478196f41b75caefc5398045224f9`. Ölçüm sayıları doğal ses kalitesi ya da anlaşılabilirliği göstermez.
- JSON çıktıda yalnız opak örnek kodu, grup, sınıf kapsamı ve sayısal WAV parametreleri bulunur; ham sözcükler, öğrenci/kimlik/sınav bilgileri veya ses dosyaları rapora girmez.

## Gerçekten çalıştırılan kontroller

- `npm test`: **603/603 PASS**.
- `npm run release:check`: **238/238 PASS**.
- `npm run offline:audit`: **92 yayımlanan statik arayüz dosyası, 0 doğrudan harici kaynak bulgusu**. Bu bir gerçek ağ çıkışı/penetrasyon testi değildir.
- `npm run acceptance:pilot`: **10/10 PASS**, yalnız sentetik; `productionReady=false`.
- `node tools/dou-speech-corpus-audit.mjs`: tekrarlanabilir, argümansız, stdout JSON. İnsan dinleme çalışması yok.
- Temiz kaynak ZIP geçici klasörde açıldı; yeni **0700 geçici SQLite** ve `127.0.0.1` üzerinde izole sunucu başlatıldı. **21/21 açık HTTP yolu 200**, **11/11 özel dosya yolu 404**, yetkisiz `/api/audit` **401**, `/api/health` sürümü **2.59.0**.
- ZIP CRC testinden geçti; özel `data`, SQLite, WAL/SHM, anahtar, `.env`, test kayıtları, üretilen kabul raporları ve loglar pakette yok.

## Sınırlar ve sonraki doğrulamalar

- Korpus, kontrollü bir laboratuvar *örneklemi* değildir; aynı ünlü örüntüsü olmasına rağmen ünsüz karşıtlıkları henüz fonetik uzmanla kalibre edilmedi.
- Gerçek Windows ses aygıtları/UI Automation/NVDA/JAWS testleri, uzman fonetik inceleme, kör insan dinleme araştırması, etik kurul/KVKK, PDF/UA ve üretim depolama güvenliği denetimleri yapılmadı.
- Deneysel motor gerçek sınav içeriğine veya yerel kurumsal okuyucuya bağlanmadı. GitHub Actions çalıştırılmadı; kullanıcının Windows bilgisayarındaki projeye ve veritabanına müdahale edilmedi.
