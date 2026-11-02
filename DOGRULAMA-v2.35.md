# DOU BEP v2.35 — Yerel Doğrulama Raporu

Tarih: 29 Ekim 2026. Test ortamı: Linux üzerinde Node.js 22.16.0. **Anonim/sentetik yerel araştırma prototipi.** Kullanıcıya ait gerçek Windows kurulumunda test yapılmadı.

| Denetim | Ölçülen sonuç |
|---|---|
| `npm test` | **453/453 PASS**, 0 hata |
| `npm run release:check` | **102/102 PASS** (kaynak/sürüm kontrolleri, penetrasyon testi değil) |
| `npm run offline:audit` | 67 yayımlanan statik arayüz dosyası, 0 doğrudan haricî kaynak bulgusu (ağ izolasyon kanıtı değil) |
| `npm run acceptance:pilot` | **10/10 PASS**, yalnız sentetik SQLite, `productionReady:false` |
| Sıfırdan yerel sunucu açılışı | 9 ana sayfa HTTP **200** |
| Sağlık uç noktası | `/api/health` sürüm `2.35.0` |
| Yetkisiz kabul API erişimi | HTTP **401** |
| Korumalı kaynak ve SQLite'ya web erişimi | HTTP **404** |
| Yeni güvenlik kontrolleri | Yeniden SQLite açılışında kod kilidinin korunması, rastgele kodlarla global limiti aşamama, onay defteri bozulunca reddetme |

### Teknik kapsam

Yeni `pilot_redeem_throttle` tablosu; kök uygulamada değişiklik gerektirmeden eski SQLite'ya ilave edilir. Hem 5 hatalı aynı kod denemesi/15 dakika hem 12 farklı hatalı deneme/60 saniye kısıtları DB'de sürdürülür. Kod/token/IP/öğrenci bilgisi yeni tabloda kaydedilmez. Onay geçmişi–sınav içerik eşleşmesi pilot kodu çıkarma/başlatma/yanıtlama/değerlendirmede yeniden doğrulanır. Mevcut veri silinmedi veya gerçek veriyle test yapılmadı.

### Üretim sınırları

Global anonim kod limiti geçici hizmet aksatmasına yol açabilir. SQLite uygulama seviyesinde şifreli değil; HTTPS, gerçek kurumsal SSO, KVKK/etik izin, gerçek kullanıcı deneyimi ve bağımsız saldırı/erişilebilirlik testleri yapılmadı. SHA-256 onay özeti yönetici seviyesinde veritabanı değişikliğine karşı bağımsız imza oluşturmaz. **Bu rapor kurum kullanım onayı değildir.**
