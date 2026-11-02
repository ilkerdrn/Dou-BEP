# DOU BEP v2.78 — Yerel dinleme raporlarında karşılaştırılabilirlik denetimi

Dört robotik motoru veya sınav modüllerini değiştirmez. 48 denemelik anonim JSON raporları, **ses koşulları ve oturum özellikleri** dikkate alınarak yorumlanır.

- Tekrarlanmış **tam yanıt desenleri** sayılır; bunlar kişinin tekrar katıldığının kanıtı değildir ve sonuçlardan silinmez.
- Ses düzeyi koşullandırma sürümü ve deneme sıralama yöntemine göre oturum kümeleri ayrı gösterilir. Koşullar farklıysa toplam motor oranları tek bir deneymiş gibi karşılaştırılmamalıdır.
- Her motor için rapor bazında en düşük, ortanca ve en yüksek doğru sayısı; önceki motora göre kazanan/eşit/kaybeden rapor sayısı gösterilir. Katılımcı sayısı çıkarılmaz.
- Önceki alt toplam doğrulaması, sınır kontrolleri, dosyaların sadece açık kullanıcı eylemiyle tarayıcı içinde okunması ve özel veri alanlarının reddi korunur.
- Kriptografik rapor özgünlüğü, bağımsız dinleyici kontrolü, klinik dinleme değerlendirmesi, anlamlılık testi veya NVDA/erişilebilirlik onayı **yoktur**.

Çalıştırma: mevcut `BASLAT.bat` / `http://127.0.0.1:4173/dou-speech-intelligibility` → Yerel rapor karşılaştırması.
Mevcut `data/` klasörüne dokunmayın. Erişilebilir sınavda kullanıma hazır değildir.
