/** Role policy shared by the UI and the localhost institutional API. Authentication is server-session based. */
export const PERMISSIONS=Object.freeze([
 ['exam.view','Sınavları görüntüleme'],['exam.edit','Sınav taslağını düzenleme'],
 ['exam.approve','Sınav taslağını onaylama'],['exam.export','Sınavı dışa aktarma'],
 ['assessment.record','Anonim puanlama'],['assessment.export','Değerlendirme raporunu alma'],
 ['catalog.manage','Kazanım kataloğunu yönetme'],['members.manage','Kurumsal üyelikleri yönetme'],
 ['audit.view','Denetim kayıtlarını görme'],
 ['accommodation.view','Anonim düzenleme kararlarını görüntüleme'],['accommodation.manage','Düzenleme kararı taslağı hazırlama'],
 ['accommodation.approve','Başkasının düzenleme kararını onaylama'],['accommodation.verify','Toplu aktarımı kararlarla karşılaştırma']
]);
const ROLE_PERMISSIONS={
 admin:['exam.view','exam.edit','exam.approve','exam.export','assessment.record','assessment.export','catalog.manage','members.manage','audit.view','accommodation.view','accommodation.manage','accommodation.approve','accommodation.verify'],
 coordinator:['exam.view','exam.edit','exam.approve','exam.export','assessment.record','assessment.export','catalog.manage','audit.view','accommodation.view','accommodation.manage','accommodation.approve','accommodation.verify'],
 teacher:['exam.view','exam.edit','exam.approve','exam.export','assessment.record','assessment.export','accommodation.verify'],
 reviewer:['exam.view','exam.approve','audit.view','accommodation.view','accommodation.approve'],
 observer:['exam.view']
};
export const ROLE_LABELS=Object.freeze({admin:'Kurum yöneticisi',coordinator:'Özel eğitim koordinatörü',teacher:'Öğretmen',reviewer:'İncelemeci',observer:'Görüntüleyici'});
export function roleCan(role,permission){return Boolean(Object.hasOwn(ROLE_PERMISSIONS,role)&&PERMISSIONS.some(([id])=>id===permission)&&ROLE_PERMISSIONS[role].includes(permission));}
export function roleMatrix(){return Object.entries(ROLE_LABELS).map(([id,label])=>({id,label,permissions:PERMISSIONS.map(([p])=>roleCan(id,p))}));}
/** Utility for asserting role/tenant access. API derives actor from the validated server session. */
export function policyDecision({actorTenant,resourceTenant,role,permission}){
 if(!actorTenant||!resourceTenant||typeof actorTenant!=='string'||typeof resourceTenant!=='string')return false;
 return actorTenant===resourceTenant&&roleCan(role,permission);
}
