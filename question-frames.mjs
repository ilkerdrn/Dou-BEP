/** Teacher-owned, incomplete question scaffolds; never auto-graded or approved. */
import {starterQuestion} from './core.mjs';
const TYPES=new Set(['choice','short','truefalse','matching']);
export function createQuestionFrame(type,objective,goalId=''){
 if(!TYPES.has(type))throw Error('Bu soru türü desteklenmiyor.');
 if(typeof objective!=='string'||objective.trim().length<8||objective.length>400)throw Error('Önce geçerli bir kazanım seçin.');
 if(goalId&&!/^H\d{2,3}$/.test(goalId))throw Error('Kazanım bağlantısı geçersiz.');
 const q=starterQuestion(type);
 return {...q,goalId,objective:objective.trim(),prompt:'',answer:'',simplifiedPrompt:'',options:type==='choice'?['','','']:[],pairs:type==='matching'?[{left:'',right:''},{left:'',right:''}]:[],
  provenance:null,teacherNote:''};
}
