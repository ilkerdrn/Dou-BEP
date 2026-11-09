/** Release prerequisites for applying a synthetic BEP plan to a real exam.
 * This module never issues entitlement tokens, changes pilot timers, or accepts
 * unverified readiness declarations from an HTTP client.
 */
export const LIVE_RELEASE_CONTROLS=Object.freeze([
 {id:'institutional_identity',label:'Kurumsal SSO ve MFA ile doğrulanmış öğrenci kimliği'},
 {id:'privacy_authorization',label:'KVKK ve kurumsal veri işleme izni'},
 {id:'candidate_binding',label:'Kurumsal kayıt üzerinden güvenli bireysel oturum eşleştirmesi'},
 {id:'signed_entitlement',label:'İki aşamalı onaylı ve süre sınırlandırılmış hak belgesi'},
 {id:'session_clock',label:'Gerçek oturuma bağlı sunucu süre ve mola uygulaması'},
 {id:'acceptance_testing',label:'Erişilebilirlik, yetki ve uçtan uca kabul testi'}
]);
export function evaluateBepRelease({planStatus,approvalStatus,coordinationVerified,controls={}}={}){
 const blockers=[];
 if(planStatus!=='verified')blockers.push({id:'plan_not_verified',label:'Onaylı süre planının güncel doğrulaması eksik'});
 if(approvalStatus!=='approved')blockers.push({id:'independent_review_missing',label:'Bağımsız onay eksik veya geçersiz'});
 if(coordinationVerified!==true)blockers.push({id:'exam_binding_missing',label:'Sınav oturumu eşleştirmesi geçersiz'});
 for(const requirement of LIVE_RELEASE_CONTROLS){
  // A control may only be certified via future server-owned checks; this
  // fail-closed preparatory implementation never treats browser input as proof.
  if(controls[requirement.id]!==true)blockers.push(requirement);
 }
 return {scope:'simulation_only',liveApplicationEnabled:false,
  reviewReady:blockers.every(x=>!['plan_not_verified','independent_review_missing','exam_binding_missing'].includes(x.id)),
  blockers,missingCount:blockers.length,
  message:'Gerçek öğrenci sınavında süre uygulaması kapalıdır; bu ekran yalnız hazırlık denetimidir.'};
}
