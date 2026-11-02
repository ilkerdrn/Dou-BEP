# DOU BEP Sınav Atölyesi v2.15 — doğrulama

- Node.js: 22.16.0.
- `npm test`: **328/328 başarılı**.
- `npm run release:check`: **13/13 başarılı** (yalnızca sınırlı yerel kontrol).
- Koordinasyon testleri: şema doğrulama, tarih/saat ve program/kod kısıtları, tenant izolasyonu, admin/koordinatör yetkileri, çakışan salon/görevli engeli, sürüm çakışması, onaylı kaynak sınavın değişmesinde bayatlama, CSRF ve origin, HTTP static allowlist.
- Chromium GUI denemesi: **başarılı değil; yerel URL ERR_BLOCKED_BY_ADMINISTRATOR ile engellendi**. Bu sonuç uygulamanın sorunsuz gerçek tarayıcıda çalıştığını kanıtlamaz.
- Gerçek NVDA/JAWS/VoiceOver/TalkBack kullanıcı testi, kurum SSO/MFA, KVKK, gerçek öğrenci pilotu ve bağımsız sızma testi: **YAPILMADI**.
- Gerçek öğrenci verilerini kullanmayın.
