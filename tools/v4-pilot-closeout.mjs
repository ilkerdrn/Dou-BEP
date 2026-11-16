/**
 * DOU BEP V4 local pilot closeout, deliberately not a certification.
 * The existing suites own their isolated databases and browser profiles.
 * This wrapper does not read BEP_DB_PATH, upload data, or change approval flags.
 */
import {spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.includes('--help')){
 console.log('Usage: node tools/v4-pilot-closeout.mjs [--skip-browser]');
 process.exit(0);
}
if(args.some(x=>x!=='--skip-browser')){
 console.error('Only --skip-browser is supported.');
 process.exit(2);
}
const skipBrowser=args.includes('--skip-browser');
const checks=[
 {id:'nlp_http',label:'Sentetik NLP / klasik soru / ara kayıt / teslim',command:process.execPath,args:['tools/v4-nlp-lab-http-acceptance.mjs']},
 ...(!skipBrowser?[{id:'student_edge',label:'İzole Edge öğrenci tarayıcı kabulü',command:process.execPath,args:['tools/browser-ui-acceptance.mjs','--student']}]:[])
];
let failure=false;
for(const check of checks){
 console.log('\n=== '+check.id+' · '+check.label+' ===');
 const result=spawnSync(check.command,check.args,{
  cwd:root,stdio:'inherit',shell:false,windowsHide:true,
  env:{...process.env,BEP_POCKET_TTS_EXPERIMENT:'0',BEP_POCKET_TTS_RESEARCH_ACK:'0'}
 });
 const ok=result.status===0&&!result.error;
 console.log(check.id+': '+(ok?'PASS':'FAIL'));
 if(!ok){failure=true;break;}
}
if(failure){
 console.error('PILOT CLOSEOUT: FAIL. Sonraki aşamalar çalıştırılmadı.');
 process.exitCode=1;
}else{
 console.log('\n=== Yerel Türkçe kadın sesi tanılama (Windows SAPI) ===');
 if(process.platform!=='win32'){
  console.log('VOICE: NOT_RUN · Windows PowerShell 5.1 gereklidir.');
 }else{
  const result=spawnSync('powershell.exe',[
   '-NoProfile','-ExecutionPolicy','Bypass','-File','tools/dou-reader-voice-readiness.ps1'
  ],{cwd:root,shell:false,windowsHide:true,encoding:'utf8',maxBuffer:1024*1024});
  const output=(result.stdout||'')+'\n'+(result.stderr||'');
  // Display diagnostic labels but avoid displaying unrelated system metadata.
  for(const line of output.split(/\r?\n/)){
   if(/^(SAPI ses sayisi:|Kullanilabilir Turkce SAPI ses sayisi:|Kullanilabilir Turkce kadin SAPI ses sayisi:|Durum:)/.test(line.trim()))
    console.log(line.trim());
  }
  const match=/Kullanilabilir Turkce kadin SAPI ses sayisi:\s*(\d+)/.exec(output);
  if(result.status!==0||result.error||!match){
   console.log('VOICE: UNVERIFIED · SAPI tanılaması tamamlanamadı.');
  }else if(Number(match[1])===0){
   console.log('VOICE: BLOCKED · Türkçe kadın SAPI sesi bulunamadı.');
  }else{
   console.log('VOICE: CANDIDATE ONLY · Dinleme ve NVDA kabulü gerekiyor.');
  }
 }
 console.log('MANUAL NVDA: PENDING · Gerçek kullanıcı testi ayrıca yapılmalı.');
 console.log('PRODUCTION READY: NO · Bu komut canlı kullanım veya ses kalitesi onayı vermez.');
 console.log('PILOT CLOSEOUT: teknik otomatik kontroller tamamlandı; manuel kapılar açık.');
}
