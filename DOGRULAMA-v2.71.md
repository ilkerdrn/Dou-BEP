# DOU BEP v2.71 — doğrulama kaydı

- Kapsam: istemci sentetik WAV üretimi, eski sesin korunması, 6 çift/12 denemelik yerel tanıma provası, denetlenebilir NVDA yerel STDIN/WAV köprüsü ve pasif sürücü kaynakları.
- Fonem adayı `synthesizeTurkishSpectralPreview()` ile `synthesizeLocalFreeText(..., {acousticModel:'spectral'})` üzerinden çalışır. **Yeni adayın anlaşılabilirliği insanlarca kanıtlanmamıştır.**
- NVDA sürücüsü yalnız prototiptir; **Windows/NVDA çalışma testi yapılmadı, otomatik kurulabilir veya üretime hazır değildir.**
- Kaynak dağıtımına `data/`, SQLite/DB, log, kimlik bilgileri ve anahtarlar alınmadı.
- İlk hedefli testler: 24/24 geçti. Yardımcı köprü ve tanıma ilave 12/12 test geçti. Dağıtım denetimi bu aşamada geçti.
- Tam regresyon, izole 14 grupta 132 dosya / **696 test başarılı**, 0 başarısız. `node release-check.mjs` **300/300** PASS. `node tools/offline-audit.mjs` **111 kaynak dosyası, 0 doğrudan dış URL bulgusu**. Testler yalnız Node statik/dinamik kontrolleridir; gerçek NVDA / insan erişilebilirlik testi yapılmadı.
- Tam proje ZIP dosyasının ayrı temiz dizine çıkarılmasıyla izole demo DB kullanılarak 23/23 HTTP smoke: kurum girişi, oturum, anonim sınav taslağı kaydı, Reader sayfası, yeni tanıma kaynakları ve özel dosya yolları kontrol edildi.
- Windows güncellemesi / gerçek NVDA yükleme testi bu ortamda yapılamadı; yama hedef bilgisayarda önce yedek sonra ön kontrol yapmalıdır.
- İnsan katılımcı verisi, mikrofon kullanımı ve kişisel veri toplama yoktur. Kaynak düzeyi çevrimdışı tarama ağ yalıtımı kanıtı değildir.
