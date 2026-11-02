# DOU BEP Sınav Atölyesi v2.69 — Türkçe sayı/ritim deneyi

30 Ekim 2026 — **yerel araştırma prototipi; gerçek sınavlarda, gerçek öğrenci/sağlık verilerinde veya erişilebilirlik desteği olarak kullanıma uygun değildir.**

## Bu sürümde

- `http://127.0.0.1:4173/dou-reader-demo` → **Kendi Türkçe ses motorumuzu dene** alanında dört yeni yapılandırma birleşimi: önceki rakam-rakam / yeni 0–9999 tam sayı okunuşu ve önceki ritim / cümle odaklı duraklama. Hız ve perde ayarı korunur.
- Sayı dönüşümünde 0–9999 için açık ve deterministik Türkçe tam sayı karşılıkları; 0007 gibi başında sıfır bulunan girdiler ve daha büyük sayılar **rakam rakam** okunur. Ondalık sayı, para, tarih ve telefon numaralarının anlamları çözümlenmez; dilbilgisel uyarlama veya ses doğallığı garanti edilmez.
- Önceden hesaplanan **planlanan okunuş** ekranda görülebilir. Cümle sonu, noktalı virgül ve uzun parçalar için isteğe bağlı farklı duraklama uzunlukları uygulanır.
- v2.68'in varsayılan motor API'si `digits` + `legacy` olarak korunur; önceki WAV bit düzeyinde değişmez. Mevcut A/B/C/D, önceki fonem ve sınav okuyucu yollarına müdahale edilmedi.
- Kullanıcıya gösterilen metin tarayıcıda kalır; ağ üzerinden gönderilmez ve veritabanına yazılmaz. WAV yalnız bellek içinde oluşturulur. Öğrenci/sınav/sağlık metni girmeyin.

## Kullanım

1. Mevcut çalışan `BASLAT.bat` sürecini durdurun ve **mevcut proje klasörünüzü, özellikle `data/` dizinini** yedekleyin.
2. `DOU_BEP_v2_69_HESAP_KORUYAN_YAMA.zip` paketini ayrı klasöre çıkarın; `GUNCELLE.bat` dosyasını çalıştırın. Varsayılan hedef: `Desktop\\New folder (7)`; farklı klasör için `GUNCELLE.ps1 -Target "C:\\dizin\\proje"` kullanın.
3. Yama `data/`, SQLite, log, anahtar veya parolaları asla kopyalamaz/değiştirmez; yalnız sürümü 2.67/2.68 olan kod dosyalarını SHA-256 ile doğrulayıp önce yedekler. Eksik/hatalı dosyalarda önceki kaynakları geri alır.
4. `BASLAT.bat` ile sunucuyu başlatın; tarayıcıda `Ctrl+F5` ve `/dou-reader-demo` sayfasını açın.
5. Anonim sentetik metinle 2026 rakam-rakam ile tam-sayı farkını dinleyin. **Bu hâlâ robotik PCM sinyaldir, anlaşılırlık ve telaffuz doğrulaması değildir.**

## Hâlâ eksik

Doğal Türkçe TTS, hece/kelime telaffuz veri kümesi, dilbilimsel çözümleme, Windows UI Automation sürücüsü, NVDA eklentisi, kör dinleme protokolü ve gerçek kullanıcı erişilebilirlik kabulü. Hiçbir otomatik test bu eksikleri tamamlanmış saymaz.

## Yerel testler

- `node --test dou-speech-number-words.test.mjs dou-speech-free-text.test.mjs dou-reader.http.test.mjs`
- `node release-check.mjs` ve `node tools/offline-audit.mjs`
- Tam regresyon testlerinde yoğun paralel çalıştırmada tek bir zamanlama duyarlı Windows ACL senaryosu ilk denemede hata verdi; tek başına tekrar çalıştırılınca geçti. Rapor ayrı tutulur.
