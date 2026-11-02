# DOU BEP Sınav Atölyesi v2.63 — Türkçe telaffuz istisnası denetimi

**BAP araştırma prototipi.** Üretim erişilebilirlik sistemi, bağımsız Türkçe TTS, NVDA eşdeğeri veya doğrulanmış konuşma üretimi değildir. Yalnız anonim/sentetik örneklerle kullanılmalıdır.

## Geliştirme

- 18 kodlanmış, sabit Türkçe yazım örneği: altı `ğ` bağlamı, iki baş küme örneği, dört ünsüz dizisi örneği, üç `-yor` vurgu istisnası ve üç varsayılan karşılaştırma.
- Yazılı hece sınırları, mevcut laboratuvar planlayıcısının tahminleriyle karşılaştırılır; örnekler fonetik bir sözlük veya dilbilimci tarafından onaylanmış veri değildir.
- `ğ` için tek başına `glide` sınıfının yeterli olup olmadığına karar verilmez; altı örnek doğrudan uzman incelemesine ayrılır.
- `-yor` içeren üç örnekte, örneklenmiş sondan bir önceki hece vurgusu ile mevcut her-sözcük-son-hece sezgisinin üç farkı **olduğu gibi gösterilir**. Ses sentezi değiştirilmez. Diğer sözcüklerin vurgusu doğrulanmış sayılmaz.
- `/dou-reader-demo` içindeki **18 sabit telaffuz istisnasını denetle** düğmesi, yalnız EX01–EX18 kodlarını ve özet sayıları gösterir. Sözcükler, gerçek sınav soruları, katılımcı verileri, kaydedilen cevaplar veya mikrofon kullanımı yoktur.

## Çalıştırma

Windows Node.js 22.13+ kurulu iken yeni sürümü ayrı klasöre çıkartıp `BASLAT.bat` çalıştırın. Reader demosu: `http://127.0.0.1:4173/dou-reader-demo`.

Yerel CLI: `npm.cmd run speech:exception-audit` (Windows) veya `npm run speech:exception-audit` (diğer ortamlarda). Komut parametre kabul etmez, dosya yazmaz ve JSON raporuna SHA-256 bütünlük özeti ekler.

Doğrulama: `npm test`, `npm run release:check`, `npm run offline:audit`, `npm run acceptance:pilot`. GitHub Actions gerekmez.

## Güvenlik ve bilimsel sınırlamalar

Mevcut kurulumdan `data` klasörünü kopyalamayın veya yeni ZIP içeriğini üstüne yazmayın; önce mevcut veriyi yedekleyin. Bu sürüm kaynak arşivinde hiçbir veri tabanı, anahtar veya kimlik bulunmamalıdır. Gerçek öğrenci, engellilik veya sağlık verisiyle canlı test yapmayın. Yazılı örnek hece dizileri ve vurgu işaretleri **uzman hakemliği değildir**. Gerçek Türkçe TTS, NVDA/JAWS, etik kurul ve saha erişilebilirliği testleri halen tamamlanmamıştır.
