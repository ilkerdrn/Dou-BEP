# DOU BEP V4 — Birleşik GitHub denetimi ve sınav geliştirme kaydı

**Kapsam:** 14 Kasım 2026 itibarıyla kullanıcının **“GitHub denetimi”** ile **“Sınav Geliştirmesine Devam”** sohbetlerindeki çalışma kararlarını tek geliştirme durumuna toplar. Bu belge **Git branch merge işlemi değildir**. Çalışan sınav kodu ve yerel veriler değiştirilmez.

## 1. Tek kaynak / çalışmaların sınırı

- GitHub deposu: `ilkerdrn/Dou-BEP`
- **Ana geliştirme dalı:** `feature/bep-v4-unified-institutional-design-20261108`
- Kullanılan iki yerel Windows çalışma alanı: `D:\Projects\DOU-BEP-V4-PREVIEW` ve `D:\Projects\DOU-BEP-ACCESSIBILITY-TEST`
- **Bağımsız güvenlik Ar-Ge dalı:** `feature/dou-reader-speech-independent-safety-20261109`. Doğal Türkçe konuşma motoru hazır olmadığı için V4'e körlemesine birleştirilmez.
- Ayrı Reader/Speech konsolidasyon taslağı: [PR #26](https://github.com/ilkerdrn/Dou-BEP/pull/26), `feature/dou-speech-pilot-keyboard-access-20261105` -> `main`, **draft / açık / merge edilmemiş**. #9–#25 işleriyle çifte merge yapılmamalı.
- Bağlı GitHub üzerinden **14 Kasım 2026 denetimi:** V4 dalı `main`e karşı `ahead=1170, behind=0`. V4 ve bağımsız güvenlik dalı birbirinden **ayrışmış**: Reader güvenlik dalına göre V4 `ahead=436, behind=168`. Sayılar zamanla değişebilir; birleşim kararı öncesi yeniden karşılaştırılır.

## 2. Ürün hedefi ve dokunulmayacak sınırlar

**DOU BEP V4**, Doğuş Üniversitesi için erişilebilir sınav hazırlama ve koordinasyon altyapısı adayıdır. Beş adımlı öğretmen akışı değişmez:
1. Sınav bilgileri
2. BEP kazanımı
3. Soru bankası
4. Sorular ve kontrol
5. Onay ve çıktı

Kurum, öğretmen, bağımsız incelemeci ve öğrencinin yetki sınırları korunur. Soru bankası, onay geçmişi, sürümler, otomatik kayıt, CSV/PDF/Word çıktı iş akışları, mobil/klavye deneyimi ve mevcut sınav kodları yok edilmez. Yerel veritabanı, kullanıcı hesapları ve kişisel öğrenci kayıtları **silinmez, taşınmaz veya test fixture'ına karıştırılmaz**. Üretim için erişilebilirlik insan kabulü olmadan hazır iddiası kurulmaz.

## 3. İki sohbetten doğrulanmış teknik ilerleme

| Alan | Gözlenen son kabul | Statü |
|---|---|---|
| V4 beş adımlı editör, kurum sayfaları, 100-soruluk editör ve mobil Edge | Öğrenci dahil **249/249 Edge PASS** (14 Kasım) | Sentetik tarayıcı kabulü geçti |
| Öğrenci UX, otomatik ara kayıt, klavye, eşleştirme, yazılı kullanım, son kontrol ve makbuz odağı | **16/16 kaynak testi PASS** (14 Kasım) | Statik sözleşmeler geçti |
| Öğretmen → incelemeci devir, bağımsız onay ve düzeltme/sürüm | **25/25 Edge PASS** (GitHub denetimi sohbeti, 14 Kasım) | Sentetik test geçti |
| Genel FULL + Edge kabulü | **9/9 kabul kapısı PASS**; Node **1192/1195**, 3 skip, 0 fail; önceki Edge **226/226** | Bu tarihteki önceki genel kabul sonucu; yeni 249-senaryosuyla aynı koşu olduğu varsayılmaz |
| Anonim pilot akışı | **10/10 PASS** (önceki GitHub denetimi) | Sentetik test geçti |
| NVDA kod laboratuvarı | Manuel laboratuvar başlatıldı; ardından izole HTTP testinde **fresh=200, reuse=401, new=200, reuse=401 PASS** (GitHub denetimi sohbeti) | Kodun HTTP tek kullanım doğrulandı |
| Gerçek NVDA/klavye/ses | İnsan tarafından eksiksiz öğrenci kabul matrisi doldurulmadı | **BEKLİYOR** |
| Doğal çevrimdışı Türkçe ses | Önceki Windows teşhisi: **0 Türkçe SAPI sesi**, David/Zira en-US; deneysel ses anlaşılır bulunmadı | **ÜRETİM ONAYI YOK** |

**Ayrım:** PASS verileri ayrı zamanlardaki test koşularındandır; bir testin geçmesi tam WCAG 2.2 AA, gerçek öğrenci kabulü veya üretim onayı değildir. Üç skip, ilgili ortamda eksik araç/izin testlerini temsil eder; PASS sayılmaz.

## 4. GitHub denetiminden gelen öncelikler

- `main` ile `feature` birleştirilmedi; hedef dal korunur. Özellikle PR #26 ses/Reader prototipi üretim sınavına doğrudan taşınmaz.
- Sınav editörü sadeleşmeli ama hiçbir modül kaybolmamalıdır; beş adımlı akış ve kurumsal premium tasarım birbirini tutmalı.
- Öğretmen kendi sınavını onaylayamaz. İncelemeci düzeltme isterse sınav sürüm farkı görünür kalmalı, yeni sürüm için bağımsız onay yeniden alınmalıdır.
- Pilot yalnız **1–30** adet çoktan seçmeli, doğru–yanlış veya eşleştirme sorusunu kabul eder; editörün sentetik **100 soru** kaldırması bu pilot sınırını değiştirmez.
- Güvenli testler yalnız geçici anonim SQLite/Edge profiliyle çalışır; gerçek öğrenci verisi, resmî sınav ve kimlik bilgisi kullanılmaz.
- En son NVDA laboratuvarında kod geçersizliği bildirildi; kod tek kullanımlıktır. Yeni **N + Enter** kod yenilemesi yalnız sentetik laboratuvarda geçerlidir. HTTP yenileme testi diğer sohbetin sonraki Windows koşusunda PASS raporlandı; bu, gerçek NVDA ses kabulü değildir.

## 5. Birleşik açık işler (öncelik sırasıyla)

1. **Gerçek NVDA insan testi:** `NVDA-OGRENCI-MANUEL-KABUL.md` ile gerçek okuma, soru/şık anlaşılırlığı, doğru/yanlış, eşleştirme, odak, son kontrol ve teslimi PASS / FAIL / TEST EDİLMEDİ olarak kaydet; ses ve gerçek veri paylaşma.
2. **DOU Speech / DOU Reader:** Bağımsız güvenlik dalını koru. Doğal ve anlaşılır çevrimdışı Türkçe ses, lisans, izinli içerik, ağ izolasyonu ve gerçek ses kabulü sağlanmadan sınav okuyucusu entegrasyonunu tamamlandı sayma.
3. **Sınav kapanış senaryoları:** En fazla 30 soruluk öğrenci pilotu; ağ kesintisi, otomatik ara kayıt, geri alma/kurtarma kodu, zaman aşımı, yeni kod, tek teslim ve değerlendirme yetkileri için tutarlı uçtan uca güvenlik kabulü.
4. **Kurum/öğretmen UX:** Beş aşamada eksik alanlara doğrudan gitme, menü kaybolma/boş sayfa regresyonları, kontrast/mobil/klavye, onay sürüm farkı ve çıktıların kullanışlılığı.
5. **Branch/PR inceleme kapısı:** `main` ve Reader güvenlik dalı ile ayrı ayrı fark kontrolü, onaysız geniş merge yok, eski PR #26 için mükerrer kodu gözden geçirme; gerçek NVDA/konuşma kabulünden önce prod-ready/merge onayı verme.

## 6. Tek komutla güvenli doğrulama (Windows)

Önce klasörün ve Git HEAD'in doğru olduğunu, çalışma ağacının temizliğini kontrol et. Güncel GitHub erişimi **varsa** test çalışma klasöründe:

```powershell
& {
  $ErrorActionPreference = 'Stop'
  Set-Location 'D:\Projects\DOU-BEP-ACCESSIBILITY-TEST'
  if (git status --porcelain --untracked-files=all) {
    throw 'Yerel degisiklikler korunuyor; burada test güncellemesi yapmayın.'
  }
  $branch = 'feature/bep-v4-unified-institutional-design-20261108'
  git fetch origin $branch
  if ($LASTEXITCODE -ne 0) { throw 'GitHub baglantisi/FETCH FAIL' }
  git merge --ff-only FETCH_HEAD
  if ($LASTEXITCODE -ne 0) { throw 'FAST-FORWARD FAIL' }
  node --test tools/v4-student-browser-acceptance.test.mjs tools/v4-nvda-manual-lab.test.mjs
  if ($LASTEXITCODE -ne 0) { throw 'SOURCE TEST FAIL' }
  npm run reader:nvda:lab:check
  if ($LASTEXITCODE -ne 0) { throw 'NVDA CODE HTTP FAIL' }
  npm run ui:browser:student
  if ($LASTEXITCODE -ne 0) { throw 'EDGE FAIL' }
}
```

`github.com` DNS hatası oluşursa **git reset / clean / force push uygulanmaz**; bağlantı düzeltilir. Yerel mevcut commit üzerinde gerekli izole testler çalıştırılabilir, ancak GitHub güncellemesi yapılmış kabul edilmez.

## 7. Sonraki çalışma kuralı

Bu belge ve `ERISILEBILIR-SINAV-KAPANIS-20261114.md`, GitHub denetimi ve sınav geliştirmesi için **ortak ilerleme kaydı** olarak kullanılır. Yeni işlerde önce güncel feature dalı ve test kanıtları incelenir, mevcut kod/sınav verisi korunur, yeni GitHub commit'i ve Windows yerel test sonucu **ayrı** raporlanır. ChatGPT sohbetlerinin uygulama içindeki geçmiş mesajları teknik olarak tek sohbet başlığına taşınmaz; geliştirme bağlamı ve GitHub kaydı bu belgeyle birleştirilir.
