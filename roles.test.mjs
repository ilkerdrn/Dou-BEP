import test from 'node:test';
import assert from 'node:assert/strict';
import {roleCan,roleMatrix,policyDecision,PERMISSIONS} from './roles.mjs';
test('preview permission matrix covers all roles and capabilities',()=>{
 assert.equal(roleMatrix().length,5);assert.equal(roleMatrix()[0].permissions.length,PERMISSIONS.length);
 assert.equal(roleCan('observer','exam.edit'),false);assert.equal(roleCan('teacher','exam.edit'),true);
 assert.equal(roleCan('__proto__','members.manage'),false);assert.equal(roleCan('admin','not.real'),false);
});
test('target authorization policy fails closed across tenants',()=>{
 const base={actorTenant:'kurum-a',resourceTenant:'kurum-a',role:'teacher',permission:'exam.edit'};
 assert.equal(policyDecision(base),true);assert.equal(policyDecision({...base,resourceTenant:'kurum-b'}),false);
 assert.equal(policyDecision({...base,actorTenant:''}),false);assert.equal(policyDecision({...base,role:'observer'}),false);
});
