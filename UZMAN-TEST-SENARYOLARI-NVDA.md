# DOU BEP — Gerçek kullanıcı ve ekran okuyucu test senaryoları (v2.82)

Amaç: Otomatik testlerin kanıtlayamadığı noktaları gerçek cihaz ve kullanıcıyla doğrulamak. **Yalnızca anonim/sentetik sınavla yapın; gerçek öğrenci verisi kullanmayın.** Her satıra GEÇTİ / KALDI / ENGELLİ yazın, kalanları not edin.

## Hazırlık
1. Windows, güncel NVDA (ayrıca mümkünse JAWS), Chrome ve Edge.
2. `npm run exam:closure` geçmiş olsun. `BASLAT.bat` ile sunucuyu başlatın; kurumsal panelde 5 soruluk (çoktan seçmeli, doğru/yanlış, eşleştirme) anonim sınavı onaylayın.
3. `/pilot` için tek kullanımlık kod üretin. Bağımsız HTML için "sesli erişilebilir sınav" dosyasını indirin.
4. Fare **kullanmayın** (senaryo A–B). Test eden kişi sınavı başka biri okumadan çözebilmeli.

## A. Görme engelli (NVDA + klavye)
| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| A1 | `/pilot` aç, kodu yaz, Enter | Başlık duyurulur, odak oturum başlığında | |
| A2 | Soru başlığına gidin (H tuşu) | "Soru 1" okunur; durum "Henüz cevaplanmadı" | |
| A3 | Seçenekler arasında ok tuşları | Her seçenek harfiyle okunur | |
| A4 | Alt+Shift+2 | "Seçenek B seçildi" duyurulur | |
| A5 | Alt+Shift+T | Kalan süre sözlü duyurulur | |
| A6 | Alt+Shift+D | Soru ve genel durum duyurulur | |
| A7 | Sonraki soru (Alt+Shift+N) | Odak soru başlığına taşınır, numara okunur | |
| A8 | Eşleştirmede açılır listeler | Etiket + seçenekler okunur, klavye ile seçilir | |
| A9 | Teslim et, onay penceresi | Cevaplanan/boş sayısı okunur; iptal edilebilir | |
| A10 | Teslimden sonra | "Teslim referansı" okunur | |
| A11 | Tüm sınav fare olmadan, başka kişi yardım etmeden tamamlandı mı? | Evet | |
Ek: DOU Reader sesi kapalı/yok iken A1–A11 yine geçmeli (ses yoksa sınav kullanılamaz hâle gelmemeli). Kısayolların NVDA tarama kipi tuşlarıyla çakışıp çakışmadığını not edin.

## B. Az gören
Yazı boyutu "Çok büyük", yüksek kontrast, %200 ve %400 tarayıcı yakınlaştırma: yatay kaydırma, kesilen metin, odak halkası görünürlüğü, süre göstergesinin okunabilirliği.

## C. İşitme engelli (ses kapalı)
Tüm yönergeler yazılı mı? Süre uyarıları (10/5/1 dk) **görsel** çıkıyor mu ve fark edildi mi? Süre bitiminde kilit mesajı anlaşılır mı? Gerekli sınavda altyazı/işaret dili ögesi var mı (yoksa kurumca hazırlanacak).

## D. Konuşma engelli
Sınav hiçbir adımda konuşma/mikrofon istemiyor mu? Yazılı/klavye yanıt yeterli mi?

## E. Motor engelli (klavye, anahtar/alternatif cihaz)
"Basit ekran" + "Büyük tıklama alanları" + tek soru görünümü. Tab sırası mantıklı mı? Yanlışlıkla teslim engelleniyor mu (onay penceresi)? Alternatif giriş cihazıyla (anahtar, göz/baş izleme, sesle kontrol yazılımı) A4–A10 yapılabiliyor mu? Ek süre (kurum onaylı) süre göstergesine yansıyor mu?

## F. Süre ve teslim sınırları
- 1 dakikalı sınav: uyarı → süre dolunca yanıtlar kilitlenir, teslim hâlâ yapılabilir.
- Sayfayı yenileme: oturum kaybı beklenen davranıştır mı, giriş ekranı uyarıyor ve tarayıcı yenileme/kapatmada uyarı veriyor mu? (Kod tek kullanımlık, yanıtlar yalnızca bellekte; oturum kurtarma bilerek yok, gizlilik gereği. Kurum karar vermeli.)
- Ağ kesintisi anında teslim: hata mesajı anlaşılır mı, yanıtlar kayboluyor mu?

## G. Raporlama
Her kalan için: ekran görüntüsü/ekran okuyucu konuşma kaydı, tarayıcı+NVDA sürümü, engelli katılımcının serbest yorumu. Bulgular `accessibility-evidence` modülüne ve kabul panelinde (`/erisilebilirlik-kabul`) kaydedilir. Başarı ölçütü: **A11 ve E'nin bağımsız tamamlanması.**

## H. DOU Speech (ayrı, insan dinlemesi gerekir)
Kısa Türkçe cümle, sayı, tarih, matematik ifadesi ("5 + 3 = 8", "3/4") ve soru metinleriyle en az 5 dinleyici anlaşılırlık puanı verir; kadın/erkek ses seçeneği şu an yok, kayıt altına alın.
