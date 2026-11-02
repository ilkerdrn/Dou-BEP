# DOU BEP v2.74 — üç motorlu fonem laboratuvarı

**Ar-Ge prototipi; doğal Türkçe TTS veya NVDA erişilebilirlik kabulü değildir.**

Yeni araştırma kolu `contrast`, spektral WAV üzerindeki `s/ş/ç/c/z` segmentlerinde farklı filtreleme uygular. Her iki eski kol (`legacy`, `spectral`) aynen korunur. Akustik fark, **anlaşılabilirlik artışı ispatı değildir**.

`/dou-speech-intelligibility` sayfasında 36 denemelik üç motorlu protokol varsayılandır: altı çift × iki sözcük × üç motor. 12 ve 24 deneme protokolleri de seçilebilir; 24 protokolünün önceki özet ekranı hatası giderilmiştir. Dinleme bitene dek hedef/motor görünmez; sonuçlar yalnız sekme belleğindedir. JSON/CSV yalnız kullanıcı isterse indirilir. Öğrenci, sınav, sağlık verileri veya kişisel kimlik girmeyin.

NVDA kaynakları deneysel kalır; test profilinde dahi yerel sistem konuşma motorunu değiştirmeden önce ayrıca doğrulama gerekir. `data/` ve hesaplar hiçbir kaynak ZIP paketine alınmaz. Kurulum güncellemesinden önce `BASLAT.bat` durdurulmalı, tüm proje ve `data/` yedeklenmelidir.
