/**
 * Client-only coordination of asynchronous exam selection. This does not cancel
 * a server request: it prevents a superseded response from changing the editor.
 * No browser storage, global state, student data or remote services are used.
 */
export function createExamSelection({fetchExam,applyExam}) {
 if(typeof fetchExam!=='function'||typeof applyExam!=='function')throw Error('Sınav seçim bağımlılıkları eksik.');
 let generation=0;
 function checkpoint() {
  const selectedGeneration=generation;
  return {isCurrent:()=>generation===selectedGeneration};
 }
 function invalidate() {generation++;}
 async function open(id) {
  if(typeof id!=='string'||!id.trim())throw Error('Sınav kimliği gerekli.');
  const ticket=++generation;
  try {
   const exam=await fetchExam(id);
   if(ticket!==generation)return false;
   await applyExam(exam);
   return ticket===generation;
  } catch(error) {
   // An older response must not surface a misleading error over the new draft.
   if(ticket!==generation)return false;
   throw error;
  }
 }
 return {open,invalidate,checkpoint};
}
