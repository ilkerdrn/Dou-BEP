import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateUtterance} from './reader-speech-policy.mjs';
const allowed = [101];
const base = {processId:101, role:'button', name:'Sonraki soru', isPassword:false, isOffscreen:false, isEnabled:true};
test('reads an ordinary explicitly approved control', () => {
  assert.deepEqual(evaluateUtterance(base, allowed), {allowed:true, text:'button: Sonraki soru'});
});
test('never reads input controls, including poorly marked passwords', () => {
  for (const role of ['edit','password','textbox','searchbox','combobox']) {
    assert.equal(evaluateUtterance({...base,role},allowed).allowed,false);
  }
  assert.equal(evaluateUtterance({...base,isPassword:true},allowed).allowed,false);
});
test('fails closed when UIA state is missing, invisible or disabled', () => {
  for (const mutation of [{isPassword:undefined},{isOffscreen:undefined},{isEnabled:undefined},{isOffscreen:true},{isEnabled:false}]) {
    assert.equal(evaluateUtterance({...base,...mutation},allowed).allowed,false);
  }
});
test('rejects non-approved processes and invalid IDs', () => {
  for (const processId of [102,-1,NaN, '101', 0]) assert.equal(evaluateUtterance({...base,processId},allowed).allowed,false);
});
test('does not vocalize credential-like accessible names', () => {
  for (const name of ['Şifre: 1234','Parola gir','OTP 654321','CVV: 123','API_KEY=abc','Güvenlik kodu','Password reset']) {
    assert.equal(evaluateUtterance({...base,name},allowed).allowed,false,name);
  }
});
test('bounds utterance length and normalizes control characters', () => {
  assert.equal(evaluateUtterance({...base,name:'a'.repeat(851)},allowed).allowed,false);
  assert.equal(evaluateUtterance({...base,name:'Kaydet\nve devam'},allowed).text,'button: Kaydet ve devam');
});
