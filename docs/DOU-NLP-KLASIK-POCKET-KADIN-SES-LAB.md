# DOU BEP V4 — NLP test + klasik öğrenci laboratuvarı ve Pocket TTS kadın sesi

**16 Kasım 2026. Yalnız anonim, yerel, sentetik araştırma. Üretim onayı yok.**

## Kaynak ve içerik güvenliği
Konu çerçevesi, kullanıcı tarafından paylaşılan **YZP207 Doğal Dil İşleme 2026-2027 Vize** belgesinden alınmıştır. Kaynakta **20 çoktan seçmeli soru** vardır, **klasik soru yoktur**. Yalnız *bilgi çıkarma, Türkçede kök bulma, TF-IDF ve veri sızıntısı, aşırı öğrenme ve eşleştirme* gibi konu başlıklarına dayanılarak **tamamen yeni yazılmış** 2 test, 2 klasik, 1 doğru/yanlış ve 1 eşleştirme denemesi üretilmiştir. Gerçek sınav metni, belgesi, öğrenci kimliği, cevap anahtarı, kaynağın ham dosyası veya kurum notları GitHub'a eklenmedi. Öğretim amaçlı bu örnekler resmî sınav yerine geçmez.

## Öğrenci ekranı
- Soru türü ve klavye yönergesi her soru için görünür; büyük hedefler, yüksek kontrast, odak yönetimi, soru haritası ve teslim özeti korunur.
- Klasik yanıt alanı 800 karakterle sınırlıdır, başlığı ve soru ilişkisi ekran okuyucu tarafından okunur. Yanıtın silinmesi, ara kaydedilmesi, sunucudan geri yüklenmesi ve tek seferlik teslimi yalnız **sentetik laboratuvarda** test edilir.
- Varsayılan gerçek pilot hâlâ **1–30 adet çoktan seçmeli, doğru/yanlış, eşleştirme** sorusunu kabul eder. Klasik yanıt desteği ancak yeni temp SQLite ile çalışan ayrı laboratuvar modunda açılır.
- Sınav kodu oluşturulduğunda 45 dakika işlemeye başlar. Normal kullanıcı akışında otomatik teslim yoktur.

## Sırasıyla çalıştır (Windows PowerShell)
```powershell
Set-Location 'D:\Projects\DOU-BEP-ACCESSIBILITY-TEST'
# Önce GitHub güncellemesini temiz Git çalışma ağacında alın.
node --test tools/v4-nlp-student-contract.test.mjs server-foundation/pocket-tts-local.test.mjs
npm run reader:nvda:nlp:check
npm run ui:browser:student
```

Gerçek ekranı ve öğretmen tarafından onaylanmış yalnız sentetik soruları açmak için:

```powershell
npm run reader:nvda:nlp
```

Bu komut geçici `127.0.0.1` adresini ve **tek kullanımlık sentetik kodu** terminalde gösterir. Gerçek sınav veya öğrenci verisi kullanılmaz. Yeni kod için `N` + Enter; temiz kapatma için `Q` + Enter veya `Ctrl+C`.

## Pocket TTS Turkish female_2: aktif yerel soru sesi (isteğe bağlı)

Daha önce yalnızca `D:\DOU-POCKET-TTS-LAB\DOU-PocketTTS-TR001-female_2.wav` önizleme dosyası çalınabiliyordu. Artık ek bir **opt-in** ses köprüsü vardır: `/api/pilot/speech` yalnız hâlen açık anonim sınavın `q1`–`q30` numaralı **soru metnini ve öğrenciye sunulan seçenekleri** yerel Pocket TTS komutuna verir. Doğru cevaplar, öğretmen notları, öğrenci cevapları, kimlik bilgileri, oturum anahtarı veya başka HTTP metni sentezlenmez.

Bir kez **yalnız kendi sentetik laboratuvarınızda** etkinleştirmek için, önce kurulu uygulamayı kontrol edin:

```powershell
$cli = 'D:\DOU-POCKET-TTS-LAB\.venv\Scripts\pocket-tts-turkish.exe'
if (-not (Test-Path -LiteralPath $cli -PathType Leaf)) {
  throw 'Pocket TTS uygulaması bu konumda kurulu değil. Sesli mod yerine yazılı veya NVDA sınavını kullanın.'
}
$env:BEP_POCKET_TTS_CLI = $cli
$env:BEP_POCKET_TTS_EXPERIMENT = '1'
$env:BEP_POCKET_TTS_RESEARCH_ACK = '1'
npm run reader:nvda:nlp
```

Sunucu bu komutu yalnız `BEP_PILOT_ONLY=1` **ve** `BEP_PILOT_CLASSIC_SAMPLE=1` iken, seçili anonim sınav oturumunun **geçerli bearer anahtarı** ile çalıştırır. Bu iki değişkeni yalnız laboratuvar kendi sürecinde ayarlar. Gerçek kurumsal sınavlarda varsayılan kapalıdır. Tarayıcıdaki **Soru okuma motoru → DOU Pocket TTS — kadın female_2** seçeneği sadece ses köprüsü gerçekten hazır olduğunda etkinleşir.

Model çağrısı `shell:false`, `HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1` ile yapılır. Modelin tüm ağırlıkları önceden yerel olarak hazır olmalıdır. En fazla 1000 karakterlik öğrenciye gösterilen metin, parçalara bölünür, en fazla 5 MB yerel WAV belleğe alınır, geçici dosyalar silinir. **Ağ izolasyonu garanti edilmez**; kurumsal güvenlik duvarı ve model lisans incelemesi ayrıca gereklidir. Ses üretiminin başarısızlığında kullanıcıya görünür hata gösterilir; gizli bulut servisine geçiş yoktur.

**Model kaynakları ve lisans:** Pocket TTS Turkish, wite-tech tarafından yayımlanan yerel modeldir. Kaynak kodu Apache-2.0, model ağırlıkları **CC-BY-4.0** kapsamında açıklanmıştır. Üretim kullanımı öncesi uygun atıf, lisans değerlendirmesi, içerik izinleri ve insanın gerçek ses anlaşılabilirlik kabulü şarttır.

- https://github.com/witetech/pocket-tts-turkish
- https://huggingface.co/wite-tech/pocket-tts-turkish

## Gerçek kabulde kontrol edilecekler
- `Sesli soru ve klavye odağı` seçilir, `Soruları aç` için Enter basılır. İlk soru ve sonraki sorular düğmesiz okunur mu?
- Pocket kadın sesi seçildiğinde seçenekler gerçekten doğru ve anlaşılır biçimde okunuyor mu, matematik sembolleri/özel karakterler atlanıyor mu?
- Bir sonraki soruya geçildiğinde eski ses kesiliyor mu? NVDA ile çift seslenme engelleniyor mu?
- Klasik yanıta yalnız klavyeyle yazılabiliyor, otomatik kayıt tamamlanıyor, yeni oturum kurtarma koduyla geri geliyor mu?
- Öğretmenin seslendirmeyi kapattığı bir soru uygulama ses motoruyla okunmuyor mu?
- İnsan ses kalitesi / erişilebilirlik onayı alınmadan üretime geçilmiyor.

**Otomatik testlerin PASS olması gerçek duyma/konuşma/erişilebilirlik kabulü değildir.**
