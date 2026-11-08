# DOU BEP V4 — Kurumsal Tasarım Blueprint

**Durum:** V4 başlangıç paketi. Bu belge tamamlanmış görsel kabul değil, uygulanacak tek tasarım sözleşmesidir.
**Kaynak:** V3 son doğrulanmış temel, `feature/bep-v3-unified-design-20261108`.
**V4 dalı:** `feature/bep-v4-unified-institutional-design-20261108`.
**Güvenlik:** Veritabanı, kimlik doğrulama, sınav oluşturma/onay, NVDA/robotik ses modülleri ve API kontratları korunur.

## Ürün mimarisi

DOU BEP tek kurumsal uygulamadır. `/`, `/index.html` ve `/kurum` tek girişe gider.
Eski tasarımcı geçiş boyunca `/eski-sinav-tasarimci` altında tutulur; işlev karşılaştırması ve veri kaybı denetimi bitmeden silinmez.

| Akış | Kullanıcı amacı | V4 kabuk |
| --- | --- | --- |
| `/kurum` | Giriş, son işlemler, kritik aksiyonlar | Tam ekran giriş veya kurumsal dashboard |
| `/kurumsal-sinav` | Soru hazırlama, kaydetme, önizleme, onay | Geniş editör, tek aksiyon hiyerarşisi |
| `/sinav-koordinasyon` | Takvim, kişi/yer, koordinasyon | Gruplanmış formlar ve durum listesi |
| `/uyarlama-kararlari`, `/toplu-sinav` | Kararlar, toplu uyarlama | Bölümlü iş akışı |
| `/sinav-operasyon`, `/erisilebilirlik-kabul` | Durum ve iş onayı | Özet + eylem alanı |
| `/sinav-dosya-aktar`, `/bep-import` | Kaynak ve kazanım aktarımı | Önizleme + doğrulama |
| `/pilot-yonetim`, `/erisilebilirlik-kontrol` | Anonim pilot ve test | Gizlilik odaklı çalışma alanı |
| Reader / Speech Lab sayfaları | Yerel ses ve deney | Aynı görsel iskelet; deneysel uyarılar korunur |

## Tek görsel sözleşme

- **Arka plan:** `#F7F7F8`; yüzey: `#FFFFFF`; kenarlık: `#E6E7EB`.
- **Metin:** `#202431`; ikincil: `#596274`; soluk: `#737E8C`.
- **Tek kurumsal vurgu:** bordo `#7A1F2B`; hover `#621923`; çok açık yüzey `#F5ECEF`.
- **Güvenilir durumlar:** yeşil `#1F7A4D`, uyarı `#996515`, hata `#B42318`; yalnız anlam taşıdığında kullanılacak.
- **Tipografi:** sistem sans; gövde 15px; başlık ölçeği 32/24/19px; metin satır aralığı 1.55.
- **Boşluk:** 4px taban, 8/12/16/24/32; bileşen köşeleri 10–14px.
- **Etkileşim:** minimum 44px dokunma hedefi, 3px görünür klavye odağı, durum metni rengin yanında yazıyla belirtilir.
- **Süsleme:** büyük gradient, parlak gölge, tekrar eden dekoratif rozet ve pazarlama afişi kullanılmaz.
- **Mobil:** 320px başlangıç; yatay taşma ve kapalı odak alanı olmaz.

## Ekran hiyerarşileri

### Giriş
İki sakin kolon: solda ürün kimliği ve en fazla üç güvenlik/fayda özeti; sağda görev odaklı giriş formu. Parlak kahraman illüstrasyonu yok. Mobilde tek kolon.

### Panel
Kısa sayfa başlığı → durum/iş kartları → en yakın yapılacak iş → son işlemler → modül kısayolları. Ayrı gölge ve renk dili yok.

### Sınav editörü
Tek üst aksiyon alanı; soru listesi/editör/ayar dengesi; 100 soruluk senaryo; klavye, kaydetme ve onay akışları değişmeden daha güçlü görsel hiyerarşi.

### Diğer yönetim sayfaları
Aynı sol navigasyon, üst başlık, yüzey, form ve işlem butonları. Tasarım sistemiyle izole bileşenler; özel düzenler yalnız alanın gerçek ihtiyacı olduğunda.

## Uygulama fazları ve bitiş koşulları

1. **Temel:** V4 branch, tasarım sözleşmesi, `bep-v4.css`, giriş/panel/editör iskeleti; V3 dosyaları yerinde.
2. **Kritik akış:** Giriş ve panel gerçek görsel inceleme; sınav editörü, soru listesi, kaydet/önizle/onay görsel ve işlevsel kabulü.
3. **Operasyon:** Koordinasyon, toplu işlemler, kararlar, içe aktarma, erişilebilirlik merkezi, pilot yönetimi.
4. **Ses ve kalite:** Reader/Speech Lab aynı kabuk, deneysel statüler açık; manuel NVDA testi ve yerel ses kabulü ayrıca.
5. **Konsolidasyon:** V3 eski stil katmanlarını ekran ekran kaldır; görsel regresyon ve işlev karşılaştırmasını geçmiş her ekran için belgeleyip tamamla.

**Kabul koşulları:** Kurumsal tutarlılık için gerçek ekran görüntüsü incelemesi, mobil 320/390/768/1280, Edge kabul testi, klavye odağı, 100 soruluk editör, SQLite izolasyonu, geçmiş işlev karşılaştırması ve gerçek NVDA manuel denemesi. Sadece yeşil CI/Edge testleri “premium görünüm bitti” demek değildir.
