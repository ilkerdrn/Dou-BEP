# DOU BEP v2.80 — Eşleşmiş sözcük hedefi karşılaştırması

Bu sürüm yeni ses üretim motoru eklemez. Dört deneysel motor ile hazırlanan kimliksiz 48 denemelik sonuçları analiz eder.

## Yeni analiz
- Her koşulda ve her motor için **her bir hedef sözcük** önceki motorun aynı sözcük sonucuyla eşleştirilir.
- Dört durum sayılır: ikisi doğru, yalnız önceki doğru, yalnız aday doğru, ikisi yanlış.
- Altı sözcük çiftinde ayrıca önceki/aday arasında yönlü değişim gösterilir.
- Eski sonuçlar v2.76–v2.79 desteklenir, v2.80 ses koşulu etiketi de kabul edilir.
- Rapordaki kimlik, katılımcı sayısı, p-değeri, Windows/NVDA veya erişilebilir sınav onayı **üretilmez**.
- Dosyalar yalnız tarayıcıda seçildiğinde ve bellekte incelenir; sunucuya yüklenmez.

## Kullanım
`BASLAT.bat` > `/dou-speech-intelligibility` > Yerel rapor karşılaştırması > 48 denemelik JSON raporlarını seç.

## Sınırlar
Bir rapor bir bağımsız dinleyici değildir; bu veri araştırma kanıtı olarak doğrulanmış değildir. Gerçek insan dinleme çalışması, etik süreç, örneklem/güç hesabı, uzman kontrolü ve gerçek Windows/NVDA kabulü gerekir.

## Kurulum
Yama paketinde mevcut `data` ve kurum hesapları yoktur; kurulum öncesi proje ve `data` yedeği alın. Windows' ta kurulum ayrıca doğrulanmalıdır.
