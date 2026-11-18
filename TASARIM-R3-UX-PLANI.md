# DOU BEP Sınav Atölyesi — UX/UI Tasarım Planı R3

Durum: **plan** (kod değişikliği yok). Kapsam yalnızca arayüzdür; veri modeli, API ve onay kuralları değişmez.

## 1. Tespit edilen kullanım sorunları

| # | Sorun | Kanıt | Etki |
|---|---|---|---|
| 1 | Menü düz bir listedir: 12 eşit ağırlıklı bağlantı | `/kurum` yan menüsü | Öğretmen "ne yapmalıyım?" sorusunu kendi çözer |
| 2 | Ana iş (sınav hazırlamak) menüde diğer yönetim araçlarıyla aynı seviyede | Menü sırası | Sık iş ile nadir iş ayrışmıyor |
| 3 | İlk ekranın yarısı tanıtım bandı; giriş formu ekranın altında kalıyor | 1366×850 ekran görüntüsü | Giriş yapmak için kaydırma gerekiyor |
| 4 | Editör (`/`) ve kurumsal panel (`/kurum`) iki ayrı uygulama gibi | Farklı kabuk, farklı gezinme | Kullanıcı yönünü kaybeder |
| 5 | Sınav adımları (6 adım) ilerleme/bitti durumunu göstermiyor, hata nerede belli değil | Yan menüdeki 1–6 numaraları | Onaya kadar tekrar tekrar geri dönülür |
| 6 | Yan menü alt notu menü öğeleriyle üst üste biniyor (düşük yükseklik) | Ekran görüntüsü | Son menü öğeleri okunamaz |
| 7 | Yer yer 11–12 px yazı, açık gri üzerinde | `.field small`, `.stat span` | Okunabilirlik; hedef kitle erişilebilirlik odaklı |
| 8 | 20 sayfada 4–5 üst üste CSS katmanı | `admin-premium.css` içinde 3 farklı "tema" | Her değişiklik beklenmedik yerde bozulur |

## 2. Kullanıcılar ve ana görevleri

- **Öğretmen (birincil):** BEP kazanımından sınav üretir, uyarlar, onaya gönderir, çıktı alır. Sık, hızlı, tekrarlı iş.
- **Koordinatör / onaylayıcı:** Bekleyen sınavları inceler, onaylar veya geri çevirir.
- **Yönetici:** Kullanıcı, yedek, operasyon, erişilebilirlik kabulü. Nadir iş.
- **Öğrenci (pilot ekranı):** Sınavı çözer. Büyük hedefler, sade ekran, klavye/okuyucu desteği.

Tasarım ilkesi: **kullanıcının sık işi ilk tıkta, nadir işi bir seviye altta.**

## 3. Bilgi mimarisi (menü baştan)

Mevcut 12 bağlantı, görev gruplarına ayrılır. URL'ler değişmez.

```
ÇALIŞMA          Bugün (ana sayfa) · Sınavlarım
OLUŞTUR          Yeni sınav · Word/PDF'den aktar · BEP kazanımı aktar
YÖNET            Koordinasyon · Uyarlama kararları · Toplu uyarlama   (rol: koordinatör+)
KALİTE           Erişilebilirlik kontrolü · Kabul listesi · Okuyucu demo
YÖNETİM          Operasyon · Pilot oturumlar                           (rol: yönetici)
```

- Rolün yetkisi olmayan grup **gizlenir**, gri bırakılmaz.
- "Yeni sınav" her sayfada üst çubukta sabit birincil düğmedir.
- Menü içi arama (`/`) korunur.

## 4. Temel ekranlar

### 4.1 Giriş
Tek sütun, ortalanmış, kart 420 px. Marka + 3 alan + tek birincil düğme. Tanıtım metni ve kural uyarısı formun altında küçük bir satır. Parola göster/gizle ve Caps Lock uyarısı. Hata mesajı alanın hemen altında ve `aria-live`.

