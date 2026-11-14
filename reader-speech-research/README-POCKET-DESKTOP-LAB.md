# DOU Speech — Pocket TTS yerel masaüstü laboratuvarı (araştırma)

Bu özellik, **DOU Reader sınav oynatıcısından ve mevcut robotik DOU Speech'ten tamamen ayrı** bir Windows
masaüstü laboratuvarıdır. Kullanıcı geri bildirimi: Pocket TTS female_2'nin tek cümlelik doğal ses örneği
yerelde başarıyla üretildi ve olumlu dinlendi. Bu sonuç tüm cümleleri/engellilik erişilebilirliğini doğrulamaz.

## Amaç ve kapsama alınanlar

- İnternetsiz, yerel Pocket TTS Turkish 0.1.0 paketinin **önceden indirilen** modelini disk önbelleğinden açar.
- Modeli ilk okumada yükler; aynı pencere içinde sonraki cümlelerde tekrar kullanır.
- Altı hazır sesi gösterir: female_1, female_2, female_3, male_1, male_2, male_3.
- Konuşma duygusu: sakin, mutlu, üzgün, kızgın veya şaşkın.
- Hazır sesi otomatik çalmaz; **Seslendir** düğmesi ve anonim veri onayı gerekir.
- Windows'un WAV denetimleriyle **tekrar dinle, duraklat, sürdür, durdur** yapar.
- Önizleme WAV dosyalarını yalnız kullanıcının geçici dizininde tutar; normal kapanışta siler.
- HTTP endpoint, mikrofon, dosya yükleme, ses klonlama ve sınav DB bağlantısı **yoktur**.

**Sınırlama:** Model konuşmayı üretmeyi tamamladıktan sonra ses başlar; bu sürüm
gerçek zamanlı örnek-akışı / NVDA sürücüsü / bağımsız kurumsal ekran okuyucu değildir.
Durdur komutu çalmayı hemen durdurur; CPU'da halen hesaplanan bir ses üretimini
anında kesmeyebilir, sonucunu atmadan siler. Windows ses kontrolünde kullanılan MCI
API'si geçiş amaçlıdır; modern Windows MediaPlayer'a geçiş ayrı iştir.
Tkinter arayüzünün NVDA/Windows UIA erişilebilirlik kabulü henüz yapılmadı.

## Hazırlık

- Windows 10/11, Python 3.10–3.12 ve uygulamanın ayrı sanal ortamı:
  \`D:\DOU-POCKET-TTS-LAB\.venv\Scripts\python.exe\`
- Daha önce izinli indirilmiş Pocket TTS model ağırlıkları (ilk demo üretiminde indirilmişti).
- Python kurulumunun tkinter modülü (normal Windows Python kurulumuyla gelir).
- Model/önbellek, haklar ve üçüncü taraf bağımlılıkların kurumca onaylı olduğu varsayılmaz.

Git dalı:
\`feature/dou-reader-speech-independent-safety-20261109\`

## 1. Projeyi güncelleme ve hazırlık kontrolü

\`\`\`powershell
Set-Location "D:\Projects\DOU-READER-SPEECH-INDEPENDENT"
git status --short
git pull --ff-only origin feature/dou-reader-speech-independent-safety-20261109
npm run reader:pocket:desktop:check
\`\`\`

GitHub DNS erişimi yoksa \`git pull\` çalışmaz; **yerel dosyalar korunur**.
Model zaten yüklüyse önceki \`npm run reader:pocket:live\` denemesi
internetsiz kullanılmaya devam edebilir. Yeni masaüstü sürümünün kullanılması
için GitHub değişikliklerinin yerel klasöre gelmesi gereklidir.

\`desktop:check\` salt-okunur moddur: \`snapshot_download(local_files_only=True)\`
ile mevcut önbelleğin dosyalarını doğrular, model çalıştırmaz ve indirmez.

## 2. Masaüstü ekranını açma

\`\`\`powershell
npm run reader:pocket:desktop
\`\`\`

Ekranda:
1. Anonim Türkçe test cümlesini yaz (5–220 karakter, tek satır).
2. Ses ve konuşma ifadesi seç (ör. female_2 / Sakin).
3. **Gerçek sınav/kişisel veri içermiyor** onay kutusunu işaretle.
4. **Seslendir** düğmesine bas (Ctrl+Enter kısayolu).
5. Ses çıkınca **Duraklat**, **Sürdür**, **Durdur** veya **Tekrar dinle** kullan.

Esc çalmayı durdurur. Pencereyi kapatınca normal durumda geçici WAV'lar silinir.
Dosyalar kullanıcı profilinin temp dizininde bulunur ve uygulama
önizleme amaçlı bunları sınırlı süre tutar; uygulama/Windows çökmesi halinde
kalıntı kalabilir. Bu nedenle asla gerçek öğrenci, sınav veya gizli metin yazmayın.

## 3. Yerel testler

\`\`\`powershell
$py = "D:\DOU-POCKET-TTS-LAB\.venv\Scripts\python.exe"
& $py -m unittest tools.test_dou_reader_pocket_desktop -v
node --test reader-speech-research/pocket-desktop-source.test.mjs
npm run reader:pocket:desktop:check
\`\`\`

Gerçek Windows ekranı, altı ses, duraklatma ve sürdürme
**Windows üzerinde insan tarafından ayrı doğrulanmalıdır.**
Python çapraz-platform testleri yapısal WAVE kontrollerini ve
sahte WinMM çağrılarıyla denetim dizisini sınar; gerçek Windows aygıtını çalmaz.

## Kurumsal kabul kapıları

- Model/hazır konuşmacı verilerinin lisans incelemesi, ses sağlayıcısının hakları.
- Türkçe anlaşılabilirlik (farklı cümleler, sayılar, kısaltmalar ve telaffuz), subjektif karşılaştırma.
- CPU gecikmesi, kesintisiz ses akışı ve kaynak bütçesi.
- NVDA ve Windows UI Automation erişilebilirlik denetimi.
- Gerçek sınavların yetkilendirme/mahremiyet gereksinimleri; sınav cevabı veya öğrenci verisinin
  yanlışlıkla seslendirilmesini önleyen ayrı güvenlik kapısı.

**Bu kapılar tamamlanmadan üretim Reader bağlantısı yapılmayacak.**
