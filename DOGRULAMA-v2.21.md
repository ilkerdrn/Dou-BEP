# v2.21 Doğrulama

Bu rapor yalnızca çalıştırıldığı yerel Node.js ortamı için geçerlidir. Windows cihazı ve gerçek engelli kullanıcılarla yapılan testleri temsil etmez.

- Yeni Sınav Operasyon Merkezi: admin/koordinatör erişim denetimi, kurum izolasyonu, eksik/onaysız karar engeli, kaynak sürüm kontrolü, aday kodu göstermeme testleri
- Arayüz: ayrı HTML/CSS/JS, yerel sunucu allowlist, Türkçe klavye ile kullanılabilen giriş/filtre yapısı
- Dış bağımlılık statik taraması: yayınlanan 64 arayüz dosyasında doğrudan haricî kaynak çağrısı yok
- Önceki v2.20 Windows SQLite test-kapatma düzeltmesi korunuyor
- Önemli sınır: HTML akışının canlı Chromium/Edge/NVDA ile test edildiği iddia edilmez
- Bağımsız sızma testi, HTTPS, MFA, veritabanı at-rest şifrelemesi, KVKK hukuk incelemesi ve pilot kullanıcı değerlendirmeleri gerçekleştirilmedi

Bu teslimde Node.js 22.16.0 üzerinde **374/374 otomatik test** ve **31/31 yerel dağıtım kontrolü** başarıyla sonuçlandı. Bunlar sertifika veya üretim onayı değildir.
