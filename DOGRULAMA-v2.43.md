# DOU BEP v2.43 doğrulama kaydı — 29 Ekim 2026

Bu rapor yalnız sentetik test ortamının sonuçlarını tanımlar. Gerçek Windows UI Automation/SAPI cihaz testi veya gerçek öğrenci kabulü içermez.

- Hedefli Türkçe matematik testi: 5/5 başarılı. Windows okuyucu statik politika testi: 7/7 başarılı (5 eski + 2 yeni).
- Tam otomatik test: **510/510 başarılı** (`npm test`, Node 22.16.0).
- Kaynak ve yayımlama kapıları: **148/148 başarılı** (`npm run release:check`, önceki modüllere ilave 5 yeni kapı).
- Çevrimdışı tarama: 74 arayüz kaynağı; kaynakta doğrudan dış URL çağrısı bulgusu yok (ağ trafiği testi değildir).
- BAP anonim kabul akışı: 10/10 sentetik senaryo, productionReady=false.
- ZIP temiz kurulum HTTP kontrolü: **11 public adres 200**, **4 private adres 404**, sağlık API sürümü **2.43.0**.
- Windows PowerShell/GUI canlı testi: yapılmadı. C# güvenlik kontrolleri kaynak analiziyle sınandı; derleme/çalışma için Windows gereklidir.
- Gizlilik: kurulu ses dışında uzaktaki sesi otomatik seçme yok, öğretmen ses yasağı korunuyor, bağımsız Windows okuyucu girdi/parola alanlarını atlıyor.
- Gerçek öğrenci verileriyle kullanım: uygun değil; kurum BT ve erişilebilirlik onayı gerekli.
