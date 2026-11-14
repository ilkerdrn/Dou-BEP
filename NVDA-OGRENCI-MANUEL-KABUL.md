# DOU BEP V4 — NVDA ile öğrenci sınavı manuel kabulü

**Tür:** Windows / Edge / NVDA insan değerlendirmesi (otomatik test değildir)

**Güvenlik:** Bu rehberde yalnız `npm run reader:nvda:manual` komutunun ürettiği anonim, sentetik dört soruluk geçici sınav kullanılabilir. Gerçek sınav, gerçek öğrenci, öğrenci sağlık verisi, gerçek hesap veya mevcut kurumsal veritabanı kullanılmaz. Öğrencinin kimliğini veya tek kullanımlık kodu test raporuna yapıştırmayın.

## Başlatma

1. Windows PowerShell ile **temiz test çalışma ağacına** girin.
2. `npm run reader:nvda:manual` çalıştırın. Komut ekranda yalnız localhost'a açık öğrenci adresini ve **tek kullanımlık sentetik kodu** gösterir. Sunucu açıkken PowerShell'i kapatmayın.
3. Güncel NVDA ekran okuyucusunu etkinleştirin, Microsoft Edge'de komutun yazdığı `http://127.0.0.1:<PORT>/pilot` adresini açın. **Port örnektir; komutun verdiği adres geçerlidir.**
4. Sınav kodu, üretildiği andan itibaren 45 dakika geçerlidir. Testte süre dolarsa önceki kodu tekrar kullanmak yerine laboratuvarı durdurup yeniden başlatın.
5. Test bitince sunucu penceresinde **Ctrl+C** ile durdurun; yalnız sentetik geçici veriler silinir. Var olan BEP veritabanı ve Git çalışma dosyaları değiştirilmez.

## Manuel kabul matrisi

Her satıra **PASS / FAIL / TEST EDİLMEDİ** ve kısa, kimliksiz açıklama yazın. Sesin gerçekten duyulması, ekran okuyucu çıktısının anlamlı olması ve kontrolün uygulanması ayrı ayrı değerlendirilmelidir.

| Kontrol | Beklenen bağımsız kullanıcı davranışı | Sonuç |
|---|---|---|
| Başlangıç ve erişim tercihi | NVDA başlığı, kodu, erişim seçimini ve açıklamaları eksiksiz duyurur; Tab / Shift+Tab ile ulaşılır | TEST EDİLMEDİ |
| Yazılı/sessiz kullanım | Ses kapalıyken sınav yönergeleri, soru içeriği, seçenekler, durum mesajları ve teslim sonucu yazılı olarak anlaşılır | TEST EDİLMEDİ |
| Hazırlık kapısı | İki onay yapılmadıkça **Soruları aç** düğmesi pasiftir; durum anlaşılır | TEST EDİLMEDİ |
| Görme erişimi | Soru numarası/başlığı, tam soru metni, seçenekler ve görsel betimleme varsa NVDA ile okunabilir | TEST EDİLMEDİ |
| Çoktan seçmeli | Radyo seçenekleri doğru etiketlidir; Space ve ok tuşlarıyla cevap seçilebilir; duyulan seçenek hangi soruya ait olduğu açısından açıktır | TEST EDİLMEDİ |
| Doğru/yanlış | Her iki yanıt NVDA ile anlaşılır, yalnız klavyeyle seçilebilir | TEST EDİLMEDİ |
| Eşleştirme | Sol ifadelerin her biri kendi seçim alanıyla ilişkilidir; NVDA doğru soruyu/ifadeyi/alternatifleri okur; ArrowDown/Tab ile tüm eşleştirmeler tamamlanır | TEST EDİLMEDİ |
| Soru değişimi | Önceki/Sonraki düğmelerinde Enter kullanınca **yeni soru başlığına** odak taşınır; gizli sorular yanlışlıkla okunmaz | TEST EDİLMEDİ |
| Soru haritası | Boş, yanıtlandı ve tekrar bak durumları renk dışında metinsel/sesli olarak ayırt edilir | TEST EDİLMEDİ |
| İlerleme ve kayıt | Yanıt sayısı, ara kayıt başarısı/başarısızlığı ve zaman bilgisi doğru ve erişilebilir biçimde anlaşılır | TEST EDİLMEDİ |
| Son kontrol | Teslim öncesi boş/işaretli soru uyarıları okunur; soruya dönüş mümkündür; yanlışlıkla tek tuşla teslim olmaz | TEST EDİLMEDİ |
| Kesin teslim | Açık onaydan sonra anonim teslim referansı okunur, değiştirilebilir yanıt paneli kapanır; ikinci kez teslim yapılamaz | TEST EDİLMEDİ |
| Büyük yazı / kontrast | Yazı büyütme ve kontrastla içerik taşmaz, odak görünür kalır; 200% yakınlaştırmada kullanılabilir | TEST EDİLMEDİ |
| Motor erişim | Sadece Tab/Shift+Tab/Enter/Space/ok tuşlarıyla fare olmadan sınav tamamlanabilir | TEST EDİLMEDİ |
| DOU Reader (ayrı deney) | Kurulu ve yerel olduğu doğrulanan Türkçe ses varsa soru/şıklar anlaşılır; seslendirme izni kapalı soru okunmaz. Ses yoksa yazılı/klavye akışı çalışmaya devam eder | TEST EDİLMEDİ |

## Sesleri nasıl değerlendirmeli?

**NVDA** gerçek ekran okuyucu olarak kendi ses sentezleyicisini kullanabilir. **DOU Reader** ise pilot sayfasında yalnız tarayıcının yerel Türkçe olarak bildirdiği sesleri kullanır. İkisi aynı anda konuşursa içeriği değerlendirmek zorlaşır; ayrı geçişlerde dinleyin. DOU Speech / Pocket TTS bağımsız deneysel laboratuvardır; **şu an sınav okuyucusuna bağlandı veya doğal kabul aldı denilemez**.

Özellikle sayıların, matematiksel işlem işaretlerinin, Türkçe harflerin, seçeneklerin ve eşleştirme ifadelerinin **anlaşılırlığını** denetleyin. Metin içeriğini veya sesi kaydetmeyin; yalnız örneğin `Eşleştirme / seçenek odağı / FAIL / hangi seçeneğin okunduğu anlaşılmıyor` biçiminde kimliksiz gözlem yazın.

## Kabul kararı

- **Otomatik 245/245 Edge PASS**, bu matrisin PASS olduğu anlamına gelmez.
- Her kritik kullanım senaryosu, insan değerlendirmesiyle ve kimliksiz kanıtla **PASS** olmadan görme/işitme/motor erişim açısından kapatılmış sayılmaz.
- NVDA testini bir geliştiricinin yapması ilk hata taraması olabilir; kurumsal üretim kabulü için uygun erişilebilirlik uzmanı ve ilgili kullanıcılarla ek değerlendirme gerekir.
