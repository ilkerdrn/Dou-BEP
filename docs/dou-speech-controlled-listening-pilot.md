# DOU Speech — Kontrollü Dinleme Pilotu (TASLAK)

**Durum:** Araştırma hazırlığı. Gerçek katılımcılarla çalışma yapıldığı veya sesin anlaşılırlığının kanıtlandığı anlamına gelmez.

## Amaç ve kapsam

Yalnızca uygulamanın sekiz sabit, sentetik, anlamsız ses örneğindeki ses karşıtlıklarının (`s–ş`, `m–n`, `p–k`, `v–z`) pilot düzeyinde algılanabilirliğini incelemek. Bu test **Türkçe TTS doğrulaması, klinik değerlendirme, erişilebilir sınav onayı veya öğrenciye ilişkin bir değerlendirme değildir**.

## Pilot öncesi kapılar

1. Çalışma için kurumun ilgili etik/onay ve gönüllü katılım koşullarını belirleyin; bu kod hiçbir katılımcıdan izin alındığını iddia etmez.
2. Denemeyi gerçek sınavdan ve öğrenci kayıtlarından ayrı bir cihaz/oturumda açın. Gerçek sınav, öğrenci, sağlık veya kimlik bilgisi girmeyin.
3. Ses aygıtının çalıştığını ve katılımcının dinlemeyi **istediğinde durdurabildiğini** gösterin. Ses yüksekliğini katılımcı ayarlasın; zorunlu yüksek ses uygulamayın.
4. Yalnızca klavye kullanarak oynatma → cevap → sonraki deneme → indirme akışını kontrol edin. Ekran okuyucuyla odak ve durum duyurularını ayrıca manuel doğrulayın.
5. Katılımcı istediği anda bırakabilir. Kaydetmeden sekmeyi kapatmak mümkündür. Test tamamlanmadan rapor indirme kapalıdır.
6. Sekiz örnek yalnızca **birer hedef deneme** oluşturur; aynı örneğin tekrar dinlenmesi mümkündür. Tekrarlı dinleme standartlaştırılmadığından sonuçları kontrollü bağımsız dinleme puanı gibi yorumlamayın.

## Bir oturumun işleyişi

- Katılımcı isteğe bağlı olarak "Sesi dinle" düğmesini seçer; ses bitmeden cevap seçenekleri açılmaz.
- Ses bitince klavye odağı ilk seçeneğe geçer. Doğru hedef sözcük test sırasında açıklanmaz.
- Cevap alındığında "Sonraki örnek" düğmesi odaklanır; son denemede yalnız toplam sayılardan oluşan JSON indirmesi odağa gelir.
- Gecikmiş ses olayları, durdurma ve sekme gizleme denemenin yanlışlıkla tamamlanmasına yol açmamalıdır.
- Test penceresindeki **yönlü karıştırma matrisi dışa aktarılmaz**; JSON yalnız sayısal toplam içerir.

## Kanıt ve sınırlamalar

- **Otomatik teknik kanıt:** Sentez WAV formatı; regrese edilen istemci olayları; C# derleme; sabit örneklerde ayrışan dalga biçimi. Başarılı CI, insanın sesi ayırt ettiğini ispatlamaz.
- **Manuel kanıt bekleniyor:** Ses aygıtından duyulabilir oynatma, klavye ve ekran okuyucu kabulü, katılımcının kendi ifadesi, pratik kullanım zorlukları.
- **Ölçüm sınırlaması:** 8 deneme ve tek oturum, anlamlı konuşma anlaşılırlığı ölçütü değildir. Rastgeleleştirme ve tekrar dinleme sonucunda yanlılık olabilir.
- **Veri sınırlaması:** Raporlarda kimlik yok; farklı raporların farklı kişilerden geldiği doğrulanamaz. Toplu analizde aynı kişinin çoklu yüklemesi engellenmez. İndirilen dosyalar katılımcının cihazındadır; dışa aktarma kişisel veri olmadığına dair garanti oluşturmaz.

## Üretim için kapalı kalan konular

Gerçek Türkçe metni sentezleme, sözcük/dil bağlamı, doğal vurgu, anlaşılabilirlik, erişilebilirlik kullanıcı kabulü, güvenilir konuşma motoru performansı ve sınav içeriğiyle veri güvenliği **bu prototip tarafından doğrulanmamıştır**. Gerçek sınav seslendirmesini bu deneysel akustiğe yönlendirmeyin.

## Değerlendirme kararı

Pilot sonrasında yalnızca teknik bulguları, protokol sapmalarını ve anonim toplu sayıları *bağlamlarıyla* raporlayın. Karar olarak **araştırmaya devam / iyileştirme gerekli / pilot durduruldu** seçeneklerinden biri kullanılabilir; bu kararlar üretim onayı yerine geçmez.
