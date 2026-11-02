# DOU BEP NVDA deneysel konuşma kuyruğu — 2 Kasım 2026

- NVDA pilot sürücüsünün bekleyen seslendirme kuyruğu 8 öğeyle sınırlandı. Sınır dolduğunda yeni istek güvenli biçimde reddedilir, çalışmakta olan seslendirme korunur.
- İptalde kuyruk temizleme ve generation geçersizleştirme davranışı korundu.
- `node --test dou-speech-nvda-bridge.test.mjs`: 8/8 PASS.
- `node release-check.mjs`: PASS.
- `python -m py_compile .../__init__.py`: PASS.
- `node tools/exam-closure-smoke.mjs`: tamamlandı, geçici veritabanı.
- Windows NVDA ve doğal Türkçe ses kalitesi saha testleri henüz yapılmadı.
- ZIP içinde data/ ve gerçek öğrenci verileri bulunmamalı; güncellemeden önce yedek ve fark incelemesi yapın.
