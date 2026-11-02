# DOU BEP Sınav Atölyesi v2.75 — Türkçe konuşma laboratuvarı

**30 Ekim 2026 · Offline araştırma prototipi; üretime veya erişilebilir sınava hazır değildir.**

Bu sürüm, v2.74’teki üç ses adayını ve deneysel NVDA sürücüsünü olduğu gibi bırakır.
Gelişme *konuşma kalitesi kanıtı değil*, üç adayın karşılaştırılmasını daha tutarlı
yapacak teknik deney düzenidir:

1. `dou-speech-tri-protocol.mjs`: 36 deneme altı adet altılı bloğa bölündü.
   Her blokta altı farklı Türkçe sözcük çifti birer kez yer alır;
   sınırda aynı çiftin art arda gelmesi engellenir. Her sözcük iki
   alternatif ve üç motorla toplam bir kez karşılaştırılır.
   Byte-modlu laboratuvar karıştırması tam istatistiksel uniform değildir.
2. `dou-speech-rehearsal-level.mjs`: yalnız dinleme provasında 22,05 kHz mono
   PCM16 WAV için katı RIFF ve veri sınırı doğrulaması; 0,115 tam klip RMS
   hedefine doğru güvenli, tepe sınırlı ses seviyesi ayarı. **RMS, LUFS veya
   algısal gürlük eşitliği değildir; tepe sınırına takılan parçalar hedefe
   ulaşamayabilir.** NVDA, sınav kayıtları ve ana TTS çıktısı etkilenmez.
3. Dinleme sayfasına kulaklık için düşük ses uyarısı, raporun JSON
   metodoloji bilgisi ve oynatma öncesi kişisel veri uyarısı eklendi.
4. `dou-speech-rehearsal-level.test.mjs` ses başlığı, başlık bozulması,
   sessizlik, çıkış tepe kontrolü, eski sesin mutasyona uğramaması ve
   altılı blokları sınar.

**Önemli sınırlar:** Ses hâlâ robotik. `s/ş` veya `c/ç` ayrımının gerçek
dinleyiciler için iyileştiği gösterilmemiştir. NVDA sürücüsü Windows üzerinde
henüz doğrulanmamıştır. Gerçek öğrenci ve sağlık verisi kullanmayın.

### Yerel deneme

Node.js ile `BASLAT.bat` başlatın, sonra
`http://127.0.0.1:4173/dou-speech-intelligibility` adresini açın.
Önce kulaklık/hoparlör sesini kısın. Üç motorlu 36 denemeyi yalnız
anonim yapay sözcüklerle tamamlayın; JSON/CSV yalnız düğmeye basınca
indirilmektedir. Mevcut `data` veritabanını silmeyin.
