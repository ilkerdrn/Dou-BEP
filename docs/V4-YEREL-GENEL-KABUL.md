# DOU BEP V4 — Yerel genel kabul kapısı

Bu kontrol yalnızca **sentetik, çevrimdışı ve yerel** geliştirme senaryolarını doğrular. Gerçek öğrenci/veri aktarımı, sınav süresi tanımlama, üretim yayını, NVDA kullanıcı kabulü veya WCAG sertifikasyonu anlamına gelmez.

## Kullanım (Windows PowerShell)

Önce V4 dalını temiz çalışma ağacında güncelleyin:

```powershell
Set-Location 'D:\Projects\DOU-BEP-V4-PREVIEW'
if (git status --porcelain) { throw 'Yerel değişiklikler korunuyor.' }
git fetch origin feature/bep-v4-unified-institutional-design-20261108
if ($LASTEXITCODE -ne 0) { throw 'FETCH FAIL' }
git switch --detach FETCH_HEAD
if ($LASTEXITCODE -ne 0) { throw 'SWITCH FAIL' }
```

Kısa kabul:

```powershell
npm.cmd run acceptance:v4:quick
```

Tüm otomatik Node testleri ve izole sentetik uçtan uca provalar:

```powershell
npm.cmd run acceptance:v4
```

Microsoft Edge yüklü bir Windows cihazında, ayrı profil ve geçici SQLite veritabanı kullanarak tarayıcı etkileşim testi de dahil:

```powershell
npm.cmd run acceptance:v4:browser
```

## Kapılar

1. `node_tests`: QUICK için kritik erişilebilirlik/uyarlama testleri; FULL için kök, `server-foundation` ve `tools` klasörlerindeki tüm `*.test.mjs` dosyaları.
2. `release_static`: sürüm, API ve güvenlik statik kontrolü.
3. `offline_assets`: yayımlanan arayüzlerde dış bağlantı varlığı denetimi.
4. `v4_design_tests`: V4 tasarım ve CSS migrasyon testleri.
5. `v4_css_inventory`: V4 stil dosyası envanteri, katı denetim.
6. `exam_closure`: geçici SQLite üzerinde sınav oluşturma, onay, teslim ve indirme doğrulaması.
7. `anonymous_pilot` (FULL): anonim pilot uçtan uca kabulü; çıktı geçici klasöre yazılır.
8. `browser_edge` (isteğe bağlı): Microsoft Edge ile gerçek tarayıcı etkileşimleri; yalıtılmış profil ve test veritabanı.

Herhangi bir kapı başarısız olursa işlem durur; kalan testler PASS değil **NOT_RUN** sayılır. Sonuçlar ve anonim pilot raporu, Windows'un geçici dosyaları altındaki benzersiz `dou-bep-v4-gate-...` klasörüne kaydedilir. Önceki raporlar silinmez veya üzerine yazılmaz. Gerçek veritabanı **açılmaz**; yukarıdaki doğrulamalar yalnızca sabit kaynak kontrolü veya izole sentetik senaryolardan oluşur. Ancak kaynak statik denetimleri ve otomatik testler tam güvenlik ispatı değildir.

## Kabul kararı

`PASS` yalnızca çalıştırılmış otomatik kapıyı doğrular. Gerçek görme engelli kullanıcıların NVDA/klavye testi, Türkçe konuşma doğallığı, kurumun KVKK değerlendirmesi, gerçek personel yetkilendirmesi ve canlı güvenlik onayı bu çalıştırıcı tarafından **doğrulanmaz**. Bunları manuel kabul tutanağında ayrı **NOT_TESTED** olarak izleyin. Yeni sınav süre hakkı dağıtımı bu kapının konusu değildir ve kapalı kalır.
