# DOU BEP Sınav Atölyesi v2.32 — Kodlu ve basit tablolu PDF pilotu

**Kapsam:** Anonim üniversite sınav araştırma prototipi. Gerçek öğrenci, tanı veya engellilik verilerini kullanmayın. Tüm önceki modüller (çok dersli sınav, öğretmen ve uyarlama onayı, MFA, koordinasyon, Word/HTML, PDF pilot ve kabul testi) korunur. Mevcut `data` klasörünü taşımayın, silmeyin veya üzerine yazmayın.

## Yeni özellikler

1. **Açık kod blokları:** Sorunun onaylı metninde ` ```python `, ` ```js ` gibi açılıp kapanan üç ters tırnaklı bloklar PDF pilotunda desteklenir. Her satır, boş satır ve girinti korunur. Tab karakteri dört boşluğa dönüştürülür. Kod **çalıştırılmaz**. Kod için yerel, gömülmesine izin verilen **eş aralıklı TrueType** font kullanılır (Consolas, Courier New, DejaVu Sans Mono, Liberation Mono gibi). Font dosyaları kaynak ZIP'e konmaz.
2. **Basit Markdown tabloları:** Şu biçimde açık başlık, ayırıcı ve satırları bulunan tablolar, her hücreye sütun adını ekleyerek **doğrusal erişilebilir açıklama** metnine dönüştürülür. Bu bir PDF `/Table` yapısı veya PDF/UA tablo gezinimi değildir.
3. **Güvenli durdurma:** Kapanmamış kod, satıra sığmayan kod, uyumsuz sütun sayısı, eksik/boş hücre, 6'dan fazla sütun, 30'dan fazla tablo satırı, desteklenmeyen gömülü şekil/Office matematik/LaTeX, font glifi eksikliği PDF üretimini durdurur. Kaynak soru metni ve doğru cevaplar otomatik değiştirilmez.
4. **Önceki güvenlik kuralları:** PDF yalnız sunucudaki onaylı revizyondan, CSRF, Origin, rol, kurum ayrımı ve onay içeriği SHA-256 kontrolünden sonra indirilebilir. PDF/UA, WCAG ve ekran okuyucu uygunluğu iddia edilmez.

Örnek soru metni:

````text
Aşağıdaki kodun çıktısını açıklayınız:
```python
value = 4
if value < 8:
    print("başarılı")
```

| Ölçüt | A | B |
| --- | --- | --- |
| Süre | 12 ms | 18 ms |
| Bellek | 64 MB | 48 MB |
````

PDF tablosu satırları `Satır 1. Ölçüt: Süre; A: 12 ms; B: 18 ms` biçiminde açıklama metni olarak gösterir. Orijinal çizgili tablo düzeni veya karmaşık başlık birleşimi üretilmez.

## Windows'ta kullanım

1. v2.32 ZIP'i **yeni bir klasöre** çıkarın; eski çalışan kurulumunuzun `data` dosyalarına dokunmayın. Node.js 22.13 veya üzerini kullanın.
2. PowerShell'de yeni klasörden:

```powershell
npm.cmd run pdf:font-check
npm.cmd run pdf:code-font-check
npm.cmd run acceptance:pilot
```

3. Kod fontu bulunamazsa, BT ekibinin gömme lisansını doğruladığı, eş aralıklı Unicode TrueType dosyasını aynı PowerShell oturumunda belirtin:

```powershell
$env:BEP_PDF_CODE_FONT_PATH = 'C:\Windows\Fonts\consola.ttf'
npm.cmd run pdf:code-font-check
```

4. Uygulamayı `BASLAT.bat` ya da MFA etkin sistemde `BASLAT-MFA.ps1` ile başlatın. `/kurumsal-sinav` sayfasında onaylı sınavı seçip **Etiketli PDF (pilot) indir** düğmesini kullanın. Sunucu başlatılmadan önce font değişkenlerini ayarlayın.

## Güvenlik, dürüstlük ve kalan eksikler

- Kod fontları dış ağdan indirilmez ve proje ZIP'inde font dosyası yoktur; sistemdeki fontlar yalnız PDF dosyasına lisans izin verdiğinde gömülür.
- Basit tablo **doğrusal etiketli paragraflardır**, gerçek semantik tablo etiketleri veya başlık ilişkileri değildir. Karmaşık tablolar, kaynak Word görüntüleri, grafikler ve matematik nesneleri insan incelemesi olmadan çevrilmez.
- Ekran okuyucu, PDF/UA uzman denetimi, NVDA/JAWS gerçek Windows testi, kurumsal SSO/HTTPS ve canlı veritabanı şifrelemesi tamamlanmadı. Gerçek öğrenci verisiyle üretim kullanımına hazır değildir.
- Çevrimdışı çalışması haricî API/CDN zorunluluğu olmadığı anlamındadır; ağ izolasyonu için ayrıca işletim sistemi güvenlik duvarı testi gereklidir.

## Doğrulama

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
npm.cmd run pdf:font-check
npm.cmd run pdf:code-font-check
```

BAP sonraki adımlar: karmaşık görsel/denklem için öğretmen onaylı alternatif metin akışı ve semantik PDF tablo başlıkları; kurumsal kimlik ve veri güvenliği; gerçek uzman kabulü; ardından bağımsız çevrimdışı Türkçe ses/ekran erişim motoru Ar-Ge'si.
