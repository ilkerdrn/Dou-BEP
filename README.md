**DOU BEP V4 genel kabul (yerel, yalnız sentetik):** `npm.cmd run acceptance:v4:quick` veya `npm.cmd run acceptance:v4`. İzole Edge tarayıcı kontrolü: `npm.cmd run acceptance:v4:browser`. Kullanım ve sınırlar: [`docs/V4-YEREL-GENEL-KABUL.md`](docs/V4-YEREL-GENEL-KABUL.md). Bu testlerin PASS sonucu canlı kullanım izni veya gerçek ekran okuyucu kabulü değildir.

**DOU BEP V3 arayüz kabulü:** Otomatik kontrol: `npm.cmd run design:v3:acceptance`. Gerçek NVDA/klavye manuel kabul protokolü: [`docs/V3-MANUEL-ERISILEBILIRLIK-KABUL.md`](docs/V3-MANUEL-ERISILEBILIRLIK-KABUL.md). Otomatik PASS, gerçek ekran okuyucu kabulü değildir.

**Son sürüm:** v2.81. Sınav oluşturma–onay–teslim zinciri ve gerçek SHA-256 indirme doğrulaması: `README-v2.81.md`.

**Son sürüm:** v2.80. Eşleşmiş sözcük hedefi analizi için `README-v2.80.md` dosyasına bakın.

# DOU BEP v2.79

Yeni: koşullara göre ayrılmış araştırma kanıtı kontrolü, rapor başına motor karşılaştırması ve ses çifti hata öncelikleri. Ayrıntılar: `README-v2.79.md`.

# DOU BEP v2.78

Yeni: yerel rapor kalite ve koşul denetimi. Ayrıntılar: `README-v2.78.md`.

DOU BEP v2.77: yerel anonim dinleme raporlarını denetleme (README-v2.77.md).

## Önceki sürüm: v2.77 — Dördüncü akustik araştırma kolu

Dört çevrimdışı robotik motorla 48 denemelik karşılaştırma ve b/d/g/k/c/ç için ayrı boğumlanma işaretleri eklendi. **İnsan anlaşılabilirliği ve Windows/NVDA uygunluğu doğrulanmadı.** Ayrıntılar: [README-v2.77.md](README-v2.77.md).

## Güncel: v2.75 — Dengeli Türkçe fonem dinleme laboratuvarı

Mevcut üç motor ile altılı bloklu 36 deneme ve yalnız deney ekranı için PCM16 RMS eşitleme (algısal gürlük eşitliği değildir) eklendi. NVDA sürücüsü deneysel, insan anlaşılabilirliği doğrulanmamıştır. Ayrıntılar: [README-v2.75.md](README-v2.75.md).

**Son araştırma paketi: v2.74 — üç motorlu 36 denemelik fonem provası ve 24 deneme arayüz düzeltmesi.**

## Son ek: v2.73

Yeni dengeli 24 denemelik ses anlaşılabilirlik provası ve izole NVDA sürücü testleri: [README-v2.73.md](README-v2.73.md).

**Güncel araştırma sürümü v2.72:** maskeleme + yerel fonem karıştırma raporu + NVDA WAV biçim doğrulaması. Ayrıntılar: [README-v2.72.md](README-v2.72.md). Üretim/erişilebilirlik kabulü değildir.

## Güncel: [v2.71 deneysel fonem/NVDA köprüsü](README-v2.71.md)

**Son araştırma sürümü:** [v2.70 yerel Türkçe bağlamsal okunuş deneyi](README-v2.70.md) — doğal TTS/NVDA değildir.

# DOU BEP Sınav Atölyesi — v2.69

Güncel kapsam ve çalıştırma: [README-v2.69.md](README-v2.69.md).

> **Son geliştirme:** v2.69 — deneysel Türkçe tam sayı telaffuzu ve cümle ritmi. v2.67 premium panel korunur.

> v2.66 ses Ar-Ge geçmişi: `README-v2.66.md`.

**Önceki sürüm: v2.51 — sınav hazırlık/onay durumunu yanlış tamamlandı göstermeme düzeltmesi.** Bkz. [README-v2.51.md](README-v2.51.md).

**Önceki sürüm: v2.50 — yalnız cihazda fonem karıştırma matrisi ve anonim toplu deney analizi.** Bkz. [README-v2.50.md](README-v2.50.md).

**Önceki sürüm: v2.49 — DOU Speech Lab yerel fonem ayırt etme alıştırması ve teknik WAV fark raporu.** Bkz. [README-v2.49.md](README-v2.49.md).

**Önceki geliştirme: v2.48 — DOU Speech Lab ünsüz sınıfı araştırması ve Sasa/Şaşa sentetik karşılaştırma demosu.** Bkz. [README-v2.48.md](README-v2.48.md).

**Önceki geliştirme: v2.47 — DOU Speech Lab fonem geçişi ve kör A/B sentetik dinleme prototipi.** Bkz. [README-v2.47.md](README-v2.47.md).

**Önceki sürüm:** v2.45 dokümanları geçmiş sürüm başvurusu içindir.

# DOU BEP Sınav Atölyesi v2.43 — DOU Reader + DOU Speech

**Önceki sürüm rehberi:** [README-v2.43.md](README-v2.43.md). Önceki modüller korunur; Windows okuyucuda bağlantı/düğme gezinmesi ve yerel Türkçe matematik seslendirme ön işlemcisi eklendi. Kendi TTS akustik modeli veya NVDA eşdeğeri değildir.

Yerel sunucu: `npm.cmd start`; sentetik demo: `http://127.0.0.1:4173/dou-reader-demo`. Gerçek öğrenci verisiyle kullanım henüz onaylı değildir.


Sürüm 2.65: [Sabit Türkçe ritim birleştirme deneyi](README-v2.65.md).

Sürüm 2.64: [Sabit Türkçe vurgu planı ve sentetik A/B dinleme](README-v2.64.md).

Sürüm 2.63: [Türkçe telaffuz istisnası Ar-Ge notu](README-v2.63.md).

## v2.68 — Serbest metin deneyi

Yalnız yerel robotik PCM WAV: Reader içinde 360 karaktere kadar örnek Türkçe metin yazma, dinleme, indirme ve temizleme. Gerçek doğal TTS, NVDA veya canlı sınav okuma değildir. Ayrıntı: `README-v2.68.md`.
