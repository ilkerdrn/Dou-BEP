# DOU BEP Sınav Atölyesi — Premium Arayüz R1 (v2.81 uyumlu)

Bu paket **yalnızca görsel arayüz** güncellemesidir. Uygulama sürümü, veritabanı şeması, kullanıcılar, sınavlar, onay süreçleri ve deneysel konuşma motoru değişmez.

## Yapılanlar

- Üniversite çalışma alanları için sade koyu lacivert menü, beyaz paneller, özgün bordo vurgu; offline sistem fontları ve sıfır dış varlık
- 17 sayfada aynı modüller ve aynı menü sırası; mevcut sayfa belirgin, mobil menü tek açılır panel
- Menü içi yerel arama (`/` kısayolu masaüstünde, `Esc` temizleme/kapatma); bağlantıların hiçbiri yeniden adlandırılmadı
- Kurum giriş ekranı, genel bakış kartları, yeni sınav hızlı işlemi, sınav sihirbazı ve taslak editörü için yeni boşluk, tipografi, kontrast ve odak stilleri
- 1200/1080/760/560px kırılımları ve yazdırma/azaltılmış hareket davranışları
- Eski sürümlerden kalmış yan menü numarası tüm ilgili sayfalarda v2.81 olarak düzeltildi

## Sınırlar

- Bu güncelleme yeni özellik veya gerçek kullanıcı erişilebilirlik sertifikası değildir.
- İlk kullanım Windows Chrome/Edge ve NVDA ile manuel doğrulama gerektirir.
- Arama yalnız menü etiketlerini filtreler; veri veya kişisel bilgi göndermiyor.
- Programın resmi Doğuş Üniversitesi tarafından onaylandığı iddia edilmez.

## Kurulum

1. Çalışan `BASLAT.bat` penceresinde `Ctrl+C` ile sunucuyu durdurun.
2. Önce projenin tüm klasörünün, özellikle `data`'nın ayrı bir yedeğini alın.
3. Tasarım yamasını ayrı klasöre çıkarın, `TASARIMI_UYGULA.bat` dosyasını çalıştırın.
4. İstenen yere **mevcut** projenin kök klasörünü yazın (ör. `New folder (9)` klasörünün gerçek tam yolu).
5. Kurucu değişen kaynakları `_design_backups` altına kopyalar, SHA-256 ile doğrular ve olası hatada geri alır.
6. Mevcut `BASLAT.bat` dosyasını yeniden açın. Chrome/Edge'de `Ctrl+F5` ile önbelleği yenileyin.

**Önemli:** Yama `data` klasörünü, kullanıcıları, sınavları, `.env` dosyalarını ve SQLite veritabanını değiştirmez. Tam proje ZIP'i eski verileri taşımaz; mevcut kurulumda yalnız yamayı kullanın.
