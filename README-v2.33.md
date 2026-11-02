# DOU BEP Sınav Atölyesi v2.33 — Öğretmen açıklamalı denklem ve görsel metinleri

**Kapsam:** Anonim üniversite sınav araştırma prototipi. **Gerçek öğrenci, tanı veya engellilik verisi kullanmayın.** Mevcut sınav koordinasyonu, erişilebilir Word/HTML, MFA, sınav onayı, PDF pilotu ve kabul merkezi korunmuştur. Canlı `data/` klasörü pakete dahil edilmez.

## Bu sürümde somut olarak ne yapıldı?

- Öğretmen sınav editöründe her sorunun altında **PDF için öğretmen açıklamalı denklem / görsel blokları** bölümünü açıp kaynakla karşılaştırılacak metin şablonunu ekleyebilir.
- Sınav sorusu metnindeki `:::denklem` veya `:::gorsel` blokları **kaynak gösterimi**, **öğretmenin erişilebilir açıklaması** ve `Kontrol: kaynakla karşılaştırıldı` beyanını birlikte zorunlu tutar. Bu kontrol beyanı tek başına gerçek bir akademik kontrolün kanıtı değildir. Örnek metinler **mutlaka değiştirilmelidir**.
- PDF motoru blokları iki ayrı, okuma sırasına giren etiketli paragraf olarak yerleştirir. Sembolik denklemi, grafik verilerini, renkleri veya alan/ölçüm ilişkilerini **kendisi yorumlamaz ya da doğrulamaz**.
- Eksik kapanış, eksik alan, eşit kaynak/açıklama, URL ve gömülü HTML/LaTeX/görsel işaretleri **PDF üretimini reddeder**. Mevcut `![]`, Office grafiği, formül resmi ve diğer gömülü nesneler otomatik dönüştürülmez.
- API yalnızca onaylı sürümden üretim yapar; değiştirilen soru açıklamasının mevcut onay SHA-256 özetiyle uyuşmaması, eksik oturum, CSRF veya kurum yetkisi PDF indirmesini engeller. Yanıt başlığında kaç alternatif yer aldığı ve insan incelemesinin hâlâ gerekli olduğu belirtilir.
- `server-foundation/pdf-reviewed-alternatives.mjs` ve yeni testler **yerel** çalışır; harici API, CDN, görsel çözümleme modeli veya bağımlılık indirme zorunlu değildir.

## Örnek işaretleme — bir sorunun metnine ekleyin

```text
Aşağıdaki modelin sözel karşılığını açıklayınız.
:::denklem
Kaynak: E = m çarpı c kare
Açıklama: E enerjisi, kütle ile ışık hızının karesinin çarpımına eşittir.
Kontrol: kaynakla karşılaştırıldı
:::

:::gorsel
Kaynak: İki sütunlu karşılaştırma grafiği
Açıklama: Birinci sütun 12, ikinci sütun 16 birimdir; ikincisi 4 birim yüksektir.
Kontrol: kaynakla karşılaştırıldı
:::
```

**Önemli:** Bu örnekler gerçek bir kaynaktan türetilmemiş **temsili eğitim örnekleridir**. Açıklama yalnızca öğretmen gerçek kaynak belgesini karşılaştırıp doğruladığında kullanılmalıdır. Metinsel açıklama, asıl grafik veya denklem gösteriminin işlevsel eşdeğerliğini otomatik kanıtlamaz. İşaretleme, Office Word/MathML nesnesi veya gömülü bir fotoğrafı PDF'ye aktarmak anlamına gelmez.

## Windows'ta yerel kullanım

1. ZIP'i önceki sürümlerin **üzerine değil, yeni bir klasöre** çıkarın. Eski `data/`, yedek ve anahtar dosyalarını koruyun.
2. Node.js 22.13+ ile aşağıdaki komutları çalıştırın:

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
npm.cmd run pdf:font-check
```

3. `BASLAT.bat` veya kurumun MFA kurulumunda `BASLAT-MFA.ps1` ile uygulamayı açın. Kurumsal sınav editöründe soru alanının altındaki açıklama şablonundan yararlanın. Kaynakla kontrol edip taslağı kaydedin; **önceki onay geçerli değildir, yeni revizyon onaylanmalıdır**. Onaylı sürümde **Etiketli PDF (pilot) indir** seçeneğini kullanın.
4. Kodlu sorularda `npm.cmd run pdf:code-font-check` de çalıştırılmalıdır. Fontlar proje ZIP'ine dahil edilmez; yerel fontun gömülme lisansı gerekir.

## Bilinen kritik sınırlar

- Sunucu **etiketli PDF pilotu** üretir; **PDF/UA uyumluluğu, formül semantiği, gerçek şekil etiketleri, W3C/WCAG uygunluğu veya NVDA/JAWS çalışabilirliği kanıtlanmamıştır**.
- Öğretmenin örnek bloğu eklemesi tek başına ölçme eşdeğerliğinin veya açıklama doğruluğunun kanıtı değildir. İlgili öğretim elemanı, erişilebilirlik uzmanı ve kurumsal onay süreçleri ayrıca gerekir.
- Karmaşık çok hücreli tablolar, Word'den gömülü resimler ve Office denklem nesneleri hâlâ otomatik içe aktarılamaz; v2.23 öğretmen denetimli metin dökümü akışı ayrı kullanılabilir.
- Yerel SQLite canlı veritabanı uygulama seviyesinde şifreli değildir. Kurumsal SSO, bağımsız pentest, KVKK ve gerçek kullanıcı kabulü tamamlanmadı.
- `Kontrol: kaynakla karşılaştırıldı` yazılı bir beyan olup kimlik doğrulanmış ayrı bir alan kaydı değildir; kurum onaylı sınav revizyonunun değiştirilmediği SHA-256 ile denetlenir.

Bu özellik, ana sınav sisteminin BAP araştırma aşamasıdır. Özelleştirilmiş Türkçe çevrimdışı ses ve ekran okuyucu Ar-Ge modülü sonraki aşamada ele alınacaktır.
