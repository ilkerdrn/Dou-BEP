# DOU BEP öğrenci ekranı — Moodle ile karşılaştırma ve kendi ölçümümüz (18 Kasım 2026)

**Kapsam ve sınırlar.** Karşılaştırma tek bir örneğe dayanır: Moodle'ın herkese açık demo sitesinde (school.moodledemo.net), sitenin giriş sayfasında kendi yayımladığı öğrenci demo hesabıyla açılan **tek bir, süresiz sınavın** çözme ekranı. Moodle'ın tüm sürümleri, süreli sınavlar, uyarlama ayarları ve mobil uygulama incelenmedi. Inspera, ExamSoft ve Canvas'ın öğrenci ekranlarına erişilemedi (lisans/hesap gerekir); onlar için yalnızca yayımlanmış belgeler (bkz. `RAKIP-ANALIZI-v2.84.md`) kullanıldı. Aşağıdaki hiçbir madde bir "üstünlük" kanıtı değildir; engelli öğrencilerle test sonuçları yoktur.

## Yan yana (Moodle demo sınav ekranı ↔ DOU BEP `/pilot`)

| Konu | Moodle (gözlenen) | DOU BEP (v2.86) |
|---|---|---|
| Soru sunumu | Tüm sorular tek sayfada, alt alta; soru bilgisi sol kutuda ("Question 1 · Not yet answered · Marked out of 2.00") | Tek soru görünümü (kapatılabilir); durum soru başlığında |
| Soru gezintisi | Sağda "Quiz navigation": küçük çerçeveli numaralar | Soru haritası: 56 px düğmeler, ✓ cevaplandı, ⚑ işaretli, mevcut soru kalın çerçeveli; ilerleme çubuğu |
| Soruyu işaretleme | Var ("Flag question") | **Eklendi (v2.86):** düğme veya Alt+Shift+F; haritada ⚑, teslim onayında sayı |
| Bitirme | "Finish attempt …" bağlantısı | Teslim onayında "X cevaplandı, Y boş, Z işaretli"; ayrı özet sayfası yok |
| Süre | Bu sınavda süre yoktu; incelenmedi | Süre halkası + sayaç, görsel uyarılar, sunucu denetimli ek süre ve mola |
| Yazı / hedef boyutu | Soru metni küçük (yaklaşık tarayıcı varsayılanı), seçim düğmeleri küçük | Varsayılan 20 px, öğrenci 18–32 seçer; seçenek kartları ≥72 px |
| Görünüm ayarı | Üstte renk modu (açık/koyu) | Yüksek kontrast, basit ekran, büyük tıklama alanları, yazı boyutu |
| Klavye kısayolu | Gözlenmedi | Alt+Shift T/D/F/M/1…9/R/S/N/P (gerçek NVDA ile doğrulanmadı) |
| Otomatik axe (WCAG 2.2 A/AA) | Bu tek sınav sayfasında 1 kural grubu: `aria-hidden-focus` (6 öğe) | 17+ ekran 0 ihlal |

Moodle'ın bizde olmayan güçlü yanları: yıllara yayılan olgunluk, çok dilli arayüz, mobil uygulama, soru türü çeşitliliği, bir ayrı "gözden geçirme/özet" sayfası, gerçek kurumlarda sınanmışlık. Axe sonucu tek sayfa örneğidir, Moodle hakkında genel hüküm değildir.

## Kendi ölçümümüz (öğrenci sınav ekranı, gerçek Chromium)
- **Klavye:** Tab ile 20 durak; **0** durakta odak halkası eksik; 44 px altı etkileşimli öğe yok (onay/radyo girdileri hariç, onlar ≥24 px).
- **Yeniden akış:** 1280, 640 (≈%200) ve 320 px (≈%400) genişlikte **yatay kaydırma yok**.
- **Yazı:** "Çok büyük" seçeneğinde soru metni ≈30,8 px.
- **Axe:** öğrenci ekranı, 320 px ve mola ekranı 0 ihlal.

Bu ölçümler **otomatiktir**; ekran okuyucu duyuru kalitesi, kısayol çakışması, bilişsel yük ve gerçek kullanılabilirlik için `UZMAN-TEST-SENARYOLARI-NVDA.md` uygulanmalıdır.

## Kalan tasarım boşlukları (öncelik sırasıyla)
1. Gerçek NVDA/JAWS ve engelli öğrenci testi (en önemlisi).
2. Ayrı "gözden geçirme" özet ekranı (Moodle'daki gibi, soru–durum tablosu).
3. Sayfa uzunluğu: ayar, okuyucu ve harita kartları sınav sorusunun üstünde yer kaplıyor; dar ekranda soru aşağıda kalıyor. Kullanıcı testinde "soruya ulaşma süresi" ölçülmeli.
4. Kurum panelleri yoğun; yeni kullanıcı testi yapılmadı.
