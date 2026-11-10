import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../release-check.mjs',import.meta.url),'utf8');

test('Git release scans tracked artifacts, not ignored local SQLite runtime files',()=>{
 assert.match(source,/execFileSync\('git',\['ls-files','-z'\]/);
 assert.match(source,/for\(const file of trackedPaths\)if\(isPrivatePath\(file\)\|\|secretExtension\.test\(file\)\)prohibited\.push\(file\)/);
 assert.match(source,/if\(!inGitRepo\)walk\(root\)/);
 assert.doesNotMatch(source,/^walk\(root\);check\('No database or private key shipped'/m);
});
test('Standalone release scans all files including secrets inside data directories',()=>{
 assert.match(source,/if\(d\.isDirectory\(\)\)walk\(pathname\)/);
 assert.match(source,/else if\(secretExtension\.test\(d\.name\)\)prohibited\.push/);
 assert.match(source,/check\('No database or private key shipped',prohibited\.length===0\)/);
 assert.match(source,/check\('v2\.37 no key material or database included in source package',.*prohibited\.length===0\)/);
});
