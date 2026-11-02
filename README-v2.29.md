# DOU BEP Sınav Atölyesi v2.29 — Semantik çıktı ve kanıtlı teslim

**Kapsam:** Yalnız anonim/sentetik verilerle çevrimdışı üniversite BAP araştırma prototipi. Gerçek öğrenci/engellilik bilgileriyle kullanıma **uygun değildir**.

## Yeni geliştirmeler

1. Word sınavında belge başlığı **Heading 1**, her soru **Heading 2** olarak gerçek OOXML paragraf stilleriyle kodlanır. Görünüşe benzeyen kalın paragraf yerine Word'ün gezinme/başlık yapısı kullanılır. PDF/UA ya da WCAG sertifikası değildir.
2. Yazdırılabilir HTML'de her soru `h2` semantik başlığı kullanır; sınavın başlığı `h1` olarak kalır.
3. Sunucu onaylı kayıttan Word + yazdırılabilir HTML + etkileşimli çevrimdışı HTML ürettiğinde **7 çıktıya özel yapısal denetim** yapar: dil, başlık/ana bölüm, yerel içerik güvenliği, klavye/duyuru işaretleri, öğrenci modeli ve çözüm anahtarı alanlarının dışarı aktarılmaması, yazdırma başlıkları, Word başlık stilleri. Denetim başarısızsa teslim bloke edilir, kayda başarı olayı yazılmaz.
4. ZIP'e `ERISILEBILIRLIK-DENETIM.json` eklenir. Bu rapor yalnız kontrol kimliklerini ve sonuçlarını içerir, sınav metni, cevap, aday/öğrenci bilgisi içermez. Raporda `manualReviewRequired: true` her zaman görünür.
5. Çevrimdışı paket doğrulayıcı yeni dosyanın SHA-256 özetini doğrular, rapordaki her yapısal sonucu **paketten yeniden hesaplar**. v2.29 ve üzeri teslimlerde bu rapor zorunludur; v2.28'in beş dosyalı paketleri geriye dönük doğrulanabilir.
6. Önceki MFA, kurum izolasyonu, onay kaydı, Word/PDF içe aktarma, toplu sınav, şifreli yedek ve Windows yerel başlatıcı korunmuştur. Şema değişikliği yoktur.

## Windows'ta değerlendirme (ayrı kurulum)

ZIP'i **mevcut çalışan klasörün üzerine yazmadan** yeni bir klasöre açın. Node.js >=22.13 gerekli.

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\BASLAT-MFA.ps1
```

`http://127.0.0.1:4173/kurumsal-sinav` adresinde anonim test sınavını kurum hesabıyla açın, kaydedip onaylayın ve **Sunucu teslim kontrolü** ile **Doğrulanabilir ZIP paketi indir** işlemlerini kullanın. ZIP içindeki yeni raporu görmek için arşivde `ERISILEBILIRLIK-DENETIM.json` dosyasını açın. Doğrulama:

```powershell
npm.cmd run package:verify -- "C:\indirilen\paket.zip"
```

## Doğrulama sınırları

Yapısal denetim bir **otomatik ön kontrol** olup sesli gezinmenin gerçek NVDA, JAWS veya VoiceOver ile çalıştığını; görsellerin ve matematik ifadelerinin eşdeğer olduğunu; baskı ve %400 reflow'u; WCAG 2.2/EN 301 549 uyumunu **kanıtlamaz**. Etiketli PDF bu sürümde üretilmez. Mevcut ses özelliği tarayıcı veya işletim sistemi sesine bağlı olabilir, şirket içinde geliştirilecek Türkçe ses motoru ayrı Ar-Ge aşamasıdır. Hiçbir yeni bulut/API bağımlılığı eklenmedi.

Üretim öncesi hâlâ: SSO/OIDC, dinlenimde uygulama katmanında canlı DB şifrelemesi, HTTPS/anahtar kurtarma, bağımsız sızma testi, KVKK/etik ve görme engelli üniversite öğrencileriyle gerçek kullanım testleri gereklidir.
