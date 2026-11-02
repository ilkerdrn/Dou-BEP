# DOU BEP Sınav Atölyesi v2.53 — Asenkron sınav seçim güvenliği

**Yalnız anonim ve sentetik üniversite/BAP araştırma prototipi.** Gerçek öğrenci, sağlık veya sınav verileriyle kullanılmak üzere doğrulanmamıştır. DOU temasının bulunması resmî kurum onayı anlamına gelmez.

## Bu sürümde tamamlananlar

- Öğretmen panelinde A sınavı açılırken B sınavı açılırsa, A'nın daha sonra tamamlanan HTTP yanıtı B'nin içeriğini değiştiremez. Yanlışlıkla sunucuya kaydetme/geri alma yapılmaz; eski HTTP yanıtı **yalnız istemci ekranında** yok sayılır.
- Düzenleme sırasında bekleyen eski bir sınav okuma işlemi geçersizleşir. Yeni sınav, yerel JSON kurtarma taslağı ve manuel kaydetme bildirimi de aynı seçim bütünlüğü korumasına katılır.
- Onay geçmişi hem sınav kimliğine hem de okunduğu andaki sürüme bağlanır. Farklı sürüme ait gecikmiş geçmiş yeni onay gibi gösterilmez.
- Yeni `exam-selection.mjs` dosyası ve ilgili regresyon testleri; yerel statik izin listesi güncellendi. Eski fonksiyonlar, onay kuralları, rol/tenant denetimi, SQLite şeması, Reader, Speech Lab ve geçmiş sürüm dosyaları korundu.

## Windows'ta yerel çalıştırma

1. ZIP'i mevcut kurulumun ve özellikle **`data` klasörünün üzerine yazmadan** yeni bir dizine çıkarın. Node.js >=22.13 gerekir.
2. `BASLAT.bat` veya PowerShell içinden `npm.cmd start` komutuyla başlatın. Yönetim: http://127.0.0.1:4173/kurum
3. Sadece örnek/anonim hesap ve sentetik sınav kullanın. Kurumsal sınav ekranından hızlı sınav değiştirme ve kaydetme durumlarını inceleyin.
4. Kaynak kontrolü: `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot`.

## Kısıtlar

Bu sürüm canlı HTTP isteğini fiziksel olarak iptal etmez, yalnız eski yanıtın güncel editöre etkisini engeller. Tarayıcı ve Windows gerçek cihaz otomasyon testleri yapılmadı. Gerçek öğrenci/sağlık verisi, üretim SQLite şifreleme, SSO/MFA/HTTPS altyapısı, PDF/UA, NVDA/JAWS uyumluluğu ve doğal/anlaşılır Türkçe çevrimdışı TTS için ayrı doğrulamalar gerekir. Öğretmen ölçme eşdeğerliğini ve uyarlamayı kendisi onaylamalıdır.
