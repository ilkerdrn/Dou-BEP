# DOU BEP Sinav Atolyesi - yerel yonetici parola kurtarma
# Bu dosyayi BASLAT.bat ile AYNI klasore koyun.
# Gercek ogrenci/ozel nitelikli veri icin kullanmayin.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$node = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($node) { $node.Source } else { $null }
if (-not $nodePath) {
    foreach ($candidate in @("$env:ProgramFiles\nodejs\node.exe", "${env:ProgramFiles(x86)}\nodejs\node.exe", "$env:LOCALAPPDATA\Programs\nodejs\node.exe")) {
        if (Test-Path -LiteralPath $candidate) { $nodePath = $candidate; break }
    }
}
if (-not $nodePath) { throw 'Node.js bulunamadi. node --version komutunu kontrol edin.' }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'server-foundation\institutional-store.mjs'))) {
    throw 'Yanlis klasor. SIFRE-SIFIRLA.ps1, BASLAT.bat ve server-foundation klasoru ile ayni yerde olmali.'
}
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'data\institution.sqlite'))) {
    Write-Host '[BILGI] Bu klasorde kurulmus hesap veritabani yok.' -ForegroundColor Yellow
    Write-Host 'BASLAT.bat dosyasinin BULUNDUGU klasoru kontrol edin.'
    Write-Host 'Ilk kurulum yapilmadiysa KURULUM-YONETICI.ps1 dosyasini calistirin.'
    exit 2
}

$js = @'
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, passwordHash } from './server-foundation/institutional-store.mjs';
const root = dirname(fileURLToPath(import.meta.url));
const store = openStore(join(root, 'data', 'institution.sqlite'));
const [mode, tenantId, emailArg] = process.argv.slice(2);
try {
  if (mode === 'list') {
    const admins = store.db.prepare("SELECT tenant_id AS tenantId, email, active FROM members WHERE role='admin' ORDER BY tenant_id,email").all();
    if (!admins.length) {
      console.log('Bu veritabaninda yonetici hesabi yok. KURULUM-YONETICI.ps1 calistirin.');
      process.exitCode = 2;
    } else {
      console.log('KAYITLI YONETICI HESAPLARI (sifreler gosterilmez):');
      for (const a of admins) console.log('  Kurum: ' + a.tenantId + ' | E-posta: ' + a.email + ' | ' + (a.active ? 'Etkin' : 'Pasif'));
    }
  } else if (mode === 'reset') {
    const email = String(emailArg || '').trim().toLowerCase();
    const account = store.db.prepare("SELECT id,tenant_id,email FROM members WHERE tenant_id=? AND email=? AND role='admin' AND active=1").get(tenantId, email);
    if (!account) throw new Error('Bu kurum kodu ve e-posta ile etkin yonetici bulunamadi. Ustteki listeyi birebir kullanin.');
    const pw = process.env.BEP_RESET_PASSWORD || '';
    const {salt,hash} = passwordHash(pw);
    store.db.exec('BEGIN IMMEDIATE');
    try {
      store.db.prepare('UPDATE members SET salt=?,hash=? WHERE id=?').run(salt,hash,account.id);
      store.db.prepare('DELETE FROM sessions WHERE member_id=?').run(account.id);
      store.db.prepare('INSERT INTO audit(tenant_id,actor_id,event,resource_id,created_at) VALUES(?,?,?,?,?)')
        .run(account.tenant_id,account.id,'admin.password_reset_local',account.id,Date.now());
      store.db.exec('COMMIT');
    } catch(e) {store.db.exec('ROLLBACK'); throw e;}
    console.log('BASARILI: Parola sifirlandi. Tum eski oturumlar gecersiz.');
    console.log('Giris kurum kodu: '+account.tenant_id);
    console.log('Giris e-posta: '+account.email);
  } else throw new Error('Gecersiz islem.');
} catch(e) { console.error('[HATA] '+e.message); process.exitCode=1; }
finally { store.db.close(); }
'@
$tmp = Join-Path $PSScriptRoot ('.bep-local-recovery-' + [guid]::NewGuid().ToString('N') + '.mjs')
$handle = [IntPtr]::Zero
try {
    [System.IO.File]::WriteAllText($tmp, $js, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host ''
    Write-Host '=== DOU BEP YONETICI PAROLA KURTARMA ===' -ForegroundColor Cyan
    & $nodePath $tmp list
    if ($LASTEXITCODE -ne 0) { throw 'Bu klasorde kurtarilacak etkin hesap bulunamadi.' }
    Write-Host ''
    $tenantId = (Read-Host 'Listeden KURUM KODUNU girin').Trim()
    $email = (Read-Host 'Listeden YONETICI E-POSTASINI girin').Trim()
    $confirm = Read-Host 'Parolayi sifirlamak icin SIFIRLA yazin'
    if ($confirm -cne 'SIFIRLA') { Write-Host 'Islem iptal edildi.'; exit 0 }
    $secure = Read-Host 'YENI PAROLA (en az 14 karakter)' -AsSecureString
    $handle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $env:BEP_RESET_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($handle)
    & $nodePath $tmp reset $tenantId $email
    if ($LASTEXITCODE -ne 0) { throw 'Parola sifirlama basarisiz.' }
    Write-Host ''
    Write-Host 'Simdi BASLAT.bat dosyasini tekrar acip http://127.0.0.1:4173/kurum adresinde giris yapin.' -ForegroundColor Green
} finally {
    Remove-Item Env:BEP_RESET_PASSWORD -ErrorAction SilentlyContinue
    if ($handle -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($handle) }
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
