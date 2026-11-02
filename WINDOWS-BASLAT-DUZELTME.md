# DOU BEP v2.3 - Windows baslatma dosyasi duzeltmesi

Bu paket **v2.3 uygulama kaynak kodunu degistirmez**. Yalnizca `BASLAT.bat` Windows komut satirinin bekledigi `CRLF` satir sonlariyla yeniden yazilmistir. Dugum noktasi kontrolleri eklenmistir:

- Node.js PATH kontrolu ve standart Windows kurulum dizinleri
- Node.js surum kontrolu (**22.13+**)
- ZIP tam cikarilmadiginda acik hata mesaji
- Proje klasorune gecis ve yerel sunucu baslatma

## Adimlar
1. ZIP'i tamamini yeni bir klasore cikarin; arsivin icinden dogrudan BAT calistirmayin.
2. PowerShell veya CMD'de `node --version` calistirin. Surum bulunamiyorsa `https://nodejs.org/` adresinden Node.js LTS kurun. Kurulum sonrasinda yeni terminal acin.
3. `BASLAT.bat` dosyasina cift tiklayin. Kurumsal giris: http://127.0.0.1:4173/kurum
4. Hata surerse CMD'de `where node`, `node --version` komutlarini ve BAT ekranindaki tam hata metnini iletin.

Bu paket yeni kurumsal guvenlik ya da ozel nitelikli ogrenci verilerinin islenmesi icin onay anlamina gelmez. Yalnizca anonim yerel pilot kullanimi icindir.
