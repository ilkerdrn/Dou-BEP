# DOU BEP Sınav Atölyesi — v2.19

**Yalnız anonim/sentetik yerel pilot.** Resmî üniversite yazılımı değildir. Gerçek öğrenci adı/numarası, tanı, engellilik ve sağlık verisi **yüklemeyin**.

## Yenilikler: oturum güvenliği

- **30 dakika hareketsizlik** sonunda oturum sunucuda sona erer; ilk girişten itibaren en fazla **2 saat** geçerlidir. Çerezin bulunması artık sunucu oturumunun aktif olduğunu garanti etmez.
- Aynı hesapta **en fazla 3 eşzamanlı oturum** tutulur. Dördüncü girişte en eski oturum otomatik kapatılır.
- Kurumsal panel `/kurum` → **Açık oturumlarım** bölümünden yalnız kendi oturumlarını görüntüle, diğer oturumu tek tek kapat veya **diğer tüm oturumları kapat**.
- Silme işlemleri **kimliği doğrulanmış oturum + CSRF + aynı origin** gerektirir. Kullanıcılar başka kişinin/kurumun oturumlarını göremez ve kapatamaz. Mevcut oturumun çıkışı eski **Oturumu kapat** işleminden yapılır.
- Başarılı giriş, çıkış, tek oturum iptali ve diğer oturumları kapatma işlemleri kurum denetim geçmişine olay olarak eklenir; parolalar, oturum belirteçleri ve CSRF değerleri bu geçmişe yazılmaz.
- Eski v2.18 oturumları bir defaya mahsus sonlandırılır: ilk v2.19 açılışında **tekrar giriş gerekir**. Mevcut kurumlar, sınavlar, uyarlama kararları ve yetki verileri silinmez. SQLite tablolarına iki yeni zaman damgası alanı eklenir.
- API JSON yanıtlarına ek güvenlik başlıkları uygulanır (Frame/Referrer/Cross-Origin/Permissions). Bunlar HTTPS yerine geçmez.

## Windows'ta güvenli yükseltme

1. Eski sürümü kapat. Kayıtlı veritabanını **silme veya sıfırlama**.
2. Eski sürümde `npm run backup` ile **şifreli yedek** oluştur; `npm run backup:verify` ile doğrula. Yedeği ayrı bir güvenli konumda sakla.
3. Yeni ZIP kod dosyalarını uygulama dizinine çıkar. Mevcut `data/institution.sqlite` ve ilişkili WAL/SHM dosyalarını **çalışan sunucu açıkken kopyalama/değiştirme**; eski `data` klasörünü koru.
4. `BASLAT.bat` çalıştır. `http://127.0.0.1:4173/kurum` üzerinden tekrar giriş yap; **Açık oturumlarım** bölümünden test et.
5. Dosyaları kurarken eski sürüme geri dönüş veritabanı şeması açısından garanti edilmez; gerektiğinde doğrulanmış yedekten ayrı geri yükleme uygula.

## Güvenlik sınırları

- **SQLite veritabanı dinlenim halinde şifreli değildir.** Şifreli yedek özelliği bu eksikliği kapatmaz. SQLCipher/disk şifreleme, anahtar yönetimi, HTTPS, SSO/MFA, saklama-silme politikaları, bağımsız sızma testi, erişilebilirlik ve KVKK incelemesi tamamlanmamıştır.
- Yerel tek bilgisayar/anonim pilot içindir; internete açık sunucu veya gerçek öğrenci dosyaları için uygun değildir.
- v2.18'in sunucu taraflı, onay kontrollü toplu sınav üretimi korunur; tek seferde 30 anonim kayıt ve 12 sınav grubu pilot sınırı sürer.

## Doğrulama

`npm test` — 358/358 PASS. `npm run release:check` — 24/24 PASS. Test sonuçları sızma testi, tam tarayıcı E2E veya kurumsal onay yerine geçmez. Daha fazla bilgi: `DOGRULAMA-v2.19.md`.
