# DOU BEP V3 — Birleşik Tasarım Kapsamı

## Kullanılan referans
Kullanıcının onayladığı bordo-beyaz kurumsal sınav hazırlama ekranı: açık pembe zemin, beyaz kartlar, bordo seçili menü, yumuşak sınırlar, sade form alanları ve beş adımlı sınav iş akışı.

## Uygulanan geçiş
- Kurum paneli ve sınav editörünün ana kart, menü, form, buton, adım ve durum tasarımı bordo-beyaz görsel dile göre güncellendi.
- Aynı görsel sözleşme diğer **14 yönetim/araç ekranına** taşındı (toplam 16 yönetim ekranı).
- Modüllerin mevcut tekil CSS dosyaları ve JavaScript işlevleri korundu; ortak `bep-design-system.css` bütün ilgili sayfalarda son yüklenir.
- `institution-page.campus-layout`, klasik `institution-page` ve `dou-admin-standalone` gövdeleri için ayrı, güvenli ortak CSS kapsamları oluşturuldu.
- Öğrencinin anonim sınav sayfası (`pilot.html`) ile bağımsız ses inceleme sayfası (`review-audio.html`) yönetim yerleşimine zorlanmadı.
- Veritabanları, kullanıcı hesapları, sınav kayıtları, API, MFA ve Speech üretim kodu değiştirilmedi.

## Teknik kontrol
```powershell
npm.cmd run design:v3:check
npm.cmd run ui:browser
```
V3 statik sözleşme testleri 16 sayfada stil sırasını, navigasyonu, ayrı tutulan öğrenci araçlarını, temel giriş/MFA öğelerini ve CSS blok bütünlüğünü denetler.

## Sınırlar
Bu uygulama **görsel standartlaştırma** aşamasıdır; eski CSS katmanları henüz tamamen kaldırılmadı. Güvenli temizlik için bağımlılık ve tarayıcı regresyon testi gerekir. Birleştirme ve prod sürüm onayı henüz yapılmadı. Koyu tema renklerinin varlığı, çalışan koyu mod düğmesi olduğu anlamına gelmez. Otomatik testler görsel erişilebilirlik sertifikası veya gerçek kullanıcılı sınav kabulü yerine geçmez.

## Yerel test ve çalışma
```powershell
Set-Location 'D:\Projects\DOU-BEP-DESIGN-20261105-153242'
git pull --ff-only origin feature/bep-v3-unified-design-20261108
npm.cmd run design:v3:check
npm.cmd run ui:browser
$env:BEP_DB_PATH = Join-Path (Get-Location) '.local-demo\pilot.sqlite'
$env:PORT = '4180'
npm.cmd start
```
Not: Port doluysa başka port seçilebilir; aynı demo SQLite veritabanına aynı anda yazan iki uygulamadan kaçınılmalıdır. Yerel değişiklikler varsa `git pull` öncesi koruyun.
