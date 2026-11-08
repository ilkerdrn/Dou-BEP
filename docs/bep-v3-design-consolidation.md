# DOU BEP V3 — Birleşik tasarım geçişi (Aşama 1)

## Durum
Bu dal, mevcut DOU BEP kurum ve sınav hazırlama sayfalarını ortak `bep-design-system.css` sözleşmesine bağlar. Var olan dört stil dosyası, henüz regresyon karşılaştırması tamamlanmadığından geçiş süresince korunmuştur. Bu aşama CSS tekilleştirmesinin tamamı değildir.

## Değişiklikler
- Ortak renk, yüzey, metin, sınır, odak, radius ve gölge değişkenleri.
- Giriş / yönetim / sınav ekranları için ortak bileşen davranışı.
- Mevcut giriş, MFA, yetkilendirme, sınav ve veritabanı kodları değişmedi.
- Sunucu statik dosya izin listesine ortak stil eklendi.
- İki sayfa yeni CSS'yi en son yükler.
- Sınav sayfasının eski v2.67 başlığı güncellendi.

## Doğrulama (izole, veritabanına yazmaz)
```powershell
npm.cmd run design:v3:check
npm.cmd run ui:browser
```

## Birleştirme öncesi kabul koşulları
1. Kurum giriş / MFA / çıkış ve sınav yazarı görünümünde masaüstü ve mobil kontrol.
2. 320, 390, 768, 1280 pikselde yatay kayma ve odak görünürlüğü.
3. Ekran okuyucu manuel kontrolü; otomatik Edge testi tam WCAG sertifikası değildir.
4. Tarayıcı testleri başarılı olduktan sonra yalnız gerçekten gereksiz kalan eski CSS kurallarını aşamalı kaldırma.
5. Kaynaklar, yerel demo veritabanları, WAV laboratuvarı, auth ve MFA ayrı korunur.

## Sınırlamalar
Henüz ana dala birleştirilmedi; üretim tasarım onayı verilmedi. Koyu tema değişkenleri yalnız temel hazırlıktır, kullanıcı denetimli karanlık mod henüz etkin değildir. Gerçek sınav/öğrenci verisiyle test yapmayın.
