import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAccess,requireAccess,AccessDenied} from './access-policy.mjs';
const valid=()=>({actor:{verified:true,tenantId:'school-A',subjectId:'teacher-1',role:'teacher'},resource:{tenantId:'school-A',kind:'exam',id:'exam-1'},permission:'exam.edit'});
test('verified same-school teacher allowed under planned policy contract',()=>{assert.equal(evaluateAccess(valid()).allowed,true);assert.equal(requireAccess(valid()),true);});
test('deny missing verification, cross-school, unknown role, mismatched permission or resource',()=>{
 for(const scenario of [
 {...valid(),actor:{...valid().actor,verified:false}},
 {...valid(),resource:{...valid().resource,tenantId:'school-B'}},
 {...valid(),actor:{...valid().actor,role:'observer'}},
 {...valid(),permission:'assessment.record'},
 {...valid(),resource:{...valid().resource,kind:'__proto__'}},
 {...valid(),actor:{...valid().actor,subjectId:''}},
 ]){assert.equal(evaluateAccess(scenario).allowed,false);assert.throws(()=>requireAccess(scenario),AccessDenied);}
});
