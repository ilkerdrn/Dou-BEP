import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ps=readFileSync(new URL('../SIFRE-SIFIRLA.ps1',import.meta.url),'utf8');

test('recovery tool may target one explicit existing pilot DB but never creates one',()=>{
 assert.match(ps,/\[string\]\$DatabasePath = ''/);
 assert.match(ps,/\[switch\]\$ListOnly/);
 assert.match(ps,/Test-Path -LiteralPath \$selectedDatabase -PathType Leaf/);
 assert.match(ps,/Resolve-Path -LiteralPath \$selectedDatabase/);
 assert.match(ps,/BEP_RECOVERY_DATABASE_PATH/);
 assert.match(ps,/if \(\$DatabasePath\)/);
});
test('account discovery opens SQLite in true read-only mode',()=>{
 assert.match(ps,/new DatabaseSync\(file, \{readOnly:mode === 'list'\}\)/);
 assert.doesNotMatch(ps,/openStore\(file\)/);
 assert.match(ps,/mode === 'list'/);
 assert.match(ps,/if \(\$ListOnly\)/);
 assert.match(ps,/Sadece hesaplar listelendi/);
});
test('password reset requires typed consent and securely changes only selected admin',()=>{
 assert.match(ps,/if \(\$confirm -cne 'SIFIRLA'\)/);
 assert.match(ps,/Read-Host 'YENI PAROLA \(en az 14 karakter\)' -AsSecureString/);
 assert.match(ps,/WHERE tenant_id=\? AND email=\? AND role='admin' AND active=1/);
 assert.match(ps,/BEGIN IMMEDIATE/);
 assert.match(ps,/UPDATE members SET salt=\?,hash=\? WHERE id=\?/);
 assert.match(ps,/DELETE FROM sessions WHERE member_id=\?/);
 assert.match(ps,/ROLLBACK/);
 assert.match(ps,/ZeroFreeBSTR/);
 assert.doesNotMatch(ps,/DROP TABLE|DELETE FROM exams|DELETE FROM tenants|DELETE FROM members/);
});
