# DOU BEP Sınav Atölyesi v2.36 — Haricî Audit Kanıtı

**Kapsam:** Çevrimdışı, sentetik/anonim üniversite sınavları için yerel BAP araştırma prototipi. Gerçek kişi, sağlık veya engellilik verisiyle kullanıma uygun değildir. Önceki API'ler ve SQLite kayıtları korunur; zorunlu şema göçü yoktur.

## Ne değişti?

`audit` tablosundaki olayların **seçilen andaki tamamı**, kimlik ve olay alanlarının sabit sıralanmış temsiliyle SHA-256 özetine dönüştürülür. Bu özet ayrı saklanan rastgele 256 bit anahtarla **HMAC-SHA256** olarak korunur. `audit:verify`, kanıttaki olay ID sınırına kadar tüm kayıtları SQLite üzerinde **salt okunur** tarayıp hem HMAC'i hem kayıt özetini kontrol eder.

- Değiştirilmiş, silinmiş veya yeniden sıralanmış **önceden mühürlenmiş** audit satırları tespit edilir.
- Kanıt dosyasında ham e-posta, hesap ID'si, öğrenci kodu, sınav metni veya audit satırları **yoktur**. Olay sayısı, son kayıt ID'si, zaman ve özetler bulunur.
- Mühürleme yeni audit satırı yazmaz ve veritabanını değiştirmez.
- Yeni audit olayları eski mühürün **dışında** kalır. Düzenli yeni mühür üretimi ve önceki kanıtların kurumca ayrı, salt okunur ortamda arşivlenmesi gerekir. Anahtar/kanıt aynı erişim düzeyindeki saldırganca değiştirilebiliyorsa kontrol aşılamaz.
- Bu çözüm **asimetik dijital imza**, WORM/SIEM, tam zamanlı değiştirilemez audit kaydı, canlı SQLite şifreleme, kanıt geri alma/rollback koruması veya KVKK güvenlik sertifikası değildir.

## Windows PowerShell (ayrı klasörler)

Yeni ZIP'i mevcut çalışan sürümün *üzerine yazmadan* ayrı klasöre çıkarın. Komutları bu yeni v2.36 klasöründe çalıştırın. Node.js en az 22.13 gereklidir. Sürüm veritabanını **önceden oluşturmuş** olmalıdır; kanıt aracı otomatik bir veritabanı oluşturmaz.

Aşağıdaki yolları kendi ortama göre düzenleyin. **Anahtar `data` dışında, kanıt ayrı klasörde** kalmalıdır. Kanıtları USB veya BT yönetimli ayrı, değiştirilemeyen kurumsal ortama kopyalayın. Yerel Windows ACL/BitLocker güvenliği ve yedekleri BT yöneticisiyle ayrıca doğrulayın.

```powershell
$db       = Join-Path (Get-Location) 'data\institution.sqlite'
$key      = Join-Path $env:APPDATA 'DOU-BEP-Audit-Key\audit.key'
$evidence = Join-Path $env:USERPROFILE 'Documents\DOU-BEP-Evidence\audit-20261029-01.json'

# Bir kere üretin; mevcut anahtar dosyasını ASLA ezmez.
npm.cmd run audit:key -- --key-file "$key"

# Mevcut audit olaylarını mühürleyin. Kanıt dosyası da asla ezilmez.
npm.cmd run audit:seal -- --db "$db" --key-file "$key" --evidence-file "$evidence"

# Kanıtı SHA-256/HMAC ile canlı audit tablosuna karşı doğrulayın.
npm.cmd run audit:verify -- --db "$db" --key-file "$key" --evidence-file "$evidence"
```

Uygulamanın yeni olayları eski kanıtı bozmaz; fakat bu yeni olaylar **henüz korunmaz**. İkinci mühür için **yeni dosya adı** (`audit-20261029-02.json` gibi) seçin. Eski kanıtları saklayın. Anahtar kaybolursa eski mühürler doğrulanamaz. Anahtar dosyasını uygulama ZIP'ine veya Git'e eklemeyin.

## İsteğe bağlı sert başlangıç koruması

Doğrulama hatalıysa SQLite dosyasını açmadan ve uygulama göçünü çalıştırmadan çıkmak için aynı PowerShell oturumunda:

```powershell
$env:BEP_REQUIRE_AUDIT_EVIDENCE = '1'
$env:BEP_AUDIT_KEY_FILE = $key
$env:BEP_AUDIT_EVIDENCE_FILE = $evidence
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\BASLAT-MFA.ps1
```

`BEP_REQUIRE_AUDIT_EVIDENCE` ayarı **varsayılan olarak kapalıdır**, böylece mevcut anonim kurulumun açılışını bozmaz. Bu koruma kurum içinde etkinleştirilirse doğru key/evidence olmadan sunucu açılmaz; key kaybı/geri yükleme prosedürü önceden planlanmalıdır. `security:check` aynı ortam değişkenleri varken kanıtı da denetler; yoksa uyarı verir.

```powershell
npm.cmd run security:check
npm.cmd test
npm.cmd run release:check
npm.cmd run acceptance:pilot
```

## Tehdit modeli ve sınırlar

1. Korunan şey **audit tablosundaki eski satırların bütünlüğüdür**; sınav veya uyarlama verilerinin kriptografik imzası değildir. Audit kaydına hiç dönüşmemiş eylemler yakalanmaz.
2. Bu **simetrik HMAC** yöntemidir; iki taraflı hukuki inkâr edilemezlik sağlamaz. Anahtarı bilen saldırgan geçerli kanıt oluşturabilir.
3. Hem DB hem eski kanıtlar birlikte eski sürüme döndürülürse bunu tek bir checkpoint kendi başına tespit edemez. Kanıtların bağımsız korunması ve en yeni ID'nin kurumca kaydı gerekir.
4. Kanıt üretiminden sonra uygulama yeni audit olayları ekleyebilir; bu olaylar yeni kanıt çıkana kadar doğrulanmaz.
5. Gerçek Windows/NTFS ACL, DPAPI/TPM KMS, yedekten geri dönüş, SSO/HTTPS, KVKK, PDF/UA ve ekran okuyucu testleri henüz yapılmadı. Bu sürüm kurumsal üretime veya gerçek öğrenci verisine geçiş izni vermez.

Ses/ekran erişim bileşeni, ana platformun güvenlik ve erişilebilirlik kabulü tamamlandıktan sonra **kurum içinde, dış bulut servisine zorunlu bağlantı olmadan** geliştirilecek Ar-Ge iş paketidir.
