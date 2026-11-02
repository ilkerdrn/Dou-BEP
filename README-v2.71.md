# DOU BEP Sınav Atölyesi — v2.71 (yalnız çevrimdışı araştırma)

30 Ekim 2026. Proje üniversite üretim/erişilebilirlik kullanımı için **onaylanmamıştır**. Sesler robotiktir; anlaşılır Türkçe TTS veya kullanıma hazır NVDA sürücüsü olduğu iddia edilemez. Testlerde yalnız anonim, uydurma sözcükler kullanılmalıdır. `data/` klasörü ve yönetici hesabı mevcut Windows kurulumunda korunmalıdır.

## Bu sürümde

1. `/dou-reader-demo`: iki akustik yol — **eski artikülasyon** varsayılan, **iki taraflı spektral geçiş** isteğe bağlı. Önceki v2.70 WAV yolu varsayılan ayarlarda bit-bit aynı kalır.
2. `/dou-speech-intelligibility`: altı Türkçe minimal sözcük çifti için 12 kör dinleme denemesi. Sistem sözcüğü rastgele seçer ve her iki ses varyantını döndürür. Katılımcının yanıtı doğru/yanlış olarak iki motor için yalnız RAM'de sayılır. Kişisel veri, mikrofon, anket exportu, yerel depolama, sunucuya veri gönderme yoktur. Bu bireysel teknik prova bir insan araştırması, fonetik uzman değerlendirmesi, doğrulanmış WER/CER veya etik kurul sonucu **değildir**.
3. `tools/dou-speech-nvda-stdio.mjs`: tek JSON stdin girdisinden stdout'a 22.05kHz PCM WAV verir; yazıyı loglamaz veya diske yazmaz. Çıktı 3MB, istek 2048 byte, metin 260 karakter ile sınırlı.
4. `nvda-experimental/`: NVDA 2026.x için **kaynak kod düzeyinde** deneysel SynthDriver. `DOU_BEP_NVDA_EXPERIMENTAL=1` ve `DOU_BEP_ROOT` zorunlu; NVDA sistemine otomatik yüklenmez ve etkinleştirilmez. Windows / NVDA gerçek testleri henüz yapılmadı. Ayrıntılar `nvda-experimental/README-TR.md`.
5. Önceki sınav modülleri, premium sol menü, kurum girişi ve ses araştırması özellikleri korundu. Kullanıcı verisi dosyaları dağıtım ZIP'inde yoktur.

## Yerel kurulum

Önce `data/` klasörü dahil orijinal kurulumun bağımsız yedeğini alın. `BASLAT.bat` kapalıyken **güncelleme ZIP** dosyasını ayrı bir klasöre çıkarın, `GUNCELLE.bat` çalıştırın. Bu yama v2.67–v2.70 kaynakları üzerinde SHA-256 ön kontrolü, kod yedeği ve hata durumunda geri yükleme uygular; `data/`, SQLite, kullanıcı hesapları ve anahtarlar pakete dahil edilmez. Tam proje ZIP'i ayrı kurulum içindir; eski `data` klasörünü sıfırlamayın.

Paneli yeniden başlatıp `http://127.0.0.1:4173/dou-reader-demo` ve `http://127.0.0.1:4173/dou-speech-intelligibility` sayfalarını deneyin. Windows üzerindeki son gerçek tarayıcı ve NVDA doğrulaması kullanıcı bilgisayarında gereklidir.

## BAP araştırma doğrulaması için sonraki adımlar

- Fonetik uzmanı tarafından hazırlanmış, homofonları ve morfolojik varyasyonları kapsayan doğru etiketli bir Türkçe değerlendirme korpusu.
- Etik kurul / gönüllü katılım prosedürleri; kişisel veriyi toplamadan, önceden tanımlı sessiz laboratuvarda tekrarlı kör dinleme.
- Test sözcüklerinde başarı oranı, güven aralığı, yanlış pozitifler, ses ortalaması ve görev tamamlama; yalnız sentetik ölçümlerin insan anlaşılabilirliği kanıtı olmadığının altını çizme.
- Ayrı NVDA test profili veya VM'de sürücü; cancel/IndexCommand, boş içerik, hız, erişilebilirlik, yanlış metni açıklama, kesilme ve yardımcı işlem sonlanması doğrulaması.
- Kullanıcılar için çalışan alternatif bir sesin daima korunması; üretim sistemine otomatik entegrasyondan kaçınma.
