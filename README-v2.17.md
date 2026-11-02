# DOU BEP Sınav Atölyesi v2.17 — Karar onayı ve sınav ön kontrolü

**Kapsam:** Yerel, sentetik/anonim sınav prototipi. Kurumun resmî onay sistemi değildir. Gerçek öğrenci adı, öğrenci numarası, T.C. kimlik numarası, tanı, engellilik, sağlık bilgisi ve gerçek kişi ile eşlenebilir kodlar sisteme girilmemelidir.

## Kurumsal onay iş akışı

1. `/kurum` içinde yönetici/koordinatör oturumu açın; ikinci bir `reviewer` veya farklı koordinatör hesabı oluşturun.
2. `/uyarlama-kararlari` sayfasında `2026-GUZ`, `BLP103`, `VIZE`, `KOD-001` gibi **hayalî** örnekleri girin. Yalnız uygulamanın tanıdığı düzenleme kodları kullanılır. İhtiyaç/tanı kategorisi sunucuya kaydedilmez.
3. Aynı kişi oluşturduğu kararı onaylayamaz. Farklı yönetici/koordinatör veya incelemeci onaylayabilir. Onay SHA-256 içerik parmak izi ile sürüme bağlanır.
4. Onaydan sonra karar düzenlenirse otomatik taslağa döner, onay düşer. İptal işlemi ve her yeni sürüm kim/ne zaman/imza iziyle kayıt altındadır; kayıt içeriği silinmez.
5. `/toplu-sinav` ekranındaki **dönemli Excel/CSV** üretiminde her satır, sunucuya sorulan kurumsal karar ile karşılaştırılır. Liste kendi kendine `onayli` diyerek yetki kazanamaz; eksik/farklı/iptal karar toplu ZIP oluşturmayı durdurur.
6. `/sinav-koordinasyon` üzerinden onaylı ders sınavı eşleştirmesi ayrıca geçerliliğini korur.

## Teknik sınırlamalar

- Karar kayıtları mevcut SQLite veritabanına yeni tablolar olarak eklenir; eski `data/` klasörü yedeklenmeli ve korunmalıdır. Migration forward-only, eski sürüm koduyla açılması desteklenmez.
- **Dönemli listeler** karar kaydı ile kontrol edilir. Eski tek dersli/çok dersli CSV yolları eski manuel davranışı korur; **bunlar kurumsal onay açısından güvenli değildir.** Gerçek kullanıma kapalıdır.
- ZIP hâlâ kullanıcı tarayıcısında hazırlanır. Tarayıcı istemcisi değiştirilebildiğinden bu kontrol gerçek bir güvenlik sınırı veya sunucuda imzalı üretim değildir. Üretim sürümünde ZIP oluşturma, yetki kontrolü ve veri aktarımı sunucuya taşınmalıdır.
- Veritabanı diskte şifreli değildir. Mevcut şifreli yedek aracına rağmen gerçek kişisel/sağlık verisi için KVKK, HTTPS/SSO/MFA, ayrıntılı kayıt saklama ve silme politikası, erişim gözden geçirme, sızma testi ve kurum onayı şarttır.
- Gerçek tarayıcıda/kullanıcılarla erişilebilirlik testi ve uzman değerlendirmesi yapılmadan yayına alınmamalıdır. Erişilebilirlik profilleri otomatik bir pedagojik eşdeğerlik garantisi değildir.
- Önceki v2.16 sürümünde oluşturulmuş gerçek olmayan kaynak sınavlar korunabilir, ancak karar onayı otomatik devralınmaz; her hayalî satır ayrı onaylanır.

## Test

`npm test` ve `npm run release:check`. Testler gerçek kurum/öğrenci kabul onayı değildir.
