# DOU Assessment OS — birleşik üniversite ölçme-değerlendirme planı

**Durum:** Mimari temel ve salt-okunur dönüşüm prototipi. Tam birleşme ya da üretim kabulü değildir.

## Mevcut projelerin korunacak güçleri
- **DOU BEP v2.81:** kurum ve rol yönetimi, sınav taslağı, ayrı onay, bireysel uyarlama, erişilebilir çıktı, deneysel yerel Reader/NVDA; Node.js + SQLite.
- **ExamForm OS v1.34:** ders/dönem arşivi, soru kalite/kazanım, DOU/Modern DOCX/PDF, optik, puanlama, akademik kanıt paketi, ders kapsam yetkisi; Python + SQLite. PostgreSQL/Docker yalnız geçici sentetik kabul yolu; canlı kurumsal PostgreSQL değil.

## Tek ürünün kapsayacağı süreç
Üniversite → fakülte → bölüm → program → ders → dönem → şube. Ortak **Değerlendirme** varlığı; sınav, vize, final, bütünleme, quiz, ödev, proje, laboratuvar, sözlü sınav, sunum. Her türde taslak, sürüm, soru/yönerge, kazanım ve rubrik, teslim/son tarih, onay, puan, geri bildirim, itiraz, arşiv ve kalite kanıtı.

## Erişilebilirlik ve güvenlik
Sınav kadar ödev, proje ve laboratuvar da onaylı bireysel uyarlamaları desteklemeli. Tanıdan otomatik hak/uyarlama çıkarılmamalı; yetkili insan kararı esas. Öğrenci/sağlık verisi asgari yetkiyle izole edilmeli. İki eski veritabanı veya onay geçmişi doğrudan birleştirilmemeli. Eski onaylar yeni ortamda kendiliğinden geçerli olmayacak. Gerçek NVDA, PDF/UA, güvenlik ve insan kullanıcı testleri ayrı kabul kapılarıdır.

## Yol haritası
1. **A:** Ortak değerlendirme modeli, kaynak alan eşleme, salt-okunur dönüşüm, veri ve kimlik izolasyonu.
2. **B:** Sınav takvimi, gözetmen/şube, soru bankası, optik, rubrik, not ve itiraz.
3. **C:** Ödev/proje/laboratuvar teslimi, grup çalışması, son tarih ve uzatma, çift değerlendirme.
4. **D:** Bütün değerlendirme türlerinde bireysel uyarlama ve erişilebilir çıktı; bağımsız kullanıcı testleri.
5. **E:** ExamForm belge/optik/kalite motorunu ayrı ve kısıtlı bir yerel servis olarak entegre etme.
6. **F:** PostgreSQL gerçek geçiş provası, SSO/OIDC, kurumsal yetki, yedekleme, güvenlik ve erişilebilirlik kabulü.

## İlk kod katkısı
`integrations/examform/examform-bridge.mjs` yalnız ExamForm `info/questions` nesnelerini inceleme önizlemesine dönüştürür. Veritabanına yazmaz. Öğrenci kimliği, sağlık, hesap, denetim ve onay geçmişi aktarmaz. Klasik→short, Çoktan seçmeli→choice, Doğru/Yanlış→truefalse yalnız alan uyumluluğudur: uzun cevap ve rubrik, puan ondalıkları, kazanım ve belge eşdeğerliği ayrıca doğrulanmalı.