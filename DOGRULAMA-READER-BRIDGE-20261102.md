# DOU BEP Reader / NVDA deneysel köprü düzeltmesi — 2 Kasım 2026

Temel: v2.81 R3 Reader hotkey fix tam paket.

- Standart girdide gelen JSON byte olarak en fazla 2048 byte ile sınırlandırılır; parçalar birleştirilip geçersiz UTF-8 reddedilir.
- Köprü betiğinin doğrudan başlatılması Windows sürücü harfleri ve Unicode dizinler için fileURLToPath/resolve ile denetlenir.
- Geçersiz girdiler stderr üzerinden sınav metnini yansıtmaz.

Kontroller: `node --test dou-speech-nvda-bridge.test.mjs` = 7/7 PASS; `node release-check.mjs` PASS.
Tüm test paketi tek koşuda zaman aşımına uğradı; bu koşuda tam suite PASS iddiası yoktur.
Gerçek Windows NVDA, Türkçe ses anlaşılırlığı ve kurumsal erişilebilirlik kabulü yapılmadı.
Paketler data/, SQLite, gerçek kullanıcı kayıtları ve sırları içermez. Mevcut sistem üzerine körlemesine açmayın; önce tam yedek alın ve kaynak farklarını inceleyin.
