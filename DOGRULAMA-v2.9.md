# DOU BEP Sınav Atölyesi v2.9 — yerel doğrulama

Tarih: 28 Ekim 2026. Çalışma ortamı Node.js 22.16.

- `npm test`: **271/271 PASS**. Bunlardan 6'sı yeni hedef-kapsam modülüne, 5'i yeni arayüz varlığı / sunucudan sunum / güvenli dışa aktarma bağlantısına yönelik denetimlerdir.
- `npm run release:check`: **13/13 PASS**. Bu bir sızma testi, pedagojik değerlendirme veya kurumsal onay değildir.
- `node --check institutional-exams.mjs`: **PASS**.
- `goal-coverage.mjs` HTTP'de doğru `text/javascript` MIME ile sunuluyor. Eski yönetici betikleri sunucu üzerinden sunulmuyor.
- Anonim kapsam CSV yalnızca hedef kodları, soru sıra numaraları, bağlantı durumları, sayımlar ve puan toplamlarını içerecek şekilde kodlandı; birim testleri ham hedef/soru metinleri, başlık ve cevap anahtarlarının sızmamasını denetliyor.
- **Tarayıcıda gerçek tıklama / uçtan uca UI testi tamamlanamadı:** Çalışma ortamının Chromium ağ ilkesi yerel adrese erişimi `ERR_BLOCKED_BY_ADMINISTRATOR` ile engelledi. Bu, kullanıcı cihazında çalışmayacağına işaret etmez fakat gerçek UI akışının henüz ayrıca doğrulanması gerektiği anlamına gelir.
- Gerçek NVDA/JAWS/VoiceOver/TalkBack testleri, özel eğitim uzmanı değerlendirmesi, gerçek öğrenci pilotu, sızma testi, HTTPS/SSO/MFA, KVKK incelemesi ve kurum onayı **yapılmadı**.

**Yalnızca yerel anonim öğretmen pilotu. Öğrenci adı, tanı, sağlık, ses verisi kullanmayın.**
