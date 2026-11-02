# DOU BEP v2.75 — doğrulama raporu

30.10.2026 · Çevrimdışı, üretim/erişilebilir sınav kullanımına **hazır olmayan** araştırma prototipi.

## Bu sürümün değişiklikleri
- Altı blok x altı sözcük çifti: 36 denemenin her altı sınamasında altı farklı çift; bitişik denemelerde aynı çift yok. 36 benzersiz çift/hedef/motor üçlüsü korunur. Karıştırma deterministik bayt-mod yöntemi olduğundan **istatistiksel olarak uniform değildir**.
- Ses üreticileri (`legacy`, `spectral`, `contrast`) değiştirilmedi. Sadece /dou-speech-intelligibility laboratuvarında PCM WAV kopyaları tam-klip RMS 0,115 hedefine yönlendirilir ve peak 0,9 sınırıyla korunur. RMS, LUFS veya eşit algısal gürlük değildir; bazı örnekler hedefe ulaşamayabilir.
- Laboratuvar sayfasına işitme uyarısı; anonim JSON raporuna ses düzeylendirme bilgisi eklendi. CSV satırları yalnız deneme verileridir.
- Yeni `dou-speech-rehearsal-level.test.mjs` fonem sırası, WAV başlığı, tepe, sessiz/bozuk veri ve izole NVDA yolunu sınar.

## Otomatik kontroller
- Node.js test dosyaları: **136 dosya, 8 ayrı grupta toplam 719/719 test başarılı**, 0 başarısız (Node v22.16.0, izole bu araç ortamı).
- `node release-check.mjs`: **314/314 başarılı**.
- `node tools/offline-audit.mjs`: **118 yayımlanan arayüz dosyasında 0 doğrudan dış kaynak çağrısı** (statik tarama, firewall kanıtı değildir).
- Yeni/hedefli ses ve protokol testleri: 10/10 başarılı.
- Tam ZIP çıkarımı: **491 dosya**; izole demo kurum CLI bootstrap başarılı.
- İzole HTTP smoke: **9 HTTP yanıtı doğrulandı**: /api/health 200 (v2.75.0), /dou-speech-intelligibility 200,
  /dou-speech-rehearsal-level.mjs 200, /dou-speech-tri-protocol.mjs 200,
  /dou-speech-intelligibility-ui.mjs 200, /dou-reader-demo 200, /kurumsal-sinav 200,
  /nvda-experimental/... 404 ve ayrı /dou-speech-rehearsal-level.test.mjs 404
  (7 public uç ve 2 private yol ile toplam 9 HTTP yanıtı; health dahil).
- ZIP güvenliği: SHA-256, CRC (`testzip`) ve `data/`/SQLite dosya yokluğu doğrulandı.
- Gerçek Chrome/Windows/NVDA tarayıcı ve okuyucu uyumluluğu henüz doğrulanmadı.

## Sınırlar
- Üçüncü ses motorunun daha anlaşılır olduğu gösterilmedi; bu sürüm doğrudan fonem sentez kalitesini artırdığını iddia etmez.
- Gerçek Windows/NVDA testi, NVDA sürücüsünün erişilebilirlik onayı, insan dinleme testi/etik izin ve gerçek sınıf kullanımı yoktur.
- Yamada/tam pakette `data/`, SQLite, gizli anahtarlar, kullanıcı kayıtları ve .env bulunmaz. `data/` ayrıca yedeklenmeli.
