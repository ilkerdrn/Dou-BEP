import {writeFileSync} from 'node:fs';
import {createDemo} from './core.mjs';
import {generateAccessibleExamHtml} from './accessible-player.mjs';
const exam=createDemo();
exam.title='BEP Matematik · Sesli Yanıt Pilot Örneği';
exam.profile='';exam.adaptations.visualCues=false;
writeFileSync('DOU-v1.4-Sesli-Yanit-Ornegi.html',generateAccessibleExamHtml(exam,{allowVoiceResponse:true}));
writeFileSync('DOU-v1.4-Mikrofonsuz-Ornek.html',generateAccessibleExamHtml(exam));
console.log('v1.4 student samples generated (synthetic and no identifying data).');
