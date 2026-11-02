# DOU BEP — deneysel NVDA uzun metin iyileştirmesi (2 Kasım 2026)

- Kaynak: DOU_BEP_NVDA_QUEUE_20261102_TAM.zip.
- 260 karakteri aşan konuşma parçası kelime sınırları tercih edilerek en fazla 260 karakterlik isteklere bölünüyor.
- IndexCommand bildirimi son parçaya korunarak taşınıyor; metin kaybı olmaması test edildi.
- En fazla 24 parça sınırı korunuyor. Aşılırsa içerik işlenmeden reddediliyor.
- İzole Python mock NVDA testleri: 14/14 PASS.
- node release-check.mjs: exit 0.
- node tools/exam-closure-smoke.mjs: exit 0; geçici DB, canlı DB'ye dokunulmadı.
- Gerçek Windows/NVDA ve Türkçe anlaşılabilirlik testleri yapılmadı. Kurumsal üretim kullanımına onay değildir.
