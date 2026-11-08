# DOU BEP V3 — Manuel erişilebilirlik kabul protokolü

**Durum:** İnsan tarafından uygulanacak kontrol listesi; otomatik test PASS sonucuyla karıştırılmamalıdır.
**Kapsam:** Yerel/anonim pilot, Edge/Chrome, Windows klavyesi ve NVDA; isteğe bağlı ikinci tarayıcı.
**Veri sınırı:** Gerçek öğrenci kimliği, tanı, sağlık verisi veya üretim hesabı kullanmayın. Bu protokol WCAG sertifikası veya kurumsal kabul değildir.

## Güvenli başlangıç

1. Git çalışma ağacındaki değişiklikleri koruyun. Uygulamayı bilinen **anonim pilot** veritabanıyla başlatın; mevcut gerçek veya hassas dosyalara dokunmayın.
2. Otomatik regresyon: `npm.cmd run design:v3:acceptance`. Bu komut anonim geçici veritabanında tarayıcı kontrolleri yürütür; NVDA'nın gerçek kullanımını **doğrulamaz**.
3. Windows'ta NVDA'yı **yerel** çalıştırın. Konuşma çıkışını rahat duyulabilecek düşük düzeyde açın. NVDA'nın çevrimdışı olup olmadığını ayrıca kontrol edin.
4. Her kayıt için tarih, tarayıcı ve sürümü, NVDA sürümü, ekran genişliği, sayfa, beklenti, gerçekleşen sonuç, PASS/FAIL/BLOCKED ve anonim adımları belirtin. Ses kaydı veya kişisel bilgi eklemeyin.

## Manuel kontrol senaryoları

| Kimlik | Sayfa / özellik | Klavye / NVDA senaryosu | Beklenen sonuç |
|---|---|---|---|
| K01 | `/kurum` giriş | Tab / Shift+Tab ile alanları gezin; etiketleri NVDA ile oku | Alan adı, zorunluluk, hata ve giriş düğmesi anlaşılır |
| K02 | Menü | `/` ile ara; `sinav` yaz; `↓` ve `↑` dene | Arama sonuçları ve odak sırası net; klavye odağı kaybolmaz |
| K03 | Menü | Eşleşmeyen arama yaz, ardından Esc | Boş sonuç bilgisi seslendirilir; Esc aramayı temizler |
| K04 | Mobil menü (390 px) | Aç, Tab ile gezin, Esc ile kapat, tekrar aç ve dışarı tıkla | Açık/kapalı durumu seslendirilir; Esc odağı menü düğmesine döndürür |
| K05 | `/kurumsal-sinav` | Yeni sınav, soru ekle, soru alanı, 100 soruluk senaryo | Alan/başlık hiyerarşisi anlaşılır, işlevler klavye ile çalışır |
| K06 | `/sinav-koordinasyon` | Bölüm kısayolları, tarih/saat alanları, form | Başlıklar ve gruplar okunur; form işlevi korunur |
| K07 | `/toplu-sinav` | Dört bölüm kısayolu ve işlem düğmeleri | Atlama hedefleri bulunur, odak görünür |
| K08 | `/uyarlama-kararlari` | Karar oluşturma, listeleme | Etiket ve hata mesajları net; gerçek kişi bilgisi girilmez |
| K09 | `/sinav-operasyon` | Durum özetini ve tablo başlıklarını oku | Durumlar salt renge bağlı değildir; başlık/hücre ilişkisi anlaşılır |
| K10 | `/erisilebilirlik-kabul` | Sınav seçimi, manuel beyan onayları | Her kontrolün açıklaması ve gönderim durumu okunur |
| K11 | `/sinav-dosya-aktar` | Anonim TXT/DOCX örneği seç, önizle | Yükleme/uyarı/kaydetme durumları anlaşılır; onaysız taslak korunur |
| K12 | `/bep-import` | Anonim metin ile hedef önizle | Hedef seçimleri ve taslak oluşturma uyarıları okunur |
| K13 | `/pilot-yonetim` | Oturum oluşturma ve teslim listesini incele | Tek kullanımlık kod açıklaması ve anonim durumlar net |
| K14 | `/erisilebilirlik-kontrol` | 12 manuel kontrolü tek tek değerlendir; JSON indir ve geri yükle | Kontrol/filtre/ilerleme durumları NVDA ile izlenebilir |
| K15 | `/dou-reader-demo` | Okuyucu denetimlerini klavye ile kullan | Yerel/sentetik sesin deneysel sınırları açık ve okunabilir |
| K16 | Ses araştırma ekranları | Fonem, havuz, A/B ve anlaşılabilirlik sayfalarını aç | Sonuç/kontrol alanları erişilebilir; doğal Türkçe konuşma veya NVDA uyumluluğu iddia edilmez |

## Test kararı

- **PASS:** Adımlar insan tarafından tamamlandı; beklenen semantik, odak ve işlev doğrulandı.
- **FAIL:** Çalışan bir özellikte erişilebilirlik problemi bulundu. Sayfa, klavye adımları ve beklenen/gerçek sonuç eklenmeli.
- **BLOCKED:** Test ortamı veya gerekli yerel ses/NVDA bileşeni hazır değil; PASS sayılamaz.
- **NOT RUN:** Henüz çalıştırılmadı; PASS sayılamaz.

Kritik FAIL varsa kurumsal erişilebilirlik kabulü verilmez. Otomatik Edge testi, gerçek NVDA/TalkBack/VoiceOver doğrulamasının yerine geçmez. DOU Speech Lab'ın robotik WAV sesleri insan anlaşılırlığı, doğal TTS veya üretim NVDA sürücüsü olarak kabul edilmez.

## Anonim test kaydı şablonu

```text
Tarih:
Sürüm / commit:
İşletim sistemi / tarayıcı:
NVDA sürümü (varsa):
Kontrol kimliği:
Sayfa:
Sonuç: PASS / FAIL / BLOCKED / NOT RUN
Klavye adımları:
Beklenen:
Gözlenen:
Düzeltme notu (kişisel bilgi olmadan):
```
