# V4 CSS Emeklilik Deneyi — Güvenli Geçiş

## Neden doğrudan silmiyoruz?

8 Kasım 2026 yerel envanterinde 16 ekranın tamamında eski CSS bağımlılıkları bulunuyor.
`admin-design-v3.css` yalnızca `institution.html` ve `institutional-exams.html` ekranlarında bağlı.
`bep-design-system.css` ve `admin-premium.css` 16 ekranda kullanılıyor.
Bu dosyaları test etmeden kaldırmak giriş, MFA, sınav editörü ve mobil menüleri bozabilir.

## Salt okunur bağımlılık envanteri

```powershell
npm.cmd run design:v4:inventory
```

Her CSS dosyasının kaç ekranda kullanıldığını, `!important`, gradyan ve eski renk
başvurularını gösterir. Hiçbir uygulama/veritabanı dosyasını değiştirmez.

## İzole Edge karşılaştırması

```powershell
npm.cmd run design:v4:css-probe
```

- Gerçek yönetici oturumu **değil**, her çalıştırmada oluşturulan anonim, geçici SQLite ve Edge profilini kullanır.
- Giriş sonrası panelde ve sınav editöründe `admin-design-v3.css` bağlantısını yalnızca
  tarayıcı DOM'unda kısa süreli kapatır, sonra açar.
- Önemli ekran bölgelerinin konumu, boyutu, renkleri ve hesaplanan CSS özelliklerinin
  önce/sonra farklarını `BROWSER V4 CSS RETIREMENT PROBE` satırlarında raporlar.
- Normal 191 Edge kontrolünü de çalıştırır. **Tüm testlerin geçmesi, eski CSS'in
  kaldırılmasının güvenli olduğunu kendi başına kanıtlamaz**; önce farklar incelenmelidir.
- Karşılaştırma değişiklik sayısı sıfır değilse ilgili dosya korunur. Sıfır değişiklik
  olsa bile klavye/erişilebilirlik, mobil ve ekran görüntüsü incelemesi yapılmadan
  kalıcı kaldırma yapılmaz.

### Anonim ekran görüntüsü isteğe bağlı

```powershell
$env:BEP_UI_CAPTURE_DIR = Join-Path (Get-Location) '.local-v4-css-probe'
npm.cmd run design:v4:css-probe
Remove-Item Env:BEP_UI_CAPTURE_DIR -ErrorAction SilentlyContinue
```

Yalnızca sentetik, anonim Edge oturumundan görüntü alır.
`dashboard-desktop.png`, `dashboard-without-v3.png`,
`exam-desktop.png`, `exam-without-v3.png` karşılaştırılabilir.
İlgili resimler kesinlikle gerçek öğrenci veya kullanıcı oturumuna ait değildir.

## Kaldırma kriterleri

1. Deneyde değişiklik gösteren seçiciler bilinçli biçimde V4'e taşınır.
2. İki ekranda masaüstü/mobil kullanım, klavye ve özel durumlar aynı şekilde çalışır.
3. Otomatik Edge testi ve anonim görsel karşılaştırma geçer.
4. Eski dosyanın HTML bağlantısı ancak ayrı, geri alınabilir commit'te kaldırılır.
5. Giriş/parola, MFA, sınav düzenleme ve veri tabanı sözleşmeleri korunur.

Not: Bu aşamada hiçbir eski CSS bağlantısı kaldırılmadı.
