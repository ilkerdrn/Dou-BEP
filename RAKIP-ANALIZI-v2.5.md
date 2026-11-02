# DOU BEP Sınav Atölyesi — Rakip analizi ve ürün stratejisi (28 Ekim 2026)

> Bu analiz, belirtilen tarihte yayımlanmış resmî ürün sayfalarına ve v2.5 yerel kaynak koduna dayanır. Rakiplerin kamuya açıklanmamış özellikleri ve gerçek kullanım deneyimi hakkında kesin iddia içermez. DOU adı prototip estetiğidir; Doğuş Üniversitesi tarafından resmî olarak sunulan bir yazılım değildir.

## Doğrudan rakipler ve öğrenilecekler

| Ürün | Kamuya açıklanan yetenek | Bizde mevcut | Eksik veya kanıtlanmamış |
|---|---|---|---|
| rahatettim | BEP planından ayrı sınav; cevap anahtarı; PDF; yazarken otomatik kayıt | Ayrı kurumsal sınav, DOCX/PDF, soru bankası, sürüm-onay | Güvenilir sunucu otomatik kaydı ve daha az adım gerektiren akış |
| BEP Hazırla | MEB temalı UDA/KDA havuzu, imzaya hazır BEP PDF, bulut arşiv | Kimliksiz BEP hedeflerini TXT/DOCX/metin PDF'den aktarma | Doğrulanmış geniş kazanım havuzu, takvimli plan, resmi kurumsal çıktı |
| Wayground | Tek oturumda öğrenciye farklı uyarlamalar, ek süre, sesli okuma, kalıcı erişim ayarları | Soru bazlı destek, 5 sunum profili, anonim dijital pilot | Öğrenci kimliğine gerek duymadan tekrarlanabilir anonim profil ataması ve dijital erişilebilirlik testleri |
| Diffit | PDF/metin/URL'den farklı okuma seviyesinde materyal ve çeşitli formatlarda dışa aktarma | Temel BEP metin aktarımı, öğretmen denetimli soru iskeleti | Öğretmen onaylı, açıkça etiketlenmiş öneri motoru ve düzenlenebilir çeşitlendirme |
| MagicSchool | Rubrik, değerlendirme ve öğretmen kontrollü farklılaştırılmış AI materyali | Rubrik, soru türleri, onay kapıları | İsteğe bağlı güvenlikli öneri üretimi, şeffaf kaynak/öneri izleri |
| Widgit Online | Profesyonel sembol kütüphanesi, görsel materyal tasarımı | Sayı doğrusu ve temel nesne çizimleri | Lisanslı sembol/alternatif iletişim materyali ve kapsamlı görsel editör |

Kaynaklar (ürünlerin kendilerine ait bilgi sayfaları):
- rahatettim: https://rahatettim.com.tr/video/bep-sinavlar
- BEP Hazırla: https://bephazirla.com/
- Wayground: https://help.wayground.com/support/solutions/articles/158000404956-differentiate-for-every-student-s-needs-with-accommodations-on-wayground
- Diffit: https://web.diffit.me/faq
- MagicSchool: https://www.magicschool.ai/faq
- Widgit: https://www.widgit.com/products/widgit-online/index.htm

## Ürün farkımızın olması gereken tanım

**Öğretmen denetimli, BEP amaçlarından erişilebilir sınav ve hedef bazlı rapora giden tek iş akışı.**

Yalnızca “sınav oluşturma” diye satılmamalı. “MEB onaylı”, “WCAG sertifikalı”, “KVKK tam uyumlu” veya “pedagojik eşdeğerliği kanıtlanmış” gibi onayımızın bulunmadığı iddialar kullanılmamalı.

## Kaynak kodundan doğrulanan durum

