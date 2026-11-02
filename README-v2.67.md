# DOU BEP Sınav Atölyesi — v2.67

**Amaç:** Yerel kurum panelindeki tutarsız sol menüyü tek bir gezinme sistemine dönüştürmek, sınav editörünün sessiz/boş açılış hatalarını görünür kılmak ve kullanıcı arayüzünü premium, kolay kullanılan bir seviyeye taşımak. Araştırma prototipidir; resmî Doğuş Üniversitesi dağıtımı değildir.

## Değişiklikler

- 12 yönetim + 4 Reader/laboratuvar ekranında aynı menü başlıkları, bağlantılar ve sıra (her ekranda doğru etkin seçim).
- Koyu erik/bordo kurumsal tema, beyaz çalışma yüzeyi, daha belirgin başlıklar, eylem düğmeleri, form kartları.
- Her sayfada **Yeni sınav oluştur** kısayolu. `http://127.0.0.1:4173/kurumsal-sinav?new=1`.
- Mobil menü düğmesi, Escape, içerik atlama, odak halkası, azaltılmış animasyon ve yazdırma düzeni.
- Sınav hazırlama ekranında yükleme durumu; modül/ağ/oturum hatasında yenileme ve kuruma dönüş. Daha önceki 404 statik JS eksikleri kapalı.
- Yerel SQLite ve onay mekanizmasında şema değişikliği **yok**; 2.66 deneysel ses bileşenleri aynı bırakıldı.

## Windows üzerinde mevcut kurulumunu koruyarak güncelleme

1. Açık `BASLAT.bat` konsolunda Ctrl+C ile sunucuyu kapat.
2. `DOU_BEP_v2_67_Premium_Yama.zip` dosyasını **ayrı** bir klasöre çıkar.
3. İçindeki `GUNCELLE.bat` dosyasını çalıştır. Varsayılan hedef: `%USERPROFILE%\Desktop\New folder (7)`.
4. Kaynak dosyalar yedeklenir ve güncellenir. `data/`, `.sqlite`, şifreler ve kullanıcı hesapları değiştirilmez.
5. Var olan projede `BASLAT.bat` dosyasını yeniden çalıştır. `http://127.0.0.1:4173/kurum` adresini aç; Ctrl+F5 ile yenile.
6. Giriş yap, sol menüden **Sınav Hazırla**'ya git; boş editör değil yeni sınav formu görünmeli.

Kurulum klasörün farklıysa yama dosyaları klasöründe `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\GUNCELLE-v2.67.ps1 -Target "C:\Gercek\Proje\Klasoru"` çalıştır.

## Doğrulama kapsamı ve sınırları

`node --test --test-concurrency=8 *.test.mjs server-foundation/*.test.mjs tools/*.test.mjs` (büyük koşu yerine dosya grupları halinde doğrulandı), `node release-check.mjs`, `node tools/offline-audit.mjs`.

Erişilebilirlik için gerçek kullanıcı testi, tarayıcı ekranda render kontrolü, PDF/UA onayı, tam TTS ve NVDA denkliği yapılmamıştır. Yalnız anonim sentetik test verileri kullanın.