### 4.2 Bugün (öğretmen ana sayfası)
Soru: "Şimdi ne yapmalıyım?" Sırayla:
1. **Devam et** kartı: son düzenlenen taslak (ad, kalan eksik sayısı, `Devam et`).
2. **Dikkat gerektirenler:** geri çevrilen sınavlar, onay bekleyenler, eksik cevap anahtarı.
3. **Başlat:** Yeni sınav · Word/PDF aktar · Kazanım aktar (3 eşit büyük kart).
4. Özet sayıları (taslak / onay bekleyen / onaylı) tek satır, tıklanınca filtreli liste.

Tanıtım bandı kaldırılır.

### 4.3 Sınavlarım
Tablo + durum filtre çipleri (Taslak, Onay bekliyor, Onaylı, Arşiv), arama, sıralama. Satır başına tek birincil eylem (duruma göre: Düzenle / İncele / İndir), diğerleri `⋯` menüsünde. Klavyeyle tam gezinilebilir.

### 4.4 Sınav editörü
- Üstte **adım çubuğu**: her adımda durum (tamam / eksik var / hata) ve eksik sayısı. Adıma tıklanabilir.
- Sağda **"Onaya hazır mı?"** paneli: engelleyen maddeler listesi; her madde ilgili alana atlar.
- Otomatik kayıt durumu sürekli görünür ("Kaydedildi 14:32").
- Soru listesi: sürükle-bırak yerine **yukarı/aşağı düğmeleri** (okuyucu ve klavye uyumu), soru başına açılır editör.
- Onayla/Gönder düğmesi, engel varken kapalı değil; tıklanınca engelleri listeler.

### 4.5 Yönetici ekranları
Tek ortak kalıp: sayfa başlığı → kısa açıklama → birincil eylem → tablo/kartlar. Tehlikeli eylemler (silme, geri yükleme) onay penceresinde, ne olacağını açıkça yazarak.

### 4.6 Öğrenci ekranı
Soru başına bir ekran, 20 px+ metin, ≥56 px dokunma hedefi, ilerleme "3 / 10", kalıcı "Yardım" düğmesi, sesli okuma varsa ekranın üstünde.

## 5. Görsel sistem

- **Renk:** marka kırmızısı yalnızca *birincil eylem, aktif durum, odak*. Durum renkleri (yeşil/amber/kırmızı) yalnızca durum için ve her zaman **metin + simge ile** (renk tek başına anlam taşımaz).
- **Tipografi:** gövde 16 px, ikincil 14 px, alt sınır 13 px; başlık ölçeği 28/22/18. Satır yüksekliği 1,5.
- **Aralık:** 4 px tabanlı (4/8/12/16/24/32/48).
- **Yüzey:** beyaz kart, 1 px ince çizgi, gölge yalnızca yükselen öğelerde (menü, iletişim kutusu).
- **Düğme:** 1 birincil / 1 ikincil / 1 metin; yüksekliği ≥44 px.
- **Odak:** 3 px kırmızı halka + 2 px boşluk, her yerde aynı.
- **Hareket:** 150 ms, `prefers-reduced-motion`'a saygılı.
- **Boş durum:** simge + tek cümle + tek eylem.

## 6. Erişilebilirlik hedefleri (WCAG 2.2 AA)

- Metin kontrastı ≥4,5:1, büyük metin ve bileşen sınırları ≥3:1.
- Tüm işlevler klavyeyle; mantıklı sekme sırası; "içeriğe geç" bağlantısı.
- Dokunma hedefi ≥44×44 px (öğrenci ekranında 56).
- Durum değişimleri `aria-live`; form hataları alanla ilişkilendirilmiş.
- 200 % yakınlaştırma ve 320 px genişlikte yatay kaydırma yok.
- NVDA ile gerçek doğrulama **yapılmadan** "erişilebilir" iddia edilmez (mevcut proje kuralı).

## 7. Teknik yaklaşım

1. Tüm sayfalar tek kabuk bileşenini kullanır (menü, üst çubuk, ana alan); `admin-navigation.js` genişletilir.
2. `design-system.css` tek kaynak olur; `ui-refresh.css`, `admin-premium.css` içindeki yinelenen "tema" blokları aşamalı silinir. Silmeden önce ilgili test (`design-*.test.mjs`, `admin-premium.test.mjs`) güncellenir.
3. Renk/aralık/yarıçap yalnızca CSS değişkenleriyle.
4. Her aşama sonunda: `npm test`, `npm run release:check`, 1366/768/390 px ekran görüntüsü.

