/**
 * DOU BEP V4 - reviewer inbox (pure, read-only).
 * The input is already a tenant-scoped, role-filtered /api/exams listing.
 * A draft is NEVER classified as "approval ready" without a server review.
 * No exam body, answer key, learner data, token, or approval capability is returned.
 */
const ROLES=new Set(['reviewer','coordinator','admin']);
const FILTERS=new Set(['draft','approved','all']);
const MAX_RESULTS=100;

export function reviewerInbox(exams,{role,actorId='',filter='draft',query=''}={}){
 const enabled=ROLES.has(role);
 if(!enabled)return {enabled:false,filter:'draft',counts:{draft:0,approved:0,all:0},items:[]};
 const selected=FILTERS.has(filter)?filter:'draft';
 const needle=String(query||'').trim().toLocaleLowerCase('tr').slice(0,100);
 const listed=(Array.isArray(exams)?exams:[]).filter(item=>
  item&&typeof item.id==='string'&&/^[0-9a-f-]{36}$/.test(item.id)&&
  ['draft','approved'].includes(item.status)&&
  Number.isSafeInteger(item.revision)&&item.revision>0
 ).map(item=>({
  id:item.id,
  title:String(item.title||'Adsız sınav').slice(0,250),
  revision:item.revision,
  status:item.status,
  updatedAt:Number.isFinite(Number(item.updatedAt))?Number(item.updatedAt):0,
  own:Boolean(actorId&&item.ownerId===actorId)
 }));
 listed.sort((a,b)=>b.updatedAt-a.updatedAt);
 const counts={draft:listed.filter(item=>item.status==='draft').length,
  approved:listed.filter(item=>item.status==='approved').length,all:listed.length};
 return {
  enabled,filter:selected,counts,
  items:listed.filter(item=>(selected==='all'||item.status===selected)&&
   (!needle||item.title.toLocaleLowerCase('tr').includes(needle))).slice(0,MAX_RESULTS)
   .map(item=>({
    ...item,
    label:item.status==='draft'?'Taslak · inceleme gerekli':'Onay kaydı var · geçmişi doğrulayın',
    hint:item.own
     ?'Bu sınav sizin taslağınız. Bağımsız onay gereken pilotta başka bir incelemeci kullanın.'
     :item.status==='draft'
      ?'Onay için hazır olduğu henüz doğrulanmadı. İçeriği ve kalite raporunu inceleyin.'
      :'Onaylanan sürümü ve onay geçmişini açıp doğrulayın.'
   }))
 };
}
