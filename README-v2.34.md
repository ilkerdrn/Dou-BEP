# DOU BEP Sınav Atölyesi v2.34 — Erişilebilirlik Kabul Merkezi

**Anonim, çevrimdışı BAP araştırma prototipi.** Bu proje gerçek öğrenci, sağlık veya engellilik kayıtlarıyla kullanıma henüz uygun değildir. Eski `data/` dosyaları korunmalı; bu ZIP ayrı klasöre çıkarılmalıdır.

## Yeni iş akışı

1. Kurumsal hesaba girin; `http://127.0.0.1:4173/erisilebilirlik-kabul` adresine gidin (kurum paneli veya Operasyon Merkezi'nden ulaşabilirsiniz).
2. Öğretim sorumlusu sınav taslağını tamamlar; yetkili kullanıcı sınav revizyonunu mevcut kurumsal onay sürecinde onaylar. **Sınav onayı yoksa kabul kaydı açılamaz.**
3. Sınavı hazırlayan **aynı hesap**, dört manuel inceleme maddesini kontrol edip öğretmen beyanını kaydeder. Genel kullanıcı başka öğretmenin sınavını imzalayamaz.
4. Ayrı bir koordinatör/yönetici hesabı, bağımsız inceleme beyanlarını tamamlar; **aynı hesap her iki aşamayı yapamaz**. İki beyan aynı revizyon ve onaylı SHA-256 özeti için kaydedilir.
5. İki inceleme tamamlandığında arayüz `İki aşama kaydı tamam` gösterir. Bu, üretim/kurumsal uygunluk, PDF/UA sertifikası, yardım teknolojisi testinin başarıyla yapıldığı veya akademik eşdeğerlik onayı değildir.
6. Sınav soruları veya açıklamaları değişirse revizyon artar; önceki beyanlar otomatik olarak **yeni sürüm için geçersizleşir** ve yeniden inceleme gerekir.

### Teslim kontrolü

Bir sınav seçilince mevcut Word/HTML teslim motorunun **standart sunum profili için yapısal kontrolü** ayrıca çalıştırılır. Hata varsa engel ve nedeni gösterilir. Bu kontrol yalnızca teknik dosya hazırlığını inceler; uyarlama kararları, sınav oturumları, gerçek öğrenci deneyimi ve kurum kabulünün tamamı için ayrıca süreç gerekir. **Eski dışa aktarma API sözleşmeleri değiştirilmedi**, dolayısıyla yeni kabul kayıtları var olan pilot indirmelerini kendiliğinden durdurmaz.

### Veri saklama ve yetkiler

- Yeni kayıt tablosu: `exam_accessibility_acceptance`. Eski sınav, karar veya oturum verileri silinmez.
- Onay kaydı kurum ID, sınav ID, revizyon, onaylı içerik özeti, aşama, yetkili hesap ID, sadece boolean kontrol listesi ve zaman içerir; serbest metin ve öğrenci profili içermez.
- Listeleme: yalnız öğretmen (kendisine görünür sınavlar), yönetici ve koordinatör. Yazma: sınav sahibi öğretim sorumlusu, ardından bağımsız koordinatör/yönetici.
- API `POST` çağrılarında mevcut CSRF, oturum, kurum ayrımı ve Origin denetimleri kullanılır; MFA kurulum-only oturumları işlemi yapamaz.
- Onay geçmişi içerik SHA-256 ile eşleşmezse durum engellenir. İmza kriptografik belge imzası değildir; günlük ve işlem zaman damgası yerel pilotta sunucu tarafından tutulur.

## Windows tek komut

ZIP'i ayrı klasöre çıkarın, Node 22.13+ ile:

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\BASLAT-MFA.ps1
```

`BASLAT-MFA.ps1` kurumsal MFA anahtarını DPAPI ile saklama senaryosuna yöneliktir. Daha önce MFA hesabı oluşturulmamış yerel pilotta `BASLAT.bat` kullanılabilir. **Eski veri klasörünü taşımayın veya üzerine yeni veritabanı yazmayın**; geçiş/geri yükleme ayrı doğrulanmalıdır.

## Bilinen engeller

Canlı veritabanı uygulama düzeyinde şifrelenmiyor. Kurumsal SSO, HTTPS dağıtım, bağımsız sızma testi, veri koruma ve etik izin, gerçek kullanıcı/NVDA/JAWS testleri, PDF/UA doğrulaması ve karmaşık matematik/görsel nesnelerinin otomatik semantik aktarımı tamamlanmadı. Bu sürüm **araştırma prototipidir**. Çevrimdışı Türkçe konuşma/ekran erişim motoru sonraki Ar-Ge aşamasında geliştirilecektir.
