# DOU Reader — Okuyucu kullanım ve klavye durumu iyileştirmesi

Bu paket, ayrı `feature/dou-reader-speech-independent-safety-20261109`
dalında öğrenci pilot okuyucusunun düğme davranışını düzeltir. Kurumsal
DOU BEP V4 projesine, cevap akışına, veritabanına ve Windows yerel
Reader hostuna dokunulmaz.

## Neler değişti?
- Tarayıcıda gerçekten kullanılabilir **yerel Türkçe ses** yoksa okuma,
  duraklatma, sürdürme ve durdurma seçenekleri uygun şekilde pasiftir.
- Okuma etkinse `Durdur` ve `Duraklat` kullanılabilir.
- Duraklatıldıysa `Sürdür` etkinleşir; okuma tamamlandığında denetimler
  yeniden devre dışı kalır.
- Öğretmenin `audioAllowed:false` işaretlediği soru okunmaz;
  hem kullanıcı arayüzü hem `readerText` kontrolü bunu uygular.
- Etkin soru değiştiğinde eski sorunun seslendiricisi iptal edilir;
  eski konuşma olaylarının yeni soruyu yanlış okuması engellenir.
- `destroy()` tarayıcı olay dinleyicilerini kaldırır.
- Var olan yerel ses sınırı korunur. Harici servise otomatik geçiş,
  mikrofon, kayıt, depolama, öğrenci yanıtı alma veya ağ çağrısı yoktur.

## Yerel test
```powershell
Set-Location "D:\Projects\DOU-READER-SPEECH-INDEPENDENT"
node --test dou-reader-panel.test.mjs dou-speech.test.mjs dou-reader-core.test.mjs dou-reader.http.test.mjs
node --test reader-speech-research/*.test.mjs
```

## Elle kontrol
1. Yerel `npm start` sunucusunu açın (varsayılan `127.0.0.1:4173`).
2. Tarayıcıda `http://localhost:4173/dou-reader-demo` adresine gidin.
3. Yerel Türkçe ses yoksa `Soruyu oku` pasif kalmalı; soru metni ve
   ileri/geri gezinmesi çalışmalıdır.
4. Türkçe ses varsa `Soruyu oku`, `Duraklat`, `Sürdür` ve
   `Durdur` kontrollerini ayrı ayrı deneyin.
5. İkinci soruya geçerken önceki soru anlatımı hemen durmalıdır.
6. Üçüncü soruda okuma kapalıdır. Kısayollar bu kuralı aşmamalıdır.
7. Sabit anons WAV önizlemesi ayrı bir özelliktir; gerçek soru okuma
   veya doğal TTS motoru olduğu anlamına gelmez.

Bu kaynak güncellemesinin gerçek tarayıcı ve ekran okuyucu kabulü,
Windows üzerinde insan tarafından henüz tekrar edilmedi. Otomatik
testlerin başarı durumunu yalnız yerel komutun çıktısı belirler.
