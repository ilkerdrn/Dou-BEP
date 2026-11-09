import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source = readFileSync(new URL('../tools/dou-reader-windows-host.cs', import.meta.url), 'utf8');
const method = source.split('private new static string AccessibleName(AutomationElement element)')[1]?.split('private void Say(AutomationElement element)')[0];
const guard = source.split('public static class SensitiveAccessibleNameGuard')[1]?.split('public static class TurkishMathPronunciation')[0];
test('Windows UIA name is checked by production guard before utterance construction', () => {
  assert.ok(method && guard, 'production UIA method and privacy helper must exist');
  assert.match(method, /element\.Current\.IsPassword/);
  assert.match(method, /ControlType\.Edit/);
  const name = method.indexOf('var name = element.Current.Name;');
  const sensitive = method.indexOf('SensitiveAccessibleNameGuard.IsSensitive(name)');
  const returnText = method.indexOf('return type + ": " + name;');
  assert.ok(name >= 0 && sensitive > name && returnText > sensitive, 'guard must precede spoken text');
  for (const hint of ['parola','şifre','password','passcode','cvv','cvc','otp','token','api[_ -]?key']) {
    assert.ok(guard.includes(hint), `missing credential guard: ${hint}`);
  }
  assert.match(guard, /RegexOptions\.IgnoreCase \| RegexOptions\.CultureInvariant/);
});
test('Reader must not speak an inaccessible input via ValuePattern or TextPattern', () => {
  assert.doesNotMatch(method, /GetCurrentPattern|ValuePattern|TextPattern|SetFocus\(/);
});
test('Offline gate executes extracted production C# guard rather than a duplicated regex', () => {
  const smoke = readFileSync(new URL('../tools/dou-reader-privacy-check.ps1', import.meta.url), 'utf8');
  assert.match(smoke,/Add-Type -TypeDefinition \$unit/);
  assert.match(smoke,/public static class SensitiveAccessibleNameGuard/);
  assert.match(smoke,/\[DouBepReader\.SensitiveAccessibleNameGuard\]::IsSensitive/);
  assert.doesNotMatch(smoke,/Invoke-WebRequest|Invoke-RestMethod|Start-Transcript|Get-Clipboard|Set-Clipboard/);
});

test('Windows PowerShell 5.1 smoke fixtures are invariant to legacy source encoding', () => {
  const smoke = readFileSync(new URL('../tools/dou-reader-privacy-check.ps1', import.meta.url), 'utf8');
  assert.doesNotMatch(smoke, /[^\\x00-\\x7f]/, 'PS 5.1 without BOM can corrupt non-ASCII literals');
  assert.match(smoke, /\[char\]0x015E/);
  assert.match(smoke, /\[char\]0x00FC/);
  assert.match(smoke, /label = \$turkishPassword/);
  assert.match(smoke, /label = \$turkishSecurity/);
});
