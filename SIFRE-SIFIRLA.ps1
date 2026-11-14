# DOU BEP Sinav Atolyesi - yerel yonetici parola kurtarma
# Bu dosyayi BASLAT.bat ile AYNI klasore koyun.
# Gercek ogrenci/ozel nitelikli veri icin kullanmayin.
[CmdletBinding()]
param(
    [string]$DatabasePath = '',
    [switch]$ListOnly
)
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
# Explicit override is for an existing pilot DB only; never silently create a new DB.
# The default (no arguments) remains fully backward-compatible.
$selectedDatabase = if ($DatabasePath) { $DatabasePath } elseif ($env:BEP_DB_PATH) {
    $env:BEP_DB_PATH
} else { Join-Path $PSScriptRoot 'data\institution.sqlite' }
if (-not [System.IO.Path]::IsPathRooted($selectedDatabase)) {
    throw 'Veritabani yolu mutlak olmalidir. -DatabasePath ile tam yol verin.'
}
if (-not (Test-Path -LiteralPath $selectedDatabase -PathType Leaf)) {
    throw ('Veritabani bulunamadi; hicbir sey degistirilmedi: ' + $selectedDatabase)
}
$selectedDatabase = (Resolve-Path -LiteralPath $selectedDatabase).ProviderPath

$js = @'
import { DatabaseSync } from 'node:sqlite';
import { openStore, passwordHash } from './server-foundation/institutional-store.mjs';
const file = process.env.BEP_RECOVERY_DATABASE_PATH;
if (!file) throw new Error('Recovery database path missing.');
const [mode, tenantId, emailArg] = process.argv.slice(2);
const readOnlyDb = mode === 'list' ? new DatabaseSync(file, {readOnly:true}) : null;
const store = mode === 'reset' ? openStore(file) : null;
try {
  if (mode === 'list') {
    const admins = readOnlyDb.prepare("SELECT tenant_id AS tenantId, email, active FROM members WHERE role='admin' ORDER BY tenant_id,email").all();
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
finally { readOnlyDb?.close(); store?.db.close(); }
'@
$tmp = Join-Path $PSScriptRoot ('.bep-local-recovery-' + [guid]::NewGuid().ToString('N') + '.mjs')
$handle = [IntPtr]::Zero
$oldRecoveryDb = [Environment]::GetEnvironmentVariable('BEP_RECOVERY_DATABASE_PATH','Process')
try {
    $env:BEP_RECOVERY_DATABASE_PATH = $selectedDatabase
    [System.IO.File]::WriteAllText($tmp, $js, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host ''
    Write-Host '=== DOU BEP YONETICI PAROLA KURTARMA ===' -ForegroundColor Cyan
    Write-Host ('[VERITABANI] ' + $selectedDatabase)
    & $nodePath $tmp list
    if ($LASTEXITCODE -ne 0) { throw 'Secilen veritabaninda yonetici hesabi bulunamadi.' }
    if ($ListOnly) {
        Write-Host 'Sadece hesaplar listelendi. Parola degistirilmedi.' -ForegroundColor Green
        return
    }
    Write-Host ''
    $tenantId = (Read-Host 'Listeden KURUM KODUNU girin').Trim()
    $email = (Read-Host 'Listeden YONETICI E-POSTASINI girin').Trim()
    $confirm = Read-Host 'Parolayi sifirlamak icin SIFIRLA yazin'
    if ($confirm -cne 'SIFIRLA') { Write-Host 'Islem iptal edildi.'; return }
    $secure = Read-Host 'YENI PAROLA (en az 14 karakter)' -AsSecureString
    $handle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $env:BEP_RESET_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($handle)
    & $nodePath $tmp reset $tenantId $email
    if ($LASTEXITCODE -ne 0) { throw 'Parola sifirlama basarisiz.' }
    Write-Host ''
    Write-Host 'Sunucuyu ayni BEP_DB_PATH ile baslatin ve http://127.0.0.1:4173/kurum adresinde giris yapin.' -ForegroundColor Green
} finally {
    if ($null -eq $oldRecoveryDb) { Remove-Item Env:BEP_RECOVERY_DATABASE_PATH -ErrorAction SilentlyContinue }
    else { $env:BEP_RECOVERY_DATABASE_PATH = $oldRecoveryDb }
    Remove-Item Env:BEP_RESET_PASSWORD -ErrorAction SilentlyContinue
    if ($handle -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($handle) }
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
