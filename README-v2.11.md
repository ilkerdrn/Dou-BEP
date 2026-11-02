# DOU BEP Sınav Atölyesi v2.11 — Öğretmen önizleme ve soru karşılaştırması

**Kapsam:** Yalnızca anonim yerel pilot. Resmî Doğuş Üniversitesi/MEB yazılımı değildir. Gerçek öğrenci kimliği, tanısı, sağlık bilgisi, çocuk ses kaydı veya kişisel BEP belgesi kullanmayın.

## Yeni özellikler

- Kurumsal sınav editöründe **Soruyu öğrenci gibi görüntüle** çalışma paneli eklendi. Öğretmen belirli bir soruyu seçebilir, sorunun öğrenci kâğıdında yer alacak biçimini görebilir.
- Beş sunum profiliyle (standart, geniş okuma, odaklanma, yüksek kontrast, geniş yanıt alanı) **geçici ve kayıt dışı** önizleme yapılabilir. Önizleme ayarı sınavın kalıcı düzenini, onay durumunu, cevap anahtarını veya kazanımı değiştirmez.
- Önizleme **öğrenci yazdırma görünümünün aynı soru çizim fonksiyonunu** kullanır (`questionHtml(q, i, exam, false)`). Soru metni, seçenekler, cevap alanları, sayı doğrusu ve nesne gruplarının öğrenci içeriği ile uyumu korunur.
- **Öğretmen karşılaştırması:** Özgün soru, öğretmenin alternatif olarak yazdığı sade metin ve öğrenciye gerçekten seçilen metin ayrı ayrı görünür.
- **Kontrol uyarıları:** Boş soru/seçenek/eşleştirme, görsel sunumun kapalı olması, eksik görsel açıklaması, geçersiz sayı doğrusu ve sade metin tutarlılığı denetimleri sunulur. Bu uyarılar klinik/pedagojik uygunluk hükmü değildir.
- Önizleme **cevap anahtarı, öğretmen notu, öğrenci kimliği veya tanı** göstermez; dış servise veri yollamaz. Yeni veritabanı tablosu veya veri migrasyonu eklenmedi.

## Kullanım

1. Anonim, öğretmen onaylı içeriklerle kurumsal panele giriş yapın ve Sınav Editörü'ne gidin.
2. Soruyu yazın. **Soruyu öğrenci gibi görüntüle** alanından soru numarasını ve sunum profilini seçin.
3. Sağdaki karşılaştırmayı ve uyarıları kontrol edin. Uyarılar soru tamamlandıkça güncellenir.
4. Gerçek öğrencilerle kullanmadan önce öğretmen/özel eğitim uzmanı tarafından erişilebilirlik ve ölçme eşdeğerliği ayrıca değerlendirilmelidir.

## Windows güncelleme

- Node.js **22.13+** gerekir (24 de desteklenir). ZIP'i yeni, boş bir klasöre açarak denemek en risksiz yöntemdir.
- Mevcut v2.10 kurulumunu güncellemeden **önce eski uygulamanın kendi `BEP_BACKUP_PASSPHRASE` ortam değişkenini belirleyerek `npm run backup` şifreli yedeğini alıp `npm run backup:verify -- "<yedek-dosyası.bepbak>"` ile doğrulayın**. Yedek şifresini unutmayın. Eski sunucuyu kapatın.
- Yeni paketin yalnızca kaynak kodunu mevcut klasöre aktarın. **`data/` klasörüne veya `data/institution.sqlite` veritabanına dokunmayın; silmeyin; üzerine yazmayın.** Özellikle şifreli yedekleri ayrı güvenli konumda tutun.
- İlk kurulumda `KURULUM-YONETICI.ps1` ile ilk yönetici hesabını oluşturun (varsayılan parola yoktur). `BASLAT.bat` açın ve `http://127.0.0.1:4173/kurum` adresine gidin.
- Eski v2.x sunucusu 4173 portunda çalışıyorsa v2.11 başlatıcı bunu fark eder; önce eski pencereyi kapatın.

## Doğrulama / sınırlar

- `npm test`: **294/294 PASS**. Yeni saf fonksiyon ve yerel HTTP servis testleri dahil.
- `npm run release:check`: **13/13 PASS**. Bu kontroller sızma testi veya kurumsal onay değildir.
- Yeni modül, sunucu ve kurumsal editör `node --check` ile söz dizimi kontrolünden geçti.
- Chromium canlı GUI testi **başarısız erişim nedeniyle yapılamadı**: bu çalışma ortamında `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Dolayısıyla gerçek tarayıcı tıklama/ekran görüntüsü testi geçmiş sayılmaz.
- Yapılmayanlar: NVDA/JAWS/VoiceOver/TalkBack ile uygulamalı testler, uzman pedagojik pilot, çocuk katılımcılarla çalışma, KVKK değerlendirmesi, HTTPS/SSO/MFA, dışa açık kurumsal dağıtım ve bağımsız sızma testi.
