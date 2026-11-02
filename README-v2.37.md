# DOU BEP Sınav Atölyesi v2.37 — Denetim Anahtarı Yenileme (İki Nesil)

**Araştırma kapsamı:** Üniversite sınavlarına yönelik anonim, tamamen yerel BAP prototipi. Gerçek kişi/engellilik/sağlık verileriyle kullanıma uygun değildir. v2.36 ve önceki veri şemaları, sınav, uyarlama, kabul ve belge üretim modülleri korunur. Zorunlu haricî servis yoktur.

## Yenilik

- v2.36'daki eski **HMAC-SHA256 denetim kanıtı** silinmez ve önce kendi 32 baytlık anahtarıyla doğrulanır.
- Yeni anahtar **ayrı bir dizinde** ve tek seferlik `audit:key` ile oluşturulur. Eski anahtar yeniden kullanılmaz; aynı anahtar baytlarıyla yenileme reddedilir.
- `audit:rotate` ayrı bir **v2.37 anahtar-değişim kanıtı** yaratır. Yeni kanıt, eski kanıt dosyasının SHA-256 özetini, eski audit sayacını ve yeni audit önekini barındırır; tümü **yeni HMAC anahtarıyla** doğrulanır.
- `audit:verify-rotation` iki anahtar ve iki kanıtı **birlikte** inceler. Önceden mühürlü kayıtta değişiklik/silme, önceki kanıtın değiştirilmesi, yanlış yeni anahtar veya yeni önekte bozulma tespit edilir.
- Yeni dosya `wx` yöntemiyle açılır; var olan eski/yeni hiçbir kanıt ezilmez. Veritabanı salt okunur açılır; göç veya yeni kayıt yapılmaz. Ham audit/öğrenci/sınav verisi çıktı dosyalarına yazılmaz.
- `BEP_REQUIRE_AUDIT_ROTATION=1` etkinse **uygulama SQLite veritabanını açmadan önce** her iki kanıtı doğrular. `security:check` aynı yapılandırmayı denetleyebilir.

**Önemli:** Bu yöntem yalnız **iki nesil** (v2.36 kök kanıtı + v2.37 yenileme) kanıtlar. Üçüncü ve sonraki anahtar değişimleri için henüz genel bir N-nesil doğrulama zinciri yoktur. İki kanıtın da bağımsız arşivde korunması gerekir. Kanıt oluşturulduktan sonra eklenen audit satırları bir sonraki kanıta kadar kapsam dışındadır.

## Windows PowerShell — 2 nesil denetim kanıtı

ZIP'i eski kuruluma dokunmadan **ayrı klasöre** çıkarın. Node.js >= 22.13 kullanılmalıdır. Aşağıdaki *örnek* yolları kurum BT'nin korumalı dizinlerine uyarlayın. Veritabanı zaten oluşmuş olmalıdır.

```powershell
$db = Join-Path (Get-Location) 'data\institution.sqlite'
$oldKey = Join-Path $env:APPDATA 'DOU-BEP-Audit-Key-v1\audit.key'
$oldProof = Join-Path $env:USERPROFILE 'Documents\DOU-BEP-Evidence-v1\checkpoint.json'
$newKey = Join-Path $env:APPDATA 'DOU-BEP-Audit-Key-v2\audit.key'
$newProof = Join-Path $env:USERPROFILE 'Documents\DOU-BEP-Evidence-v2\rotation.json'

# İlk kez kullanıyorsanız: v2.36 ilk anahtarı ve ilk kanıtı üretin.
# Önceki kurulumda bunlar varsa YENİDEN oluşturmayın.
npm.cmd run audit:key -- --key-file "$oldKey"
npm.cmd run audit:seal -- --db "$db" --key-file "$oldKey" --evidence-file "$oldProof"
npm.cmd run audit:verify -- --db "$db" --key-file "$oldKey" --evidence-file "$oldProof"

# Ayrı bir yeni HMAC anahtarı üretin; var olan dosyayı asla ezmez.
npm.cmd run audit:key -- --key-file "$newKey"

# Eski kanıttan yeni anahtarlı kanıta bağ kurun.
npm.cmd run audit:rotate -- --db "$db" --old-key-file "$oldKey" --old-evidence-file "$oldProof" --new-key-file "$newKey" --new-evidence-file "$newProof"

# İki anahtar ve iki kanıtı birlikte doğrulayın.
npm.cmd run audit:verify-rotation -- --db "$db" --old-key-file "$oldKey" --old-evidence-file "$oldProof" --new-key-file "$newKey" --new-evidence-file "$newProof"
```

Üretim kanıtı ve iki ayrı anahtarı, veritabanından ayrı ve kurum politikasıyla korunan alanlarda saklayın. **Eski anahtarı silmeyin:** Yeni kanıt eski kanıta bağlıdır. Anahtarları Git'e, ZIP'e veya proje `data/` klasörüne koymayın. Anahtar erişimi, yedekleme, fiziksel medyanın saklanması ve Windows NTFS ACL/BitLocker/DPAPI politikası kurum BT sorumluluğundadır. Bu yazılım bunları otomatik olarak yönetmez.

### İsteğe bağlı iki nesilli açılış kontrolü

```powershell
$env:BEP_REQUIRE_AUDIT_ROTATION = '1'
$env:BEP_AUDIT_OLD_KEY_FILE = $oldKey
$env:BEP_AUDIT_OLD_EVIDENCE_FILE = $oldProof
$env:BEP_AUDIT_NEW_KEY_FILE = $newKey
$env:BEP_AUDIT_NEW_EVIDENCE_FILE = $newProof

npm.cmd run security:check
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\BASLAT-MFA.ps1
```

Bu güvenlik kapısı **varsayılan olarak devre dışıdır**; mevcut anonim test kurulumunu kilitlemez. Kasıtlı açılırsa yanlış/eksik anahtar veya bozuk kanıtta uygulama açılmaz. `BEP_REQUIRE_AUDIT_EVIDENCE=1` v2.36 tek kanıt kapısı da geriye dönük desteklenir.

## Yerel testler

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
```

## Tehdit modeli ve açık eksikler

1. Korunan şey yalnız denetim tablosunun **iki kanıt noktasına kadarki içerik bütünlüğüdür**; olayların gerçekte kayda girip girmediği, saat doğruluğu, olay anında atomik yazma veya WORM/SIEM garantisi değildir.
2. HMAC anahtarları **simetriktir**; asimetrik imza, hukuki inkâr edilemezlik veya dış kurumun bağımsız doğrulaması sağlanmaz. Anahtarları ele geçiren kişi kanıt üretebilir. Hem veritabanı hem eski/yeni kanıtlar birlikte geriye alınırsa haricî monoton çıpa olmadan geri dönüş saptanamaz.
3. Uygulama seviyesinde SQLite şifreleme, kurumsal OIDC/SSO, HTTPS/TLS, otomatik KMS/TPM/DPAPI anahtar yaşam döngüsü ve kurtarma tatbikatı halen eksiktir.
4. Windows cihaz testleri, bağımsız sızma testi, KVKK/etik izinleri, PDF/UA uygunluk denetimi, Türkçe ekran okuyucu ve gerçek özel gereksinimli kullanıcı kabul testleri yapılmadı. **Gerçek öğrenci verileri kullanılmamalıdır.**
5. Yerel ses/ekran erişim motoru ana uygulamanın kabul sürecinden sonraki bağımsız BAP Ar-Ge iş paketidir; zorunlu bulut servisi olmadan geliştirilmesi hedeflenir.