- Var: soru bankası (taslak, yayın), BEP hedef bağlantısı, soru sunumu karşılaştırması, öğretmen onay geçmişi, onaylı çıktılar, çevrimdışı öğrenci HTML, yerel şifreli SQLite yedek, anonim oturum ve puanlama, 5 erişilebilir çıktı profili.
- v2.5 ile var: 5 adımlı sınav hazırlık kontrolü; içerik ve kimlik içermeyen CSV; eksik adıma geçiş.
- Yok: otomatik sunucu taslak kaydı; resmî doğrulanmış kazanım kataloğu; okul genelinde SaaS/SSO/MFA/HTTPS; gerçek engelli kullanıcılarla doğrulanmış WCAG 2.2 AA uyumluluğu; kurul/onaylı çocuk verisi işleme; pedagojik eşdeğerlik için bağımsız uzman kanıtı; taranmış PDF OCR; güvenli ve isteğe bağlı LLM üretimi; yasal lisanslı sembol içeriği.
- Mevcut mimari yalnızca `127.0.0.1` üzerinde çalışan yerel pilottur. Çok kurum veritabanı izolasyonu yerel testlerden geçmiştir, kurumsal bulut güvenlik sertifikası anlamına gelmez.

## Geliştirme öncelikleri ve ölçülebilir kabul kapıları

| Faz | Öncelik | Teslim | Kabul ölçütü |
|---|---|---|---|
| v2.5 | Hemen | Hazırlık ve eksik adım paneli | Kaydedilmemiş değişiklik, eksik soru ve süresi geçmiş inceleme doğru görünmeli; CSV'de soru/cevap/kimlik bulunmamalı |
| v2.6 | P0 | Taslak otomatik kayıt, kurtarma, düzenleme çakışması | Ağ hatası simülasyonu, sürüm çakışması; kayıp değişiklik yok; gerçek kişi verisi tarayıcı kalıcı depolamasına yazılmıyor |
| v2.7 | P0 | Doğrulanmış kazanım kaynağı ve öğretmen arama | Kaynak/versiyon/derse göre filtre; içerik lisans ve atıf kontrolü; hedef değişince sınav kontrolü yenileniyor |
| v2.8 | P0 | Anonim erişilebilir sınav profilleri + gerçek AT testleri | NVDA, VoiceOver, TalkBack, klavye ve 320px reflow denemeleri; bloklayıcı sorun kalmamalı, uzman onayı kaydedilmeli |
| v2.9 | P1 | Öğretmenin incelediği soru/alternatif öneri motoru | Model çıktılarını cevap anahtarı kabul etmeme; prompt injection ve hassas veri testleri; öneri kaynak/kalite gerekçesi; elle onay zorunlu |
| v3.0 | P0 | Kurumsal kullanım öncesi mimari ve denetim | HTTPS, SSO/MFA, gizli anahtar yönetimi, audit, veri silme/saklama, restore drill, tenant sınır testleri, güvenlik ve KVKK hukuk değerlendirmesi; erişilebilirlik kullanıcı testi |
| Sonrası | P2 | Lisanslı semboller ve OBS/LMS entegrasyonu | İzinli API sözleşmesi, gerçek okul pilotu, lisans denetimi, performans ölçümleri, destek/satış ve SLA |

## Risk sınırları

1. Gerçek öğrenci adı, TCKN, tanı, sağlık kaydı, yüz, çocuk sesi, tanımlanabilir BEP belgesi kullanılmaz.
2. Kimlikli öğrenciye ait dönemlik ilerleme takibi güvenlik, veri sorumluluğu, saklama ve hukuki dayanak kararı verilmeden açılmaz.
3. Öğretmen beyanı pedagojik eşdeğerliği veya erişilebilirlik standardına uyumu otomatik kanıtlamaz.
4. Taranmış PDF içe alma yeteneği henüz yoktur; OCR ayrı çalışma ve doğru veri ayrıştırma testlerine ihtiyaç duyar.
5. Akademik/pedagojik pilot gerçek uzman ve kullanıcılarla onaylı protokolle yürütülmelidir.

Referans çerçeve:
- MEB bütünleştirme öğretmen kılavuzu: https://orgm.meb.gov.tr/kitaplar/Butunlestirme_Kapsaminda_Egitim_Uygulamalari_Ogretmen_Kilavuz_Kitabi.pdf
- WCAG 2.2: https://www.w3.org/TR/wcag/
- KVKK özel nitelikli veri rehberi: https://www.kvkk.gov.tr/Icerik/8184/Ozel-Nitelikli-Kisisel-Verilerin-Islenmesine-Iliskin-Rehber