## 8. Aşamalar

| Aşama | İçerik | Ölçüt |
|---|---|---|
| **F1 – Kabuk ve gezinme** | Yeni menü grupları, rol bazlı gizleme, sabit "Yeni sınav", alt not taşma düzeltmesi | Her sayfada aynı kabuk; 768 px yükseklikte menü taşmıyor |
| **F2 – Giriş + Bugün** | Yeni giriş, öğretmen ana sayfası | Giriş formu kaydırmadan görünür; "devam et" 1 tık |
| **F3 – Sınavlarım** | Liste, filtre çipleri, satır eylemleri | Bir sınava ≤2 tıkla ulaşım |
| **F4 – Editör** | Durumlu adım çubuğu, "Onaya hazır mı?" paneli, kayıt durumu | Onay engelleri tek yerde, tıklanır |
| **F5 – Yönetici kalıbı** | Ortak sayfa iskeleti, onay iletişim kutuları | 8 yönetici sayfası aynı düzende |
| **F6 – Öğrenci ekranı** | Büyük hedefler, ilerleme, yardım | Dokunma hedefi ≥56 px |
| **F7 – Temizlik** | Eski CSS katmanlarını silme | Toplam CSS boyutu ≥%40 azalır |

## 9. Başarı ölçütleri (pilot sırasında öğretmenle denenecek)

- Yeni kullanıcı, yardım almadan **ilk sınavı ≤10 dakikada** onaya gönderir.
- "Taslağıma devam et" ≤2 tık.
- Onay reddinde nedenin bulunması ≤1 tık.
- Klavyeyle tüm kritik akış tamamlanır.

## 10. Kapsam dışı

Yeni özellik, veri şeması, kimlik doğrulama, konuşma/NVDA motoru, gerçek kullanıcı verisi.

## 11. Uygulama durumu

| Aşama | Durum | Not |
|---|---|---|
| F1 Kabuk ve gezinme | Tamam | Görev gruplu menü, taşma düzeltmesi. Üst çubukta sabit "Yeni sınav" yapılmadı (menüdeki düğme duruyor). |
| F2 Giriş + Bugün | Tamam | Tek sütun giriş, sade Bugün paneli. |
| F3 Devam et + rol menüsü | Tamam | Sunucu yetkileri değişmedi; menü gizleme yalnızca kolaylıktır. Ayrı "Sınavlarım" sayfası yok (`/kurumsal-sinav` listesi kullanılıyor). |
| F4 Editör adım çubuğu | Tamam | Rozetler mevcut ön kontrol raporundan gelir. Soru sırası düğmeleri yapılmadı. |
| F5 Ortak sayfa başlığı + onay penceresi | Kısmen | Kurum paneli, koordinasyon, uyarlama kararları, kazanım/soru yayımlama ve sesli yanıt onayları yeni pencerede. |
| F6 Öğrenci ekranı | Tamam | Sahte sınavla denendi; ekran okuyucuyla denenmedi. |
| F7 Temizlik | Kısmen | Aşağıya bakın. |

### F7'de bilerek yapılmayanlar

- **Editördeki taslak kaybı onayları** (kaydedilmemiş değişiklik, kurtarma, kopya, dosyadan açma, hedef değiştirme, görsel uygulama; ~10 yer) tarayıcının yerel `confirm()` kutusunda bırakıldı. Bu kutu senkron çalıştığı için kayıt zamanlayıcısı ve `dirty`/`busy` durumu onay sırasında değişemez; asenkron pencereye geçmek bu garantiyi bozar ve tarayıcı içi testi yoktur.
- **Öğrenci ekranı, ana editör (`app.mjs`), ses/kayıt araçları** (~20 yer) aynı gerekçeyle ve kapsam dışı olduğu için dokunulmadı.
- **Eski CSS katmanlarının silinmesi** yapılmadı. `design-system.css` bilerek en son yüklenir ve eski katmanları `!important` ile geçersiz kılar; kuralları silmek için önce tüm sayfaların giriş yapılmış durumlarını kapsayan bir görsel regresyon düzeneği gerekir. Aksi hâlde dinamik durumlarda kullanılan kurallar yanlışlıkla silinebilir.
