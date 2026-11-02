import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('./dou-reader-windows-host.cs', import.meta.url), 'utf8');
test('Windows Reader tracks successful hotkey registrations', () => {
  assert.match(source, /HashSet<int> _registeredHotkeys/);
  assert.match(source, /if \(!RegisterHotKey\(Handle, key\.Item1/);
  assert.match(source, /_registeredHotkeys\.Add\(key\.Item1\)/);
});
test('Windows Reader unregisters all successful hotkeys on collision', () => {
  assert.match(source, /if \(!RegisterHotKey[\s\S]*?foreach \(int id in _registeredHotkeys\) UnregisterHotKey\(Handle, id\);[\s\S]*?_registeredHotkeys\.Clear\(\);[\s\S]*?return;/);
});
test('Windows Reader cleans up registered hotkeys at shutdown', () => {
  assert.match(source, /OnFormClosed[\s\S]*?foreach \(int id in _registeredHotkeys\) UnregisterHotKey\(Handle, id\);[\s\S]*?_registeredHotkeys\.Clear\(\);/);
});
