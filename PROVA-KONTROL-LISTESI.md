# Prova sınavı kontrol listesi (3–5 bilgisayar, gerçek Windows)

Amaç: Gerçek salona geçmeden önce, burada göremediğimiz sorunları gerçek bilgisayarlarda bulmak. Her satıra GEÇTİ / KALDI yazın; KALDI olanın ekran görüntüsünü ve hata metnini geliştiriciye gönderin. **Yalnızca sentetik/anonim veri kullanın; gerçek öğrenci adı, numarası, tanısı yazmayın.**

## A. Kurulum (sunucu bilgisayarı) — kim: BT / sınav birimi
| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| A1 | Node.js sürümü: PowerShell'de `node -v` | v22.13 veya üstü | |
| A2 | Projeyi indirip çıkarın; `KURULUM-YONETICI.ps1` ile yönetici hesabını oluşturun | Hata yok | |
| A3 | `BASLAT-SALON.bat` çalıştırın | "SALON (LAN) MODU AÇIK" ve "Öğrenci adresi: http://192.168.x.x:4173/pilot" yazar | |
| A4 | Güvenlik duvarı kuralı (yönetici PowerShell, bir kez): `netsh advfirewall firewall add rule name="DOU BEP Salon" dir=in action=allow protocol=TCP localport=4173 profile=private` | Başarılı | |
| A5 | Sunucuda `http://localhost:4173/kurum` açın, giriş yapın | Menü görünür | |
| A6 | Başka bir bilgisayardan `http://<sunucu-ip>:4173/kurum` açın | **Erişilemez/403** olmalı (yönetim yalnız sunucudan) | |
| A7 | Aynı bilgisayardan `http://<sunucu-ip>:4173/pilot` açın | Giriş sayfası açılır | |

## B. Hazırlık (her öğrenci bilgisayarında) — kim: salon görevlisi
| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| B1 | `http://<sunucu-ip>:4173/hazirlik` → "Hepsini sırayla dene" | Sunucu bağlantısı ✓; yanıt süresi < 500 ms | |
| B2 | Yerel Türkçe ses yoksa model hazırlanması | "Model hazır" (ilk seferde ~38 MB iner) | |
| B3 | "Sesi dene" → "Evet, duydum" | ✓ | |
| B4 | Alt+Shift+T | "kısayol tuşları algılandı" | |
| B5 | Genel durum | "Bu bilgisayar sınava hazır" | |

## C. Sınav hazırlığı — kim: öğretim elemanı
| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| C1 | `ORNEK-SORU-SABLONU.xlsx` ile iki farklı ders için kısa sınav yükleyin (biri yazılı soru içersin) | Önizlemede sorular, cevap ve puan görünür | |
| C2 | Her soruyu kaynakla karşılaştırıp onaylayın, kurum onayını verin | Sınav "onaylı" | |
| C3 | Editörde bir değişiklik yapıp 5 sn bekleyin | "Kaydedildi" (otomatik kayıt) | |

## D. Salon planı — kim: salon görevlisi
| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| D1 | `/salon-oturumu`: "Örnek planı koy", aday kodu/koltuk/sınavları düzenleyin; en az **1 görme, 1 motor, 1 işitme, 1 uyarlamasız** aday | Doğrulama geçer | |
| D2 | "Planı doğrula ve kodları üret" | Her aday için ayrı kod | |
| D3 | "Giriş kâğıtlarını yazdır" | Kâğıtta ad yok; koltuk, sınav, süre, kod, adres var | |
| D4 | Görme engelli aday için "Kodu sesli oku" | Kod okunur | |

## E. Sınav (öğrenci bilgisayarları)
| # | Aday türü | Kontrol | Sonuç |
|---|---|---|---|
| E1 | Hepsi | Kod girilince kendi sınavı, kendi süresi açılır | |
| E2 | Görme (AUTO_READ) | Yönerge + ilk soru kendiliğinden okunur; Alt+Shift+N sonraki soruyu okur; klavyeyle tüm sınav | |
| E3 | Görme | Ekran okuyucu (NVDA) ile "Soruları otomatik oku" kapatılıp çift okuma olmadığı | |
| E4 | Az gören | Çok büyük yazı + yüksek kontrast otomatik açık | |
| E5 | Motor | Tek soru, büyük tıklama alanları; fare olmadan bitirilebilir | |
| E6 | İşitme | Süre uyarıları görsel; sesli yönerge yok | |
| E7 | Yazılı soru | Yaz, tarayıcıyı kapat/yenile → aynı kodla devam; yazı geri gelir | |
| E8 | Mola hakkı olan | Alt+Shift+M → sorular gizlenir, süre durur; bitirince döner | |
| E9 | Hepsi | Süre bitiminde otomatik teslim | |
| E10 | Görevli | Canlı tabloda herkesin durumu, kalan süre, devam sayısı | |

## F. Sonuç
| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| F1 | `/pilot-yonetim`: bir teslimi incele, puan gir | Kaydedilir | |
| F2 | `/salon-oturumu`: "Sonuç tablosunu indir (CSV)" | 1 satır/aday; nesnel puan önerisi | |
| F3 | Saklama süresi uyarısını okuyun | Süre kurum kararınıza uygun mu? | |

## Geçti sayılması için
A–F'de **KALDI yok**; E2/E3/E5 en az bir **gerçek engelli kullanıcı veya ona yakın uzman** tarafından denenmiş. Bu liste otomatik testlerin yerine geçmez, onları tamamlar. Gerçek NVDA/JAWS testi için ayrıca `UZMAN-TEST-SENARYOLARI-NVDA.md` ve sonuçlar için `TEST-SONUC-FORMU.csv` kullanılır.
