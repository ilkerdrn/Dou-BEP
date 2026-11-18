# DOU BEP — Sınav platformu rakip incelemesi (18 Kasım 2026)

> v2.5 analizi (`RAKIP-ANALIZI-v2.5.md`) BEP/materyal araçlarına bakıyordu. Bu ek, **sınav yapılan platformlara** (Inspera, ExamSoft Examplify, Moodle, Canvas) bakar. Yalnızca arama sonuçlarında görülen kamuya açık sayfalara dayanır; rakiplerin açıklanmayan özellikleri hakkında iddia yoktur. Yazı sınırı nedeniyle bazı kaynaklar eski olabilir (aşağıda belirtildi).

## Bulgular ve bizim durumumuz

| Konu | Rakiplerde görülen | DOU BEP durumu (v2.84) | Boşluk / karar |
|---|---|---|---|
| Ekran okuyucu kanıtı | Inspera 2024'te Admin ve Öğrenci için VPAT 2.4 yayımlamış; JAWS, NVDA, VoiceOver ile, ekran okuyucu testini gören bir değerlendirici yapmış. ExamSoft Examplify için JAWS 2022+, NVDA (Windows) ve VoiceOver (Mac) belgeli; test kayıtları var ([Inspera VPAT](https://inspera.com/legal/vpat/), [Examplify erişilebilirlik](https://support.examsoft.com/hc/en-us/articles/13291240030989-Examplify-Accessibility-Features)). | Yalnızca otomatik axe-core taraması (17 ekran 0 ihlal) ve gerçek Chromium testleri. **Gerçek NVDA/JAWS kanıtı yok.** | `UZMAN-TEST-SENARYOLARI-NVDA.md` + `ERISILEBILIRLIK-UYUM-RAPORU-TASLAK.md`; gerçek test sonrası doldurulacak. |
| Başlatıcı/giriş erişilebilirliği | 2021'de Inspera sınav portalı başlatıcısının ekran okuyucuyla erişilemediği bildirilmiş ([OT haberi](https://www.aop.org.uk/ot/news/2021/09/01/leading-e-exam-portal-inaccessible-for-blind-and-partially-sighted-students-says-charity), eski). Türkiye'de güvenlik doğrulama ekranı yüzünden giriş yapamayan görme engelli öğrenci şikâyetleri anlatılıyor ([bianet](https://bianet.org/haber/milli-egitim-bakanligi-ndan-gorme-engellilere-e-okul-engeli-170979)). | Giriş ve öğrenci kodu ekranlarında CAPTCHA yok; etiketli alanlar; axe 0 ihlal. | Korundu; her sürümde `npm run a11y:axe` ile denetlenir. |
| Öğrenci başına ek süre | Moodle: kullanıcı/grup bazlı süre geçersiz kılma, ama **sınav kapanış saati geçerse süre yine biter** (bilinen tuzak). Canvas: "Moderate Quiz" ile öğrenciye ek süre ([Moodle kullanıcı geçersiz kılma](https://sites.centre.edu/moodlekbase/?p=1280), [Campus Technology](https://campustechnology.com/articles/2016/03/16/quiz-accommodations-for-students-in-canvas-and-moodle.aspx)). | **Yeni (v2.84):** kod üretirken 0–120 dk onaylı ek süre; süre kod girilince başlar; bitişi **sunucu** hesaplar (süre + ek süre + 2 dk ağ payı); süre bitince tarayıcı yanıtları otomatik teslim eder. | Kapandı. Grup bazlı toplu ek süre toplu uyarlama hattında mevcut (`batch-accommodations`). |
| Mola (rest break) | Janison ek süre, çift süre ve mola listeliyor ([Janison](https://www.janison.com/online-assessment-software/platform/accessibility-features/)). | Yok. | **Açık boşluk.** Süreyi durdurma/mola kurumsal ve güvenlik kararı gerektirir; öğretmen onaylı "mola" tasarımı ayrı iş. |
| Görünüm seçenekleri | Newcastle'ın Inspera sayfası ters renk (koyu mod) ve yazı boyutunu belirtiyor. | Yüksek kontrast, 18–32 yazı boyutu, basit ekran, büyük tıklama alanları. | Eşdeğer veya daha geniş. |
| Yerleşik seslendirme | Inspera yerleşik metinden konuşmaya aracı sunuyor ([destek](https://support.inspera.com/hc/en-us/articles/360037981811)). | DOU Reader/DOU Speech, tamamen çevrimdışı; **ses kalitesi doğrulanmadı**. | Ses motoru üretime hazır değil; ekran okuyucuyla erişim korunuyor. |
| Görsel içerik (fizik/matematik) | Türkiye çalışması: üniversite giriş fizik sorularının yarısından fazlası görmeyen öğrenciye erişilemez ([ODTÜ çalışması](https://avesis.metu.edu.tr/yayin/ed5ecbf7-2501-4cdc-b2fe-cfcc8f9a6f3c/examining-the-accessibility-of-university-entrance-exam-physics-questions-for-blind-students)). | Görsel için öğretmenin doğruladığı metin betimlemesi zorunlu; yoksa sınav yayımlanamıyor. | Güçlü yön; Türkçe matematik okuma kalitesi ayrıca test edilmeli. |
| Türkiye'de ürün | Aramada ekran okuyucuyla uyumlu bir Türkçe **üniversite sınav yazılımı** adı bulunmadı; üniversiteler yönergelerle bilgisayarda sınav, sözlü sınav, Braille gibi düzenlemeler sunuyor. | Tek giriş, anonim erişilebilir sınav, çevrimdışı çalışma. | Konumlandırma: "engelli öğrenci merkezli, çevrimdışı çalışan erişilebilir sınav". Bunu **gerçek kullanıcı testi** olmadan iddia etmeyin. |

## Bu turda kapatılan boşluklar
1. Sunucu tarafı, öğrenci başına onaylı ek süre ve sunucu denetimli bitiş zamanı (Moodle/Canvas düzeyi).
2. Süre bitince otomatik teslim (yanıt kaybı yok).
3. Bağımsız erişilebilirlik tarayıcısı (axe-core) ve düzeltmeler: açık gri yardımcı metinler (4,5:1 altı), WCAG 2.2 hedef boyutu (24 px), hatalı ARIA.
4. Tek giriş; oturumsuz paneller `/kurum` girişine yönlenir.

## Hâlâ açık (ben kapatamam)
- Gerçek NVDA/JAWS/VoiceOver ve engelli öğrenci testleri; DOU Speech dinleme değerlendirmesi.
- Mola özelliği için kurum kararı; KVKK, sızma testi, SSO/HTTPS, kurum onayı.
