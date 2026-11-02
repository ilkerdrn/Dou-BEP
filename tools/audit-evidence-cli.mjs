/** Offline-only CLI. Paths must be given explicitly; no web server endpoint. */
import {generateAuditEvidenceKey,sealAuditEvidence,verifyAuditEvidence,rotateAuditEvidence,verifyRotatedAuditEvidence} from './audit-evidence.mjs';
const [command,...rest]=process.argv.slice(2);
const options={};
for(let i=0;i<rest.length;i+=2){
 if(!['--db','--key-file','--evidence-file','--old-key-file','--old-evidence-file','--new-key-file','--new-evidence-file'].includes(rest[i])||!rest[i+1]||options[rest[i]]){console.error('Invalid arguments');process.exit(2);}
 options[rest[i]]=rest[i+1];
}
const args={databasePath:options['--db'],keyFile:options['--key-file'],evidenceFile:options['--evidence-file']};
try{
 let result;
 if(command==='init-key'&&Object.keys(options).length===1&&args.keyFile)result=generateAuditEvidenceKey({keyFile:args.keyFile});
 else if(command==='seal'&&Object.keys(options).length===3)result=sealAuditEvidence(args);
 else if(command==='verify'&&Object.keys(options).length===3)result=verifyAuditEvidence(args);
 else if(['rotate','verify-rotation'].includes(command)&&Object.keys(options).length===5&&options['--db']&&options['--old-key-file']&&options['--old-evidence-file']&&options['--new-key-file']&&options['--new-evidence-file']){
   const rotationArgs={databasePath:args.databasePath,oldKeyFile:options['--old-key-file'],oldEvidenceFile:options['--old-evidence-file'],newKeyFile:options['--new-key-file'],newEvidenceFile:options['--new-evidence-file']};
   result=command==='rotate'?rotateAuditEvidence(rotationArgs):verifyRotatedAuditEvidence(rotationArgs);
 }
 else throw new Error('usage');
 console.log(JSON.stringify({command,...result},null,2));
}catch(error){console.error(JSON.stringify({ok:false,error:error.code||'invalid_command'}));process.exitCode=1;}
