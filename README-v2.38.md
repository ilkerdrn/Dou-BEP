# DOU BEP Sınav Atölyesi v2.38 — Bağımsız denetim kanıtına bağlı şifreli yedek

**Araştırma prototipi. Gerçek öğrenci/engellilik verileriyle kullanmayın.** Bu sürüm, mevcut v2.37 kaynak kodunu, sınav/erişilebilirlik modüllerini ve SQLite şemasını korur. Canlı SQLite **uygulama seviyesinde şifreli değildir**. AES-256-GCM koruması sadece `.bepbak` yedek dosyası için geçerlidir. Geliştirme yereldir, dış bulut API'si gerektirmez.

## Neler eklendi?

1. `tools/attested-backup.mjs`: Bağımsız audit HMAC kanıtını **önce kaynak SQLite'da, sonra tutarlı yedek anlık görüntüsünde** doğrular; sadece geçerli görüntüyü şifreleyerek yeni `.bepbak` dosyasına yazar. Şifreli dosya yayımlanmadan önce ayrıca doğrulanır.
2. Korumalı **geri yükleme**: Şifreli veri geçici dosyaya çözülür, audit kanıtı doğrulanır; ancak bundan sonra **yeni** SQLite yoluna yayımlanır. Hatalı anahtar, eski kanıt, eksik kayıt veya dosya değiştirilmesi işlemi durdurur. Daha önce açık oturumlar geri yüklemede silinir.
3. Tek kanıt (`single`) ve eski/yeni anahtara bağlı iki kanıt (`rotation`) modları desteklenir.
4. `tools/backup-attested-windows.ps1`, parola girişini gizli olarak alır ve işlem bittiğinde geçici ortam değişkenini temizler. Şifre parolası veya denetim anahtarı kaynak pakette bulunmaz.

## Windows kurulumu

Node.js 22.13+ gerekir. Kaynak ZIP'ini **mevcut çalışan klasörün üzerine yazmadan** farklı dizine çıkarın. Önce mevcut anonim test ortamının yedeğini alın. `.sqlite` ve `.bepbak` dosyaları ile anahtar/kanıt dosyalarını farklı güvenli konumlarda tutun.

### A. Bir kanıtla korumalı yedek

Önceden oluşturulmuş bağımsız anahtar ve kanıt olmalıdır (anahtar ve kanıtın oluşturulması için `npm.cmd run audit:key -- --key-file ...` ve `npm.cmd run audit:seal -- --db ... --key-file ... --evidence-file ...` kullanılabilir). Konumları canlı veritabanı klasörü dışında olmalıdır.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\backup-attested-windows.ps1 `
  -Action backup -AuditMode single `
  -Source "D:\BEP-Test\data\institution.sqlite" `
  -Destination "E:\BEP-Yedek\bep-20261029.bepbak" `
  -KeyFile "E:\BEP-Anahtar\audit.key" `
  -EvidenceFile "F:\BEP-Kanit\proof.json"
```

### B. Yeni SQLite dosyasına geri yükleme

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\backup-attested-windows.ps1 `
  -Action restore -AuditMode single `
  -Source "E:\BEP-Yedek\bep-20261029.bepbak" `
  -Destination "D:\BEP-Test\restored-new.sqlite" `
  -KeyFile "E:\BEP-Anahtar\audit.key" `
  -EvidenceFile "F:\BEP-Kanit\proof.json"
```

Her iki komut da parolayı görünmeden ister. **Mevcut canlı veritabanının üzerine geri yükleme yapılmaz.** Geri yükleme sonrası ayrıca anonim kabul testi ve kurumun yedek kurtarma prosedürü çalıştırılmalıdır.

### C. İki anahtarlı kanıt zinciri

Mevcut v2.37 anahtar yenileme akışını kullanan kurum, `-AuditMode rotation` ve `-OldKeyFile`, `-OldEvidenceFile`, `-NewKeyFile`, `-NewEvidenceFile` argümanlarıyla çalışabilir. Önceki ve yeni anahtarın/kanıtın güvenle korunması zorunludur.

## Testler

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
```

## Açık güvenlik sınırları

- Canlı SQLite, WAL ve uygulama belleğindeki veri şifrelenmez; Windows BitLocker opsiyonel ek bir disk korumasıdır.
- HMAC kanıtı **yalnız oluşturulduğu ana kadarki audit kayıtları** için geçerlidir. Sınav gövdesinin veya tüm veritabanı tablolarının ayrı bir dijital imzası değildir.
- Kanıt/anahtar dosyalarının da eski sürüme döndürülmesi, bağımsız güvenli arşiv yoksa tespit edilemeyebilir.
- Her yedekleme/geri yükleme bağımsız kanıtın varlığına ve doğru anahtarın erişilebilir olmasına bağlıdır; anahtar kaybolursa eski kanıt doğrulanamaz.
- Windows DPAPI/BitLocker ve gerçek kurum ortamı burada fiziksel cihaz üzerinde doğrulanmadı.
- Kurumsal OIDC/SSO, KVKK, PDF/UA, bağımsız güvenlik testi ve gerçek erişilebilirlik deneyleri tamamlanmadı.
