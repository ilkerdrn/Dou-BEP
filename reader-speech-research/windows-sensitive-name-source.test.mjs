import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source = readFileSync(new URL('../tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
const method = source.split('private new static string AccessibleName(AutomationElement element)')[1]?.split('private void Say(AutomationElement element)')[0];
test('Windows UIA name is checked for sensitive hints before utterance construction', () => {
  assert.ok(method, 'AccessibleName implementation must exist');
  assert.match(method, /element\.Current\.IsPassword/);
  assert.match(method, /ControlType\.Edit/);
  const name = method.indexOf('var name = element.Current.Name;');
  const sensitive = method.indexOf('Regex.IsMatch(name,');
  const returnText = method.indexOf('return type + ": " + name;');
  assert.ok(name >= 0 && sensitive > name && returnText > sensitive, 'sensitive-name guard must precede spoken text');
  for (const hint of ['parola','şifre','password','passcode','cvv','cvc','otp','token','api[_ -]?key']) {
    assert.ok(method.includes(hint), `missing credential guard: ${hint}`);
  }
  assert.match(method, /RegexOptions\.IgnoreCase \| RegexOptions\.CultureInvariant/);
});
test('Reader must not speak an inaccessible input via ValuePattern or TextPattern', () => {
  assert.doesNotMatch(method, /GetCurrentPattern|ValuePattern|TextPattern|SetFocus\(/);
});
