# DOU BEP v2.79 — Koşul bazlı araştırma kanıtı kontrolü

Bu sürüm bir **araştırma verisi değerlendirme** iyileştirmesidir; akustik motorlar ve mevcut sınav kayıtları değiştirilmez.

- Önceki v2.76–v2.78 JSON raporları okunabilir; v2.79 laboratuvar çıktısı da tanınır.
- Koşullar aynı olsa bile JSON dosyaları gerçek bağımsız dinleyicileri doğrulamaz; aynı kişinin tekrarlarını ayırt etmez.
- Her deney koşulu içinde üç adayın önceki motora göre her rapordaki doğru sayısı farkı, iyileşme/eşitlik/kötüleşme ve farkın ortancası sunulur.
- Her koşul için yanlış duyma sayılarıyla ses çifti öncelik tablosu vardır; bu gerçek fonem üretim hatasının kaynağını kanıtlamaz.
- Düşük rapor sayısı, tanımsız/karma koşullar, aynı yanıt desenleri ve tavan etkisi için açık uyarılar vardır.
- 12 rapor sayısı yalnız **ön keşif planlama hedefi**, istatistiksel örneklem büyüklüğü veya klinik eşik değildir.
- İnsan anlaşılabilirliği, bağımsız katılımcı, sınav erişilebilirliği ve Windows/NVDA üretim onayı **verilmez**.
- Dosyalar yalnız kullanıcı düğmeye basınca tarayıcıda açılır; sunucuya gönderilmez, diske kendiliğinden yazılmaz.

Giriş: `BASLAT.bat`, ardından `http://127.0.0.1:4173/dou-speech-intelligibility` → **Yerel rapor karşılaştırması, koşul denetimi ve araştırma kanıtı kontrolü**.

**Güvenlik:** Mevcut kurumsal `data/`, SQLite, demo hesapları ve NVDA varsayılan konuşma motoru değiştirilmemelidir. Bu prototipi gerçek erişilebilir sınav kullanımına hazır kabul etmeyin.
