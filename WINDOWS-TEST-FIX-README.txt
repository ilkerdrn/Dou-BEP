DOU BEP Sinav Atolyesi 2.20 - Windows test temizleme duzeltmesi

Sadece server.mjs dosyasindaki test server close hookuna SQLite db.close()
eklenmistir. BEP_NO_LISTEN=1 durumunda uygulanir.
Windows'ta acik SQLite dosyasini silmeye calisan testler EPERM verebiliyordu.
Bu paket 2.20.0 uygulama surumunu korur; onceki verileri icermez.
Linux Node v22.16.0: npm test 365/365, npm run release:check 29/29.
Windows yerel testleri kullanicinin cihazinda tekrar calistirilmalidir.
Gercek ogrenci ve saglik verileriyle kullanima uygun degildir.
