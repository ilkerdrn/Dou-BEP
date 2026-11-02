# DOU BEP — NVDA yerel konuşma sürücüsü (yalnız araştırma)

**KULLANIM UYARISI:** Erişilebilirlik için hazır, desteklenen, sertifikalı ya da insanlarla doğrulanmış bir Türkçe konuşma motoru değildir. NVDA'nın mevcut çalışan sesini değiştirmeyin; yalnız ayrı test profili / sanal makinede kullanın. Gerçek öğrencinin sınav metinleri, sağlık veya kişisel bilgilerini okutmayın. İzin ve etik süreçleri olmadan kullanıcı araştırması yapmayın.

Bu klasör, NVDA 2026.x SynthDriver API'si için **kaynak kod prototipidir**. Hazır kurulum (`.nvda-addon`) veya otomatik etkinleştirme içermez. Windows/NVDA üzerinde test edilmedi.

Teknik bileşenler:
- `synthDrivers/douBepPilot/__init__.py`: `speak`, `cancel`, `pause`, `terminate`, `IndexCommand` ve konuşma bildirimi deneyi. `check()` açıkça `DOU_BEP_NVDA_EXPERIMENTAL=1` ve `DOU_BEP_ROOT` bekler; aksi halde devre dışı kalır.
- `tools/dou-speech-nvda-stdio.mjs`: yalnız stdin JSON alır, stdout'a WAV verir. Doğrudan ağ erişimi, bulut veya dosyaya metin yazma yoktur. 260 karakter sınırı, en fazla 15 saniye alt süreç beklemesi.
- NVDA'nın `nvwave.WavePlayer` ses yolu kullanılır; spektral aday yerine **önceki güvenilirlik açısından daha tanıdık robotik** varyant varsayılandır.

## Yapılması gerekenler

1. Yalnız izole sanal makinede NVDA sürümüne uygun sanal ses aygıtı ve `node` çalıştırmayı doğrulayın.
2. Kaynak dosyalarını bir NVDA test profilinde ayrı synthDrivers dizininde kontrollü olarak yükleyin. **Bu adım burada otomatik yapılmaz.**
3. `DOU_BEP_ROOT` tam yerel proje dizinini göstermeli, `DOU_BEP_NVDA_EXPERIMENTAL=1` elle etkinleştirilmelidir.
4. Cancel sırasında senkronizasyon; IndexCommand işaretlerinin oynatma anı; NVDA'nın `say all`, duraklatma, ses aygıtı kaybı, boş içerik ve Unicode kapsamı manuel test edilmelidir. Bu sonuçlar henüz yok.
5. Başarı sağlanana kadar NVDA'nın mevcut kullanılabilir ses motoru korunmalıdır.

Referans: https://api.nvaccess.org/releases/2026.3beta1/documentation/developerGuide.html ve NVDA `source/synthDriverHandler.py`, `source/nvwave.py` (30 Ekim 2026 itibarıyla teknik referans).

## v2.72 WAV güvenlik sözleşmesi

`wave_contract.py` sentetik WAV başlığını ve tüm gövde uzunluğunu NVDA `WavePlayer.feed` çağrısından önce denetler. Yalnız 22.050 Hz / tek kanal / 16 bit PCM, üst boyut 3 MB ve 60 saniye kabul edilir. Bozuk RIFF, eksik veri veya beklenmeyen ses biçimi **oynatılmadan reddedilir**. `cancel()` sırasında alt süreç zaten kapanmışsa `OSError` güvenli biçimde ele alınır. Bu kaynak düzeyinde koruma **NVDA/Windows üzerinde başarı iddiası değildir**; ayrı test profilinde gerçek odak, sayfa okuma, kesinti ve ses cihazı testleri yapılmalıdır.

Platform bağımsız sözleşme testi: `python -m unittest nvda-experimental/test_wave_contract.py` (Windows paketinde NVDA içindeki Python ortamını etkilemeden çalıştırılabilir).
