# DOU BEP Sınav Atölyesi — v2.12

**Durum:** Özel gereksinimlere yönelik, yalnızca *anonim yerel pilot*. Doğuş Üniversitesi, MEB veya başka bir kurum tarafından onaylanmış resmî bir yazılım değildir. Gerçek öğrenci adı, tanısı, sağlık bilgisi, kişisel BEP belgesi veya çocuk ses kaydı kullanmayın.

## Bu sürümde yeni

### 11 yerel görsel materyal

Kurumsal sınav editöründe **Hazır görsel materyaller** bölümü eklendi. İçerikler mevcut öğrenci kâğıdı çizim motoruna uyumlu **geometrik şekillerden** oluşur; fotoğraf, lisanslı sembol, yapay zekâ, internet servisi veya dosya yükleme kullanmaz.

- Tek grupta beş daire, yedi üçgen, on daire
- İki grupta 3+2 daire, 4+6 kare, 2+4 yıldız, 4+4 kare
- Sayı doğrusu: 0–5, 0–10, 10–20, 20–30

Materyaller hem kategoriye göre hem de Türkçe metin aramasıyla filtrelenebilir. Öğretmen önce materyali, sonra **hedef soruyu** seçer. Ekleme işlemi **açık onay** ister. Sorunun soru metni, kazanımı, şıkları, doğru yanıtı, puanı ve kimliği korunur; yalnızca görsel bilgileri ve uygun görsel betimlemesi değiştirilir. Eski alternatif-metni doğrulamaları ve yerel şablon denetimi geçersizleşir, otomatik kayıt yeni taslak sürümünü yazar. Onaylı sınav doğrudan yeniden onaylanmaz.

### Kritik kontrol iyileştirmesi

Önceki sürümlerde görsel *şekil türü* (kare/yıldız/üçgen) öğretmen denetiminin içerik parmak izinde yer almıyordu. Artık varsayılan daire veya sayı doğrusu ile **değişmeyen** eski doğrulamalar bozulmadan kalırken farklı geometrik şekiller için tekrar doğrulama istenir. Bu, özel eğitim uzmanı onayı yerine geçmez.

### Erişilebilirlik

- Galeri seçimleri klavyeyle kullanılabilir; seçili kartların `aria-pressed` işareti vardır.
- Küçük ekranlarda tek sütunlu düzen; odak vurgusu ve azaltılmış hareket tercihi desteklenir.
- Görsel kartlarda betimleyici `role=img` / `aria-label` kullanılır.
- Soruya uygulanan metin alternatifi, yalnızca nesnelerin sayısı/şekli veya sayı doğrusu aralığı hakkında nesnel betimleme içerir; pedagojik anlamı öğretmen değerlendirir.
- Öğrenci çıktısında görselin gösterilmesi için **Erişilebilirlik seçenekleri → Görsel açıklamalar** ayrıca etkinleştirilmelidir. Görsel ipucunun ölçülen beceriyi değiştirip değiştirmediği öğretmenin sorumluluğundadır.

## Kullanım

1. `BASLAT.bat` ile programı açın; `http://127.0.0.1:4173/kurum` adresinden kurum hesabıyla oturum açın.
2. **Kurumsal Sınav Editörü** bölümüne geçin ve anonim örnek sınavı hazırlayın.
3. **Hazır görsel materyaller** bölümünde filtreyi/aramayı kullanın, bir kartı seçin.
4. **Hedef soru** alanından hangi soruya uygulanacağını seçin. **Görseli seçili soruya uygula** düğmesine basın; gösterilen değişiklik uyarısını okuyup onaylayın.
5. Soru bölümünde görsel açıklamasını ve sayı/şekilleri kontrol edin. Görsel açıklamalar ayarını açıp **Soruyu öğrenci gibi görüntüle** bölümünde kontrol edin.
6. Ölçme uygunluğunu, cevap anahtarını, hedef eşleştirmesini ve önceki öğretmen onaylarını yeniden gözden geçirin. Kaydedilmemiş veya onaysız içerik kurumsal çıktı olarak sunulmamalıdır.

## Windows güncelleme ve verilerin korunması

- Node.js 22.13+ gerekir. İlk defa kuruyorsanız ZIP'i **boş** klasöre açıp `KURULUM-YONETICI.ps1` çalıştırın; varsayılan yönetici parolası **yoktur**.
- Eski v2.11 kurulumu üzerinde güncelleme yapacaksanız, önce eski sürümde `BEP_BACKUP_PASSPHRASE` ile **şifreli yedek** (`npm run backup`) alın ve `npm run backup:verify -- "<dosya.bepbak>"` ile doğrulayın. Parolayı güvenle saklayın.
- Sunucuyu kapatın. Yeni ZIP'teki **yalnızca kaynak dosyalarını** mevcut uygulama klasörüne aktarın. `data` klasörü, `data/institution.sqlite` ve şifreli yedeklere **dokunmayın**. Önce ayrı bir klasörde deneme yapmak daha güvenlidir.
- Eski sunucu aynı 4173 portunu kullanıyorsa başlatıcı kullanıcıyı uyarır; çalışan işlemi otomatik sonlandırmaz.

## Sınırlar

- Gerçek kullanıcılarla ekran okuyucu (NVDA/JAWS/VoiceOver/TalkBack), motor erişilebilirlik, baskı ve pedagojik eşdeğerlik testleri yapılmadı.
- Kurumsal HTTPS/SSO/MFA, KVKK değerlendirmesi, bağımsız sızma testi ve kurum onayı tamamlanmadı.
- Bu sürüm **özgün yerel geometrik çizimler** sunar; profesyonel AAC/sembol kütüphanesi, dış görsel yükleme veya kullanıcıya özel görsel arşiv oluşturmaz.
- `npm test`: **302/302 PASS**. `npm run release:check`: **13/13 PASS**. Yerel Chromium üzerinden gerçek kullanıcı akışı **ortam kısıtı nedeniyle yapılamadı** (`net::ERR_BLOCKED_BY_ADMINISTRATOR`). Birim/HTTP testleri bu eksiğin yerini tutmaz.
