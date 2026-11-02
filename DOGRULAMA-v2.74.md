# DOU BEP v2.74 — doğrulama ve sınırlar

30 Ekim 2026 — **çevrimdışı araştırma prototipi**, insan anlaşılabilirliği ve gerçek Windows/NVDA uygunluğu henüz kanıtlanmadı.

- Otomatik regresyon: **715/715 test** başarılı; en son tam koşu yaklaşık 57 saniyede tamamlandı.
- Hedefli fonem/üç motor protokol/24 deneme uyumluluk testleri: **29/29** başarılı.
- Yeni yöntem: `contrast` kolu, `spectral` dalından hesaplanan WAV'ın s/ş/c/ç/z segmentlerine kontrollü farklı spektral işlem uygular. Sesin farklı olması anlaşılabilirliğinin daha iyi olduğu anlamına gelmez.
- Yeni 36 deneme: altı çift × iki sözcük × üç deneysel kol; 12 ve 24 deneme yolları korunur.
- Eski 24 denemelik UI'da `summarizeRecognition` yerine protokole uygun `summaryFor` çağrısı yerleştirildi; önceki boş ekran olasılığına karşı test eklendi.
- Raporlar yalnız tüm prova tamamlanınca görüntülenir, kullanıcı isterse anonim JSON/CSV dışa aktarılır; sınav veya kurum verileri işlenmez.
- `data/`, SQLite, çerez, kişisel veri, anahtar ve NVDA kurulum dosyası paketlerde yoktur.
- Windows/NVDA gerçek cihaz testi, fonetik uzmanı tarafından insan anlaşılabilirliği ölçümü ve etik/izin süreçleri hala açık aşamalardır.
