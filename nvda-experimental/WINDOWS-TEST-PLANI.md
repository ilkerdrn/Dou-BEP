# NVDA Windows smoke test — 2026-11-02

Amaç: var olan NVDA sesini, Windows profilini, veritabanını veya öğrenci içeriğini değiştirmeden lokal prototip testlerini çalıştırmak.

**Tek komut** (PowerShell, proje kökünde):
```powershell
& ".\tools\nvda-windows-smoke.ps1"
```
- Node köprüsünün sınırlandırılmış JSON/WAV testleri
- Python mevcutsa NVDA taklit sürücüsü ve PCM sözleşmesi testleri
- Yerel NVDA kurulumuna ilişkin salt-okunur kontrol
- Hiçbir eklenti yüklenmez veya etkinleştirilmez. NVDA'nın mevcut sesi değiştirilmez.

**Gerçek test için eksikler:** Test VM'si, ayrı NVDA konfigürasyonu, gerçek NVDA sürümünün doğrulanması, ayrı konuşma profili, güvenli geri dönüş, ses/odak/Say All/IndexCommand gözlemi ve insan dinleme değerlendirmesi.

Üretim ortamında veya öğrencilerin gerçek metinleriyle çalıştırmayın. Otomatik testlerde PASS, gerçek Windows/NVDA erişilebilirlik kabulü değildir.
