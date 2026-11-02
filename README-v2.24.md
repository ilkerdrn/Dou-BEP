# DOU BEP Sınav Atölyesi v2.24 — Onaylı sınav için sunucu tarafında doğrulanabilir teslim

**Kapsam:** BAP araştırması için anonim, yerel üniversite sınavı prototipi. v2.23'ün Word/PDF kaynak incelemesi, koordinasyon, uyarlama, Excel aktarımı ve toplu sınav özellikleri korunur. Bu sürüm gerçek öğrenci/tanı/sağlık verisi için onaylı değildir.

## Yeni özellikler

- Kurumsal sınav editöründe onaylı kaydı açın → **Onay ve çıktı** bölümüne gidin → `Onaylı sınav için erişilebilir sunum profili` seçin → **Sunucu teslim kontrolü** → **Doğrulanabilir ZIP paketi indir**.
- Paket **istemcinin gönderdiği sınav içeriğinden değil**, kurum içi SQLite'daki onaylı sınavın güncel sürümünden sunucuda oluşturulur. Kaynak verinin SHA-256 özeti, aynı sürümdeki onay geçmişiyle eşleşmeden **hiçbir tekil sınav dışa aktarma işlemi gerçekleşmez**.
- ZIP'de `SINAV.docx`, `SINAV-YAZDIR.html`, `SINAV-ERISILEBILIR.html`, `INTEGRITY-MANIFEST.json` ve `OKU-BENI.txt` bulunur. Dosyalar cevap anahtarı olarak işaretlenmiş çözüm listesi veya öğrenci kimlik kaydı içermez; doğru cevap olabilecek seçenek metinleri doğal olarak sorularda bulunabilir.
- Manifestte sürüm, profil, sınav sürümü, onaylı içerik SHA-256 özeti, soru sayısı ve her üretim dosyasının SHA-256 özeti yer alır. Bunlar kriptografik **dijital imza değildir**; yetkili kaynaktan bağımsız SHA-256 karşılaştırması gerektirir.
- Öğretmen teslimi öncesi sınavın onay/kalite/betimleme kontrolleri tekrarlanır. Yalnız biçim profili değiştirilir; soru, cevap anahtarı, hedef ve süre bilgisi değişemez.
- `exam_delivery_events` adlı yeni tabloda tenant/kullanıcı/sınav/sürüm/profil/paket hash'i denetim kaydı oluşturulur. Önceki `data` içeriği silinmez; dosyalar geçici sunucu yanıtı olarak üretilir, paket ZIP'i kalıcı diske yazılmaz.
- `npm run package:verify -- <teslim.zip> [beklenen-zip-sha256]` komutu yeni tekil sınav ZIP'ini de doğrular; eski toplu sınav ZIP'leri desteklenmeye devam eder. Beklenen hash ZIP indirme yanıtının `X-Package-SHA256` başlığından veya bağımsız güvenilir kayıttan alınabilir.

## Sınırlar

1. ZIP'deki SHA-256'lar üretim dosyalarının bayt bütünlüğünü kontrol eder; dokümanın görsel çıktısını, matematik semantiğini, ölçme eşdeğerliğini veya WCAG erişilebilirliğini otomatik kanıtlamaz.
2. DOCX, yazdırılabilir HTML ve erişilebilir HTML çıktıları oluşturulur; **yerel Microsoft Word veya ekran okuyucuyla gerçek kullanıcı testleri henüz tamamlanmadı**. Erişilebilir HTML'deki ses tarayıcı/sistem tarafından sunulur; kendi çevrimdışı Türkçe sentez motorumuz henüz yapılmadı.
3. PDF'nin kendisi sunucuda üretilmiyor; yazdırılabilir HTML dosyası tarayıcıdan PDF olarak kaydedilebilir. Etiketli/semantik erişilebilir PDF henüz teslim edilmiyor.
4. Bu sürümde dinlenimde DB şifrelemesi, kurumsal SSO/MFA, profesyonel sızma testi ve görme engelli kullanıcıyla bağımsız kabul testi tamamlanmadı. Gerçek öğrenci/engellilik verisi kullanmayın.
5. Arayüzdeki önceki bireysel Word/HTML indirme yöntemleri de sürer; güvenli ve denetlenebilir teslim için yeni paket önerilir.

## Windows'ta test

ZIP'i eski kurulumdan ayrı klasöre çıkartın; `data` klasörünü **kopyalamayın, silmeyin**. Node.js 22.13+ kurulu olmalı. PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\TEK-KOMUT-YEREL-KONTROL.ps1
```

Kontroller tamamlanırsa `BASLAT.bat` ile `http://127.0.0.1:4173/kurum` açın; kurum hesabıyla `http://127.0.0.1:4173/kurumsal-sinav` sayfasına girin. Var olan 4173 portunda eski sürüm çalışıyorsa normal biçimde kapatın. Kimlik/tanı yerine yalnız anonim örnek sınavlarla test edin.
