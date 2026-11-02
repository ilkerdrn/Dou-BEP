# DOU BEP v2.76 — Bağımsız doğrulama raporu

30.10.2026 · Çevrimdışı Türkçe fonem araştırma prototipi; **üretime ve erişilebilir sınav kullanımına hazır değildir**.

## Kapsam
- Dördüncü `place` ses kolu, b/d/g/k/c/ç için yerel kontrollü patlama/boğumlanma ipuçları ve 48 denemelik dört motorlu protokol. Önceki 3 motorun sesi değiştirilmedi.
- Altı çift × iki sözcük × dört motor; sekiz blokta her çift bir kez. Tek oturum bilimsel karşılaştırma olarak yorumlanamaz.
- Kısa 12, dengeli 24 ve üç motorlu 36 deneme, NVDA araştırma sürücüsü ve mevcut sınav uygulaması korunur.
- Raporlar yalnız istemci belleğinde; tamamlanınca kullanıcı isteğiyle kimliksiz JSON/CSV oluşturulur. İnternete veya sunucuya gönderilmez.
- Kod seviyesindeki başarı herhangi bir fonemin doğal/anlaşılır Türkçe seslendirildiğinin kanıtı değildir.

## Doğrulamalar
- Hedefli yeni protokol ve dal: **6/6**; ek eski ses testleri **19/19** geçti.
- Dağıtım: **317/317** kontrol geçti.
- Offline statik varlık taraması: **121 dosya, 0 doğrudan dış bağlantı bulgusu**. Firewall garantisi değil.
- İlk tam regresyon sırasında sürüm güncellemesi ile eşzamanlı başlayan testlerde eski v2.75 görüldü: 715 başarılı, 10 sürüm uyuşmazlığı. İlgili dokuz dosyanın yeniden çalıştırılması: **44/44 başarılı**. Ardından değişiklik yapılmadan tekrar edilen tam regresyon: **725/725 başarılı** (61 saniye, 0 hata).
- Tam ZIP ayrı klasöre çıkarıldı; izole demo admin girişi, oturum doğrulama, anonim sınav oluşturma, açık modüller, özel kaynaklar dahil **33/33 yerel HTTP kontrolü başarılı**.
- Gerçek Windows/NVDA sürücü ve insan anlaşılabilirlik testi yapılmadı.

## Güvenlik
- ZIP içinde `data/`, SQLite, .env, gizli anahtarlar veya kişisel kayıt yok. Güncelleme yalnız kaynak dosyalarını kopyalar; kod yedeği ve hata halinde geri alma içerir.
- Gerçek görme engelli kullanıcılar veya öğrenciler üzerinde pilot yapılmadan önce etik/kurumsal izin ve fonetik uzmanı incelemesi gerekir.
