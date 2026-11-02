/**
 * SERVER DESIGN CONTRACT — not wired to the browser prototype.
 * There is deliberately no login/SSO endpoint and no persistent learner data.
 * A future trusted OIDC adapter must authenticate and verify claims before it
 * can populate actor. Passing a role from the browser is never acceptable.
 */
import {roleCan} from '../roles.mjs';
const knownResources=new Set(['exam','assessment','objective','rubric','audit']);
export class AccessDenied extends Error {constructor(){super('Erişim reddedildi.');this.name='AccessDenied';}}
function safeId(value){return typeof value==='string' && /^[A-Za-z0-9_-]{2,80}$/.test(value);}
/**
 * @param {{actor:{verified:boolean,tenantId:string,subjectId:string,role:string}, resource:{tenantId:string,kind:string,id:string}, permission:string}} request
 * @returns {{allowed:boolean,reason:string}}
 */
export function evaluateAccess(request){
 if(!request||!request.actor||!request.resource)return {allowed:false,reason:'missing_context'};
 const {actor,resource,permission}=request;
 if(actor.verified!==true)return {allowed:false,reason:'unverified_actor'};
 if(!safeId(actor.tenantId)||!safeId(actor.subjectId)||!safeId(resource.tenantId)||!safeId(resource.id))return {allowed:false,reason:'invalid_identity'};
 if(!knownResources.has(resource.kind))return {allowed:false,reason:'invalid_resource'};
 if(actor.tenantId!==resource.tenantId)return {allowed:false,reason:'tenant_mismatch'};
 if(typeof permission!=='string'||!permission.startsWith(resource.kind+'.'))return {allowed:false,reason:'permission_mismatch'};
 if(!roleCan(actor.role,permission))return {allowed:false,reason:'insufficient_role'};
 return {allowed:true,reason:'granted'};
}
export function requireAccess(request){if(!evaluateAccess(request).allowed)throw new AccessDenied();return true;}
