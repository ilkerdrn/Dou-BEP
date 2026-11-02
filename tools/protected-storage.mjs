/**
 * Optional offline Windows BitLocker volume gate for a pilot SQLite store.
 * Protects the *volume at rest* only. It is not SQLite column encryption,
 * authenticated users, endpoint protection or institutional certification.
 * Neither retrieves, prints nor manages BitLocker recovery keys.
 */
import {execFileSync} from 'node:child_process';
import {win32} from 'node:path';
import {existsSync,realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const SAFE_DRIVE=/^[A-Z]:\\$/i;
const STATUS_OK=new Set(['on','1']);
const FULLY_ENCRYPTED=new Set(['fullyencrypted','1']);

export function inspectProtectedStorage({path,platform=process.platform,run}={}){
 if(platform!=='win32')return {protected:false,reason:'unsupported_platform',message:'Otomatik disk şifreleme kontrolü yalnızca Windows BitLocker için destekleniyor.'};
 if(typeof path!=='string'||!path.trim())return {protected:false,reason:'invalid_path',message:'Veritabanı yolu geçersiz.'};
 const requested=win32.resolve(path);
 const root=win32.parse(requested).root;
 if(!SAFE_DRIVE.test(root))return {protected:false,reason:'unsupported_volume',message:'Ağ paylaşımı, UNC ve sürücü harfi olmayan yollar kabul edilmez.'};
 // Resolve an existing file or its nearest existing ancestor so a reparse-point
 // redirect to another volume cannot make a plain database look protected.
 if(platform===process.platform){
  let ancestor=requested;
  while(!existsSync(ancestor)&&win32.dirname(ancestor)!==ancestor)ancestor=win32.dirname(ancestor);
  if(existsSync(ancestor)){
   try{const actualRoot=win32.parse(realpathSync.native(ancestor).replace(/^\\\\\?\\/, '')).root;
    if(actualRoot.toUpperCase()!==root.toUpperCase())return {protected:false,reason:'redirected_volume',message:'Veritabanı yolu farklı bir sürücüye yönlendiriliyor.'};
   }catch{return {protected:false,reason:'unverifiable_path',message:'Veritabanı yolu doğrulanamadı.'};}
  }
 }
 // Use -EncodedCommand and execFileSync (never a shell) to avoid path or script injection.
 const drive=root.slice(0,2);
 const script=`$ErrorActionPreference='Stop'; $v=Get-BitLockerVolume -MountPoint '${drive}' -ErrorAction Stop; if($null -eq $v){throw 'Missing volume'}; [pscustomobject]@{ protectionStatus=[string]$v.ProtectionStatus; volumeStatus=[string]$v.VolumeStatus; encryptionPercentage=[int]$v.EncryptionPercentage } | ConvertTo-Json -Compress`;
 const args=['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')];
 try{
  const output=(run??((exe,argv)=>execFileSync(exe,argv,{encoding:'utf8',timeout:12000,maxBuffer:16384,windowsHide:true,stdio:['ignore','pipe','pipe']})))('powershell.exe',args);
  const value=JSON.parse(String(output).trim());
  const status=String(value?.protectionStatus??'').trim().toLowerCase();
  const volume=String(value?.volumeStatus??'').trim().toLowerCase();
  const percentage=Number(value?.encryptionPercentage);
  const protectedVolume=STATUS_OK.has(status)&&FULLY_ENCRYPTED.has(volume)&&percentage===100;
  return {protected:protectedVolume,reason:protectedVolume?'protected':'encryption_incomplete',message:protectedVolume?'BitLocker disk şifrelemesi açık, koruma etkin ve şifreleme tamamlanmış.':'Disk şifrelemesi, koruması veya tamamlanma durumu yeterli değil.'};
 }catch{
  // No exception output: an unavailable PowerShell/BitLocker module is NOT proof of encryption.
  return {protected:false,reason:'verification_unavailable',message:'BitLocker durumu doğrulanamadı (PowerShell yetkisi, sürücü veya araç eksik olabilir).'};
 }
}

export function enforceProtectedStorage({path,required=process.env.BEP_REQUIRE_PROTECTED_VOLUME==='1',inspect=inspectProtectedStorage}={}){
 if(!required)return {enforced:false};
 const result=inspect({path});
 if(!result.protected)throw Error('BEP_STORAGE_BLOCKED: Şifreli disk koruması doğrulanamadı; sunucu başlatılmadı. '+result.message);
 return {enforced:true};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const source=process.argv[2]||process.env.BEP_DB_PATH||fileURLToPath(new URL('../data/institution.sqlite',import.meta.url));
 const status=inspectProtectedStorage({path:source});
 console.log('DOU BEP — YEREL DISK KORUMASI');
 console.log(status.protected?'PASS':'WARN',status.reason, status.message);
 console.log('Not: Bu denetim veritabanı alanlarını şifrelemez; gerçek öğrenci verileri için yeterli değildir.');
 if(!status.protected)process.exitCode=1;
}
