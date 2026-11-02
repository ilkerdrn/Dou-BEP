# DOU BEP Sınav Atölyesi v2.35 — Anonim Pilot Oturum Güvenliği

**Araştırma kapsamı: yalnız anonim/sentetik üniversite sınavları, yerel sunucu ve çevrimdışı kullanım.** Gerçek öğrenci, sağlık veya engellilik verileriyle kurumsal üretime uygun değildir.

## v2.35 geliştirmesi

1. **Kalıcı anonim kod deneme sınırı:** Öğrenci pilot kodu girişleri artık HTTP sunucusunun geçici belleğinde değil SQLite `pilot_redeem_throttle` tablosunda korunur. Beş hatalı denemeden sonra aynı kod için 15 dakikalık, 60 saniye içinde 12 hatalı denemeden sonra tüm kodlar için 60 saniyelik engel uygulanır. Bu ikinci koruma rastgele farklı kodlar deneyerek sınırı atlamayı engeller. Gerçek kullanıcıların aynı yerel sınırı paylaşması nedeniyle saldırganın geçici hizmet aksatması mümkün olabilir; kurum ölçeğinde ayrı hız/kota mimarisi ve bağımsız güvenlik testi gerekir.
2. **Veri minimizasyonu:** Yeni tabloda *ham giriş kodu, IP adresi, öğrenci kimliği, sağlık veya sınav metni yoktur*. Yalnız SHA-256 anahtar özetleri, sayaçlar ve zamanlar tutulur; eski denemeler sınırlı olarak temizlenir. SHA-256 burada anonimleştirme sertifikası veya yüksek entropili olmayan kodlar için parolaya eşdeğer koruma değildir.
3. **Sınav sürümü ve onay bütünlüğü:** Kod oluşturma, anonim sınavı başlatma, yanıt teslimi, değerlendirme ve kazanım özetinde, onaylı sınav revizyonuna ilişkin SHA-256 kayıtlı geçmiş güncel sınav metniyle eşleşmelidir. Sürüm ve statü doğru görünse bile içerik değiştirilmişse işlem `approval_integrity` ile reddedilir.
4. **Mevcut akışın korunması:** Tek kullanımlık kod ve öğrenci oturum tokenı eskisi gibi; `data/`, eski sınavlar, uyarlamalar, öğretmen–koordinatör kabul kayıtları ve önceki API sözleşmesi korunur. Açılışta yalnız yeni indeks ve tablo eklenir. Zorunlu harici API/CDN bağımlılığı yoktur.
5. **Gözlem:** `npm.cmd run security:check` salt okunur denetimde pilot deneme kilitlerinin yalnız toplam sayısını gösterir. Kod ve hesap tanımlayıcıları raporlanmaz.

## Windows kurulumu

ZIP'i çalışan v2.34 kurulumunun *üzerine yazmadan*, ayrı bir klasöre çıkarın. Node.js 22.13 veya üstü gereklidir. PowerShell'de klasör içinde:

```powershell
npm.cmd test
npm.cmd run release:check
npm.cmd run offline:audit
npm.cmd run acceptance:pilot
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\BASLAT-MFA.ps1
```

Anonim pilot ekranında tek kullanımlık kod girilerek koruma denenebilir. Testlerdeki zaman sınırlarını aşmak için gerçek veritabanındaki sayaçları elle değiştirmeyin. Ayrı bir geçici kurulumla çalışın.

## Sınırlar ve yapılmamış işler

- **Uygulama düzeyinde canlı SQLite şifreleme, kurumsal SSO, sunucu tarafı HTTPS dağıtımı, gerçek kullanıcı/NVDA/JAWS ve PDF/UA testi, bağımsız penetrasyon testi, KVKK/etik onay tamamlanmadı.** BitLocker isteğe bağlı disk koruması bunu tek başına çözmez.
- Kod denemelerini kuruma/IP'ye göre ayırmamak gizliliği korur ama ortak kilitleme sayesinde geçici kullanım engeline izin verir. Gerçek pilot öncesi kurum içinde nasıl dağıtılacağı tasarlanmalı.
- SHA-256 özetleri *yerel veritabanı yöneticisine karşı kriptografik imza değildir*; saldırgan ilgili onay geçmişini de değiştirebilir. Bağımsız imzalı denetim ve güvenli anahtar saklama iş paketi hâlâ açıktır.
- Kendi çevrimdışı Türkçe ses/ekran erişim motoru ana platform kabulünden sonraki Ar-Ge aşamasındadır.

Bu geliştirme üretim, erişilebilirlik veya kurum güvenliği sertifikası değildir.
