/**
 * v2.54: A revision-bound, one-shot approval transaction for the teacher editor.
 * Approval is a server operation. Subsequent list/history refreshes are UI work,
 * never grounds for claiming that an accepted approval failed.
 * No browser storage, remote dependency or learner-level information.
 */
export function assertApprovalReady({id,revision,confirmed,dirty,busy,allowed,saving,pending,blocked}) {
 if(!allowed)throw Error('Sınav onaylama yetkisi bulunmuyor.');
 if(busy||saving)throw Error('İşlem veya kayıt sürerken sınav onaylanamaz.');
 if(blocked||dirty||pending)throw Error('Kaydedilmemiş veya çakışan değişiklikler varken sınav onaylanamaz.');
 if(typeof id!=='string'||!id.trim()||!Number.isSafeInteger(revision)||revision<1)throw Error('Kaydedilmiş geçerli sınav sürümü gerekli.');
 if(confirmed!==true)throw Error('Sınav sürümü öğretmen tarafından açıkça teyit edilmeli.');
 return {id,revision};
}
export async function submitExamApproval({id,revision,request,onAccepted,refreshList,refreshHistory}) {
 if(typeof request!=='function'||typeof onAccepted!=='function'||typeof refreshList!=='function'||typeof refreshHistory!=='function')throw Error('Onay işlemi bağımlılıkları eksik.');
 if(typeof id!=='string'||!id.trim()||!Number.isSafeInteger(revision)||revision<1)throw Error('Onay sürüm kimliği geçersiz.');
 const accepted=await request(id,revision);
 if(!accepted||accepted.id!==id||accepted.revision!==revision||accepted.status!=='approved')throw Error('Sunucu onay yanıtı beklenen sınav sürümüyle eşleşmiyor. Sunucudan yeniden okuyun.');
 // Commit only the exact approved revision, before non-critical read refreshes.
 onAccepted(accepted);
 const [list,history]=await Promise.allSettled([refreshList(),refreshHistory()]);
 return {approved:accepted,refreshFailed:[list.status==='rejected'?'liste':null,history.status==='rejected'?'geçmiş':null].filter(Boolean)};
}
