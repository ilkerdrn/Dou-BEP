# DOU BEP Sınav Atölyesi — v2.72 | Türkçe fonem değerlendirme güvenilirliği

**Araştırma prototipi.** Ses motoru robotiktir. Bu sürüm kullanıcı erişilebilirliği, akademik araştırma onayı, klinik değerlendirme, doğallık, anlaşılırlık veya NVDA uyumluluğu kanıtı değildir. Veriler gerçek öğrenci/sınav/sağlık kaydı içermemelidir.

## Yeni yerel deney

- `http://127.0.0.1:4173/dou-speech-intelligibility` adresinde 6 Türkçe minimal çift için 12 dinleme denemesi.
- Doğru sözcük/cevap, 12 deneme bitene dek açıklanmaz. İki ses motoru da her çift için birer kez kullanılır, ancak bu bir **bilimsel çift-kör çalışma** değildir.
- Tamamlandıktan sonra sonuçlarda eski/aday motor için doğrular ve her çiftte ses karıştırmaları görünür. İsteğe bağlı, düğmeye basarak JSON veya CSV dosyası indirilebilir.
- JSON ve CSV **yalnız 6 sabit çiftin toplulaştırılmış, anonim** tanıma sonucunu içerir. Katılımcı kimliği, zaman damgası, gerçek sınav metni, sağlık bilgisi, mikrofon kaydı veya IP yoktur. Sayfa yenilenince test silinir; indirmeyi kullanıcı başlatmalıdır.
- CSV/JSON sonuçları insan anlaşılabilirliğinin kanıtı değildir; her motor için yalnız 6 cevap, güven aralığı ve etik onay olmadan karar verilmez.

## NVDA yerel test koruması

- `nvda-experimental/synthDrivers/douBepPilot/wave_contract.py` gelen 22.050 Hz, tek kanal, 16 bit PCM RIFF dosyasını başlık, uzunluk ve biçim açısından denetler.
- NVDA sürücüsü **yalnız kaynak prototipidir**; varsayılan sürücü olmaz ve otomatik kurulmaz. Ayrı test profili/sanal makine gerekir. İptal ve `WavePlayer` ses aygıtı davranışı gerçek Windows/NVDA üzerinde ayrıca test edilmelidir.
- Eski ses yolu ve kurumsal sınav işlevleri değiştirilmedi. Sunucudan NVDA kaynakları veya kişisel veriler yayınlanmaz.

## Kurulum

Mevcut Windows kurulumundaki `data/` dizini ve SQLite kurum kayıtlarını **silme**. Tam yedek al, mevcut `BASLAT.bat` sürecini kapat, güvenli yama ZIP'ini ayrı klasöre aç ve `GUNCELLE.bat` çalıştır. Varsayılan hedef `Desktop\New folder (7)`. Hedefin farklıysa `GUNCELLE.ps1 -Target` kullan.

## Doğrulama

`node --test dou-speech-intelligibility.test.mjs dou-speech-recognition-report.test.mjs dou-speech-nvda-bridge.test.mjs`

`python -m unittest nvda-experimental/test_wave_contract.py`

`node release-check.mjs`

Bunlar teknik denetimlerdir; gerçek insan anlaşılabilirliği sonuçları henüz mevcut değildir.
