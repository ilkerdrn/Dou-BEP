# DOU BEP Sınav Atölyesi v2.51 — Öğretmen hazırlık ve onay denetimi

**Yerel, anonim ve sentetik BAP/Ar-Ge prototipidir.** Gerçek öğrenci, engellilik, sağlık, sınav veya personel bilgileriyle kullanılmamalıdır. Doğuş Üniversitesi'nin resmî kurumsal ürünü veya erişilebilirlik sertifikalı yazılımı değildir.

## v2.51 yeniliği

Önceki sürümde kaydedilmiş ve onaylı görünen bir sınavın, kazanım bağlantıları eksik olsa dahi hazırlık ekranındaki son adımı tamamlanmış gösterebilmesi düzeltildi. Artık `Kaydetme ve onay` adımı, önceki **dört** hazırlık kontrolü bitmeden tamamlandı sayılmaz.

- `Sınav bilgileri`, `BEP kazanımları`, `Sorular`, `Öğretmen ve erişim kontrolü`: hepsi tamamlanmalıdır.
- Eksik kazanım veya sıfır soru artık yanlış tamamlanma durumu oluşturmaz.
- Önceden verilmiş onay **silinmez veya geri alınmaz**. Eksik hazırlık durumunda öğretmen panelinde açık uyarı gösterilir; kayıt yetkili tarafından ayrıca incelenmelidir.
- `Anonim kontrol CSV indir` çıktısı bu güvenilirlik kapısını takip eder; soru metni, öğrenci bilgisi, dosya adı veya cevap anahtarı içermez.
- DOU Reader, çevrimdışı DOU Speech Lab, tüm eski sınav/uyarlama işlevleri, SQLite ve API sözleşmeleri korunmuştur. Bu sürüm yeni veri taşımaya veya migrasyona ihtiyaç duymaz.

## Windows'ta güvenli yerel çalıştırma

1. ZIP'i mevcut kurulumunuzun ve **`data` klasörünüzün üzerine yazmadan** yeni bir klasöre çıkarın. Node.js 22.13+ gerekir.
2. Yeni klasörde `npm.cmd start` çalıştırın; kurulumunuzda yönetici hesabı yoksa `KURULUM-YONETICI.ps1` yönergelerini izleyin.
3. `http://127.0.0.1:4173/kurum` adresinden girip kurumsal sınav editöründeki **Sınav hazırlık kontrolü** panelini görüntüleyin.
4. Tüm kontrolleri kaynak koddan yapmak isterseniz: `npm.cmd test`, `npm.cmd run release:check`, `npm.cmd run offline:audit`, `npm.cmd run acceptance:pilot`. Bunlar sentetik testlerdir.

## Önemli sınırlar

Bu yalnızca **arayüzün hazırlık durumu tutarlılığını** düzeltir; mevcut sunucu onayını değiştirmez, otomatik belge yayımlamaz. Gerçek Windows/NVDA yardımcı teknoloji testleri, doğal Türkçe TTS, SSO, veritabanının çalışırken şifrelenmesi, PDF/UA ve yetkili etik/KVKK onayı henüz tamamlanmamıştır. Gerçek öğrenci verisi kullanılmamalıdır.
