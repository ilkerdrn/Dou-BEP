import {writeFileSync} from 'node:fs';
import {createDemo} from './core.mjs';
import {createExamMp3,createAudioScript,audioDependencies} from './offline-audio.mjs';
import {generateAccessibleExamHtml} from './accessible-player.mjs';
const exam=createDemo();exam.title='BEP Matematik · Erişilebilir Sesli Sınav';exam.profile='';
exam.adaptations.highContrast=false;exam.adaptations.visualCues=false;
for(const q of exam.questions)q.teacherNote='';
writeFileSync('DOU-v1.3-Sesli-Sinav-Ornegi.html',generateAccessibleExamHtml(exam));
writeFileSync('DOU-v1.3-Seslendirme-Metni.txt',createAudioScript(exam));
if(audioDependencies().available){const mp3=await createExamMp3(exam);writeFileSync('DOU-v1.3-Ornek-Seslendirme.mp3',mp3);console.log('MP3 bytes',mp3.length);}
