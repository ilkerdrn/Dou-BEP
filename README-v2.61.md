# DOU BEP Sınav Atölyesi v2.61 — Sentetik ünlü–ünsüz C geçiş araştırması

**Araştırma prototipi; resmî üniversite/kurumsal uygunluk, doğal Türkçe TTS, ekran okuyucu veya üretim onayı DEĞİLDİR.** Sadece sabit, anonim ve sentetik ses örneklerinde kullanın. Gerçek öğrenci verisi, engellilik/tanı bilgisi, kurumsal sınav metni ya da insan araştırması verisi girmeyin.

## v2.61'de eklenenler

- `/dou-reader-demo` sayfasında **14 örneğin C geçiş denetimini aç**: TR01–TR14 sentetik kodlarını, filtrelenen ünlü/gürültülü ünsüz sınırı sayısını, değiştirilmiş PCM örneği sayısını, önceki (B zamanlama) ve yeni C varyantının nesnel ortalama sınır sıçramasını gösterir.
- Aynı tablodaki **C sesini çal**, yalnız sabit örneği yerel PCM16 WAV olarak üretir. Kayıt, yanıt, kimlik, mikrofon veya harici API kullanılmaz.
- C varyantı, B zamanlama çıktısının 22.050 Hz / 16 bit / mono sesini alıp yalnız ünlü ile gürültülü ünsüz (`noise`) birleşimlerindeki ~4 ms simetrik pencerede beş-tap filtre uygular. Tonlu-tonlu geçiş, patlamalı ünsüz ve durakları işlemez. B ve A WAV'ları byte düzeyinde değiştirilmemiştir.
- 14 örnekte **15 uygun sınır** işlendi; bazı gruplarda hiç uygun sınır bulunmadığı için **0 değişiklik** olması beklenen bir sonuçtur.
- `npm run speech:join-audit` (yalın JSON için `node tools/dou-speech-join-audit.mjs`) yalnız sayısal, kodlanmış örnek kimliklerinden oluşan yerel JSON raporu stdout'a basar; argümanla metin, dosya veya serbest örnek kabul etmez.

**Bilimsel sınır:** Bazı sınırların sıçrama metriği artabilir. Filtre, fonem telaffuzu veya konuşma doğallığı için eğitilmiş bir model değildir. Nesnel ölçümlerdeki fark iyileşme veya anlaşılabilirlik kanıtı olarak yorumlanamaz. İnsan araştırması için ayrıca etik kurul, uzman değerlendirmesi ve uygun erişilebilirlik testi gerekir.

## Kurulum / kontrol (Windows)

1. ZIP'i **mevcut `data` klasörünün üzerine yazmadan**, yeni bir dizine çıkarın. Önceki verileri yedekleyin. Bu paketle gerçek öğrenci verisi kullanmayın.
2. Node.js **22.13+** sürümüyle `BASLAT.bat` veya `npm.cmd start` çalıştırın.
3. `http://127.0.0.1:4173/dou-reader-demo` adresini açın ve **14 örneğin C geçiş denetimini aç** seçeneğini kullanın. A/B prova bölümü ayrı ve değişmeden durur.
4. Yerel kontroller: `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot`, `npm.cmd run speech:join-audit`.

## Değişmeyenler ve sınırlar

- Sınav şablonları, çok dersli sınav oluşturma, BEP uyarlamaları, onay iş akışı, SQLite şeması, mevcut Reader'ın yerel ses politikası, önceki A/B spektral/zamanlama WAV algoritmaları ve sentetik fonem laboratuvarı korunur.
- Gerçek Windows + NVDA/JAWS, doğal Türkçe ses anlaşılabilirliği, bağımsız ses sentezi, üretim verisi şifrelemesi ve kurumsal yetkilendirme/etik süreçleri bu sürümle doğrulanmamıştır.
- Yalnız statik çevrimdışı kaynak denetimi ağ çıkışını işletim sistemi düzeyinde kanıtlamaz.
